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
  const {
    RUSSIA_REGION_CODES_URI,
    RussiaMapRegionValidationError,
    RussiaMapTotalValidationError,
    getRussiaRegionCodesJson,
  } = await import('./russiaRegionCatalog.js');

  const RussiaMapDataSchema = z.object({
    title: z.string().min(1),
    years: z.array(
      z.object({
        year: z.number(),
        total: z.number().optional(),
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
      title: 'MCP Dashboard — карты и дашборды',
      description:
        'Для любой визуализации по субъектам Российской Федерации (хороплет, сравнение лет, показатели по регионам: добыча, ВРП, демография и т.д.) ' +
        'предпочитайте инструмент create_russia_map вместо самописного HTML/Highcharts: он даёт интерактивный дашборд и PNG по каждому году. ' +
        `Коды регионов — ISO 3166-2:RU; полный справочник: MCP resource ${RUSSIA_REGION_CODES_URI} или инструмент get_russia_region_codes.`,
    });

    server.registerResource(
      'russia_region_codes',
      RUSSIA_REGION_CODES_URI,
      {
        title: 'Справочник кодов субъектов РФ для карты',
        description:
          'JSON: код ISO 3166-2:RU, официальное название, тип, федеральный округ, алиасы (ХМАО, Югра и т.д.). ' +
          'Используйте перед сборкой данных для create_russia_map.',
        mimeType: 'application/json',
      },
      async (uri) => ({
        contents: [
          {
            uri: uri.href,
            mimeType: 'application/json',
            text: getRussiaRegionCodesJson(),
          },
        ],
      })
    );

    server.registerTool(
      'get_russia_region_codes',
      {
        title: 'Справочник кодов субъектов РФ (JSON)',
        description:
          'Возвращает тот же справочник, что и resource ' +
          RUSSIA_REGION_CODES_URI +
          ': коды ISO 3166-2:RU, названия и алиасы. Вызывайте перед create_russia_map, если клиент не читает resources.',
      },
      async () => ({
        content: [{ type: 'text' as const, text: getRussiaRegionCodesJson() }],
      })
    );

    server.registerTool(
      'create_russia_map',
      {
        title: 'Создать карту регионов России',
        description:
          'Интерактивная карта России по субъектам РФ: слайдер года, легенда, экспорт. ' +
          'Используйте для запросов вроде «карта по регионам», «добыча нефти по областям», «показатель X по субъектам РФ», сравнение лет. ' +
          'Не собирайте отдельную веб-страницу с картой, если достаточно этого инструмента. ' +
          'Входной JSON: { "title": "…", "years": [ { "year": 2023, "regions": [ { "regionCode": "RU-MOW", "value": 100 } ], "total"?: число } ] } — regionCode в формате ISO 3166-2:RU; опционально total — известная сумма по всем контурам карты, остаток относится к неперечисленным субъектам. ' +
          `Список кодов и алиасов: ${RUSSIA_REGION_CODES_URI} или get_russia_region_codes. ` +
          'Ответ: JSON с dashboardUrl (пока запущен сервер) и по одному PNG на каждый год (в том же порядке, что years).',
        inputSchema: {
          data: z
            .object({
              title: z
                .string()
                .min(1)
                .describe('Заголовок карты: что показывает показатель (например «Количество школьников», «Добыча нефти, т»).'),
              years: z.array(
                z.object({
                  year: z.number(),
                  total: z.number().optional(),
                  regions: z.array(
                    z.object({
                      regionCode: z.string(),
                      value: z.number(),
                    })
                  ),
                })
              ),
            })
            .describe(
              'Данные для карты: title, массив лет; для каждого года — регионы с кодом ISO 3166-2:RU и числовым значением'
            ),
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
          const yearsOrder = data.years.map((y: { year: number }) => y.year);
          const text = JSON.stringify(
            {
              dashboardUrl: result.dashboardUrl,
              dashboardId: result.dashboardId,
              title: data.title,
              pngCount: result.imagesBase64.length,
              snapshotYearsOrder: yearsOrder,
              regionCodesResourceUri: RUSSIA_REGION_CODES_URI,
              message:
                'Дашборд создан. Ссылка на интерактивную версию действительна, пока запущен сервер. ' +
                'В ответе передаётся по одному PNG на каждый год (блоки изображений в том же порядке, что snapshotYearsOrder).',
            },
            null,
            2
          );
          return {
            content: [
              { type: 'text', text },
              ...result.imagesBase64.map((b64) => ({
                type: 'image' as const,
                data: b64,
                mimeType: 'image/png' as const,
              })),
            ],
          };
        } catch (err) {
          if (err instanceof RussiaMapTotalValidationError) {
            const payload = { error: err.message };
            console.error('[mcp-dashboard] [tool] create_russia_map total:', payload);
            return {
              content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }],
              isError: true,
            };
          }
          if (err instanceof RussiaMapRegionValidationError) {
            const payload = {
              error: err.message,
              unknownRegionCodes: err.unknownRegionCodes,
              possibleMatches: err.suggestions,
              hint: `Сопоставьте названия с кодами из resource ${RUSSIA_REGION_CODES_URI} или вызовите get_russia_region_codes.`,
            };
            console.error('[mcp-dashboard] [tool] create_russia_map валидация регионов:', payload);
            return {
              content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }],
              isError: true,
            };
          }
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
