import { defaultFileConfig } from './config';
import { addLog } from '@/utils/log';
import * as fs from 'fs';
import * as path from 'path';
import { z } from 'zod';
import { fileService } from './worker';

// 从配置读取文件大小限制
const MAX_FILE_SIZE = defaultFileConfig.maxFileSize;

// Zod schemas for validation
export const UploadResultSchema = z.object({
  url: z.string().url(),
  fileId: z.string(),
  originalFilename: z.string(),
  size: z
    .number()
    .positive()
    .refine((size) => size <= MAX_FILE_SIZE, {
      message: `File size must not exceed ${MAX_FILE_SIZE / (1024 * 1024)}MB`
    }),
  contentType: z.string()
});

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

// Type inference from schemas
export type UploadResult = z.infer<typeof UploadResultSchema>;
export type FileInput = z.infer<typeof FileInputSchema>;

/**
 * 统一的文件上传函数
 * 支持网络链接、本地文件、base64 和 buffer 四种输入方式
 */
export async function uploadFile(input: FileInput): Promise<UploadResult> {
  // 验证输入参数
  const validatedInput = FileInputSchema.parse(input);

  try {
    // 根据不同的输入字段确定类型并处理
    const { buffer, filename, contentType } = await (async () => {
      if (validatedInput.url) {
        return await handleNetworkFile(validatedInput);
      } else if (validatedInput.path) {
        return await handleLocalFile(validatedInput);
      } else if (validatedInput.data) {
        return handleBase64File(validatedInput);
      } else if (validatedInput.buffer) {
        return handleBufferFile(validatedInput);
      } else {
        throw new Error('No valid input method provided');
      }
    })();

    // 上传到文件服务
    const metadata = await fileService.uploadFile(buffer, filename, contentType);

    const inputType = validatedInput.url
      ? 'network'
      : validatedInput.path
        ? 'local'
        : validatedInput.data
          ? 'base64'
          : 'buffer';

    addLog.info(`File uploaded successfully via ${inputType}: ${filename} -> ${metadata.fileId}`);

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
async function handleNetworkFile(input: FileInput): Promise<{
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
async function handleLocalFile(input: FileInput): Promise<{
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
function handleBase64File(input: FileInput): {
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
function handleBufferFile(input: FileInput): {
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
