import { z } from 'zod';
import { InfoString } from '@/type/i18n';
import { SystemVarSchema } from '.';
import { InputSchema, OutputSchema } from './fastgpt';

export const ToolCallbackReturnSchema = z.object({
  error: z.any().optional(),
  output: z.record(z.any()).optional()
});
export const ToolCallbackType = z
  .function()
  .args(z.any(), SystemVarSchema)
  .returns(z.promise(ToolCallbackReturnSchema));

export enum ToolTypeEnum {
  tools = 'tools',
  search = 'search',
  multimodal = 'multimodal',
  communication = 'communication',
  other = 'other'
}

export const VersionListItemSchema = z.object({
  value: z.string(),
  description: z.string().optional(),
  inputs: z.array(InputSchema).describe('The inputs of the tool'),
  outputs: z.array(OutputSchema).describe('The outputs of the tool')
});

export const ToolConfigSchema = z

  .object({
    toolId: z.string().optional().describe('The unique id of the tool'),
    name: InfoString.describe('The name of the tool'),
    description: InfoString.describe('The description of the tool'),
    versionList: z.array(VersionListItemSchema).min(1).describe('The version list'),

    // Can be inherited
    isActive: z.boolean().optional().describe('Default is active'),
    type: z.nativeEnum(ToolTypeEnum).optional().describe('The type of the tool'),
    icon: z.string().optional().describe('The icon of the tool'),
    author: z.string().optional().describe('The author of the tool'),
    courseUrl: z.string().optional().describe('The documentation URL of the tool')
  })
  .describe('The Tool Config Schema');
export const toolConfigWithCbSchema = ToolConfigSchema.merge(
  z.object({
    cb: ToolCallbackType.describe('The callback function of the tool')
  })
);
export const ToolSchema = toolConfigWithCbSchema.merge(
  z.object({
    // Required
    toolId: z.string().describe('The unique id of the tool'),
    type: z.nativeEnum(ToolTypeEnum).describe('The type of the tool'),
    icon: z.string().describe('The icon of the tool'),

    // Computed
    parentId: z.string().optional().describe('The parent id of the tool'),
    toolDirName: z.string()
  })
);

export const ToolSetConfigSchema = ToolConfigSchema.omit({
  versionList: true
})
  .merge(
    z.object({
      type: z.nativeEnum(ToolTypeEnum).describe('The type of the tool'),
      children: z.array(toolConfigWithCbSchema).describe('The children of the tool set')
    })
  )
  .describe('The ToolSet Config Schema');

export const ToolSetSchema = ToolSchema.omit({
  cb: true,
  parentId: true,
  toolDirName: true
})
  .merge(
    z.object({
      children: z.array(ToolSchema).describe('The children of the tool set')
    })
  )
  .describe('The ToolSet Schema');
