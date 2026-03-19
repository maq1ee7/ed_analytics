/**
 * Streamable HTTP транспорт для MCP — подключение по URL (в т.ч. из Cursor к удалённому серверу).
 * Используется Web API Request/Response через адаптер, чтобы работало и в SDK 1.0, и в 1.27+.
 */
import type { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { randomUUID } from 'crypto';
import { expressToWebRequest, webResponseToExpress } from './mcpWebAdapter.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const transports: Record<string, any> = {};

function isInitializeRequest(body: unknown): boolean {
  if (body === null || typeof body !== 'object') return false;
  return (
    'method' in body && (body as { method?: string }).method === 'initialize'
  );
}

/** Транспорт с handleRequest(request: Request): Promise<Response> (Web API). Используем только Web Standard транспорт. */
interface WebTransport {
  handleRequest(request: Request): Promise<Response>;
  sessionId?: string;
  onclose?: (() => void) | null;
}

type WebTransportConstructor = new (options: {
  sessionIdGenerator: () => string;
  onsessioninitialized?: (sid: string) => void;
}) => WebTransport;

async function loadWebTransportClass(): Promise<WebTransportConstructor> {
  try {
    const m = await import(
      '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'
    );
    if (m.WebStandardStreamableHTTPServerTransport) {
      return m.WebStandardStreamableHTTPServerTransport as unknown as WebTransportConstructor;
    }
  } catch {
    // В SDK 1.0 может не быть отдельного файла — берём из streamableHttp
  }
  const fallback = await import('@modelcontextprotocol/sdk/server/streamableHttp.js');
  return fallback.StreamableHTTPServerTransport as unknown as WebTransportConstructor;
}

export async function createMcpHttpHandlers(
  getServer: () => import('@modelcontextprotocol/sdk/server/mcp.js').McpServer
): Promise<{
  mcpPost: (req: ExpressRequest, res: ExpressResponse) => Promise<void>;
  mcpGet: (req: ExpressRequest, res: ExpressResponse) => Promise<void>;
}> {
  const TransportClass = await loadWebTransportClass();

  const mcpPost = async (req: ExpressRequest, res: ExpressResponse): Promise<void> => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    const method = typeof req.body === 'object' && req.body !== null && 'method' in req.body
      ? (req.body as { method?: string }).method
      : '?';

    try {
      const transport = sessionId ? transports[sessionId] : null;

      if (transport && typeof transport.handleRequest === 'function') {
        console.error('[mcp-dashboard] [mcp] POST session', sessionId?.slice(0, 8) + '…', 'method', method);
        const webRequest = expressToWebRequest(req);
        const webResponse = await transport.handleRequest(webRequest);
        const newSessionId =
          webResponse.headers.get('mcp-session-id') ||
          webResponse.headers.get('Mcp-Session-Id');
        if (newSessionId && !transports[newSessionId]) {
          transports[newSessionId] = transport;
        }
        await webResponseToExpress(webResponse, res);
        return;
      }

      if (!sessionId && isInitializeRequest(req.body)) {
        console.error('[mcp-dashboard] [mcp] POST новый initialize, создаём сессию');
        const transport = new TransportClass({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (sid: string) => {
            if (sid) transports[sid] = transport;
          },
        }) as WebTransport;

        transport.onclose = () => {
          const sid = transport.sessionId;
          if (sid) delete transports[sid];
        };

        const server = getServer();
        await server.connect(transport as unknown as import('@modelcontextprotocol/sdk/shared/transport.js').Transport);

        const webRequest = expressToWebRequest(req);
        const webResponse = await transport.handleRequest(webRequest);
        const sid =
          webResponse.headers.get('mcp-session-id') ||
          webResponse.headers.get('Mcp-Session-Id');
        if (sid) transports[sid] = transport;
        await webResponseToExpress(webResponse, res);
        return;
      }

      res.status(400).json({
        jsonrpc: '2.0',
        error: { code: -32000, message: 'Bad Request: No valid session ID or missing initialize' },
        id: null,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const stack = err instanceof Error ? err.stack : undefined;
      console.error(
        '[mcp-dashboard] MCP POST error:',
        message,
        '| body type:',
        typeof req.body,
        'content-type:',
        req.headers['content-type']
      );
      if (stack) console.error(stack);
      if (!res.headersSent) {
        const isDev = process.env.NODE_ENV !== 'production';
        res.status(500).json({
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: isDev ? message : 'Internal server error',
          },
          id: null,
        });
      }
    }
  };

  const mcpGet = async (req: ExpressRequest, res: ExpressResponse): Promise<void> => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    if (!sessionId || !transports[sessionId]) {
      res.status(400).send('Invalid or missing session ID');
      return;
    }
    try {
      const transport = transports[sessionId] as WebTransport;
      const webRequest = expressToWebRequest(req);
      const webResponse = await transport.handleRequest(webRequest);
      await webResponseToExpress(webResponse, res);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (err instanceof Error && err.stack) {
        console.error('[mcp-dashboard] MCP GET error:', err.stack);
      } else {
        console.error('[mcp-dashboard] MCP GET error:', message);
      }
      if (!res.headersSent) res.status(500).end();
    }
  };

  return { mcpPost, mcpGet };
}
