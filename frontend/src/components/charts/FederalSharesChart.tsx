import React, { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { FederalSharesData } from '../../types/charts';
import { generateFederalSharesData, loadFederalSharesMockData } from '../../utils/mockDataGenerators';

// Регистрируем компоненты Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface FederalSharesChartProps {
  data?: FederalSharesData;
  className?: string;
}

const FederalSharesChart: React.FC<FederalSharesChartProps> = ({ data, className = '' }) => {
  const [chartData, setChartData] = useState<FederalSharesData | null>(null);

  // Загружаем данные при монтировании компонента
  useEffect(() => {
    const loadData = async () => {
      if (data) {
        setChartData(data);
      } else {
        try {
          const mockData = await loadFederalSharesMockData();
          setChartData(mockData);
        } catch (error) {
          console.error('Ошибка загрузки данных Federal Shares:', error);
          // Fallback на сгенерированные данные
          setChartData(generateFederalSharesData());
        }
      }
    };

    loadData();
  }, [data]);

  if (!chartData) {
    return (
      <div className={`flex items-center justify-center h-96 ${className}`}>
        <div className="text-gray-500">Загрузка данных...</div>
      </div>
    );
  }

  // Подготавливаем данные для Chart.js (stacked bar)
  const chartJsData = {
    labels: chartData.years.map(year => year.toString()),
      datasets: chartData.dimensions.map(dimension => ({
      label: dimension.dimension,
      data: chartData.years.map(year => dimension.values[year] || 0),
      backgroundColor: dimension.color,
      borderColor: dimension.color,
      borderWidth: 1,
      borderRadius: 0,
      borderSkipped: false,
    }))
  };

  // Кастомный плагин для отображения значений на сегментах
  const dataLabelsPlugin = {
    id: 'dataLabels',
    afterDatasetsDraw: (chart: any) => {
      const ctx = chart.ctx;
      
      // Для каждого года (индекса данных)
      for (let dataIndex = 0; dataIndex < chart.data.labels.length; dataIndex++) {
        
        // Собираем все видимые элементы для этого года
        const visibleBars: any[] = [];
        chart.data.datasets.forEach((dataset: any, datasetIndex: number) => {
          const meta = chart.getDatasetMeta(datasetIndex);
          const bar = meta.data[dataIndex];
          const value = dataset.data[dataIndex];
          
          if (!meta.hidden && bar && value > 2) {
            visibleBars.push({
              bar,
              value,
              dataset,
              datasetIndex
            });
          }
        });
        
        // Рассчитываем позиции на основе реальных координат элементов
        visibleBars.forEach((item) => {
          const { bar, value } = item;
          const { x, y, width } = bar;
          
          // Настройки текста
          ctx.save();
          ctx.font = 'bold 11px Arial';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          
          const text = value.toFixed(1);
          
          // Используем реальные координаты элемента Chart.js
          const textX = x - width / 2;
          const textY = y;
          
          // Сначала рисуем обводку (темную)
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
          ctx.lineWidth = 3;
          ctx.strokeText(text, textX, textY);
          
          // Затем рисуем основной текст (белый)
          ctx.fillStyle = '#ffffff';
          ctx.fillText(text, textX, textY);
          
          ctx.restore();
        });
      }
    }
  };

  const options = {
    indexAxis: 'y' as const, // Горизонтальные столбцы
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        stacked: true, // Включаем stacked режим для оси X
        beginAtZero: true,
        ticks: {
          callback: function(value: any) {
            return value + '%';
          },
          font: {
            size: 11,
          },
          color: '#6b7280',
        },
        grid: {
          color: '#f3f4f6',
        },
        title: {
          display: true,
          text: 'Percentage',
          font: {
            size: 12,
            weight: 'bold' as const,
          },
          color: '#374151',
        }
      },
      y: {
        stacked: true, // Включаем stacked режим для оси Y
        ticks: {
          font: {
            size: 12,
            weight: 'bold' as const,
          },
          color: '#374151',
        },
        grid: {
          display: false,
        },
      },
    },
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          padding: 20,
          usePointStyle: true,
          font: {
            size: 11,
          },
          generateLabels: function(chart: any) {
            const original = ChartJS.defaults.plugins.legend.labels.generateLabels;
            const labels = original.call(this, chart);
            
            // Группируем по 5 элементов в ряд
            return labels.map((label: any) => ({
              ...label,
              text: label.text
            }));
          }
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
            const value = context.parsed.x;
            return `${label}: ${value.toFixed(1)}%`;
          },
          afterLabel: function(context: any) {
            // Показываем накопительную сумму
            const datasetIndex = context.datasetIndex;
            const dataIndex = context.dataIndex;
            let total = 0;
            
            for (let i = 0; i <= datasetIndex; i++) {
              total += context.chart.data.datasets[i].data[dataIndex];
            }
            
            return `Накопительно: ${total.toFixed(1)}%`;
          }
        }
      },
      title: {
        display: true,
        text: chartData.title,
        font: {
          size: 18,
          weight: 'bold' as const,
        },
        color: '#1f2937',
        padding: {
          bottom: 20
        }
      }
    },
    layout: {
      padding: {
        top: 10,
        bottom: 10,
        left: 10,
        right: 10,
      }
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-lg p-6 ${className}`}>
      {/* Дополнительная информация */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>Показатели d1-d10</span>
          <span>Годы: {chartData.years.join(', ')}</span>
        </div>
      </div>

      {/* Диаграмма */}
      <div className="relative h-96">
        <Bar data={chartJsData} options={options} plugins={[dataLabelsPlugin]} />
      </div>

      {/* Информация о данных */}
      <div className="mt-4 text-center text-xs text-gray-500">
        Федеральные доли по {chartData.dimensions.length} показателям за {chartData.years.length} года
      </div>
    </div>
  );
};

export default FederalSharesChart;
