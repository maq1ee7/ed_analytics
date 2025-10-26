export interface ChartPoint {
  x: number;
  y: number;
}

export interface HistogramData {
  label: string;
  value: number;
  frequency: number;
}

import { RegionCode } from '../constants/regions';

export interface RegionTemperatureData {
  regionCode: RegionCode;
  region: string;
  temperature: number;
  color: string;
}

export interface ChartConfig {
  responsive: boolean;
  maintainAspectRatio: boolean;
  plugins: {
    legend: {
      display: boolean;
      position?: 'top' | 'bottom' | 'left' | 'right';
    };
    tooltip: {
      enabled: boolean;
    };
  };
}

export interface RadarChartDataPoint {
  regionCode: RegionCode;
  regionName: string;
  values: number[]; // Значения по каждой оси (d1-d10)
  color: string;
}

export interface RadarChartData {
  year: number;
  regions: RadarChartDataPoint[];
  axes: string[]; // Названия осей (d1, d2, d3, ...)
  maxValue: number; // Максимальное значение для нормализации
}

export interface RadarChartDataset {
  years: RadarChartData[];
}

export interface FederalSharesDataPoint {
  dimension: string; // d1, d2, d3, ... d10
  values: { [year: number]: number }; // Значения по годам в процентах
  color: string;
}

export interface FederalSharesData {
  title: string;
  years: number[]; // Список годов для отображения
  dimensions: FederalSharesDataPoint[]; // Данные по каждому измерению d1-d10
  maxPercentage: number; // Максимальное значение для масштабирования (обычно 100)
}

// Типы для данных из dashboardExample.json

export interface ExponentialChartPoint {
  x: number;
  y: number;
}

export interface ExponentialChartYear {
  year: number;
  points: ExponentialChartPoint[];
}

export interface ExponentialChartData {
  years: ExponentialChartYear[];
}

export interface FederalSharesIndexData {
  index: string;
  values: { [year: string]: number };
}

export interface FederalSharesChartData {
  title: string;
  years: number[];
  maxPercentage: number;
  indexes: FederalSharesIndexData[];
}

export interface RadarChartRegionData {
  regionCode: string;
  values: number[];
}

export interface RadarChartYearData {
  year: number;
  axes: string[];
  maxValue: number;
  regions: RadarChartRegionData[];
}

export interface RadarChartDataFromJSON {
  years: RadarChartYearData[];
}

export interface RussiaMapRegionData {
  regionCode: string;
  value: number;
}

export interface RussiaMapYearData {
  year: number;
  regions: RussiaMapRegionData[];
}

export interface RussiaMapChartData {
  years: RussiaMapYearData[];
}

export interface ChartItem {
  type: 'exponential' | 'federal_shares' | 'radar' | 'russia_map';
  title: string;
  data: ExponentialChartData | FederalSharesChartData | RadarChartDataFromJSON | RussiaMapChartData;
}

export interface DashboardData {
  dashboard: {
    title: string;
    description: string;
    charts: ChartItem[];
  };
}
