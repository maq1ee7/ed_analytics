/**
 * E2E: удалённый MCP (initialize + create_russia_map) и проверки.
 * Запуск без tsx/esbuild: только Node 18+.
 *
 * Базовый URL (первое непустое):
 *   MCP_BASE_URL → MCP_DASHBOARD_BASE_URL → http://SERVER_IP:PORT → BASE_URL → localhost:3100
 * Удобно задать в .env SERVER_IP и PORT (как для deploy.sh). Явный MCP_BASE_URL всё переопределяет.
 *
 *   ./scripts/test.sh   # подхватывает .env
 *   npm test
 */

import { strict as assert } from 'node:assert';
import { mcpRequest, resolveHttpBaseUrl } from './mcp-jsonrpc.mjs';

const { url: MCP_BASE_URL, from: baseUrlSource } = resolveHttpBaseUrl();
const MCP_ENDPOINT = `${MCP_BASE_URL}/mcp`;
const HTTP_ORIGIN = MCP_BASE_URL;

/** Эталон: только канонические ISO-коды (как после normalize на сервере). */
const MOCK_DATA = {
  title: 'E2E эталон',
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

const sortChartDataForCompare = (data) => ({
  title: data.title,
  years: [...data.years]
    .sort((a, b) => a.year - b.year)
    .map((y) => ({
      year: y.year,
      regions: [...y.regions].sort((a, b) => a.regionCode.localeCompare(b.regionCode)),
    })),
});

const EXPECTED_PAYLOAD = sortChartDataForCompare(MOCK_DATA);

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

async function main() {
  console.log('Базовый URL:', MCP_BASE_URL, `(источник: ${baseUrlSource})`);
  if (baseUrlSource.startsWith('default')) {
    console.warn(
      'Подсказка: задайте в mcp_dashboard/.env переменные (см. .env.example), например SERVER_IP=… или MCP_BASE_URL=http://хост:3100, либо передайте MCP_BASE_URL в командной строке.'
    );
  }
  console.log('MCP endpoint:', MCP_ENDPOINT);
  console.log('HTTP origin (проверки API/UI):', HTTP_ORIGIN);
  console.log('Мок-данные:', JSON.stringify(MOCK_DATA, null, 2));
  console.log('');

  const { response: initRes, text: initText, rpc: initRpc } = await mcpRequest(null, 'initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'test-mcp-call', version: '1.0.0' },
  }, { timeoutMs: 30_000 });

  const sessionId =
    initRes.headers.get('mcp-session-id') ?? initRes.headers.get('Mcp-Session-Id');
  assert.ok(
    sessionId,
    `Ожидался заголовок mcp-session-id. status=${initRes.status} body=${initText?.slice(0, 500) ?? ''}`
  );
  assert.ok(initRes.ok, `initialize: HTTP ${initRes.status} ${initText?.slice(0, 500) ?? ''}`);
  console.log('Сессия установлена:', sessionId.slice(0, 8) + '…');

  console.log('Вызов create_russia_map...');
  /** create_russia_map: несколько проходов Puppeteer — длинный таймаут. */
  const { response: callRes, text: callText, rpc: callRpc } = await mcpRequest(
    sessionId,
    'tools/call',
    {
      name: 'create_russia_map',
      arguments: { data: MOCK_DATA },
    },
    { timeoutMs: 300_000 }
  );

  assert.ok(callRes.ok, `tools/call: HTTP ${callRes.status} ${callText?.slice(0, 400) ?? ''}`);

  const rpc = callRpc;
  assert.ok(rpc, `Не удалось разобрать тело ответа tools/call (ожидался JSON или SSE data:). Начало ответа:\n${callText?.slice(0, 800) ?? ''}`);
  assert.ok(!rpc.error, `MCP error: ${JSON.stringify(rpc.error)}`);

  const content = rpc.result?.content ?? [];
  assert.ok(
    content.length > 0,
    `Пустой result.content. Распарсенный RPC: ${JSON.stringify(rpc).slice(0, 600)}`
  );

  let dashboardId;
  let dashboardUrlFromMcp;
  const imageBlocks = [];

  for (const item of content) {
    if (item.type === 'text' && item.text) {
      try {
        const parsed = JSON.parse(item.text);
        if (parsed.dashboardId) dashboardId = parsed.dashboardId;
        if (parsed.dashboardUrl) dashboardUrlFromMcp = parsed.dashboardUrl;
      } catch {
        assert.fail(`Текстовый блок не JSON: ${item.text.slice(0, 200)}`);
      }
    }
    if (item.type === 'image' && item.data) {
      imageBlocks.push({ data: item.data, mimeType: item.mimeType });
    }
  }

  assert.ok(dashboardId, 'В ответе MCP нет dashboardId в JSON-тексте');
  assert.equal(
    imageBlocks.length,
    MOCK_DATA.years.length,
    `Ожидалось ${MOCK_DATA.years.length} PNG (по числу лет), получено ${imageBlocks.length}`
  );
  for (let i = 0; i < imageBlocks.length; i++) {
    const { data: imageBase64, mimeType: imageMime } = imageBlocks[i];
    assert.ok(imageBase64 && imageBase64.length > 500, `Нет PNG #${i + 1} или слишком короткий base64`);
    assert.equal(imageMime, 'image/png', `Ожидался mimeType image/png для снимка #${i + 1}`);
    const pngBuf = Buffer.from(imageBase64, 'base64');
    assert.ok(pngBuf.length >= PNG_MAGIC.length, `Декод base64 PNG #${i + 1}: буфер слишком мал`);
    assert.ok(
      pngBuf.subarray(0, PNG_MAGIC.length).equals(PNG_MAGIC),
      `Декод base64 #${i + 1}: нет сигнатуры PNG`
    );
  }
  console.log('MCP: dashboardId, PNG base64 (все годы) и сигнатуры PNG — ок');

  if (dashboardUrlFromMcp) {
    try {
      const u = new URL(dashboardUrlFromMcp);
      const base = new URL(HTTP_ORIGIN);
      if (u.host !== base.host) {
        console.warn(
          `[warn] dashboardUrl host (${u.host}) ≠ база E2E (${base.host}). Проверьте BASE_URL на сервере. API ниже — по базе из env (resolveHttpBaseUrl).`
        );
      }
    } catch {
      console.warn('[warn] Некорректный dashboardUrl в ответе MCP:', dashboardUrlFromMcp);
    }
  }

  const apiUrl = `${HTTP_ORIGIN}/api/dashboard/${encodeURIComponent(dashboardId)}`;
  const apiRes = await fetch(apiUrl, { signal: AbortSignal.timeout(30_000) });
  assert.ok(apiRes.ok, `GET ${apiUrl} → ${apiRes.status}`);
  const stored = await apiRes.json();
  assert.equal(stored.id, dashboardId);
  assert.equal(stored.type, 'russia_map');
  const actualPayload = sortChartDataForCompare(stored.payload);
  assert.deepEqual(actualPayload, EXPECTED_PAYLOAD, 'payload в API не совпадает с эталоном');
  console.log('GET /api/dashboard/:id — payload совпадает с эталоном');

  const dashUrl = `${HTTP_ORIGIN}/dashboard/${encodeURIComponent(dashboardId)}`;
  const pageRes = await fetch(dashUrl, { signal: AbortSignal.timeout(30_000) });
  assert.ok(pageRes.ok, `GET ${dashUrl} → ${pageRes.status}`);
  const html = await pageRes.text();
  assert.ok(
    html.includes('map.html') || html.includes('Интерактивная карта') || html.includes('root'),
    'Страница дашборда: неожиданное тело'
  );
  console.log('GET /dashboard/:id — 200, HTML получен');

  console.log('');
  console.log('E2E завершён успешно.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
