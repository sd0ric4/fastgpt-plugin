import * as Minio from 'minio';
import { randomBytes } from 'crypto';
import {
  defaultFileConfig,
  type FileConfig,
  type FileMetadata,
  getRetentionMilliseconds
} from './config';
import { addLog } from '@/utils/log';

export class FileService {
  private minioClient: Minio.Client;
  private config: FileConfig;
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

    this.testConnection()
      .then(() => {
        this.initBucket();
      })
      .catch((error) => {
        addLog.error('MinIO connection test failed:', error);
      });
  }

  private async testConnection(): Promise<void> {
    try {
      addLog.info(
        `Testing MinIO connection to ${this.config.endpoint}:${this.config.port} (SSL: ${this.config.useSSL})`
      );
      addLog.info(`Using bucket: ${this.config.bucket}`);

      const buckets = await this.minioClient.listBuckets();
      addLog.info(`MinIO connection successful. Found ${buckets.length} buckets`);

      // 列出找到的存储桶
      if (buckets.length > 0) {
        const bucketNames = buckets.map((b) => b.name).join(', ');
        addLog.info(`Available buckets: ${bucketNames}`);
      }
    } catch (error) {
      addLog.error('MinIO connection failed:', {
        endpoint: this.config.endpoint,
        port: this.config.port,
        useSSL: this.config.useSSL,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      // 提供更多诊断信息
      if (error instanceof Error) {
        if (error.message.includes('socket connection was closed')) {
          addLog.error('Network connection issue - please check:');
          addLog.error('1. MinIO server is running and accessible');
          addLog.error('2. Endpoint and port are correct');
          addLog.error('3. Firewall/network permissions');
          addLog.error(
            `4. Try: curl http://${this.config.endpoint}:${this.config.port}/minio/health/live`
          );
        } else if (error.message.includes('ECONNREFUSED')) {
          addLog.error(
            'Connection refused - MinIO server may not be running on the specified port'
          );
        } else if (error.message.includes('ENOTFOUND')) {
          addLog.error('DNS resolution failed - check if the endpoint is correct');
        }
      }

      throw new Error(
        `MinIO connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private async initBucket() {
    try {
      addLog.info(`Checking bucket: ${this.config.bucket}`);
      const bucketExists = await this.minioClient.bucketExists(this.config.bucket);
      if (!bucketExists) {
        addLog.info(`Bucket ${this.config.bucket} does not exist, attempting to create...`);
        await this.minioClient.makeBucket(this.config.bucket);
        addLog.info(`Created bucket: ${this.config.bucket}`);
      } else {
        addLog.info(`Bucket ${this.config.bucket} already exists`);
      }

      // 设置存储桶为仅允许下载（非预览）
      await this.setBucketDownloadOnly();
    } catch (error) {
      addLog.error('Failed to initialize bucket:', error);
      addLog.error(
        `MinIO Config: endpoint=${this.config.endpoint}, port=${this.config.port}, bucket=${this.config.bucket}`
      );

      // 如果是 MethodNotAllowed 错误，可能是存储桶已存在但权限不足
      if (error instanceof Error && error.message.includes('Method Not Allowed')) {
        addLog.warn(
          'Method Not Allowed - this might indicate the bucket exists but with different permissions, or the MinIO server has restrictions'
        );
        // 不抛出错误，假设存储桶存在
        return;
      }

      throw error;
    }
  }

  private async setBucketDownloadOnly() {
    try {
      addLog.info(`Setting bucket ${this.config.bucket} to download-only access...`);

      // 下载专用策略：允许 GetObject 但通过 Content-Disposition 强制下载
      const policy = {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: '*',
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${this.config.bucket}/*`],
            Condition: {
              StringLike: {
                's3:ResponseContentDisposition': 'attachment*'
              }
            }
          }
        ]
      };

      await this.minioClient.setBucketPolicy(this.config.bucket, JSON.stringify(policy));
      addLog.info(`Successfully set bucket ${this.config.bucket} to download-only access`);
    } catch (error) {
      addLog.warn(
        `Failed to set bucket download-only policy: ${error instanceof Error ? error.message : String(error)}`
      );
      addLog.warn('Files may not be directly accessible');
      // 不抛出错误，因为这不是致命错误
    }
  }

  private generateFileId(): string {
    return randomBytes(16).toString('hex');
  }

  private generateAccessUrl(fileId: string, filename: string): string {
    // 生成 MinIO/S3 的直接访问 URL，格式：bucket/uuid/filename
    const protocol = this.config.useSSL ? 'https' : 'http';
    const port =
      this.config.port && this.config.port !== (this.config.useSSL ? 443 : 80)
        ? `:${this.config.port}`
        : '';

    return `${protocol}://${this.config.endpoint}${port}/${this.config.bucket}/${fileId}/${encodeURIComponent(filename)}`;
  }

  async uploadFile(
    fileBuffer: Buffer,
    originalFilename: string,
    contentType?: string
  ): Promise<FileMetadata> {
    // 检查文件大小
    if (fileBuffer.length > this.config.maxFileSize) {
      throw new Error(`File size ${fileBuffer.length} exceeds limit ${this.config.maxFileSize}`);
    }

    const fileId = this.generateFileId();
    const objectName = `${fileId}/${originalFilename}`; // 使用 uuid/filename 格式

    const uploadTime = new Date();
    const expiresAt = new Date(
      uploadTime.getTime() + getRetentionMilliseconds(this.config.retentionDays)
    );

    try {
      // 上传到 MinIO
      await this.minioClient.putObject(
        this.config.bucket,
        objectName,
        fileBuffer,
        fileBuffer.length,
        {
          'Content-Type': contentType || 'application/octet-stream',
          'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(originalFilename)}`,
          'x-amz-meta-original-filename': encodeURIComponent(originalFilename),
          'x-amz-meta-upload-time': uploadTime.toISOString(),
          'x-amz-meta-expires-at': expiresAt.toISOString()
        }
      );

      const metadata: FileMetadata = {
        fileId,
        originalFilename,
        contentType: contentType || 'application/octet-stream',
        size: fileBuffer.length,
        uploadTime,
        expiresAt,
        accessUrl: this.generateAccessUrl(fileId, originalFilename)
      };

      addLog.info(`File uploaded successfully: ${fileId}`);
      return metadata;
    } catch (error) {
      addLog.error('Failed to upload file:', error);
      throw error;
    }
  }

  async downloadFile(fileId: string): Promise<{
    buffer: Buffer;
    metadata: FileMetadata;
  }> {
    try {
      // 首先获取文件信息
      const metadata = await this.getFileInfo(fileId);

      const objectName = `${fileId}/${metadata.originalFilename}`;

      const stream = await this.minioClient.getObject(this.config.bucket, objectName);
      const chunks: Buffer[] = [];

      return new Promise((resolve, reject) => {
        stream.on('data', (chunk) => chunks.push(chunk));
        stream.on('end', () => {
          const buffer = Buffer.concat(chunks);
          resolve({ buffer, metadata });
        });
        stream.on('error', reject);
      });
    } catch (error) {
      addLog.error(`Failed to download file ${fileId}:`, error);
      throw error;
    }
  }

  async getFileInfo(fileId: string): Promise<FileMetadata> {
    try {
      // 首先尝试列出以 fileId 开头的对象来找到正确的文件
      const objectsList = this.minioClient.listObjects(this.config.bucket, fileId, false);
      let foundObject: any = null;

      for await (const obj of objectsList) {
        if (obj.name && obj.name.startsWith(fileId)) {
          foundObject = obj;
          break;
        }
      }

      if (!foundObject) {
        throw new Error(`File not found: ${fileId}`);
      }

      // 获取对象的详细信息和元数据
      const stat = await this.minioClient.statObject(this.config.bucket, foundObject.name);

      // 从 MinIO 元数据中解析信息
      const encodedFilename = stat.metaData['x-amz-meta-original-filename'] || 'unknown';
      const originalFilename =
        encodedFilename === 'unknown' ? 'unknown' : decodeURIComponent(encodedFilename);
      const uploadTime = new Date(stat.metaData['x-amz-meta-upload-time'] || stat.lastModified);
      const expiresAt = new Date(
        stat.metaData['x-amz-meta-expires-at'] ||
          Date.now() + getRetentionMilliseconds(this.config.retentionDays)
      );
      const contentType = stat.metaData['content-type'] || 'application/octet-stream';

      // 检查是否过期
      if (expiresAt <= new Date()) {
        await this.minioClient.removeObject(this.config.bucket, foundObject.name);
        throw new Error(`File expired: ${fileId}`);
      }

      const metadata: FileMetadata = {
        fileId,
        originalFilename,
        contentType,
        size: stat.size,
        uploadTime,
        expiresAt,
        accessUrl: this.generateAccessUrl(fileId, originalFilename)
      };

      return metadata;
    } catch (error) {
      if (error instanceof Error && error.message.includes('File expired')) {
        throw error;
      }
      addLog.error(`Failed to get file info for ${fileId}:`, error);
      throw new Error(`File not found: ${fileId}`);
    }
  }

  async deleteFile(fileId: string): Promise<void> {
    try {
      // 列出以 fileId 开头的对象来找到正确的文件
      const objectsList = this.minioClient.listObjects(this.config.bucket, fileId, false);
      let foundObject: any = null;

      for await (const obj of objectsList) {
        if (obj.name && obj.name.startsWith(fileId)) {
          foundObject = obj;
          break;
        }
      }

      if (!foundObject) {
        addLog.info(`File ${fileId} not found, assuming already deleted`);
        return;
      }

      await this.minioClient.removeObject(this.config.bucket, foundObject.name);

      addLog.info(`File deleted successfully: ${fileId}`);
    } catch (error) {
      addLog.error(`Failed to delete file ${fileId}:`, error);
      throw error;
    }
  }
}

// 单例实例
export const fileService = new FileService();
