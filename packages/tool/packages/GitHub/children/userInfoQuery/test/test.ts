import { tool, InputType } from '../src/index';

async function main() {
  // 测试用例：octocat
  const input = {
    username: 'sd0ric4'
    // token: 'ghp_xxx' // 可选
  };

  const parsed = InputType.parse(input);
  const result = await tool(parsed);

  console.log('用户基本信息:', result.userInfo);
  console.log('公开仓库数量:', result.repos.length);
  if (result.repos.length > 0) {
    console.log('第一个仓库:', result.repos[0]);
  }
}

main().catch(console.error);
