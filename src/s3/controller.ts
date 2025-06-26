import * as Minio from 'minio';
import { randomBytes } from 'crypto';
import { defaultFileConfig, type FileConfig, type FileMetadata } from './config';
import * as fs from 'fs';
import * as path from 'path';
import { z } from 'zod';

export const FileInputSchema = z
  .object({
    url: z.string().url('Invalid URL format').optional(),
    path: z.string().min(1, 'File path cannot be empty').optional(),
    base64: z.string().min(1, 'Base64 data cannot be empty').optional(),
    buffer: z.instanceof(Buffer, { message: 'Buffer is required' }).optional(),
    defaultFilename: z.string().optional()
  })
  .refine(
    (data) => {
      const inputMethods = [data.url, data.path, data.base64, data.buffer].filter(Boolean);
      return inputMethods.length === 1 && (!(data.base64 || data.buffer) || data.defaultFilename);
    },
    {
      message: 'Provide exactly one input method. Filename required for base64/buffer inputs.'
    }
  );
export type FileInput = z.infer<typeof FileInputSchema>;

type GetUploadBufferResponse = { buffer: Buffer; filename: string };

export class S3Service {
  private minioClient: Minio.Client;
  private config: FileConfig;

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

  private generateFileId(): string {
    return randomBytes(16).toString('hex');
  }

  private generateAccessUrl(filename: string): string {
    const protocol = this.config.useSSL ? 'https' : 'http';
    const port =
      this.config.port && this.config.port !== (this.config.useSSL ? 443 : 80)
        ? `:${this.config.port}`
        : '';
    return `${protocol}://${this.config.endpoint}${port}/${this.config.bucket}/${encodeURIComponent(filename)}`;
  }

  async uploadFileAdvanced(input: FileInput): Promise<FileMetadata> {
    const handleNetworkFile = async (input: FileInput): Promise<GetUploadBufferResponse> => {
      const response = await fetch(input.url!);
      if (!response.ok)
        return Promise.reject(
          new Error(`Download failed: ${response.status} ${response.statusText}`)
        );

      const buffer = Buffer.from(await response.arrayBuffer());
      const filename = (() => {
        const urlFilename = (() => {
          const contentDisposition = response.headers.get('content-disposition');
          if (contentDisposition) {
            // 处理 RFC 5987 格式: filename*=UTF-8''filename 或标准格式: filename="filename"
            const filenameRegex = /filename\*?=(?:UTF-8'')?(['"]?)([^'"\s;]+)\1/i;
            const matches = filenameRegex.exec(contentDisposition);
            if (matches != null && matches[2]) {
              return decodeURIComponent(matches[2]);
            }
          }

          return path.basename(new URL(input.url!).pathname) || 'network_file';
        })();

        // 如果文件名没有扩展名，使用默认扩展名
        if (!path.extname(urlFilename)) {
          return urlFilename + '.bin'; // 默认扩展名
        }

        return urlFilename;
      })();

      return { buffer, filename };
    };
    const handleLocalFile = async (input: FileInput): Promise<GetUploadBufferResponse> => {
      if (!fs.existsSync(input.path!))
        return Promise.reject(new Error(`File not found: ${input.path}`));

      const buffer = await fs.promises.readFile(input.path!);
      const filename = input.defaultFilename || path.basename(input.path!);

      return { buffer, filename };
    };
    const handleBase64File = (input: FileInput): GetUploadBufferResponse => {
      const base64Data = (() => {
        const data = input.base64!;
        return data.includes(',') ? data.split(',')[1] : data; // Remove data URL prefix if present
      })();

      return {
        buffer: Buffer.from(base64Data, 'base64'),
        filename: input.defaultFilename!
      };
    };
    const handleBufferFile = (input: FileInput): GetUploadBufferResponse => {
      return { buffer: input.buffer!, filename: input.defaultFilename! };
    };
    const uploadFile = async (
      fileBuffer: Buffer,
      originalFilename: string
    ): Promise<FileMetadata> => {
      const inferContentType = (filename: string) => {
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
      };

      if (fileBuffer.length > this.config.maxFileSize) {
        return Promise.reject(
          `File size ${fileBuffer.length} exceeds limit ${this.config.maxFileSize}`
        );
      }

      const fileId = this.generateFileId();
      const objectName = `${fileId}-${originalFilename}`;
      const uploadTime = new Date();

      const contentType = inferContentType(originalFilename);
      await this.minioClient.putObject(
        this.config.bucket,
        objectName,
        fileBuffer,
        fileBuffer.length,
        {
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="${encodeURIComponent(originalFilename)}"`,
          'x-amz-meta-original-filename': encodeURIComponent(originalFilename),
          'x-amz-meta-upload-time': uploadTime.toISOString()
        }
      );

      const metadata: FileMetadata = {
        fileId,
        originalFilename,
        contentType,
        size: fileBuffer.length,
        uploadTime,
        accessUrl: this.generateAccessUrl(objectName)
      };

      return metadata;
    };

    const validatedInput = FileInputSchema.parse(input);

    const { buffer, filename } = await (() => {
      if (validatedInput.url) return handleNetworkFile(validatedInput);
      if (validatedInput.path) return handleLocalFile(validatedInput);
      if (validatedInput.base64) return handleBase64File(validatedInput);
      if (validatedInput.buffer) return handleBufferFile(validatedInput);
      return Promise.reject('No valid input method provided');
    })();

    return await uploadFile(buffer, filename);
  }
}
