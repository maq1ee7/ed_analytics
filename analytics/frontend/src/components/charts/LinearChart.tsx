import React from 'react';
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
import { LinearChartData } from '../../types/charts';

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

interface LinearChartProps {
  data?: LinearChartData;
  className?: string;
}

const LinearChart: React.FC<LinearChartProps> = ({ data, className = '' }) => {
  if (!data || !data.years || data.years.length === 0 || !data.years[0].points || data.years[0].points.length === 0) {
    return (
      <div className={`flex items-center justify-center h-96 ${className}`}>
        <div className="text-gray-500">Нет данных для отображения</div>
      </div>
    );
  }

  // Берем первый элемент из массива years (график для одного набора данных)
  const chartPoints = data.years[0].points;

  // Фильтруем точки с null значениями для отображения
  const validPoints = chartPoints.filter(point => point.y !== null);

  if (validPoints.length === 0) {
    return (
      <div className={`flex items-center justify-center h-96 ${className}`}>
        <div className="text-gray-500">Нет данных для отображения</div>
      </div>
    );
  }

  const chartData = {
    labels: validPoints.map(point => point.x.toString()),
    datasets: [
      {
        label: 'Значение',
        data: validPoints.map(point => point.y),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 7,
        pointBackgroundColor: 'rgb(59, 130, 246)',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        tension: 0.3,
        fill: true,
      },
    ],
  };

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
        text: 'Линейный график',
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
            return `Год: ${context[0].label}`;
          },
          label: (context: TooltipItem<'line'>) => {
            const yValue = context.parsed.y ?? 0;
            return `Значение: ${yValue.toLocaleString('ru-RU')}`;
          },
        },
      },
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Год',
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
          text: 'Значение',
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
            return parseFloat(value.toString()).toLocaleString('ru-RU');
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

  return (
    <div className={`bg-white p-6 rounded-lg shadow-md border border-gray-200 ${className}`}>
      <div className="h-80">
        <Line data={chartData} options={options} />
      </div>

      {/* Информация о количестве точек */}
      <div className="mt-4 text-center text-sm text-gray-600">
        Показано {validPoints.length} точек данных
      </div>
    </div>
  );
};

export default LinearChart;

