import { ChartPoint, HistogramData, RegionTemperatureData } from '../types/charts';

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

// Генератор температурных данных для регионов России
export const generateRussiaTemperatureData = (): RegionTemperatureData[] => {
  const regions = [
    'Москва', 'Санкт-Петербург', 'Новосибирск', 'Екатеринбург', 'Казань',
    'Нижний Новгород', 'Челябинск', 'Самара', 'Омск', 'Ростов-на-Дону',
    'Уфа', 'Красноярск', 'Воронеж', 'Пермь', 'Волгоград',
    'Краснодар', 'Саратов', 'Тюмень', 'Тольятти', 'Ижевск',
    'Барнаул', 'Ульяновск', 'Иркутск', 'Хабаровск', 'Ярославль',
    'Владивосток', 'Махачкала', 'Томск', 'Оренбург', 'Кемерово'
  ];
  
  const data: RegionTemperatureData[] = regions.map(region => {
    // Генерируем температуру в диапазоне от -35°C до +35°C
    const baseTemp = (Math.random() - 0.5) * 60; // -30 to +30
    const noise = (Math.random() - 0.5) * 10; // ±5 градусов шума
    const temperature = parseFloat((baseTemp + noise).toFixed(1));
    
    // Определяем цвет на основе температуры
    const color = getTemperatureColor(temperature);
    
    return {
      region,
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
