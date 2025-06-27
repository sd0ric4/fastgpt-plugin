import { addLog } from '@/utils/log';
import { z } from 'zod';

export const InputType = z
  .object({
    url: z.string().describe('硅基流动接口视频基础地址，例如：https://api.siliconflow.cn/v1/video'),
    authorization: z.string().describe('接口凭证（不需要 Bearer），如 sk-xxxx'),
    model: z
      .enum([
        'Wan-AI/Wan2.1-T2V-14B',
        'Wan-AI/Wan2.1-T2V-14B-Turbo',
        'Wan-AI/Wan2.1-I2V-14B-720P',
        'Wan-AI/Wan2.1-I2V-14B-720P-Turbo'
      ])
      .default('Wan-AI/Wan2.1-T2V-14B')
      .describe('模型名称'),
    prompt: z.string().describe('用于生成视频描述的文本提示词'),
    image_size: z
      .enum(['1280x720', '720x1280', '960x960'])
      .default('1280x720')
      .describe('生成内容的长宽比'),
    negative_prompt: z.string().optional().describe('用于排除不希望出现在生成内容中的元素'),
    image: z
      .string()
      .url()
      .or(z.string().startsWith('data:image/'))
      .optional()
      .describe(
        '部分模型必填，支持 base64 或图片 URL。例如："data:image/png;base64,XXX" 或图片链接'
      ),
    seed: z.number().optional().describe('用于控制生成内容的随机性')
  })
  .describe('硅基流动视频生成接口参数');

export const OutputType = z.object({
  status: z.enum(['Succeed', 'InQueue', 'InProgress', 'Failed']),
  reason: z.string(),
  results: z.object({
    videos: z.array(z.object({ url: z.string().url() })),
    timings: z.object({ inference: z.number() }),
    seed: z.number()
  })
});

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function tool(props: z.infer<typeof InputType>): Promise<z.infer<typeof OutputType>> {
  props = InputType.parse(props);
  addLog.error('调用硅基流动视频生成接口，参数:', { props });
  const { url, authorization, ...params } = props;

  // 不再处理 image 字段的 base64 转换
  const submitBody = Object.fromEntries(
    Object.entries({
      model: params.model,
      prompt: params.prompt,
      image_size: params.image_size,
      negative_prompt: params.negative_prompt,
      seed: params.seed,
      image: params.image
    }).filter(([, value]) => value !== undefined)
  );

  // 1. 提交生成任务
  const submitRes = await fetch(`${url}/submit`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${authorization}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(submitBody)
  });

  const submitData = await submitRes.json();
  if (!submitRes.ok || !submitData.requestId) {
    throw new Error('提交任务失败: ' + (submitData?.message || submitRes.statusText));
  }
  addLog.error('任务提交成功，Request ID:', submitData.requestId);

  // 2. 轮询获取结果
  let statusRes: Response | undefined = undefined;
  let statusData: any = undefined;
  for (let i = 0; i < 180; i++) {
    await sleep(3000);
    statusRes = await fetch(`${url}/status`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authorization}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ requestId: submitData.requestId })
    });
    statusData = await statusRes.json();
    if (statusData.status === 'Succeed' || statusData.status === 'Failed') {
      break;
    }
  }

  // 明确判断 statusRes 是否为 undefined
  if (!statusRes || !statusRes.ok) {
    throw new Error('获取结果失败: ' + (statusData?.message || statusRes?.statusText));
  }

  return OutputType.parse(statusData);
}
