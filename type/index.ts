import { z } from "zod";
import type { InputType, OutputType } from "./fastgpt";
import type { ToolConfigSchema, ToolSetConfigSchema } from "./tool";

const InputBaseSchema = z.object({
  version: z.string().optional(),
});

export function defineInputSchema<T extends z.AnyZodObject>(schema: T) {
  return InputBaseSchema.merge(schema);
}

export type ToolConfigType = z.infer<typeof ToolConfigSchema> & {
  inputs: InputType[];
  outputs: OutputType[];
};

export type ToolSetConfigType = z.infer<typeof ToolSetConfigSchema>;

export function defineTool(tool: ToolConfigType) {
  return {
    isToolSet: false,
    ...tool,
  };
}

export function defineToolSet(toolset: ToolSetConfigType) {
  return {
    isToolSet: true,
    ...toolset,
  };
}

export * from "./fastgpt";
