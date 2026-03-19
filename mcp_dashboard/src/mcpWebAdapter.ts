/**
 * Адаптер Express req/res ↔ Web API Request/Response.
 * Позволяет использовать Web Standard MCP-транспорт с Express (работает в SDK 1.0 и 1.27+).
 */
import type { Request as ExpressRequest, Response as ExpressResponse } from 'express';

/**
 * Строит полный URL запроса из Express req.
 */
function getRequestUrl(req: ExpressRequest): string {
  const protocol = req.protocol || 'http';
  const host = req.get('host') || 'localhost';
  const path = req.originalUrl || req.url || '/';
  return `${protocol}://${host}${path}`;
}

/**
 * Конвертирует Express Request в Web API Request.
 */
export function expressToWebRequest(req: ExpressRequest): Request {
  const url = getRequestUrl(req);
  const method = req.method || 'GET';
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value !== undefined && value !== '') {
      headers.set(key, Array.isArray(value) ? value.join(', ') : String(value));
    }
  }
  const body =
    method !== 'GET' && req.body !== undefined
      ? JSON.stringify(req.body)
      : undefined;
  return new Request(url, { method, headers, body });
}

/**
 * Отправляет Web API Response в Express Response.
 */
export async function webResponseToExpress(
  webResponse: Response,
  res: ExpressResponse
): Promise<void> {
  res.status(webResponse.status);
  webResponse.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });
  const body = await webResponse.text();
  res.send(body);
}
