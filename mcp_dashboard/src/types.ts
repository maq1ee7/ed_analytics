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
