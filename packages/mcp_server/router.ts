import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import type { Express, Request, Response } from 'express';
import { getErrText } from '@tool/utils/err';
import { getTools, callTool } from './src/api/fastgpt';

// 简单的日志工具
const log = {
  info: (msg: string, ...args: any[]) => console.log(`[MCP INFO] ${msg}`, ...args),
  error: (msg: string, ...args: any[]) => console.error(`[MCP ERROR] ${msg}`, ...args)
};

// 管理 MCP 传输连接
const transportMap: Record<string, SSEServerTransport> = {};

/**
 * 创建 MCP 服务器实例
 */
function createMCPServer(key: string) {
  const server = new Server(
    {
      name: 'fastgpt-mcp-server',
      version: '1.0.0'
    },
    {
      capabilities: {
        tools: {}
      }
    }
  );

  // 处理工具列表请求
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: await getTools(key)
  }));

  // 处理工具调用请求
  const handleToolCall = async (
    name: string,
    args: Record<string, any>
  ): Promise<CallToolResult> => {
    try {
      log.info(`Call tool: ${name} with args: ${JSON.stringify(args)}`);
      const result = await callTool({ key, toolName: name, inputs: args });

      return {
        content: [
          {
            type: 'text',
            text: typeof result === 'string' ? result : JSON.stringify(result)
          }
        ],
        isError: false
      };
    } catch (error) {
      return {
        message: getErrText(error),
        content: [],
        isError: true
      };
    }
  };

  server.setRequestHandler(CallToolRequestSchema, async (request) =>
    handleToolCall(request.params.name, request.params.arguments ?? {})
  );

  return server;
}

/**
 * 初始化 MCP 路由
 *
 * 为什么不用 ts-rest？
 * 1. SSE 是长连接，不符合请求-响应模式
 * 2. MCP SDK 需要直接操作原始的 Express Response 对象
 * 3. SSE 需要特殊的流式响应处理
 */
export function initMCPRoutes(app: Express) {
  // SSE 连接端点 - 必须使用原始 Express 路由
  (app as any).get('/mcp/:key/sse', async (req: Request, res: Response) => {
    const { key } = req.params;

    try {
      log.info(`Establishing MCP SSE connection for key: ${key}`);

      // MCP SDK 会直接设置 SSE 头部和保持连接
      const transport = new SSEServerTransport(`/mcp/${key}/messages`, res);
      transportMap[transport.sessionId] = transport;

      // 创建 MCP 服务器
      const server = createMCPServer(key);

      // 设置事件处理器
      transport.onclose = () => {
        log.info(`MCP Transport closed ${transport.sessionId}`);
        delete transportMap[transport.sessionId];
      };

      transport.onerror = (err) => {
        log.error(`MCP Transport error ${transport.sessionId}`, err);
      };

      server.onclose = () => {
        log.info(`MCP Server closed ${transport.sessionId}`);
        delete transportMap[transport.sessionId];
      };

      server.onerror = (err) => {
        log.error(`MCP Server error ${transport.sessionId}`, err);
      };

      // 连接服务器和传输层
      await server.connect(transport);
      log.info(`MCP Server connected: ${transport.sessionId}`);
    } catch (error) {
      log.error('Failed to establish MCP connection', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to establish MCP connection' });
      }
    }
  });

  // 消息处理端点 - 也使用原始 Express 路由
  (app as any).post('/mcp/:key/messages', (req: Request, res: Response) => {
    const { sessionId } = req.query as { sessionId: string };

    try {
      const transport = transportMap[sessionId];
      if (!transport) {
        log.error(`Session not found: ${sessionId}`);
        return res.status(404).json({ error: 'Session not found' });
      }

      // 检查请求流状态
      log.info(
        `Request stream state - readable: ${req.readable}, destroyed: ${req.destroyed}, readableEnded: ${req.readableEnded}`
      );

      if (req.destroyed || req.readableEnded) {
        log.error(`Request stream is not available for session: ${sessionId}`);
        return res.status(400).json({ error: 'Request stream is not available' });
      }

      // 调用 handlePostMessage
      transport.handlePostMessage(req, res);
      log.info(`Handled message for session: ${sessionId}`);
    } catch (error) {
      log.error('Error handling MCP message', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  });

  log.info('MCP routes initialized (using raw Express routes for SSE compatibility)');
}
