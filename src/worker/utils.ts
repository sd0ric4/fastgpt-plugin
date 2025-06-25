import type { FileMetadata } from '@/s3/config';
import type { FileInput } from '@/s3/controller';
import { parentPort } from 'worker_threads';

export const uploadFile = async (data: FileInput) => {
  return new Promise<FileMetadata>((resolve, reject) => {
    global.uploadFileResponseFn = (res: FileMetadata) => {
      resolve(res);
    };
    parentPort?.postMessage({
      type: 'uploadFile',
      data
    });
  });
};

declare global {
  // eslint-disable-next-line no-var
  var uploadFileResponseFn: (data: FileMetadata) => void | undefined;
}

export {};
