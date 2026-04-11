import { randomUUID } from 'crypto';
import { saveDashboard } from '../db.js';
import { renderDashboardToPng } from '../render.js';
import {
  assertRussiaMapRegionCodes,
  normalizeRussiaMapChartData,
} from '../russiaRegionCatalog.js';
import type { RussiaMapChartData } from '../types.js';

const PORT = process.env.PORT ?? '3100';
const BASE_URL =
  process.env.BASE_URL ||
  `http://${process.env.SERVER_IP || 'localhost'}:${PORT}`;

export interface CreateRussiaMapInput {
  data: RussiaMapChartData;
}

export interface CreateRussiaMapResult {
  dashboardId: string;
  dashboardUrl: string;
  imageBase64: string;
}

/**
 * Валидирует и сохраняет дашборд, возвращает id и url.
 */
export function createAndSaveRussiaMap(input: CreateRussiaMapInput): {
  dashboardId: string;
  dashboardUrl: string;
} {
  const { data: rawData } = input;
  if (!rawData || !Array.isArray(rawData.years) || rawData.years.length === 0) {
    throw new Error('Неверный формат данных: ожидается объект с полем years (массив годов с регионами).');
  }
  assertRussiaMapRegionCodes(rawData);
  const data = normalizeRussiaMapChartData(rawData);
  const id = randomUUID();
  saveDashboard(id, 'russia_map', data);
  const dashboardUrl = `${BASE_URL.replace(/\/$/, '')}/dashboard/${id}`;
  return { dashboardId: id, dashboardUrl };
}

/**
 * Генерирует дашборд: сохраняет в БД, рендерит картинку, возвращает url и base64.
 */
export async function createRussiaMap(
  input: CreateRussiaMapInput
): Promise<CreateRussiaMapResult> {
  console.error('[mcp-dashboard] [createRussiaMap] start');
  const { dashboardId, dashboardUrl } = createAndSaveRussiaMap(input);
  console.error('[mcp-dashboard] [createRussiaMap] дашборд сохранён', dashboardId, dashboardUrl);
  const imageBase64 = await renderDashboardToPng(dashboardUrl);
  console.error('[mcp-dashboard] [createRussiaMap] рендер готов');
  return { dashboardId, dashboardUrl, imageBase64 };
}
