/**
 * Типы данных для дашбордов. Совместимы с форматом RussiaMapChartData из ed_analytics.
 */

export interface RussiaMapRegionData {
  regionCode: string;
  value: number;
}

export interface RussiaMapYearData {
  year: number;
  regions: RussiaMapRegionData[];
  /**
   * Опционально: известная сумма показателя по всем субъектам, для которых на карте есть контур
   * (множество кодов совпадает с ключами `data/regionCoordinates.json`).
   */
  total?: number;
  /**
   * После нормализации: остаток `total − сумма(перечисленные)` для неперечисленных субъектов карты
   * (одно число на все такие регионы). Только если остаток > 0 и есть неперечисленные контуры.
   */
  restAggregateValue?: number;
}

export interface RussiaMapChartData {
  /** Человекочитаемый заголовок показателя (что отображает карта). */
  title: string;
  years: RussiaMapYearData[];
}

export interface StoredDashboard {
  id: string;
  type: 'russia_map';
  payload: RussiaMapChartData;
  createdAt: string;
}
