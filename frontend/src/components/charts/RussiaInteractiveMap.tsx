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

  const getValueColor = (value: number) => {
    // Цветовая схема на основе значения
    if (value <= -20) return '#1e40af'; // Очень низкое - темно-синий
    if (value <= -10) return '#3b82f6'; // Низкое - синий
    if (value <= 0) return '#06b6d4';   // Ниже среднего - голубой
    if (value <= 10) return '#10b981';  // Среднее - зеленый
    if (value <= 20) return '#f59e0b';  // Выше среднего - оранжевый
    return '#ef4444';                   // Высокое - красный
  };

  const getValueHoverColor = (value: number) => {
    // Более яркие цвета при наведении
    if (value <= -20) return '#1d4ed8'; // Очень низкое - ярче темно-синий
    if (value <= -10) return '#2563eb'; // Низкое - ярче синий
    if (value <= 0) return '#0891b2';   // Ниже среднего - ярче голубой
    if (value <= 10) return '#059669';  // Среднее - ярче зеленый
    if (value <= 20) return '#d97706';  // Выше среднего - ярче оранжевый
    return '#dc2626';                   // Высокое - ярче красный
  };

  const getRegionFill = useCallback((regionCode: RegionCode) => {
    const regionData = getRegionData(regionCode);
    return getValueColor(regionData.value);
  }, [getRegionData]);

  const getRegionHoverFill = useCallback((regionCode: RegionCode) => {
    const regionData = getRegionData(regionCode);
    return getValueHoverColor(regionData.value);
  }, [getRegionData]);

  return (
    <div className="relative max-w-4xl mx-auto p-5 bg-white rounded-lg shadow-lg">
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
        <div className="absolute z-50 left-1.5 top-32 transition-all duration-300 opacity-100">
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
                  {getRegionData(hoveredRegion).value > 0 ? '+' : ''}{getRegionData(hoveredRegion).value.toFixed(1)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SVG Карта */}
      <div className="relative w-full" style={{ filter: 'drop-shadow(0 5px 12px rgba(0, 0, 0, 0.5))' }}>
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

      {/* Информация о текущем годе */}
      <div className="mt-4 text-center text-sm text-gray-600">
        Показаны данные по {currentYearData.regions.length} регионам за {currentYear} год
      </div>
    </div>
  );
};

export default RussiaInteractiveMap;