import React, { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import { Radar } from 'react-chartjs-2';
import { RadarChartDataset } from '../../types/charts';
import { generateRadarChartData, loadRadarChartMockData } from '../../utils/mockDataGenerators';

// Регистрируем компоненты Chart.js
ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

interface RadarChartProps {
  data?: RadarChartDataset;
  className?: string;
}

const RadarChart: React.FC<RadarChartProps> = ({ data, className = '' }) => {
  const [currentYearIndex, setCurrentYearIndex] = useState(0);
  const [chartData, setChartData] = useState<RadarChartDataset | null>(null);

  // Загружаем данные при монтировании компонента
  useEffect(() => {
    const loadData = async () => {
      if (data) {
        setChartData(data);
      } else {
        try {
          const mockData = await loadRadarChartMockData();
          setChartData(mockData);
        } catch (error) {
          console.error('Ошибка загрузки данных:', error);
          // Fallback на сгенерированные данные
          setChartData(generateRadarChartData());
        }
      }
    };

    loadData();
  }, [data]);

  if (!chartData || !chartData.years.length) {
    return (
      <div className={`flex items-center justify-center h-96 ${className}`}>
        <div className="text-gray-500">Загрузка данных...</div>
      </div>
    );
  }

  const currentYearData = chartData.years[currentYearIndex];
  const years = chartData.years.map(y => y.year);

  // Подготавливаем данные для Chart.js
  const chartJsData = {
    labels: currentYearData.axes,
    datasets: currentYearData.regions.map(region => ({
      label: region.regionName,
      data: region.values,
      backgroundColor: region.color + '20', // Добавляем прозрачность
      borderColor: region.color,
      borderWidth: 2,
      pointBackgroundColor: region.color,
      pointBorderColor: '#fff',
      pointHoverBackgroundColor: '#fff',
      pointHoverBorderColor: region.color,
      pointRadius: 4,
      pointHoverRadius: 6,
    }))
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          padding: 20,
          usePointStyle: true,
          font: {
            size: 12,
          },
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: '#374151',
        borderWidth: 1,
        callbacks: {
          label: function(context: any) {
            const label = context.dataset.label || '';
            const value = context.parsed.r;
            return `${label}: ${(value * 100).toFixed(1)}%`;
          }
        }
      }
    },
    scales: {
      r: {
        beginAtZero: true,
        min: 0,
        max: currentYearData.maxValue,
        ticks: {
          stepSize: 0.2,
          callback: function(value: any) {
            return (value * 100).toFixed(0) + '%';
          },
          font: {
            size: 10,
          },
          color: '#6b7280',
        },
        grid: {
          color: '#e5e7eb',
        },
        angleLines: {
          color: '#e5e7eb',
        },
        pointLabels: {
          font: {
            size: 12,
            weight: 'bold' as const,
          },
          color: '#374151',
        },
      },
    },
  };

  const handlePrevYear = () => {
    setCurrentYearIndex(prev => 
      prev === 0 ? chartData.years.length - 1 : prev - 1
    );
  };

  const handleNextYear = () => {
    setCurrentYearIndex(prev => 
      prev === chartData.years.length - 1 ? 0 : prev + 1
    );
  };

  return (
    <div className={`bg-white rounded-lg shadow-lg p-6 ${className}`}>
      {/* Заголовок с каруселью годов */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-gray-800">
          Региональные показатели d1-d10
        </h3>
        
        <div className="flex items-center space-x-4">
          <button
            onClick={handlePrevYear}
            className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors duration-200"
            aria-label="Предыдущий год"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <div className="text-lg font-semibold text-gray-800 min-w-[60px] text-center">
            {currentYearData.year}
          </div>
          
          <button
            onClick={handleNextYear}
            className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors duration-200"
            aria-label="Следующий год"
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
            />
          ))}
        </div>
      </div>

      {/* Диаграмма */}
      <div className="relative h-96">
        <Radar data={chartJsData} options={options} />
      </div>

      {/* Информация о текущем годе */}
      <div className="mt-4 text-center text-sm text-gray-600">
        Показано {currentYearData.regions.length} регионов за {currentYearData.year} год
      </div>
    </div>
  );
};

export default RadarChart;
