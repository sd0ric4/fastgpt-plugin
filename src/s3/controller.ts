import * as Minio from 'minio';
import { randomBytes } from 'crypto';
import { defaultFileConfig, type FileConfig, type FileMetadata } from './config';
import { addLog } from '@/utils/log';
import * as fs from 'fs';
import * as path from 'path';
import { z } from 'zod';

// ================================
// 1. 类型定义和验证
// ================================

export const FileInputSchema = z
  .object({
    url: z.string().url('Invalid URL format').optional(),
    path: z.string().min(1, 'File path cannot be empty').optional(),
    data: z.string().min(1, 'Base64 data cannot be empty').optional(),
    buffer: z.instanceof(Buffer, { message: 'Buffer is required' }).optional(),
    filename: z.string().optional()
  })
  .refine(
    (data) => {
      const inputMethods = [data.url, data.path, data.data, data.buffer].filter(Boolean);
      return inputMethods.length === 1 && (!(data.data || data.buffer) || data.filename);
    },
    {
      message: 'Provide exactly one input method. Filename required for base64/buffer inputs.'
    }
  );

export type FileInput = z.infer<typeof FileInputSchema>;

// ================================
// 2. 文件服务主类
// ================================

export class FileService {
  private minioClient: Minio.Client;
  private config: FileConfig;

  // ================================
  // 2.1 初始化相关
  // ================================

  constructor(config?: Partial<FileConfig>) {
    this.config = { ...defaultFileConfig, ...config };

    this.minioClient = new Minio.Client({
      endPoint: this.config.endpoint,
      port: this.config.port,
      useSSL: this.config.useSSL,
      accessKey: this.config.accessKey,
      secretKey: this.config.secretKey
    });
  }

  // ================================
  // 2.2 连接和存储桶管理
  // ================================

  // ================================
  // 2.3 文件处理工具方法
  // ================================

  private generateFileId(): string {
    return randomBytes(16).toString('hex');
  }

  private generateAccessUrl(fileId: string, filename: string): string {
    const protocol = this.config.useSSL ? 'https' : 'http';
    const port =
      this.config.port && this.config.port !== (this.config.useSSL ? 443 : 80)
        ? `:${this.config.port}`
        : '';
    return `${protocol}://${this.config.endpoint}${port}/${this.config.bucket}/${fileId}/${encodeURIComponent(filename)}`;
  }

  // 根据文件扩展名推断真实的 Content-Type（用于返回给用户）
  private inferContentType(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    const mimeMap: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
      '.pdf': 'application/pdf',
      '.txt': 'text/plain',
      '.json': 'application/json',
      '.csv': 'text/csv',
      '.zip': 'application/zip',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      '.doc': 'application/msword',
      '.xls': 'application/vnd.ms-excel',
      '.ppt': 'application/vnd.ms-powerpoint'
    };

    return mimeMap[ext] || 'application/octet-stream';
  }

  // ================================
  // 2.4 核心上传方法
  // ================================

  async uploadFile(fileBuffer: Buffer, originalFilename: string): Promise<FileMetadata> {
    if (fileBuffer.length > this.config.maxFileSize) {
      return Promise.reject(
        new Error(`File size ${fileBuffer.length} exceeds limit ${this.config.maxFileSize}`)
      );
    }

    const fileId = this.generateFileId();
    const objectName = `${fileId}/${originalFilename}`;
    const uploadTime = new Date();

    // 推断文件的真实 Content-Type（用于返回给用户）
    const realContentType = this.inferContentType(originalFilename);

    try {
      await this.minioClient.putObject(
        this.config.bucket,
        objectName,
        fileBuffer,
        fileBuffer.length,
        {
          'Content-Type': 'application/octet-stream', // 强制下载，不预览
          'Content-Disposition': `attachment; filename="${encodeURIComponent(originalFilename)}"`,
          'x-amz-meta-original-filename': encodeURIComponent(originalFilename),
          'x-amz-meta-upload-time': uploadTime.toISOString()
        }
      );

      const metadata: FileMetadata = {
        fileId,
        originalFilename,
        contentType: realContentType, // 返回真实的 Content-Type
        size: fileBuffer.length,
        uploadTime,
        accessUrl: this.generateAccessUrl(fileId, originalFilename)
      };

      return metadata;
    } catch (error) {
      addLog.error('Failed to upload file:', error);
      return Promise.reject(error);
    }
  }

  async uploadFileAdvanced(input: FileInput): Promise<FileMetadata> {
    const validatedInput = FileInputSchema.parse(input);

    try {
      const { buffer, filename } = await (async () => {
        if (validatedInput.url) return await this.handleNetworkFile(validatedInput);
        if (validatedInput.path) return await this.handleLocalFile(validatedInput);
        if (validatedInput.data) return this.handleBase64File(validatedInput);
        if (validatedInput.buffer) return this.handleBufferFile(validatedInput);
        return Promise.reject(new Error('No valid input method provided'));
      })();

      const metadata = await this.uploadFile(buffer, filename);
      return metadata;
    } catch (error) {
      if (error instanceof z.ZodError) {
        return Promise.reject(
          new Error(`Invalid input: ${error.errors.map((e) => e.message).join(', ')}`)
        );
      }
      addLog.error(`Upload failed:`, error);
      return Promise.reject(error);
    }
  }

  // ================================
  // 2.5 多种输入方式文件处理
  // ================================

  private async handleNetworkFile(input: FileInput): Promise<{ buffer: Buffer; filename: string }> {
    const response = await fetch(input.url!);
    if (!response.ok)
      return Promise.reject(
        new Error(`Download failed: ${response.status} ${response.statusText}`)
      );

    const buffer = Buffer.from(await response.arrayBuffer());
    const filename = (() => {
      if (input.filename) return input.filename;

      const urlFilename = path.basename(new URL(input.url!).pathname) || 'downloaded_file';

      // 如果文件名没有扩展名，使用默认扩展名
      if (!path.extname(urlFilename)) {
        return urlFilename + '.bin'; // 默认扩展名
      }

      return urlFilename;
    })();

    return { buffer, filename };
  }

  private async handleLocalFile(input: FileInput): Promise<{ buffer: Buffer; filename: string }> {
    if (!fs.existsSync(input.path!))
      return Promise.reject(new Error(`File not found: ${input.path}`));

    const buffer = await fs.promises.readFile(input.path!);
    const filename = input.filename || path.basename(input.path!);

    return { buffer, filename };
  }

  private handleBase64File(input: FileInput): {
    buffer: Buffer;
    filename: string;
  } {
    const base64Data = (() => {
      const data = input.data!;
      return data.includes(',') ? data.split(',')[1] : data; // Remove data URL prefix if present
    })();

    return {
      buffer: Buffer.from(base64Data, 'base64'),
      filename: input.filename!
    };
  }

  private handleBufferFile(input: FileInput): {
    buffer: Buffer;
    filename: string;
  } {
    return { buffer: input.buffer!, filename: input.filename! };
  }
}
