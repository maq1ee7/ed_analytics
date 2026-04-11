/**
 * Общий клиент Streamable HTTP MCP для скриптов (E2E, verify-examples).
 * @module
 */

/** @param {string} s */
export const trimUrl = (s) => s.replace(/\/$/, '');

export function resolveHttpBaseUrl() {
  const e = process.env;
  if (e.MCP_BASE_URL?.trim()) {
    return { url: trimUrl(e.MCP_BASE_URL.trim()), from: 'MCP_BASE_URL' };
  }
  if (e.MCP_DASHBOARD_BASE_URL?.trim()) {
    return { url: trimUrl(e.MCP_DASHBOARD_BASE_URL.trim()), from: 'MCP_DASHBOARD_BASE_URL' };
  }
  const ip = e.SERVER_IP?.trim();
  if (ip) {
    const port = (e.MCP_DASHBOARD_PORT || e.PORT || '3100').toString().trim();
    return { url: `http://${ip}:${port}`, from: 'SERVER_IP+PORT' };
  }
  if (e.BASE_URL?.trim()) {
    return { url: trimUrl(e.BASE_URL.trim()), from: 'BASE_URL' };
  }
  return { url: 'http://localhost:3100', from: 'default (нет MCP_BASE_URL / SERVER_IP / … в env)' };
}

/**
 * Streamable HTTP может вернуть один JSON или SSE (text/event-stream) с строками `data: {...}`.
 */
export function parseJsonRpcFromMcpBody(text) {
  const t = (text ?? '').trim();
  if (!t) return null;

  try {
    const j = JSON.parse(t);
    if (j && typeof j === 'object' && ('jsonrpc' in j || 'result' in j || 'error' in j)) {
      return j;
    }
  } catch {
    /* не один цельный JSON */
  }

  const fromDataLines = [];
  for (const line of text.split(/\r?\n/)) {
    const m = /^\s*data:\s*(.*)$/i.exec(line);
    if (!m) continue;
    const payload = m[1].trim();
    if (!payload || payload === '[DONE]') continue;
    try {
      fromDataLines.push(JSON.parse(payload));
    } catch {
      /* ignore */
    }
  }
  if (fromDataLines.length > 0) {
    for (let i = fromDataLines.length - 1; i >= 0; i--) {
      const j = fromDataLines[i];
      if (j && typeof j === 'object' && j.result !== undefined) return j;
      if (j && typeof j === 'object' && j.error !== undefined) return j;
    }
    return fromDataLines[fromDataLines.length - 1];
  }

  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i--) {
    try {
      const j = JSON.parse(lines[i]);
      if (j && typeof j === 'object' && (j.result !== undefined || j.error !== undefined)) {
        return j;
      }
    } catch {
      /* ignore */
    }
  }

  return null;
}

/**
 * @param {string | null} sessionId
 * @param {string} method
 * @param {unknown} params
 * @param {{ timeoutMs?: number }} [options]
 */
export async function mcpRequest(sessionId, method, params, options = {}) {
  const timeoutMs = options.timeoutMs ?? 60_000;
  const body = {
    jsonrpc: '2.0',
    id: 1,
    method,
    params,
  };
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json, text/event-stream',
    ...(sessionId ? { 'mcp-session-id': sessionId } : {}),
  };
  const { url: MCP_BASE_URL } = resolveHttpBaseUrl();
  const MCP_ENDPOINT = `${MCP_BASE_URL}/mcp`;
  const response = await fetch(MCP_ENDPOINT, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const text = await response.text();
  const rpc = parseJsonRpcFromMcpBody(text);
  return { response, text, rpc, endpoint: MCP_ENDPOINT };
}
