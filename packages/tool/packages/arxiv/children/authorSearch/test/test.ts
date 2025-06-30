import { tool, InputType } from '../src/index';

async function main() {
  const input = {
    author: 'Yann LeCun',
    maxResults: 3,
    sortBy: 'relevance'
  };
  // 校验输入类型
  const parsed = InputType.parse(input);
  const result = await tool(parsed);
  console.log(JSON.stringify(result, null, 2));
}

main().catch(console.error);
