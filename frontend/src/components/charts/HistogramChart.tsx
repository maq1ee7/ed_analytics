import React, { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
  TooltipItem,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { generateNormalDistributionData } from '../../utils/mockDataGenerators';

// Регистрируем компоненты Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const HistogramChart: React.FC = () => {
  // Генерируем данные один раз при монтировании компонента
  const chartData = useMemo(() => {
    const data = generateNormalDistributionData(25);
    
    return {
      labels: data.map(item => item.label),
      datasets: [
        {
          label: 'Частота',
          data: data.map(item => item.frequency),
          backgroundColor: 'rgba(16, 185, 129, 0.6)',
          borderColor: 'rgb(16, 185, 129)',
          borderWidth: 1,
          borderRadius: 2,
          borderSkipped: false,
        },
      ],
    };
  }, []);

  const options: ChartOptions<'bar'> = {
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
        text: 'Гистограмма нормального распределения',
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
        borderColor: 'rgb(16, 185, 129)',
        borderWidth: 1,
        displayColors: false,
        callbacks: {
          title: (context: TooltipItem<'bar'>[]) => {
            return `Значение: ${context[0].label}`;
          },
          label: (context: TooltipItem<'bar'>) => {
            return `Частота: ${context.parsed.y}`;
          },
        },
      },
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Значения (стандартное отклонение)',
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
          maxRotation: 45,
          minRotation: 0,
        },
      },
      y: {
        display: true,
        title: {
          display: true,
          text: 'Частота',
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
          stepSize: 5,
        },
        beginAtZero: true,
      },
    },
    interaction: {
      intersect: false,
      mode: 'index',
    },
    elements: {
      bar: {
        hoverBackgroundColor: 'rgba(16, 185, 129, 0.8)',
        hoverBorderColor: 'rgb(16, 185, 129)',
        hoverBorderWidth: 2,
      },
    },
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
      <div className="h-80">
        <Bar data={chartData} options={options} />
      </div>
    </div>
  );
};

export default HistogramChart;
