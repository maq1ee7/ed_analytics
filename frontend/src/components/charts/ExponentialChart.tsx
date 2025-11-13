import React, { useMemo, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
  TooltipItem,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { ExponentialChartData } from '../../types/charts';

// Регистрируем компоненты Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface ExponentialChartProps {
  data?: ExponentialChartData;
  className?: string;
}

// Цвета для разных годов
const YEAR_COLORS = [
  { border: 'rgb(59, 130, 246)', background: 'rgba(59, 130, 246, 0.1)' },   // Синий
  { border: 'rgb(16, 185, 129)', background: 'rgba(16, 185, 129, 0.1)' },   // Зелёный
  { border: 'rgb(239, 68, 68)', background: 'rgba(239, 68, 68, 0.1)' },     // Красный
  { border: 'rgb(245, 158, 11)', background: 'rgba(245, 158, 11, 0.1)' },   // Оранжевый
  { border: 'rgb(139, 92, 246)', background: 'rgba(139, 92, 246, 0.1)' },   // Фиолетовый
];

const ExponentialChart: React.FC<ExponentialChartProps> = ({ data, className = '' }) => {
  const [currentYearIndex, setCurrentYearIndex] = useState(0);

  if (!data || !data.years || data.years.length === 0) {
    return (
      <div className={`flex items-center justify-center h-96 ${className}`}>
        <div className="text-gray-500">Нет данных для отображения</div>
      </div>
    );
  }

  const years = data.years;
  const currentYearData = years[currentYearIndex];

  // Генерируем данные один раз при монтировании компонента
  const chartData = useMemo(() => {
    const color = YEAR_COLORS[currentYearIndex % YEAR_COLORS.length];
    
    return {
      labels: currentYearData.points.map(point => point.x.toFixed(2)),
      datasets: [
        {
          label: `Год ${currentYearData.year}`,
          data: currentYearData.points.map(point => point.y),
          borderColor: color.border,
          backgroundColor: color.background,
          borderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 6,
          pointBackgroundColor: color.border,
          pointBorderColor: '#ffffff',
          pointBorderWidth: 1,
          tension: 0.3,
          fill: true,
        },
      ],
    };
  }, [currentYearData, currentYearIndex]);

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          font: {
            size: 12,
            family: 'Inter, sans-serif',
          },
        },
      },
      title: {
        display: true,
        text: 'График экспоненциальной функции',
        font: {
          size: 16,
          weight: 'bold',
          family: 'Inter, sans-serif',
        },
        padding: {
          bottom: 20,
        },
      },
      tooltip: {
        enabled: true,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 1,
        displayColors: false,
        callbacks: {
          title: (context: TooltipItem<'line'>[]) => {
            return `X: ${context[0].label}`;
          },
          label: (context: TooltipItem<'line'>) => {
            const yValue = context.parsed.y ?? 0;
            return `Y: ${parseFloat(yValue.toString()).toFixed(2)}`;
          },
        },
      },
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'X значения',
          font: {
            size: 12,
            weight: 'bold',
            family: 'Inter, sans-serif',
          },
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
        ticks: {
          font: {
            size: 10,
            family: 'Inter, sans-serif',
          },
        },
      },
      y: {
        display: true,
        title: {
          display: true,
          text: 'Y значения',
          font: {
            size: 12,
            weight: 'bold',
            family: 'Inter, sans-serif',
          },
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
        ticks: {
          font: {
            size: 10,
            family: 'Inter, sans-serif',
          },
          callback: function(value: string | number) {
            return parseFloat(value.toString()).toFixed(1);
          },
        },
      },
    },
    interaction: {
      intersect: false,
      mode: 'index',
    },
    elements: {
      point: {
        hoverBackgroundColor: 'rgb(59, 130, 246)',
        hoverBorderColor: '#ffffff',
        hoverBorderWidth: 2,
      },
    },
  };

  const handlePrevYear = () => {
    setCurrentYearIndex(prev => 
      prev === 0 ? years.length - 1 : prev - 1
    );
  };

  const handleNextYear = () => {
    setCurrentYearIndex(prev => 
      prev === years.length - 1 ? 0 : prev + 1
    );
  };

  return (
    <div className={`bg-white p-6 rounded-lg shadow-md border border-gray-200 ${className}`}>
      {/* Заголовок с каруселью годов */}
      {years.length > 1 && (
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-800">
            График экспоненциальной функции
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
      )}

      {/* Индикаторы годов */}
      {years.length > 1 && (
        <div className="flex justify-center mb-4">
          <div className="flex space-x-2">
            {years.map((year, index) => (
              <button
                key={year.year}
                onClick={() => setCurrentYearIndex(index)}
                className={`w-3 h-3 rounded-full transition-colors duration-200 ${
                  index === currentYearIndex
                    ? 'bg-blue-500'
                    : 'bg-gray-300 hover:bg-gray-400'
                }`}
                aria-label={`Перейти к ${year.year} году`}
              />
            ))}
          </div>
        </div>
      )}

      <div className="h-80">
        <Line data={chartData} options={options} />
      </div>

      {/* Информация о текущем годе */}
      <div className="mt-4 text-center text-sm text-gray-600">
        Показано {currentYearData.points.length} точек за {currentYearData.year} год
      </div>
    </div>
  );
};

export default ExponentialChart;
