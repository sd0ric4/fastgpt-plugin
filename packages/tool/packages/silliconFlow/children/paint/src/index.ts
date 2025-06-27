import { z } from 'zod';

export const InputType = z
  .object({
    url: z
      .string()
      .describe('硅基流动接口绘图基础地址，例如：https://api.siliconflow.cn/v1/images/generations'),
    authorization: z.string().describe('接口凭证（不需要 Bearer），如 sk-xxxx'),
    model: z
      .enum(['Kwai-Kolors/Kolors'])
      .default('Kwai-Kolors/Kolors')
      .describe('模型名称，当前仅支持 Kwai-Kolors/Kolors'),
    prompt: z.string().describe('绘图提示词'),
    image_size: z
      .enum(['1024x1024', '960x1280', '768x1024', '720x1440', '720x1280', '512x512', '2048x2048'])
      .default('1024x1024')
      .describe('绘图尺寸'),
    batch_size: z.number().min(1).max(4).default(1).describe('生成的图片数量，范围为 1-4'),
    num_inference_steps: z.number().min(1).max(100).default(20).describe('推理步数，范围为 1-100'),
    guidance_scale: z
      .number()
      .min(0)
      .max(20)
      .default(7.5)
      .describe('控制生成图像与提示词的匹配程度，0-20'),
    negative_prompt: z.string().optional().describe('用于排除不希望出现在生成图像中的元素'),
    seed: z
      .number()
      .min(0)
      .max(9999999999)
      .optional()
      .describe('用于控制生成图像的随机性。范围为 0-9999999999'),
    image: z
      .string()
      .url()
      .or(z.string().startsWith('data:image/'))
      .optional()
      .describe(
        '需要上传的图片，支持图片 URL 或 base64 格式，如 "https://xxx/xx.png" 或 "data:image/png;base64,XXX"'
      )
  })
  .describe('硅基流动绘图接口参数');

export const OutputType = z.object({
  images: z
    .array(
      z.object({
        url: z
          .string()
          .url()
          .describe('生成图片的 URL，链接有效期为一小时，请及时下载保存，避免因过期无法访问')
      })
    )
    .describe('生成的图片列表，包含图片 URL 和其他信息'),
  timings: z
    .object({
      inference: z.number().describe('推理耗时，单位毫秒')
    })
    .passthrough()
    .describe('推理过程的时间信息'),
  seed: z.number().describe('用于控制生成图像的随机性')
});

// 错误状态码映射
const ERROR_MESSAGES = {
  400: (data: any) => `Bad Request${data?.message ? `: ${data.message}` : ''}`,
  401: () => 'Invalid token',
  404: () => '404 page not found',
  429: (data: any) => `Rate limit${data?.message ? `: ${data.message}` : ': Too Many Requests'}`,
  503: (data: any) => `Service unavailable${data?.message ? `: ${data.message}` : ''}`,
  504: () => 'Gateway Timeout'
} as const;

export async function urlToBase64(imageUrl: string): Promise<string> {
  const res = await fetch(imageUrl);
  if (!res.ok) throw new Error('图片下载失败: ' + imageUrl);
  const buffer = Buffer.from(await res.arrayBuffer());
  // 简单推断 mime
  const mime = imageUrl.endsWith('.png')
    ? 'image/png'
    : imageUrl.endsWith('.jpg') || imageUrl.endsWith('.jpeg')
      ? 'image/jpeg'
      : 'image/png';
  return `data:${mime};base64,${buffer.toString('base64')}`;
}

export async function tool(props: z.infer<typeof InputType>): Promise<z.infer<typeof OutputType>> {
  // 自动补全默认值
  props = InputType.parse(props);
  const { url, authorization, ...params } = props;

  // image 字段自动转 base64
  let image = params.image;
  if (image && !image.startsWith('data:image/')) {
    // 是 url，自动转 base64
    image = await urlToBase64(image);
  }

  // 构建请求体，过滤掉 undefined 值
  const body = Object.fromEntries(
    Object.entries({
      model: params.model,
      prompt: params.prompt,
      image_size: params.image_size,
      batch_size: params.batch_size,
      num_inference_steps: params.num_inference_steps,
      guidance_scale: params.guidance_scale,
      negative_prompt: params.negative_prompt,
      seed: params.seed,
      image
    }).filter(([, value]) => value !== undefined)
  );

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${authorization}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  const text = await response.text();
  const data = (() => {
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  })();

  if (!response.ok) {
    const errorHandler = ERROR_MESSAGES[response.status as keyof typeof ERROR_MESSAGES];
    const message = errorHandler
      ? errorHandler(data)
      : typeof data === 'object' && data?.message
        ? data.message
        : `Response error: ${response.status} ${response.statusText}`;

    throw new Error(message);
  }

  return OutputType.parse(data);
}
