import express from 'express';
import { initOpenAPI } from './contract/openapi';
import { initRouter } from './router';
import { initTool } from '@tool/init';
import { MCP_ENABLED } from './constants';

const app = express();

// 静态文件服务 - 可以全局应用
app.use(express.static('public', {}));

// 先初始化 MCP 路由（不使用 body parser 中间件）
initRouter(app);

// 然后为其他路由应用 body parser 中间件
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

initOpenAPI(app);

initTool();

const PORT = parseInt(process.env.PORT || '3000');
app.listen(PORT, (error?: Error) => {
  if (error) {
    console.error(error);
    process.exit(1);
  }
  console.log(`FastGPT Plugin Service is listening at http://localhost:${PORT}`);

  if (MCP_ENABLED) {
    console.log(`🔌 MCP Server endpoints available at:`);
    console.log(`   • SSE: http://localhost:${PORT}/mcp/:key/sse`);
    console.log(`   • Messages: http://localhost:${PORT}/mcp/:key/messages`);
  }
});
