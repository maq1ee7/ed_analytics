import React, { useState, useEffect } from 'react';
import ExponentialChart from '../charts/ExponentialChart';
import RussiaInteractiveMap from '../charts/RussiaInteractiveMap';
import RadarChart from '../charts/RadarChart';
import FederalSharesChart from '../charts/FederalSharesChart';
import { 
  DashboardData, 
  ExponentialChartData, 
  FederalSharesChartData, 
  RadarChartDataFromJSON, 
  RussiaMapChartData 
} from '../../types/charts';

const ChartsGrid: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/data/dashboardExample.json');
        
        if (!response.ok) {
          throw new Error('Не удалось загрузить данные дашборда');
        }
        
        const data: DashboardData = await response.json();
        setDashboardData(data);
        setError(null);
      } catch (err) {
        console.error('Ошибка загрузки данных дашборда:', err);
        setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-500 text-lg">Загрузка данных...</div>
      </div>
    );
  }

  if (error || !dashboardData) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-red-500 text-lg">Ошибка загрузки: {error || 'Данные не найдены'}</div>
      </div>
    );
  }

  // Извлекаем данные для каждого графика
  const exponentialData = dashboardData.dashboard.charts.find(c => c.type === 'exponential')?.data as ExponentialChartData | undefined;
  const federalSharesData = dashboardData.dashboard.charts.find(c => c.type === 'federal_shares')?.data as FederalSharesChartData | undefined;
  const radarData = dashboardData.dashboard.charts.find(c => c.type === 'radar')?.data as RadarChartDataFromJSON | undefined;
  const mapData = dashboardData.dashboard.charts.find(c => c.type === 'russia_map')?.data as RussiaMapChartData | undefined;

  return (
    <div className="space-y-6">
      {/* Первый ряд - основной график */}
      {exponentialData && (
        <div className="w-full min-h-0">
          <ExponentialChart data={exponentialData} />
        </div>
      )}

      {/* Второй ряд - региональные показатели */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {radarData && (
          <div className="w-full min-h-0">
            <RadarChart data={radarData} />
          </div>
        )}
        {federalSharesData && (
          <div className="w-full min-h-0">
            <FederalSharesChart data={federalSharesData} />
          </div>
        )}
      </div>

      {/* Третий ряд - карта на всю ширину */}
      {mapData && (
        <div className="w-full">
          <RussiaInteractiveMap data={mapData} />
        </div>
      )}
    </div>
  );
};

export default ChartsGrid;
