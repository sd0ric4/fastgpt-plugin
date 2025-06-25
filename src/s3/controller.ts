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
  private initPromise: Promise<void>;
  private isInitialized = false;

  // ================================
  // 2.1 初始化相关
  // ================================

  constructor(config?: Partial<FileConfig>) {
    this.config = { ...defaultFileConfig, ...config };
    addLog.info(`Initializing MinIO client: ${this.config.endpoint}:${this.config.port}`);

    this.minioClient = new Minio.Client({
      endPoint: this.config.endpoint,
      port: this.config.port,
      useSSL: this.config.useSSL,
      accessKey: this.config.accessKey,
      secretKey: this.config.secretKey
    });

    this.initPromise = this.initialize();
  }

  private async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await this.testConnection();
      await this.initBucket();
      this.isInitialized = true;
      addLog.info('FileService initialized successfully');
    } catch (error) {
      addLog.error('FileService initialization failed:', error);
      throw error;
    }
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initPromise;
    }
  }

  // ================================
  // 2.2 连接和存储桶管理
  // ================================

  private async testConnection(): Promise<void> {
    try {
      addLog.info(
        `Testing MinIO connection to ${this.config.endpoint}:${this.config.port} (SSL: ${this.config.useSSL})`
      );
      const buckets = await this.minioClient.listBuckets();
      addLog.info(
        `MinIO connection successful. Found ${buckets.length} buckets${buckets.length ? ': ' + buckets.map((b) => b.name).join(', ') : ''}`
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      addLog.error('MinIO connection failed:', {
        endpoint: this.config.endpoint,
        port: this.config.port,
        useSSL: this.config.useSSL,
        error: message
      });

      if (error instanceof Error) {
        const errorHints = {
          'socket connection was closed': [
            'MinIO server running?',
            'Correct endpoint/port?',
            'Network/firewall OK?',
            `Try: curl http://${this.config.endpoint}:${this.config.port}/minio/health/live`
          ],
          ECONNREFUSED: ['MinIO server not running on specified port'],
          ENOTFOUND: ['DNS resolution failed - check endpoint']
        };

        for (const [key, hints] of Object.entries(errorHints)) {
          if (message.includes(key)) {
            hints.forEach((hint, i) => addLog.error(`${i + 1}. ${hint}`));
            break;
          }
        }
      }

      throw new Error(`MinIO connection failed: ${message}`);
    }
  }

  private async initBucket() {
    try {
      addLog.info(`Checking bucket: ${this.config.bucket}`);
      const bucketExists = await this.minioClient.bucketExists(this.config.bucket);
      if (!bucketExists) {
        addLog.info(`Creating bucket: ${this.config.bucket}`);
        await this.minioClient.makeBucket(this.config.bucket);
      }
      await this.setBucketDownloadOnly();
    } catch (error) {
      addLog.error('Failed to initialize bucket:', error);
      if (error instanceof Error && error.message.includes('Method Not Allowed')) {
        addLog.warn('Method Not Allowed - bucket may exist with different permissions');
        return;
      }
      throw error;
    }
  }

  private async setBucketDownloadOnly() {
    try {
      const accessPolicy = {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: '*',
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${this.config.bucket}/*`]
          }
        ]
      };
      await this.minioClient.setBucketPolicy(this.config.bucket, JSON.stringify(accessPolicy));
      await this.setBucketLifecycle();
      addLog.info(`Bucket ${this.config.bucket} policies set successfully`);
    } catch (error) {
      addLog.warn(
        `Failed to set bucket policies: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private async setBucketLifecycle() {
    try {
      const lifecycleConfig: Minio.LifecycleConfig = {
        Rule: [
          {
            ID: 'AutoDeleteRule',
            Status: 'Enabled',
            Expiration: {
              Days: this.config.retentionDays,
              DeleteMarker: false,
              DeleteAll: false
            }
          }
        ]
      };
      await this.minioClient.setBucketLifecycle(this.config.bucket, lifecycleConfig);
      addLog.info(`Lifecycle policy set: ${this.config.retentionDays} days retention`);
    } catch (error) {
      addLog.warn(
        `Failed to set lifecycle policy: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

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
    await this.ensureInitialized();

    if (fileBuffer.length > this.config.maxFileSize) {
      throw new Error(`File size ${fileBuffer.length} exceeds limit ${this.config.maxFileSize}`);
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

      addLog.info(`File uploaded successfully: ${fileId}`);
      return metadata;
    } catch (error) {
      addLog.error('Failed to upload file:', error);
      throw error;
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
        throw new Error('No valid input method provided');
      })();

      const metadata = await this.uploadFile(buffer, filename);
      const inputType = validatedInput.url
        ? 'network'
        : validatedInput.path
          ? 'local'
          : validatedInput.data
            ? 'base64'
            : 'buffer';
      addLog.info(`File uploaded via ${inputType}: ${filename} -> ${metadata.fileId}`);
      return metadata;
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`Invalid input: ${error.errors.map((e) => e.message).join(', ')}`);
      }
      addLog.error(`Upload failed:`, error);
      throw error;
    }
  }

  // ================================
  // 2.5 多种输入方式文件处理
  // ================================

  private async handleNetworkFile(input: FileInput): Promise<{ buffer: Buffer; filename: string }> {
    addLog.info(`Downloading: ${input.url}`);
    const response = await fetch(input.url!);
    if (!response.ok) throw new Error(`Download failed: ${response.status} ${response.statusText}`);

    const buffer = Buffer.from(await response.arrayBuffer());
    let filename = input.filename;

    if (!filename) {
      filename = path.basename(new URL(input.url!).pathname) || 'downloaded_file';

      // 如果文件名没有扩展名，使用默认扩展名
      if (!path.extname(filename)) {
        filename += '.bin'; // 默认扩展名
      }
    }

    return { buffer, filename };
  }

  private async handleLocalFile(input: FileInput): Promise<{ buffer: Buffer; filename: string }> {
    addLog.info(`Reading local file: ${input.path}`);
    if (!fs.existsSync(input.path!)) throw new Error(`File not found: ${input.path}`);

    const buffer = await fs.promises.readFile(input.path!);
    const filename = input.filename || path.basename(input.path!);

    return { buffer, filename };
  }

  private handleBase64File(input: FileInput): {
    buffer: Buffer;
    filename: string;
  } {
    addLog.info(`Processing base64 file: ${input.filename}`);
    let base64Data = input.data!;
    if (base64Data.includes(',')) base64Data = base64Data.split(',')[1]; // Remove data URL prefix

    return {
      buffer: Buffer.from(base64Data, 'base64'),
      filename: input.filename!
    };
  }

  private handleBufferFile(input: FileInput): {
    buffer: Buffer;
    filename: string;
  } {
    addLog.info(`Processing buffer file: ${input.filename}`);
    return { buffer: input.buffer!, filename: input.filename! };
  }

  // ================================
  // 2.6 静态方法和实例管理
  // ================================

  static createForWorker(config?: Partial<FileConfig>): FileService {
    return new FileService(config);
  }
  static getDefaultConfig(): FileConfig {
    return { ...defaultFileConfig };
  }
  getConfig(): FileConfig {
    return { ...this.config };
  }
}

// ================================
// 3. 单例实例和便捷导出
// ================================

// 创建默认的文件服务实例
export const fileService = new FileService();

// 便捷的上传函数 - 直接使用默认实例
export async function uploadFile(input: FileInput): Promise<FileMetadata> {
  return await fileService.uploadFileAdvanced(input);
}

// 便捷的基础上传函数
export async function uploadFileBuffer(
  fileBuffer: Buffer,
  filename: string
): Promise<FileMetadata> {
  return await fileService.uploadFile(fileBuffer, filename);
}
