import { z } from 'zod';

export const InputType = z
  .object({
    绘图提示词: z.string().optional(), //绘图提示词是旧版的名称，保持兼容性
    prompt: z.string().optional(),
    url: z.string(),
    authorization: z.string()
  })
  .refine(
    (data) => {
      // 至少需要提供绘图提示词或 prompt
      return data.绘图提示词 || data.prompt;
    },
    {
      message: '必须传入 "绘图提示词" 或 "prompt" 中的一个'
    }
  )
  .transform((data) => ({
    ...data,
    prompt: data.prompt || data.绘图提示词
  }));
export const OutputType = z.object({
  错误信息: z.string().optional(), // 兼容旧版的错误信息
  图片访问链接: z.string().optional(), // 兼容旧版的图片访问链接
  error: z.string().optional(),
  link: z.string().optional()
});

export async function tool(props: z.infer<typeof InputType>): Promise<z.infer<typeof OutputType>> {
  const { prompt, url, authorization } = props;
  const res = await fetch(`${url}/v1/images/generations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authorization}`
    },
    body: JSON.stringify({
      model: 'dall-e-3',
      n: 1,
      size: '1024x1024',
      prompt: prompt
    })
  });
  if (!res.ok) {
    const error = await res.text();
    return {
      错误信息: error,
      error: error
    };
  }
  const json = await res.json();
  return {
    图片访问链接: json.data[0].url,
    link: json.data[0].url
  };
}
