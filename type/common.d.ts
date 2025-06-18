import { z } from "zod";
export declare const InfoString: z.ZodObject<{
    en: z.ZodOptional<z.ZodString>;
    "zh-CN": z.ZodString;
    "zh-Hant": z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    en?: string;
    "zh-CN"?: string;
    "zh-Hant"?: string;
}, {
    en?: string;
    "zh-CN"?: string;
    "zh-Hant"?: string;
}>;
