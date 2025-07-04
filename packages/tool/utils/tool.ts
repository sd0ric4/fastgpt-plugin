import type { z } from 'zod';
import type { SystemVarType, ToolSetConfigType } from '@tool/type';
import { ToolConfigSchema, ToolSchema, toolConfigWithCbSchema } from '@tool/type/tool';
import type { ToolListItemType } from '@tool/type/api';

export const exportTool = ({
  toolCb,
  InputType,
  config
}: {
  toolCb: (
    props: z.infer<typeof InputType>,
    systemVar: SystemVarType
  ) => Promise<Record<string, any>>;
  InputType: z.ZodTypeAny;
  config: z.infer<typeof ToolConfigSchema>;
}): z.infer<typeof toolConfigWithCbSchema> => {
  const cb = async (props: z.infer<typeof InputType>, systemVar: SystemVarType) => {
    try {
      const output = await toolCb(InputType.parse(props), systemVar);
      return {
        output
      };
    } catch (error) {
      return { error };
    }
  };

  return {
    ...config,
    cb
  };
};

export const exportToolSet = ({ config }: { config: ToolSetConfigType }) => {
  return {
    ...config
  };
};

export function formatToolList(list: z.infer<typeof ToolSchema>[]): ToolListItemType[] {
  return list.map((item, index) => ({
    id: item.toolId,
    parentId: item.parentId,
    author: item.author,
    courseUrl: item.courseUrl,
    name: item.name,
    avatar: item.icon,
    versionList: item.versionList,
    intro: item.description,
    templateType: item.type,
    pluginOrder: index,
    isActive: item.isActive ?? true,
    weight: index,
    originCost: 0,
    currentCost: 0,
    hasTokenFee: false
  }));
}
