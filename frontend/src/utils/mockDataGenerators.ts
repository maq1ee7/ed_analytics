import { ChartPoint, HistogramData, RegionTemperatureData, RadarChartDataset, RadarChartData, RadarChartDataPoint, FederalSharesData, FederalSharesDataPoint } from '../types/charts';
import { RUSSIA_REGIONS, REGION_CODES } from '../constants/regions';

// Генератор экспоненциальных данных с шумами
export const generateExponentialData = (pointCount: number = 50): ChartPoint[] => {
  const data: ChartPoint[] = [];
  
  for (let i = 0; i < pointCount; i++) {
    const x = (i / pointCount) * 5; // Диапазон X от 0 до 5
    const baseY = Math.exp(x * 0.8); // Экспоненциальная функция
    const noise = (Math.random() - 0.5) * baseY * 0.3; // Шум ±30%
    const y = Math.max(0.1, baseY + noise); // Гарантируем положительные значения
    
    data.push({ x: parseFloat(x.toFixed(2)), y: parseFloat(y.toFixed(2)) });
  }
  
  return data;
};

// Генератор данных для гистограммы нормального распределения
export const generateNormalDistributionData = (bins: number = 25): HistogramData[] => {
  const data: HistogramData[] = [];
  const mean = 0;
  const stdDev = 1;
  const samples = 1000;
  
  // Генерируем выборку из нормального распределения
  const normalSamples: number[] = [];
  for (let i = 0; i < samples; i++) {
    // Используем Box-Muller transform для генерации нормального распределения
    const u1 = Math.random();
    const u2 = Math.random();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    normalSamples.push(mean + z0 * stdDev);
  }
  
  // Создаем bins для гистограммы
  const min = Math.min(...normalSamples);
  const max = Math.max(...normalSamples);
  const binWidth = (max - min) / bins;
  
  for (let i = 0; i < bins; i++) {
    const binStart = min + i * binWidth;
    const binEnd = min + (i + 1) * binWidth;
    const binCenter = (binStart + binEnd) / 2;
    
    // Подсчитываем количество значений в bin
    let count = normalSamples.filter(val => val >= binStart && val < binEnd).length;
    
    // Добавляем небольшой шум
    const noise = (Math.random() - 0.5) * count * 0.1;
    count = Math.max(0, Math.round(count + noise));
    
    data.push({
      label: binCenter.toFixed(2),
      value: binCenter,
      frequency: count
    });
  }
  
  return data;
};

// Простая функция для генерации псевдослучайных чисел с seed
const seededRandom = (seed: number) => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

// Генератор температурных данных для регионов России
export const generateRussiaTemperatureData = (seed: number = 12345): RegionTemperatureData[] => {
  let currentSeed = seed;
  
  // Выбираем первые 30 регионов для демонстрации (стабильный выбор)
  const selectedRegionCodes = REGION_CODES.slice(0, 30);
  
  const data: RegionTemperatureData[] = selectedRegionCodes.map(regionCode => {
    const regionInfo = RUSSIA_REGIONS[regionCode];
    
    // Генерируем температуру с использованием seed для стабильности
    currentSeed++;
    const baseTemp = (seededRandom(currentSeed) - 0.5) * 60; // -30 to +30
    currentSeed++;
    const noise = (seededRandom(currentSeed) - 0.5) * 10; // ±5 градусов шума
    const temperature = parseFloat((baseTemp + noise).toFixed(1));
    
    // Определяем цвет на основе температуры
    const color = getTemperatureColor(temperature);
    
    return {
      regionCode,
      region: regionInfo.title,
      temperature,
      color
    };
  });
  
  return data;
};

// Функция для определения цвета на основе температуры
const getTemperatureColor = (temperature: number): string => {
  // Нормализуем температуру в диапазон 0-1
  const normalized = Math.max(0, Math.min(1, (temperature + 40) / 80)); // -40 to +40 -> 0 to 1
  
  if (normalized < 0.2) return '#1e3a8a'; // Очень холодно - темно-синий
  if (normalized < 0.4) return '#3b82f6'; // Холодно - синий
  if (normalized < 0.6) return '#10b981'; // Прохладно - зеленый
  if (normalized < 0.8) return '#f59e0b'; // Тепло - желтый
  return '#dc2626'; // Жарко - красный
};

// Утилита для интерполяции цветов
export const interpolateColor = (color1: string, color2: string, factor: number): string => {
  const hex1 = color1.replace('#', '');
  const hex2 = color2.replace('#', '');
  
  const r1 = parseInt(hex1.substring(0, 2), 16);
  const g1 = parseInt(hex1.substring(2, 4), 16);
  const b1 = parseInt(hex1.substring(4, 6), 16);
  
  const r2 = parseInt(hex2.substring(0, 2), 16);
  const g2 = parseInt(hex2.substring(2, 4), 16);
  const b2 = parseInt(hex2.substring(4, 6), 16);
  
  const r = Math.round(r1 + (r2 - r1) * factor);
  const g = Math.round(g1 + (g2 - g1) * factor);
  const b = Math.round(b1 + (b2 - b1) * factor);
  
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};

// Предустановленные цвета для регионов в радиальной диаграмме
const RADAR_CHART_COLORS = [
  '#22d3ee', // cyan-400
  '#f87171', // red-400
  '#4ade80', // green-400
  '#94a3b8', // slate-400
  '#a855f7', // purple-500
  '#f59e0b', // amber-500
  '#ef4444', // red-500
  '#06b6d4', // cyan-500
  '#10b981', // emerald-500
  '#8b5cf6', // violet-500
  '#f97316', // orange-500
  '#84cc16', // lime-500
  '#ec4899', // pink-500
  '#6366f1', // indigo-500
  '#14b8a6'  // teal-500
];

// Генератор данных для радиальной диаграммы
export const generateRadarChartData = (
  years: number[] = [2021, 2022, 2023, 2024],
  regionsPerYear: { [year: number]: number } = {},
  seed: number = 54321
): RadarChartDataset => {
  let currentSeed = seed;
  const axes = ['d1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8', 'd9', 'd10'];
  
  const yearsData: RadarChartData[] = years.map((year, yearIndex) => {
    // Определяем количество регионов для этого года (от 4 до 7)
    const regionCount = regionsPerYear[year] || Math.min(4 + yearIndex, 7);
    
    // Выбираем случайные регионы
    const selectedRegions = REGION_CODES
      .sort(() => seededRandom(currentSeed++) - 0.5)
      .slice(0, regionCount);
    
    const regions: RadarChartDataPoint[] = selectedRegions.map((regionCode, index) => {
      const regionInfo = RUSSIA_REGIONS[regionCode];
      const color = RADAR_CHART_COLORS[index % RADAR_CHART_COLORS.length];
      
      // Генерируем значения для каждой оси (от 0.3 до 1.0)
      const values = axes.map(() => {
        const baseValue = 0.3 + seededRandom(currentSeed++) * 0.7;
        // Добавляем тренд роста по годам
        const yearTrend = yearIndex * 0.02;
        return Math.min(1.0, Math.max(0.1, baseValue + yearTrend));
      });
      
      return {
        regionCode,
        regionName: regionInfo.title,
        values: values.map(v => parseFloat(v.toFixed(2))),
        color
      };
    });
    
    return {
      year,
      axes,
      maxValue: 1.0,
      regions
    };
  });
  
  return { years: yearsData };
};

// Загрузка mock-данных из JSON файла
export const loadRadarChartMockData = async (): Promise<RadarChartDataset> => {
  try {
    const response = await fetch('/data/radarChartMockData.json');
    const data = await response.json();
    return data as RadarChartDataset;
  } catch (error) {
    console.warn('Не удалось загрузить mock-данные, используем сгенерированные:', error);
    return generateRadarChartData();
  }
};

// Предустановленные цвета для Federal Shares диаграммы
const FEDERAL_SHARES_COLORS = [
  '#22d3ee', // cyan-400 - d1
  '#ef4444', // red-500 - d2
  '#22c55e', // green-500 - d3
  '#64748b', // slate-500 - d4
  '#eab308', // yellow-500 - d5
  '#dc2626', // red-600 - d6
  '#7c2d12', // red-900 - d7
  '#7e22ce', // purple-700 - d8
  '#1e293b', // slate-800 - d9
  '#ef4444'  // red-500 - d10
];

// Генератор данных для Federal Shares диаграммы (stacked)
export const generateFederalSharesData = (
  years: number[] = [2018, 2019, 2020],
  seed: number = 98765
): FederalSharesData => {
  let currentSeed = seed;
  const dimensions = ['d1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8', 'd9', 'd10'];
  
  const dimensionsData: FederalSharesDataPoint[] = dimensions.map((dimension, index) => {
    const color = FEDERAL_SHARES_COLORS[index];
    const values: { [year: number]: number } = {};
    
    // Генерируем значения так, чтобы сумма всех измерений была около 100%
    // Каждое измерение получает от 3% до 18% от общего
    const baseValue = 3 + seededRandom(currentSeed++) * 15;
    
    years.forEach(year => {
      // Добавляем небольшие вариации по годам (±2%)
      const yearVariation = (seededRandom(currentSeed++) - 0.5) * 4;
      const value = Math.max(1, Math.min(25, baseValue + yearVariation));
      values[year] = parseFloat(value.toFixed(1));
    });
    
    return {
      dimension,
      color,
      values
    };
  });
  
  // Нормализуем значения, чтобы сумма была ровно 100% для каждого года
  years.forEach(year => {
    const totalForYear = dimensionsData.reduce((sum, dim) => sum + dim.values[year], 0);
    const scaleFactor = 100 / totalForYear;
    
    dimensionsData.forEach(dim => {
      dim.values[year] = parseFloat((dim.values[year] * scaleFactor).toFixed(1));
    });
  });
  
  return {
    title: 'Federal Shares by Year',
    years,
    dimensions: dimensionsData,
    maxPercentage: 100
  };
};

// Загрузка mock-данных для Federal Shares из JSON файла
export const loadFederalSharesMockData = async (): Promise<FederalSharesData> => {
  try {
    const response = await fetch('/data/federalSharesMockData.json');
    const data = await response.json();
    return data as FederalSharesData;
  } catch (error) {
    console.warn('Не удалось загрузить Federal Shares mock-данные, используем сгенерированные:', error);
    return generateFederalSharesData();
  }
};
