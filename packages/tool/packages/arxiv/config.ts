import { defineToolSet } from '@tool/type';
import { ToolTypeEnum } from '@tool/type/tool';
import keywordSearch from './children/keywordSearch';

export default defineToolSet({
  name: {
    'zh-CN': 'arxiv 工具集',
    en: 'arxiv tool set'
  },
  type: ToolTypeEnum.tools,
  description: {
    'zh-CN': 'arxiv 工具集',
    en: 'arxiv tool set'
  },
  children: [keywordSearch]
});
