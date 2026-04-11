#!/usr/bin/env node
/**
 * Прогон examples/manifest.json против живого MCP (HTTP Streamable), без Cursor.
 * Те же проверки, что ожидает skill verify-mcp-dashboard.
 *
 *   MCP_BASE_URL=http://хост:3100 node scripts/verify-examples-mcp.mjs
 *   npm run verify:examples
 *
 * Подхватывает .env через shell (см. scripts/verify-examples.sh) или задайте MCP_BASE_URL вручную.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mcpRequest, resolveHttpBaseUrl } from './mcp-jsonrpc.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const INIT_TIMEOUT_MS = 30_000;
/** Несколько лет = несколько скриншотов Puppeteer подряд. */
const TOOLS_CALL_TIMEOUT_MS = 300_000;

function getTextAndImages(content) {
  let textBlock = '';
  const images = [];
  for (const item of content) {
    if (item.type === 'text' && item.text) textBlock += item.text;
    if (item.type === 'image' && item.data) images.push(item);
  }
  return { textBlock, images };
}

function toolLooksLikeSuccess(rpc) {
  if (!rpc || rpc.error) return false;
  const isErr = rpc.result?.isError === true;
  if (isErr) return false;
  const content = rpc.result?.content ?? [];
  const { textBlock, images } = getTextAndImages(content);
  if (!textBlock) return false;
  try {
    const j = JSON.parse(textBlock.trim());
    if (j.error && !j.dashboardUrl) return false;
    if (!j.dashboardUrl || !j.dashboardId) return false;
  } catch {
    return false;
  }
  return images.length > 0;
}

function toolLooksLikeExpectedError(rpc, containsText) {
  const content = rpc?.result?.content ?? [];
  const { textBlock } = getTextAndImages(content);
  const isErr = rpc?.result?.isError === true;
  const combined = textBlock + (rpc?.error ? JSON.stringify(rpc.error) : '');
  if (containsText?.length) {
    return containsText.every((s) => combined.includes(s));
  }
  return (
    isErr ||
    /"error"|unknownRegionCodes|Неверный формат|Invalid|required|expected/i.test(combined)
  );
}

async function main() {
  const { url: base, from: src } = resolveHttpBaseUrl();
  console.log('MCP HTTP:', `${base}/mcp`, `(источник: ${src})`);
  console.log('');

  const manifestPath = join(ROOT, 'examples', 'manifest.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const cases = manifest.cases ?? [];

  let initRes;
  let initText;
  try {
    const out = await mcpRequest(
      null,
      'initialize',
      {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'verify-examples-mcp', version: '1.0.0' },
      },
      { timeoutMs: INIT_TIMEOUT_MS }
    );
    initRes = out.response;
    initText = out.text;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('Не удалось подключиться к MCP:', msg);
    console.error(
      'Задайте MCP_BASE_URL на хост:порт, с которого доступен /mcp (не localhost внутри Docker с вашей машины).'
    );
    process.exit(1);
  }

  const sessionId =
    initRes.headers.get('mcp-session-id') ?? initRes.headers.get('Mcp-Session-Id');
  if (!sessionId || !initRes.ok) {
    console.error('initialize failed:', initRes.status, initText?.slice(0, 600));
    process.exit(1);
  }

  const results = [];

  for (const c of cases) {
    const fixturePath = join(ROOT, 'examples', c.file);
    const args = JSON.parse(readFileSync(fixturePath, 'utf8'));
    const expectedYears = args.data?.years?.length ?? 0;

    let rpc;
    let callText = '';
    try {
      const out = await mcpRequest(
        sessionId,
        'tools/call',
        {
          name: 'create_russia_map',
          arguments: args,
        },
        { timeoutMs: TOOLS_CALL_TIMEOUT_MS }
      );
      callText = out.text ?? '';
      rpc = out.rpc;
    } catch (e) {
      results.push({
        id: c.id,
        ok: false,
        reason: e instanceof Error ? e.message : String(e),
      });
      continue;
    }

    const expect = c.expect?.outcome;
    let ok = false;
    let reason = '';

    if (expect === 'success') {
      ok =
        toolLooksLikeSuccess(rpc) &&
        (() => {
          const content = rpc.result?.content ?? [];
          const images = content.filter((x) => x.type === 'image' && x.data);
          if (expectedYears > 0 && images.length !== expectedYears) {
            reason = `ожидалось ${expectedYears} PNG (по числу лет), получено ${images.length}`;
            return false;
          }
          return true;
        })();
      if (!ok && !reason) reason = 'ответ не похож на успешный (dashboardUrl / PNG / isError)';
    } else if (expect === 'tool_error') {
      const contains = c.expect?.containsText;
      ok = toolLooksLikeExpectedError(rpc, contains);
      if (!ok) reason = `ожидалась ошибка инструмента; тело: ${callText.slice(0, 400)}`;
    } else {
      reason = `неизвестный expect.outcome: ${expect}`;
    }

    results.push({ id: c.id, ok, reason: reason || (ok ? '' : 'см. лог') });
  }

  let failed = 0;
  for (const r of results) {
    const mark = r.ok ? 'OK' : 'FAIL';
    if (!r.ok) failed++;
    console.log(`${mark}\t${r.id}${r.reason ? '\t' + r.reason : ''}`);
  }
  console.log('');
  if (failed > 0) {
    console.error(`Итого: ${failed} из ${results.length} кейсов провалено.`);
    process.exit(1);
  }
  console.log(`Итого: все ${results.length} кейсов прошли.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
