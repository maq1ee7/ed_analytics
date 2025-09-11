export interface ChartPoint {
  x: number;
  y: number;
}

export interface HistogramData {
  label: string;
  value: number;
  frequency: number;
}

export interface RegionTemperatureData {
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
