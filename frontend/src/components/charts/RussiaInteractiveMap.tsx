import React, { useState, useCallback, useMemo } from 'react';
import { RegionCode, RUSSIA_REGIONS, generateStableTemperatureData, regionCoordinates, REGION_CODES, getRegionTitle } from '../../constants/regions';

const RussiaInteractiveMap: React.FC = () => {
  const [hoveredRegion, setHoveredRegion] = useState<RegionCode | null>(null);
  const [currentYearIndex, setCurrentYearIndex] = useState(0);

  // Массив доступных годов
  const years = useMemo(() => [2020, 2021, 2022, 2023, 2024], []);
  const currentYear = years[currentYearIndex];

  // Генерируем стабильные данные с учетом текущего года
  const regionTemperatureData = useMemo(() => {
    return generateStableTemperatureData(12345, currentYear);
  }, [currentYear]); // Регенерируем данные при изменении года

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
      return { title: 'Неизвестный регион', temperature: 0 };
    }

    // Используем предгенерированную температуру
    const temperature = regionTemperatureData[regionCode] || 0;

    return {
      title: regionInfo.title,
      temperature,
      type: regionInfo.type,
      federalDistrict: regionInfo.federalDistrict
    };
  }, [regionTemperatureData]);

  const getTemperatureColor = (temperature: number) => {
    // Цветовая схема на основе температуры
    if (temperature <= -10) return '#1e40af'; // Очень холодно - темно-синий
    if (temperature <= 0) return '#3b82f6';   // Холодно - синий
    if (temperature <= 10) return '#06b6d4';  // Прохладно - голубой
    if (temperature <= 20) return '#10b981';  // Умеренно - зеленый
    if (temperature <= 30) return '#f59e0b';  // Тепло - оранжевый
    return '#ef4444';                         // Жарко - красный
  };

  const getTemperatureHoverColor = (temperature: number) => {
    // Более яркие цвета при наведении
    if (temperature <= -10) return '#1d4ed8'; // Очень холодно - ярче темно-синий
    if (temperature <= 0) return '#2563eb';   // Холодно - ярче синий
    if (temperature <= 10) return '#0891b2';  // Прохладно - ярче голубой
    if (temperature <= 20) return '#059669';  // Умеренно - ярче зеленый
    if (temperature <= 30) return '#d97706';  // Тепло - ярче оранжевый
    return '#dc2626';                         // Жарко - ярче красный
  };

  const getRegionFill = useCallback((regionCode: RegionCode) => {
    const regionData = getRegionData(regionCode);
    return getTemperatureColor(regionData.temperature);
  }, [getRegionData]);

  const getRegionHoverFill = useCallback((regionCode: RegionCode) => {
    const regionData = getRegionData(regionCode);
    return getTemperatureHoverColor(regionData.temperature);
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
                <span className="font-medium">Температура:</span>
                <span className={`ml-1 font-semibold ${getRegionData(hoveredRegion).temperature > 20 ? 'text-red-600' :
                    getRegionData(hoveredRegion).temperature > 0 ? 'text-green-600' :
                      'text-blue-600'
                  }`}>
                  {getRegionData(hoveredRegion).temperature > 0 ? '+' : ''}{getRegionData(hoveredRegion).temperature}°C
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
        Показаны температурные данные за {currentYear} год
      </div>
    </div>
  );
};

export default RussiaInteractiveMap;