import React, { useState, useCallback, useMemo } from 'react';
import { RegionCode, RUSSIA_REGIONS, regionCoordinates, REGION_CODES, getRegionTitle } from '../../constants/regions';
import { RussiaMapChartData } from '../../types/charts';

interface RussiaInteractiveMapProps {
  data?: RussiaMapChartData;
  className?: string;
}

const RussiaInteractiveMap: React.FC<RussiaInteractiveMapProps> = ({ data, className = '' }) => {
  const [hoveredRegion, setHoveredRegion] = useState<RegionCode | null>(null);
  const [currentYearIndex, setCurrentYearIndex] = useState(0);

  if (!data || !data.years || data.years.length === 0) {
    return (
      <div className={`flex items-center justify-center h-96 ${className}`}>
        <div className="text-gray-500">Нет данных для отображения</div>
      </div>
    );
  }

  // Массив доступных годов
  const years = useMemo(() => data.years.map(y => y.year), [data]);
  const currentYear = years[currentYearIndex];

  // Получаем данные для текущего года
  const currentYearData = useMemo(() => {
    return data.years[currentYearIndex];
  }, [data, currentYearIndex]);

  // Создаём карту значений для быстрого доступа
  const regionValueMap = useMemo(() => {
    const map: { [key: string]: number } = {};
    currentYearData.regions.forEach(region => {
      map[region.regionCode] = region.value;
    });
    return map;
  }, [currentYearData]);

  // Вычисляем квантили для равномерного распределения цветов
  const quantiles = useMemo(() => {
    const values = currentYearData.regions.map(r => r.value).sort((a, b) => a - b);
    if (values.length === 0) return [0, 0, 0, 0, 0, 0, 0, 0];
    
    // Вычисляем 8 квантилей (октили: 12.5%, 25%, 37.5%, 50%, 62.5%, 75%, 87.5%, 100%)
    const getQuantile = (percent: number) => {
      const index = Math.ceil((values.length * percent) / 100) - 1;
      return values[Math.max(0, Math.min(index, values.length - 1))];
    };
    
    return [
      getQuantile(12.5),  // 12.5-й перцентиль
      getQuantile(25),    // 25-й перцентиль
      getQuantile(37.5),  // 37.5-й перцентиль
      getQuantile(50),    // 50-й перцентиль (медиана)
      getQuantile(62.5),  // 62.5-й перцентиль
      getQuantile(75),    // 75-й перцентиль
      getQuantile(87.5),  // 87.5-й перцентиль
      getQuantile(100)    // максимум
    ];
  }, [currentYearData]);

  const handleRegionMouseEnter = useCallback((regionCode: RegionCode) => {
    setHoveredRegion(regionCode);
  }, []);

  const handleRegionMouseLeave = useCallback(() => {
    setHoveredRegion(null);
  }, []);

  const handlePrevYear = useCallback(() => {
    setCurrentYearIndex(prev => 
      prev === 0 ? years.length - 1 : prev - 1
    );
  }, [years.length]);

  const handleNextYear = useCallback(() => {
    setCurrentYearIndex(prev => 
      prev === years.length - 1 ? 0 : prev + 1
    );
  }, [years.length]);

  const getRegionData = useCallback((regionCode: RegionCode) => {
    const regionInfo = RUSSIA_REGIONS[regionCode];
    if (!regionInfo) {
      return { title: 'Неизвестный регион', value: 0 };
    }

    // Получаем значение из данных
    const value = regionValueMap[regionCode] || 0;

    return {
      title: regionInfo.title,
      value,
      type: regionInfo.type,
      federalDistrict: regionInfo.federalDistrict
    };
  }, [regionValueMap]);

  const getValueColor = useCallback((value: number) => {
    // Цветовая схема на основе 8 квантилей (октилей)
    if (value <= quantiles[0]) return '#1e3a8a'; // 0-12.5% - очень темно-синий
    if (value <= quantiles[1]) return '#1e40af'; // 12.5-25% - темно-синий
    if (value <= quantiles[2]) return '#3b82f6'; // 25-37.5% - синий
    if (value <= quantiles[3]) return '#06b6d4'; // 37.5-50% - голубой
    if (value <= quantiles[4]) return '#10b981'; // 50-62.5% - зеленый
    if (value <= quantiles[5]) return '#84cc16'; // 62.5-75% - желто-зеленый
    if (value <= quantiles[6]) return '#f59e0b'; // 75-87.5% - оранжевый
    if (value <= quantiles[7]) return '#ef4444'; // 87.5-100% - красный
    return '#dc2626';                            // Выше максимума - темно-красный
  }, [quantiles]);

  const getValueHoverColor = useCallback((value: number) => {
    // Более яркие цвета при наведении
    if (value <= quantiles[0]) return '#1e40af'; // 0-12.5% - ярче очень темно-синий
    if (value <= quantiles[1]) return '#1d4ed8'; // 12.5-25% - ярче темно-синий
    if (value <= quantiles[2]) return '#2563eb'; // 25-37.5% - ярче синий
    if (value <= quantiles[3]) return '#0891b2'; // 37.5-50% - ярче голубой
    if (value <= quantiles[4]) return '#059669'; // 50-62.5% - ярче зеленый
    if (value <= quantiles[5]) return '#65a30d'; // 62.5-75% - ярче желто-зеленый
    if (value <= quantiles[6]) return '#d97706'; // 75-87.5% - ярче оранжевый
    if (value <= quantiles[7]) return '#dc2626'; // 87.5-100% - ярче красный
    return '#b91c1c';                            // Выше максимума - ярче темно-красный
  }, [quantiles]);

  const getRegionFill = useCallback((regionCode: RegionCode) => {
    const regionData = getRegionData(regionCode);
    return getValueColor(regionData.value);
  }, [getRegionData]);

  const getRegionHoverFill = useCallback((regionCode: RegionCode) => {
    const regionData = getRegionData(regionCode);
    return getValueHoverColor(regionData.value);
  }, [getRegionData]);

  // Форматирование чисел с разделителями тысяч
  const formatNumber = (num: number) => {
    return num.toLocaleString('ru-RU', { maximumFractionDigits: 1 });
  };

  // Данные для легенды
  const legendData = useMemo(() => [
    { color: '#1e3a8a', hoverColor: '#1e40af', label: `≤ ${formatNumber(quantiles[0])}`, range: '0-12.5%' },
    { color: '#1e40af', hoverColor: '#1d4ed8', label: `≤ ${formatNumber(quantiles[1])}`, range: '12.5-25%' },
    { color: '#3b82f6', hoverColor: '#2563eb', label: `≤ ${formatNumber(quantiles[2])}`, range: '25-37.5%' },
    { color: '#06b6d4', hoverColor: '#0891b2', label: `≤ ${formatNumber(quantiles[3])}`, range: '37.5-50%' },
    { color: '#10b981', hoverColor: '#059669', label: `≤ ${formatNumber(quantiles[4])}`, range: '50-62.5%' },
    { color: '#84cc16', hoverColor: '#65a30d', label: `≤ ${formatNumber(quantiles[5])}`, range: '62.5-75%' },
    { color: '#f59e0b', hoverColor: '#d97706', label: `≤ ${formatNumber(quantiles[6])}`, range: '75-87.5%' },
    { color: '#ef4444', hoverColor: '#dc2626', label: `≤ ${formatNumber(quantiles[7])}`, range: '87.5-100%' },
  ], [quantiles]);

  return (
    <div className="relative max-w-6xl mx-auto p-5 bg-white rounded-lg shadow-lg">
      {/* Заголовок с каруселью годов */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">
            Интерактивная карта России
          </h3>
          <p className="text-gray-600">
            Наведите курсор на регион для получения подробной информации
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <button
            onClick={handlePrevYear}
            className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors duration-200"
            aria-label="Предыдущий год"
            tabIndex={0}
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <div className="text-lg font-semibold text-gray-800 min-w-[60px] text-center">
            {currentYear}
          </div>
          
          <button
            onClick={handleNextYear}
            className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors duration-200"
            aria-label="Следующий год"
            tabIndex={0}
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Индикаторы годов */}
      <div className="flex justify-center mb-4">
        <div className="flex space-x-2">
          {years.map((year, index) => (
            <button
              key={year}
              onClick={() => setCurrentYearIndex(index)}
              className={`w-3 h-3 rounded-full transition-colors duration-200 ${
                index === currentYearIndex
                  ? 'bg-blue-500'
                  : 'bg-gray-300 hover:bg-gray-400'
              }`}
              aria-label={`Перейти к ${year} году`}
              tabIndex={0}
            />
          ))}
        </div>
      </div>

      {/* Информация о регионе */}
      {hoveredRegion && (
        <div className="absolute z-50 right-6 top-32 transition-all duration-300 opacity-100 pointer-events-none">
          <div className="bg-white px-4 py-3 rounded-lg shadow-lg border border-blue-200 min-w-64">
            <div className="text-sm md:text-lg font-bold text-blue-700 mb-2">
              {getRegionData(hoveredRegion).title}
            </div>
            <div className="space-y-1 text-xs md:text-sm text-gray-600">
              <div>
                <span className="font-medium">Код:</span> {hoveredRegion}
              </div>
              <div>
                <span className="font-medium">Тип:</span> {getRegionData(hoveredRegion).type}
              </div>
              <div>
                <span className="font-medium">Федеральный округ:</span> {getRegionData(hoveredRegion).federalDistrict}
              </div>
              <div>
                <span className="font-medium">Год:</span> {currentYear}
              </div>
              <div>
                <span className="font-medium">Значение:</span>
                <span className={`ml-1 font-semibold ${getRegionData(hoveredRegion).value > 10 ? 'text-red-600' :
                    getRegionData(hoveredRegion).value > 0 ? 'text-green-600' :
                      'text-blue-600'
                  }`}>
                  {formatNumber(getRegionData(hoveredRegion).value)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Контейнер для легенды и карты */}
      <div className="flex gap-6 items-start">
        {/* Легенда */}
        <div className="flex-shrink-0">
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Легенда</h4>
            <div className="space-y-2">
              {legendData.map((item, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div 
                    className="w-8 h-6 rounded border border-gray-300 flex-shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <div className="text-xs text-gray-700">
                    <div className="font-medium">{item.label}</div>
                    <div className="text-gray-500">{item.range}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* SVG Карта */}
        <div className="flex-1 relative w-full" style={{ filter: 'drop-shadow(0 5px 12px rgba(0, 0, 0, 0.5))' }}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 1000 600"
            className="w-full h-auto"
          >
            {REGION_CODES.map(code => {
              return (
                <path
                  key={code}
                  d={regionCoordinates[code]}
                  data-title={getRegionTitle(code)}
                  data-code={code}
                  fill={hoveredRegion === code ? getRegionHoverFill(code) : getRegionFill(code)}
                  stroke="#FFFFFF"
                  strokeWidth="1"
                  strokeLinejoin="round"
                  className="cursor-pointer transition-all duration-200"
                  onMouseEnter={() => handleRegionMouseEnter(code)}
                  onMouseLeave={handleRegionMouseLeave}
                />
              );
            })}
          </svg>
        </div>
      </div>

      {/* Информация о текущем годе */}
      <div className="mt-4 text-center text-sm text-gray-600">
        Показаны данные по {currentYearData.regions.length} регионам за {currentYear} год
      </div>
    </div>
  );
};

export default RussiaInteractiveMap;