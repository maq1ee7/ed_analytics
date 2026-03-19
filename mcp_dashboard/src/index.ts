/**
 * MCP Dashboard — MCP-сервер для генерации дашбордов (интерактивная карта России и др.).
 * Запуск: node dist/index.js (или npm run dev)
 * Поднимает HTTP-сервер: дашборды + API + MCP по Streamable HTTP (эндпоинт /mcp для Cursor и др.).
 */
// Node 18: глобальный crypto (Web API) отсутствует, SDK его ожидает — полифилл до любых импортов MCP
import { webcrypto } from 'node:crypto';
if (typeof globalThis.crypto === 'undefined') {
  (globalThis as unknown as { crypto: Crypto }).crypto = webcrypto as Crypto;
}
import express from 'express';
import { createApp } from './server.js';
import { createMcpHttpHandlers } from './mcpTransport.js';
import { closeBrowser } from './render.js';

const PORT = parseInt(process.env.PORT ?? '3100', 10);

async function main(): Promise<void> {
  const { McpServer } = await import('@modelcontextprotocol/sdk/server/mcp.js');
  const { z } = await import('zod');
  const { createRussiaMap } = await import('./tools/createRussiaMap.js');

  const RussiaMapDataSchema = z.object({
    years: z.array(
      z.object({
        year: z.number(),
        regions: z.array(
          z.object({
            regionCode: z.string(),
            value: z.number(),
          })
        ),
      })
    ),
  });

  /** Создаёт новый McpServer для каждой сессии (один сервер — один транспорт в SDK). */
  const createMcpServer = (): InstanceType<typeof McpServer> => {
    const server = new McpServer({
      name: 'mcp-dashboard',
      version: '1.0.0',
    });
    server.registerTool(
      'create_russia_map',
      {
        title: 'Создать карту регионов России',
        description:
          'Создаёт интерактивную карту регионов России по переданным JSON-данным. ' +
          'Данные должны быть в формате: { "years": [ { "year": 2023, "regions": [ { "regionCode": "RU-MOW", "value": 100 }, ... ] }, ... ] }. ' +
          'Возвращает URL дашборда (работает пока запущен сервер) и картинку карты (base64 PNG).',
        inputSchema: {
          data: z
            .object({
              years: z.array(
                z.object({
                  year: z.number(),
                  regions: z.array(
                    z.object({
                      regionCode: z.string(),
                      value: z.number(),
                    })
                  ),
                })
              ),
            })
            .describe('Данные для карты: массив лет, для каждого года — массив регионов с кодом и значением'),
        },
      },
      async ({ data }): Promise<{
        content: Array<
          | { type: 'text'; text: string }
          | { type: 'image'; data: string; mimeType: string }
        >;
        isError?: boolean;
      }> => {
        try {
          console.error('[mcp-dashboard] [tool] create_russia_map вызван');
          RussiaMapDataSchema.parse(data);
          const result = await createRussiaMap({ data });
          console.error('[mcp-dashboard] [tool] create_russia_map успех', result.dashboardId);
          const text = JSON.stringify(
            {
              dashboardUrl: result.dashboardUrl,
              dashboardId: result.dashboardId,
              message: 'Дашборд создан. Ссылка действительна пока запущен сервер.',
            },
            null,
            2
          );
          return {
            content: [
              { type: 'text', text },
              { type: 'image', data: result.imageBase64, mimeType: 'image/png' },
            ],
          };
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          console.error('[mcp-dashboard] [tool] create_russia_map ошибка:', message);
          return {
            content: [{ type: 'text', text: JSON.stringify({ error: message }) }],
            isError: true,
          };
        }
      }
    );
    return server;
  };

  const app = createApp();
  // Парсинг JSON для /mcp при любом Content-Type (Cursor может слать другой заголовок)
  app.use('/mcp', express.json({ type: () => true }));
  app.use(express.json());

  const { mcpPost, mcpGet } = await createMcpHttpHandlers(createMcpServer);
  app.post('/mcp', (req, res) => mcpPost(req, res));
  app.get('/mcp', (req, res) => mcpGet(req, res));

  const httpServer = app.listen(PORT, () => {
    console.error(`[mcp-dashboard] HTTP server: http://localhost:${PORT}`);
    console.error(`[mcp-dashboard] MCP endpoint: http://localhost:${PORT}/mcp`);
  });

  const shutdown = (): void => {
    httpServer.close();
    closeBrowser();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
