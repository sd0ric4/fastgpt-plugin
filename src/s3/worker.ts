import { FileService, type FileInput } from './controller';
import type { FileConfig } from './config';
export const fileService = new FileService();
// Worker 中的文件服务实例
let workerFileService: FileService | null = null;

// 初始化文件服务（由主线程传递配置）
export function initFileServiceInWorker(config?: Partial<FileConfig>) {
  if (!workerFileService) {
    // 优先使用主线程的单例实例，如果不可用则创建新实例
    workerFileService = fileService || FileService.createForWorker(config);
  }
  return workerFileService;
}

// 获取文件服务实例
export function getFileServiceInWorker(): FileService {
  if (!workerFileService) {
    // 优先使用主线程的单例实例，如果不可用则创建新实例
    workerFileService = fileService || FileService.createForWorker();
  }
  return workerFileService!; // 使用非空断言，因为上面已确保不为 null
}

// Worker 中的高级文件上传处理 - 支持多种输入方式
export async function uploadFileAdvancedInWorker(input: FileInput) {
  const fileService = getFileServiceInWorker();
  return await fileService.uploadFileAdvanced(input);
}
