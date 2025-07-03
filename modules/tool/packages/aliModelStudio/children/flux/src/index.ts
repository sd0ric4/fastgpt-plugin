import { z } from 'zod';
import { getErrText } from '@tool/utils/err';
import { delay } from '@tool/utils/delay';

// FLUX模型枚举
const ModelEnum = z.enum([
  'flux-schnell', // FLUX.1 [schnell] 少步模型，生成速度快，视觉质量优秀
  'flux-dev', // FLUX.1 [dev] 面向非商业应用的开源权重模型
  'flux-merged' // FLUX.1-merged 结合DEV和Schnell优势的模型
]);

// 图像尺寸枚举
const SizeEnum = z.enum(['512*1024', '768*512', '768*1024', '1024*576', '576*1024', '1024*1024']);

export const InputType = z.object({
  apiKey: z.string().describe('阿里云百炼API Key'),
  prompt: z.string().describe('文本内容，支持中英文，中文不超过500个字符，英文不超过500个单词'),
  model: ModelEnum.optional().default('flux-schnell').describe('模型名称'),
  size: SizeEnum.optional().default('1024*1024').describe('生成图像的分辨率'),
  seed: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe('图片生成时候的种子值，如果不提供，则算法自动用一个随机生成的数字作为种子'),
  steps: z
    .number()
    .int()
    .min(1)
    .optional()
    .describe(
      '图片生成的推理步数，如果不提供，则默认为30。flux-schnell模型官方默认steps为4，flux-dev模型官方默认steps为50'
    ),
  guidance: z
    .number()
    .min(0)
    .optional()
    .describe(
      '指导度量值，用于在图像生成过程中调整模型的创造性与文本指导的紧密度。较高的值会使得生成的图像更忠于文本提示，但可能减少多样性；较低的值则允许更多创造性，增加图像变化。默认值为3.5'
    ),
  offload: z
    .boolean()
    .optional()
    .describe(
      '是否在采样过程中将部分计算密集型组件临时从GPU卸载到CPU，以减轻内存压力或提升效率。默认为False'
    ),
  add_sampling_metadata: z
    .boolean()
    .optional()
    .describe('是否在输出的图像文件中嵌入生成时使用的提示文本等元数据信息。默认为True')
});

export const OutputType = z.object({
  images: z.array(z.string()).optional().describe('Array of generated image URLs'),
  error: z.string().optional().describe('错误信息')
});

// 任务状态枚举
enum TaskStatus {
  PENDING = 'PENDING', // 任务排队中
  RUNNING = 'RUNNING', // 任务处理中
  SUCCEEDED = 'SUCCEEDED', // 任务执行成功
  FAILED = 'FAILED', // 任务执行失败
  CANCELED = 'CANCELED', // 任务取消成功
  UNKNOWN = 'UNKNOWN' // 任务不存在或状态未知
}

export async function tool({
  apiKey,
  prompt,
  model = 'flux-schnell',
  size = '1024*1024',
  seed,
  steps,
  guidance,
  offload,
  add_sampling_metadata
}: z.infer<typeof InputType>): Promise<z.infer<typeof OutputType>> {
  try {
    // 步骤1：创建任务获取任务ID
    const requestBody = {
      model,
      input: {
        prompt
      },
      parameters: {
        size,
        ...(seed !== undefined && { seed }),
        ...(steps !== undefined && { steps }),
        ...(guidance !== undefined && { guidance }),
        ...(offload !== undefined && { offload }),
        ...(add_sampling_metadata !== undefined && { add_sampling_metadata })
      }
    };

    const createTaskResponse = await fetch(
      'https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'X-DashScope-Async': 'enable'
        },
        body: JSON.stringify(requestBody)
      }
    );
    const createTaskData = await createTaskResponse.json();
    const taskId = createTaskData?.output?.task_id;
    if (!taskId) {
      return {
        error: '创建任务失败，未获取到任务ID'
      };
    }

    // 步骤2：轮询查询任务结果
    const maxRetries = 60; // 最大重试次数，约3分钟 (60 * 3秒 = 180秒)
    let retryCount = 0;

    while (retryCount < maxRetries) {
      await delay(3000); // 等待3秒

      try {
        const queryResponse = await fetch(`https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`, {
          headers: {
            Authorization: `Bearer ${apiKey}`
          }
        });
        const queryData = await queryResponse.json();
        const taskStatus = queryData?.output?.task_status;
        if (taskStatus === TaskStatus.SUCCEEDED) {
          // 任务成功，处理结果
          const results = queryData?.output?.results || [];
          const imageCount = queryData?.usage?.image_count || 0;

          const images = [];

          for (const result of results) {
            if (result.url) {
              // 直接使用阿里云提供的图片URL
              images.push(result.url);
            }
          }

          return {
            images
          };
        } else if (taskStatus === TaskStatus.FAILED) {
          const errorMessage = queryData?.output?.message || '图像生成任务失败';
          return {
            error: errorMessage
          };
        } else if (taskStatus === TaskStatus.CANCELED) {
          return {
            error: '图像生成任务被取消'
          };
        }
        // 任务还在进行中，继续轮询
      } catch (queryError) {
        return Promise.reject({
          error: getErrText(queryError, '查询任务状态失败'),
          task_id: taskId,
          task_status: 'UNKNOWN'
        });
      }

      retryCount++;
    }

    // 超时
    return {
      error: '图像生成超时，请稍后重试'
    };
  } catch (error: unknown) {
    return {
      error: getErrText(error, 'FLUX文生图请求失败')
    };
  }
}
