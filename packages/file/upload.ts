import { fileService } from './service';
import { getCurrentFileConfig } from './config';
import { addLog } from '@/utils/log';
import * as fs from 'fs';
import * as path from 'path';
import { z } from 'zod';

// 动态获取文件大小限制
const getMaxFileSize = () => getCurrentFileConfig().maxFileSize;

// Zod schemas for validation
export const UploadResultSchema = z.object({
  url: z.string().url(),
  fileId: z.string(),
  originalFilename: z.string(),
  size: z
    .number()
    .positive()
    .refine((size) => size <= getMaxFileSize(), {
      message: `File size must not exceed ${getMaxFileSize() / (1024 * 1024)}MB`
    }),
  contentType: z.string()
});

export const NetworkFileInputSchema = z.object({
  type: z.literal('network'),
  url: z.string().url('Invalid URL format'),
  filename: z.string().optional()
});

export const LocalFileInputSchema = z.object({
  type: z.literal('local'),
  path: z.string().min(1, 'File path cannot be empty'),
  filename: z.string().optional()
});

export const Base64FileInputSchema = z.object({
  type: z.literal('base64'),
  data: z.string().min(1, 'Base64 data cannot be empty'),
  filename: z.string().min(1, 'Filename is required for base64 input'),
  contentType: z.string().optional()
});

export const BufferFileInputSchema = z.object({
  type: z.literal('buffer'),
  buffer: z.instanceof(Buffer, { message: 'Buffer is required' }),
  filename: z.string().min(1, 'Filename is required for buffer input'),
  contentType: z.string().optional()
});

export const FileInputSchema = z.discriminatedUnion('type', [
  NetworkFileInputSchema,
  LocalFileInputSchema,
  Base64FileInputSchema,
  BufferFileInputSchema
]);

// Type inference from schemas
export type UploadResult = z.infer<typeof UploadResultSchema>;
export type NetworkFileInput = z.infer<typeof NetworkFileInputSchema>;
export type LocalFileInput = z.infer<typeof LocalFileInputSchema>;
export type Base64FileInput = z.infer<typeof Base64FileInputSchema>;
export type BufferFileInput = z.infer<typeof BufferFileInputSchema>;
export type FileInput = z.infer<typeof FileInputSchema>;

/**
 * 统一的文件上传函数
 * 支持网络链接、本地文件、base64 和 buffer 四种输入方式
 */
export async function uploadFile(input: FileInput): Promise<UploadResult> {
  // 验证输入参数
  const validatedInput = FileInputSchema.parse(input);

  let buffer: Buffer;
  let filename: string;
  let contentType: string | undefined;

  try {
    switch (validatedInput.type) {
      case 'network':
        ({ buffer, filename, contentType } = await handleNetworkFile(validatedInput));
        break;

      case 'local':
        ({ buffer, filename, contentType } = await handleLocalFile(validatedInput));
        break;

      case 'base64':
        ({ buffer, filename, contentType } = handleBase64File(validatedInput));
        break;

      case 'buffer':
        ({ buffer, filename, contentType } = handleBufferFile(validatedInput));
        break;

      default:
        throw new Error(`Unsupported file input type: ${(validatedInput as any).type}`);
    }

    // 上传到文件服务
    const metadata = await fileService.uploadFile(buffer, filename, contentType);

    addLog.info(
      `File uploaded successfully via ${validatedInput.type}: ${filename} -> ${metadata.fileId}`
    );

    const result = {
      url: metadata.accessUrl,
      fileId: metadata.fileId,
      originalFilename: metadata.originalFilename,
      size: metadata.size,
      contentType: metadata.contentType
    };

    // 验证返回结果
    return UploadResultSchema.parse(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      addLog.error(`Validation error in uploadFile:`, error.errors);
      throw new Error(`Invalid input parameters: ${error.errors.map((e) => e.message).join(', ')}`);
    }

    addLog.error(`Failed to upload file via ${validatedInput.type}:`, error);
    throw error;
  }
}

/**
 * 处理网络文件
 */
async function handleNetworkFile(input: NetworkFileInput): Promise<{
  buffer: Buffer;
  filename: string;
  contentType?: string;
}> {
  addLog.info(`Downloading file from network: ${input.url}`);

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
async function handleLocalFile(input: LocalFileInput): Promise<{
  buffer: Buffer;
  filename: string;
  contentType?: string;
}> {
  addLog.info(`Reading local file: ${input.path}`);

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
function handleBase64File(input: Base64FileInput): {
  buffer: Buffer;
  filename: string;
  contentType?: string;
} {
  addLog.info(`Processing base64 file: ${input.filename}`);

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
function handleBufferFile(input: BufferFileInput): {
  buffer: Buffer;
  filename: string;
  contentType?: string;
} {
  addLog.info(`Processing buffer file: ${input.filename}`);

  return {
    buffer: input.buffer,
    filename: input.filename,
    contentType: input.contentType
  };
}

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

// 导出便捷函数
export const uploadFromNetwork = (url: string, filename?: string): Promise<UploadResult> => {
  const input = NetworkFileInputSchema.parse({ type: 'network', url, filename });
  return uploadFile(input);
};

export const uploadFromLocal = (path: string, filename?: string): Promise<UploadResult> => {
  const input = LocalFileInputSchema.parse({ type: 'local', path, filename });
  return uploadFile(input);
};

export const uploadFromBase64 = (
  data: string,
  filename: string,
  contentType?: string
): Promise<UploadResult> => {
  const input = Base64FileInputSchema.parse({ type: 'base64', data, filename, contentType });
  return uploadFile(input);
};

export const uploadFromBuffer = (
  buffer: Buffer,
  filename: string,
  contentType?: string
): Promise<UploadResult> => {
  const input = BufferFileInputSchema.parse({ type: 'buffer', buffer, filename, contentType });
  return uploadFile(input);
};
