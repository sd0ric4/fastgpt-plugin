import * as Minio from 'minio';
import { randomBytes } from 'crypto';
import {
  defaultFileConfig,
  type FileConfig,
  type FileMetadata,
  getRetentionMilliseconds
} from './config';
import { addLog } from '@/utils/log';
import * as fs from 'fs';
import * as path from 'path';
import { z } from 'zod';

// 从 upload.ts 移过来的类型定义
export const FileInputSchema = z
  .object({
    // 网络文件输入
    url: z.string().url('Invalid URL format').optional(),

    // 本地文件输入
    path: z.string().min(1, 'File path cannot be empty').optional(),

    // Base64 文件输入
    data: z.string().min(1, 'Base64 data cannot be empty').optional(),

    // Buffer 文件输入
    buffer: z.instanceof(Buffer, { message: 'Buffer is required' }).optional(),

    // 通用字段
    filename: z.string().optional(),
    contentType: z.string().optional()
  })
  .refine(
    (data) => {
      // 确保只有一种输入方式被使用
      const inputMethods = [data.url, data.path, data.data, data.buffer].filter(Boolean);
      return inputMethods.length === 1;
    },
    {
      message: 'Exactly one input method must be provided: url, path, data, or buffer'
    }
  )
  .refine(
    (data) => {
      // 对于 base64 和 buffer 输入，filename 是必需的
      if ((data.data || data.buffer) && !data.filename) {
        return false;
      }
      return true;
    },
    {
      message: 'Filename is required for base64 and buffer inputs'
    }
  );

export type FileInput = z.infer<typeof FileInputSchema>;

export class FileService {
  private minioClient: Minio.Client;
  private config: FileConfig;
  private initPromise: Promise<void>;
  private isInitialized = false;

  constructor(config?: Partial<FileConfig>) {
    this.config = { ...defaultFileConfig, ...config };

    addLog.info(`Initializing MinIO client: ${this.config.endpoint}:${this.config.port}`);

    // 创建 MinIO 客户端
    this.minioClient = new Minio.Client({
      endPoint: this.config.endpoint,
      port: this.config.port,
      useSSL: this.config.useSSL,
      accessKey: this.config.accessKey,
      secretKey: this.config.secretKey
    });

    // 异步初始化，不阻塞构造函数
    this.initPromise = this.initialize();
  }

  private async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

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

  // 确保服务已初始化的辅助方法
  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initPromise;
    }
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
      addLog.info(`Setting bucket ${this.config.bucket} policies...`);

      // 设置公共读取策略：允许所有人访问文件（通过 Content-Disposition 确保下载而不是预览）
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
      addLog.info(`Successfully set bucket ${this.config.bucket} to public read access`);

      // 设置生命周期策略：自动删除过期文件
      await this.setBucketLifecycle();
    } catch (error) {
      addLog.warn(
        `Failed to set bucket policies: ${error instanceof Error ? error.message : String(error)}`
      );
      addLog.warn('Files may not be directly accessible or auto-delete may not work');
      // 不抛出错误，因为这不是致命错误
    }
  }

  private async setBucketLifecycle() {
    try {
      // MinIO 生命周期配置 - 使用 JSON 格式
      const lifecycleConfig = {
        Rule: [
          {
            ID: 'AutoDeleteRule',
            Status: 'Enabled',
            Expiration: {
              Days: this.config.retentionDays
            }
          }
        ]
      };

      await this.minioClient.setBucketLifecycle(this.config.bucket, lifecycleConfig);
      addLog.info(
        `Successfully set bucket ${this.config.bucket} lifecycle policy (${this.config.retentionDays} days)`
      );
    } catch (error) {
      addLog.warn(
        `Failed to set bucket lifecycle policy: ${error instanceof Error ? error.message : String(error)}`
      );
      addLog.warn('Auto-delete may not work, files need to be manually cleaned up');
      // 继续执行，不抛出错误
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
    // 确保服务已初始化
    await this.ensureInitialized();

    // 检查文件大小
    if (fileBuffer.length > this.config.maxFileSize) {
      throw new Error(`File size ${fileBuffer.length} exceeds limit ${this.config.maxFileSize}`);
    }

    const fileId = this.generateFileId();
    const objectName = `${fileId}/${originalFilename}`; // 使用 uuid/filename 格式

    const uploadTime = new Date();
    // 计算预计过期时间（仅用于返回，实际过期由存储桶生命周期策略管理）
    const expiresAt = new Date(
      uploadTime.getTime() + getRetentionMilliseconds(this.config.retentionDays)
    );

    // 对于安全风险较高的文件类型，强制设置为 application/octet-stream
    const safeContentType = this.getSafeContentType(contentType);

    try {
      // 上传到 MinIO，设置强制下载的元数据
      await this.minioClient.putObject(
        this.config.bucket,
        objectName,
        fileBuffer,
        fileBuffer.length,
        {
          'Content-Type': safeContentType,
          'Content-Disposition': `attachment; filename="${encodeURIComponent(originalFilename)}"`,
          'x-amz-meta-original-filename': encodeURIComponent(originalFilename),
          'x-amz-meta-upload-time': uploadTime.toISOString(),
          'x-amz-meta-original-content-type': contentType || 'application/octet-stream'
        }
      );

      const metadata: FileMetadata = {
        fileId,
        originalFilename,
        contentType: contentType || 'application/octet-stream',
        size: fileBuffer.length,
        uploadTime,
        expiresAt, // 仅用于返回预计过期时间，实际由存储桶策略管理
        accessUrl: this.generateAccessUrl(fileId, originalFilename)
      };

      addLog.info(`File uploaded successfully: ${fileId}`);
      return metadata;
    } catch (error) {
      addLog.error('Failed to upload file:', error);
      throw error;
    }
  }

  /**
   * 统一的文件上传方法 - 支持多种输入方式
   * 支持网络链接、本地文件、base64 和 buffer 四种输入方式
   */
  async uploadFileAdvanced(input: FileInput): Promise<FileMetadata> {
    // 验证输入参数
    const validatedInput = FileInputSchema.parse(input);

    try {
      // 根据不同的输入字段确定类型并处理
      const { buffer, filename, contentType } = await (async () => {
        if (validatedInput.url) {
          return await this.handleNetworkFile(validatedInput);
        } else if (validatedInput.path) {
          return await this.handleLocalFile(validatedInput);
        } else if (validatedInput.data) {
          return this.handleBase64File(validatedInput);
        } else if (validatedInput.buffer) {
          return this.handleBufferFile(validatedInput);
        } else {
          throw new Error('No valid input method provided');
        }
      })();

      // 调用基础的上传方法
      const metadata = await this.uploadFile(buffer, filename, contentType);

      const inputType = validatedInput.url
        ? 'network'
        : validatedInput.path
          ? 'local'
          : validatedInput.data
            ? 'base64'
            : 'buffer';

      addLog.info(`File uploaded successfully via ${inputType}: ${filename} -> ${metadata.fileId}`);

      return metadata;
    } catch (error) {
      if (error instanceof z.ZodError) {
        addLog.error(`Validation error in uploadFileAdvanced:`, error.errors);
        throw new Error(
          `Invalid input parameters: ${error.errors.map((e) => e.message).join(', ')}`
        );
      }

      const inputType = validatedInput.url
        ? 'network'
        : validatedInput.path
          ? 'local'
          : validatedInput.data
            ? 'base64'
            : validatedInput.buffer
              ? 'buffer'
              : 'unknown';

      addLog.error(`Failed to upload file via ${inputType}:`, error);
      throw error;
    }
  }

  /**
   * 处理网络文件
   */
  private async handleNetworkFile(input: FileInput): Promise<{
    buffer: Buffer;
    filename: string;
    contentType?: string;
  }> {
    /**
     * 根据 Content-Type 获取文件扩展名
     */
    function getExtensionFromContentType(contentType: string): string | null {
      const mimeMap: Record<string, string> = {
        'image/jpeg': '.jpg',
        'image/jpg': '.jpg',
        'image/png': '.png',
        'image/gif': '.gif',
        'image/webp': '.webp',
        'image/svg+xml': '.svg',
        'application/pdf': '.pdf',
        'text/plain': '.txt',
        'application/json': '.json',
        'text/csv': '.csv',
        'application/zip': '.zip',
        'application/x-zip-compressed': '.zip',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
        'application/msword': '.doc',
        'application/vnd.ms-excel': '.xls',
        'application/vnd.ms-powerpoint': '.ppt'
      };

      return mimeMap[contentType.toLowerCase()] || null;
    }

    addLog.info(`Downloading file from network: ${input.url}`);

    if (!input.url) {
      throw new Error('URL is required for network file input');
    }

    const response = await fetch(input.url);
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.status} ${response.statusText}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());

    // 提取文件名
    let filename = input.filename;
    if (!filename) {
      // 从 URL 中提取文件名
      const urlPath = new URL(input.url).pathname;
      filename = path.basename(urlPath) || 'downloaded_file';

      // 如果还是没有扩展名，尝试从 Content-Type 推断
      if (!path.extname(filename)) {
        const contentType = response.headers.get('content-type');
        if (contentType) {
          const ext = getExtensionFromContentType(contentType);
          if (ext) {
            filename += ext;
          }
        }
      }
    }

    const contentType = response.headers.get('content-type') || undefined;

    return { buffer, filename, contentType };
  }

  /**
   * 处理本地文件
   */
  private async handleLocalFile(input: FileInput): Promise<{
    buffer: Buffer;
    filename: string;
    contentType?: string;
  }> {
    /**
     * 根据文件扩展名获取 Content-Type
     */
    function getContentTypeFromExtension(extension: string): string | undefined {
      const extMap: Record<string, string> = {
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

      return extMap[extension.toLowerCase()];
    }

    addLog.info(`Reading local file: ${input.path}`);

    if (!input.path) {
      throw new Error('Path is required for local file input');
    }

    if (!fs.existsSync(input.path)) {
      throw new Error(`Local file not found: ${input.path}`);
    }

    const buffer = await fs.promises.readFile(input.path);
    const filename = input.filename || path.basename(input.path);

    // 根据文件扩展名推断 Content-Type
    const contentType = getContentTypeFromExtension(path.extname(filename));

    return { buffer, filename, contentType };
  }

  /**
   * 处理 Base64 文件
   */
  private handleBase64File(input: FileInput): {
    buffer: Buffer;
    filename: string;
    contentType?: string;
  } {
    addLog.info(`Processing base64 file: ${input.filename}`);

    if (!input.data) {
      throw new Error('Base64 data is required for base64 file input');
    }

    if (!input.filename) {
      throw new Error('Filename is required for base64 file input');
    }

    // 处理可能包含 data URL 前缀的 base64 字符串
    let base64Data = input.data;
    if (base64Data.includes(',')) {
      // 移除 data:image/png;base64, 这样的前缀
      base64Data = base64Data.split(',')[1];
    }

    const buffer = Buffer.from(base64Data, 'base64');

    return {
      buffer,
      filename: input.filename,
      contentType: input.contentType
    };
  }

  /**
   * 处理 Buffer 文件
   */
  private handleBufferFile(input: FileInput): {
    buffer: Buffer;
    filename: string;
    contentType?: string;
  } {
    addLog.info(`Processing buffer file: ${input.filename}`);

    if (!input.buffer) {
      throw new Error('Buffer is required for buffer file input');
    }

    if (!input.filename) {
      throw new Error('Filename is required for buffer file input');
    }

    return {
      buffer: input.buffer,
      filename: input.filename,
      contentType: input.contentType
    };
  }

  /**
   * 手动设置存储桶为公共可读（用于故障排除）
   */
  async setBucketPublic(): Promise<void> {
    await this.ensureInitialized();

    try {
      // 设置最简单的公共读取策略
      const policy = {
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

      await this.minioClient.setBucketPolicy(this.config.bucket, JSON.stringify(policy));
      addLog.info(`Successfully set bucket ${this.config.bucket} to public read access`);
    } catch (error) {
      addLog.error(`Failed to set bucket public access: ${error}`);
      throw error;
    }
  }

  /**
   * 获取安全的 Content-Type，强制设置为 application/octet-stream 以确保所有文件都下载而不预览
   */
  private getSafeContentType(contentType?: string): string {
    // 为了安全起见，所有文件都强制设置为 application/octet-stream
    // 这样确保：
    // 1. 所有文件都会被下载而不是在浏览器中预览
    // 2. 避免任何可能的 XSS 或代码执行风险
    // 3. 统一的安全策略，简单可靠

    if (contentType && contentType !== 'application/octet-stream') {
      addLog.info(
        `Converting content type ${contentType} to application/octet-stream for security`
      );
    }

    return 'application/octet-stream';
  }

  // 静态方法：为 worker 创建独立的实例
  static createForWorker(config?: Partial<FileConfig>): FileService {
    return new FileService(config);
  }

  // 静态方法：获取默认配置（用于 worker 间配置传递）
  static getDefaultConfig(): FileConfig {
    return { ...defaultFileConfig };
  }

  // 获取当前实例的配置（用于传递给 worker）
  getConfig(): FileConfig {
    return { ...this.config };
  }
}
