import React, { useState, useEffect } from 'react';
import LinearChart from '../charts/LinearChart';
import RussiaInteractiveMap from '../charts/RussiaInteractiveMap';
import RadarChart from '../charts/RadarChart';
import FederalSharesChart from '../charts/FederalSharesChart';
import { 
  DashboardData, 
  LinearChartData, 
  FederalSharesChartData, 
  RadarChartDataFromJSON, 
  RussiaMapChartData 
} from '../../types/charts';
import { getDashboardByUid, handleApiError } from '../../utils/api';

interface ChartsGridProps {
  uid?: string;
}

const ChartsGrid: React.FC<ChartsGridProps> = ({ uid }) => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Если нет UID - не загружаем ничего
    if (!uid) {
      setIsLoading(false);
      setDashboardData(null);
      setError(null);
      return;
    }
    
    let isCancelled = false; // Флаг для отмены запроса
    
    const loadDashboardData = async () => {
      try {
        setIsLoading(true);
        
        // Загружаем данные по UID из API
        const response = await getDashboardByUid(uid);
        
        // Проверяем, не отменен ли запрос
        if (isCancelled) {
          return;
        }
        
        // answer уже объект DashboardData (PostgreSQL JSONB автоматически парсится)
        const data: DashboardData = response.answer as unknown as DashboardData;
        setDashboardData(data);
        setError(null);
      } catch (err) {
        console.error('Ошибка загрузки данных дашборда:', err);
        
        // Не обновляем состояние если запрос отменен
        if (isCancelled) {
          return;
        }
        
        const apiError = handleApiError(err);
        setError(apiError.message || 'Неизвестная ошибка');
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    loadDashboardData();
    
    // Cleanup function - отменяет запрос при размонтировании или изменении uid
    return () => {
      isCancelled = true;
    };
  }, [uid]);

  // Если нет UID - показываем сообщение
  if (!uid) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="text-gray-400 mb-4">
            <svg className="w-20 h-20 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div className="text-gray-600 text-lg font-medium">Дашборд не выбран</div>
          <div className="text-gray-500 text-sm mt-2">Выберите дашборд из истории запросов</div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center space-y-3">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          <p className="text-gray-600">Загрузка дашборда...</p>
        </div>
      </div>
    );
  }

  if (error || !dashboardData) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="text-red-400 mb-4">
            <svg className="w-20 h-20 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="text-red-600 text-lg font-medium">Ошибка загрузки дашборда</div>
          <div className="text-gray-600 text-sm mt-2">{error || 'Данные не найдены'}</div>
        </div>
      </div>
    );
  }

  // Извлекаем данные для каждого графика
  const linearData = dashboardData.dashboard.charts.find(c => c.type === 'linear')?.data as LinearChartData | undefined;
  const federalSharesData = dashboardData.dashboard.charts.find(c => c.type === 'federal_shares')?.data as FederalSharesChartData | undefined;
  const radarData = dashboardData.dashboard.charts.find(c => c.type === 'radar')?.data as RadarChartDataFromJSON | undefined;
  const mapData = dashboardData.dashboard.charts.find(c => c.type === 'russia_map')?.data as RussiaMapChartData | undefined;

  return (
    <div className="space-y-6">
      {/* Линейный график */}
      {linearData && (
        <div className="w-full min-h-0">
          <LinearChart data={linearData} />
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
