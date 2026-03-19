/**
 * Тестовый вызов MCP-инструмента create_russia_map с мок-данными.
 * Перед запуском поднимите сервер: npm run dev
 *
 * Использование:
 *   npx tsx scripts/test-mcp-call.ts
 *   MCP_BASE_URL=http://130.193.46.4:3100 npx tsx scripts/test-mcp-call.ts
 */

const MCP_BASE_URL = process.env.MCP_BASE_URL ?? 'http://localhost:3100';
const MCP_ENDPOINT = `${MCP_BASE_URL.replace(/\/$/, '')}/mcp`;

const MOCK_DATA = {
  years: [
    {
      year: 2023,
      regions: [
        { regionCode: 'RU-MOW', value: 100 },
        { regionCode: 'RU-SPE', value: 200 },
        { regionCode: 'RU-KDA', value: 150 },
      ],
    },
    {
      year: 2024,
      regions: [
        { regionCode: 'RU-MOW', value: 120 },
        { regionCode: 'RU-SPE', value: 220 },
        { regionCode: 'RU-KDA', value: 180 },
      ],
    },
  ],
};

async function mcpRequest(
  sessionId: string | null,
  method: string,
  params: Record<string, unknown>
): Promise<{ response: Response; json: unknown }> {
  const body = {
    jsonrpc: '2.0',
    id: 1,
    method,
    params,
  };
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json, text/event-stream',
    ...(sessionId ? { 'mcp-session-id': sessionId } : {}),
  };
  const response = await fetch(MCP_ENDPOINT, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  const text = await response.text();
  let json: unknown;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  return { response, json };
}

async function main(): Promise<void> {
  console.log('MCP endpoint:', MCP_ENDPOINT);
  console.log('Мок-данные:', JSON.stringify(MOCK_DATA, null, 2));
  console.log('');

  // 1. Initialize
  const { response: initRes, json: initJson } = await mcpRequest(null, 'initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'test-mcp-call', version: '1.0.0' },
  });

  const sessionId =
    initRes.headers.get('mcp-session-id') ?? initRes.headers.get('Mcp-Session-Id');
  if (!sessionId) {
    console.error('Ошибка: сервер не вернул mcp-session-id. Ответ:', initRes.status, initJson);
    process.exit(1);
  }
  console.log('Сессия установлена:', sessionId);

  if (!initRes.ok) {
    console.error('Initialize failed:', initRes.status, initJson);
    process.exit(1);
  }

  // 2. tools/call create_russia_map
  console.log('Вызов create_russia_map...');
  const { response: callRes, json: callJson } = await mcpRequest(sessionId, 'tools/call', {
    name: 'create_russia_map',
    arguments: { data: MOCK_DATA },
  });

  if (!callRes.ok) {
    console.error('tools/call failed:', callRes.status, callJson);
    process.exit(1);
  }

  const result = callJson as {
    result?: { content?: Array<{ type: string; text?: string; data?: string; mimeType?: string }> };
    error?: { message: string };
  };

  if (result.error) {
    console.error('Ошибка MCP:', result.error.message);
    process.exit(1);
  }

  const content = result.result?.content ?? [];
  for (const item of content) {
    if (item.type === 'text' && item.text) {
      console.log('Ответ (текст):', item.text);
      try {
        const parsed = JSON.parse(item.text);
        if (parsed.dashboardUrl) {
          console.log('URL дашборда:', parsed.dashboardUrl);
        }
      } catch {
        // не JSON — уже вывели текст
      }
    }
    if (item.type === 'image' && item.data) {
      console.log('Изображение: получено, длина base64:', item.data.length, 'символов');
    }
  }
  console.log('');
  console.log('Тест завершён успешно.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
