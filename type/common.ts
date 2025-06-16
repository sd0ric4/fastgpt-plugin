import { z } from "zod";

export const InfoString = z.object({
  en: z.string().optional(),
  "zh-CN": z.string(),
  "zh-Hant": z.string().optional(),
});
