import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/fastgpt';

export default defineTool({
  toolId: 'toolId', // required when type is toolset
  name: {
    'zh-CN': 'arxiv 关键词检索',
    en: 'arxiv keyword search'
  },
  description: {
    'zh-CN': 'arxiv 关键词检索',
    en: 'description'
  },
  versionList: [
    {
      value: '0.1.0',
      description: 'Default version',
      inputs: [
        {
          key: 'formatStr',
          label: '格式化字符串',
          renderTypeList: [FlowNodeInputTypeEnum.input, FlowNodeInputTypeEnum.reference],
          valueType: WorkflowIOValueTypeEnum.string
        }
      ],
      outputs: [
        {
          id: 'time',
          type: FlowNodeOutputTypeEnum.static,
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'time',
          label: '时间',
          description: '当前时间'
        }
      ]
    }
  ]
});
