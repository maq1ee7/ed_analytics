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
