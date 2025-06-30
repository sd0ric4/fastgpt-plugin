import { tool, InputType } from '../src/index';

async function main() {
  // 测试用例：facebook/react
  const input = {
    owner: 'facebook',
    repo: 'react'
    // token: 'ghp_xxx' // 可选，建议用环境变量或 system_input_config
  };

  const parsed = InputType.parse(input);
  const result = await tool(parsed);

  console.log('仓库基本信息:', result.info);
  console.log('README内容(前200字):', result.readme);
  console.log('License信息:', result.license);
}

main().catch(console.error);
