import { createExpressEndpoints } from '@ts-rest/express';
import { contract } from '../contract';
import { s } from '../router/init';
import type { Express } from 'express';
import { toolRouter } from '@tool/router';
import { initMCPRoutes } from '@mcp_server/router';
import { MCP_ENABLED } from '@/constants';

export const initRouter = (app: Express) => {
  // 首先初始化 MCP 路由（必须在其他中间件之前，避免流被消费）
  if (MCP_ENABLED) {
    initMCPRoutes(app);
  }

  // 然后初始化 ts-rest 路由（适合标准 REST API）
  const router = s.router(contract, {
    tool: toolRouter
  });

  createExpressEndpoints(contract, router, app, {
    jsonQuery: true
    // globalMiddleware: [authTokenMiddleware]
  });
};
