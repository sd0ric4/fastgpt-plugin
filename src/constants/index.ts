export const isProd = process.env.NODE_ENV === 'production';

// MCP 相关配置
export const FASTGPT_ENDPOINT = process.env.FASTGPT_ENDPOINT || 'http://localhost:3000';
export const MCP_ENABLED = process.env.MCP_ENABLED !== 'false'; // 默认启用
