import { z } from 'zod';
import axios from 'axios';
import { getErrText } from '@tool/utils/err';
import { delay } from '@tool/utils/delay';

// 模型枚举
const ModelEnum = z.enum([
  'wanx2.1-t2i-turbo', // 通义万相文生图2.1 - 生成速度更快，通用生成模型
  'wanx2.1-t2i-plus', // 通义万相文生图2.1 - 生成图像细节更丰富，速度稍慢
  'wanx2.0-t2i-turbo' // 通义万相文生图2.0 - 擅长质感人像与创意设计，性价比高
]);

// 图像尺寸枚举
const SizeEnum = z.enum([
  '512*512',
  '512*1024',
  '768*768',
  '768*1024',
  '1024*512',
  '1024*768',
  '1024*1024',
  '1280*720',
  '1440*720'
]);

export const InputType = z.object({
  apiKey: z.string().describe('阿里云百炼API Key'),
  prompt: z
    .string()
    .describe('正向提示词，描述期望生成的图像内容。支持中英文，长度不超过800个字符'),
  model: ModelEnum.optional().default('wanx2.1-t2i-turbo').describe('模型名称'),
  negative_prompt: z
    .string()
    .optional()
    .describe('反向提示词，描述不希望在画面中看到的内容，长度不超过500个字符'),
  size: SizeEnum.optional().default('1024*1024').describe('输出图像的分辨率'),
  n: z
    .number()
    .int()
    .min(1)
    .max(4)
    .optional()
    .default(1)
    .describe('生成图片的数量，取值范围为1~4张'),
  seed: z
    .number()
    .int()
    .min(0)
    .max(2147483647)
    .optional()
    .describe('随机数种子，用于控制模型生成内容的随机性'),
  prompt_extend: z
    .boolean()
    .optional()
    .default(true)
    .describe('是否开启prompt智能改写，开启后会使用大模型对输入prompt进行智能改写'),
  watermark: z.boolean().optional().default(false).describe('是否添加水印标识，水印位于图片右下角')
});

export const OutputType = z.object({
  images: z
    .array(
      z.object({
        url: z.string().describe('生成图片的访问链接'),
        orig_prompt: z.string().describe('原始输入提示词'),
        actual_prompt: z.string().optional().describe('智能改写后的实际提示词')
      })
    )
    .optional(),
  task_id: z.string().optional().describe('任务ID'),
  task_status: z.string().optional().describe('任务状态'),
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
  model = 'wanx2.1-t2i-turbo',
  negative_prompt,
  size = '1024*1024',
  n = 1,
  seed,
  prompt_extend = true,
  watermark = false
}: z.infer<typeof InputType>): Promise<z.infer<typeof OutputType>> {
  try {
    // 步骤1：创建任务获取任务ID
    const createTaskResponse = await axios.post(
      'https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis',
      {
        model,
        input: {
          prompt,
          ...(negative_prompt && { negative_prompt })
        },
        parameters: {
          size,
          n,
          ...(seed !== undefined && { seed }),
          prompt_extend,
          watermark
        }
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'X-DashScope-Async': 'enable'
        }
      }
    );

    const taskId = createTaskResponse.data?.output?.task_id;
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
        const queryResponse = await axios.get(
          `https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`,
          {
            headers: {
              Authorization: `Bearer ${apiKey}`
            }
          }
        );

        const taskStatus = queryResponse.data?.output?.task_status;
        if (taskStatus === TaskStatus.SUCCEEDED) {
          // 任务成功，处理结果
          const results = queryResponse.data?.output?.results || [];

          // json 结构 print 出 results
          const images = [];

          for (const result of results) {
            if (result.url) {
              // 直接使用阿里云提供的图片URL，无需上传到本地存储
              images.push({
                url: result.url,
                orig_prompt: result.orig_prompt,
                actual_prompt: result.actual_prompt
              });
            }
          }

          return {
            images,
            task_id: taskId,
            task_status: taskStatus
          };
        } else if (taskStatus === TaskStatus.FAILED) {
          return {
            error: '图像生成任务失败',
            task_id: taskId,
            task_status: taskStatus
          };
        } else if (taskStatus === TaskStatus.CANCELED) {
          return {
            error: '图像生成任务被取消',
            task_id: taskId,
            task_status: taskStatus
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
      error: '图像生成超时，请稍后重试',
      task_id: taskId,
      task_status: 'TIMEOUT'
    };
  } catch (error: any) {
    return {
      error: getErrText(error, '文生图请求失败')
    };
  }
}
