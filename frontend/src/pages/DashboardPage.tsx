import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api, { handleApiError } from '../utils/api';
import QueriesHistory from '../components/QueriesHistory';

interface DashboardData {
  message: string;
  timestamp: string;
  environment: string;
  user: {
    id: number;
    username: string;
    role: string;
  };
}

const DashboardPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDashboardData = async (): Promise<void> => {
      try {
        setIsLoading(true);
        const response = await api.get('/hello');
        setDashboardData(response.data);
      } catch (err) {
        const apiError = handleApiError(err);
        setError(apiError.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const handleLogout = async (): Promise<void> => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleLogoutKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleLogout();
    }
  };

  const handleAskQuestion = (): void => {
    navigate('/query');
  };



  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-gray-600">Загрузка дашборда...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Навигационная панель */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                Система аналитики образования
              </h1>
            </div>
            
            <div className="flex items-center space-x-4">
              {user && (
                <div className="flex items-center space-x-3">
                  <div className="text-sm">
                    <p className="text-gray-900 font-medium">{user.username}</p>
                  </div>
                  
                  <button
                    onClick={handleLogout}
                    onKeyDown={handleLogoutKeyDown}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    aria-label="Выйти из системы"
                    tabIndex={0}
                  >
                    Выйти
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Основной контент с боковой панелью */}
      <div className="flex" style={{ height: 'calc(100vh - 4rem)' }}>
        {/* Левая панель - История запросов */}
        <div className="w-1/4 min-w-80">
          <QueriesHistory />
        </div>

        {/* Правая панель - Основной контент */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto py-6 sm:px-6 lg:px-8">
            <div className="px-4 py-6 sm:px-0">
          {error ? (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              <strong className="font-bold">Ошибка загрузки данных</strong>
              <p className="mt-2">{error}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {/* Приветственная карточка */}
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h2 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    Добро пожаловать в систему!
                  </h2>
                  
                  {dashboardData && (
                    <div className="space-y-4">
                      <div className="bg-green-50 border border-green-200 rounded-md p-4">
                        <p className="text-green-800 font-medium">{dashboardData.message}</p>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="bg-gray-50 rounded-md p-3">
                          <p className="text-sm font-medium text-gray-600">Время подключения</p>
                          <p className="text-sm text-gray-900">
                            {new Date(dashboardData.timestamp).toLocaleString('ru-RU')}
                          </p>
                        </div>
                        
                        <div className="bg-gray-50 rounded-md p-3">
                          <p className="text-sm font-medium text-gray-600">Окружение</p>
                          <p className="text-sm text-gray-900 capitalize">
                            {dashboardData.environment}
                          </p>
                        </div>
                      </div>
                      
                      {/* Кнопка "Задать вопрос" */}
                      <div className="pt-4 border-t border-gray-200">
                        <button
                          onClick={handleAskQuestion}
                          className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-md transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                          📊 Задать вопрос для анализа
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Информация о пользователе */}
              {user && (
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                      Информация о пользователе
                    </h3>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-600">ID пользователя</p>
                        <p className="text-sm text-gray-900">{user.id}</p>
                      </div>
                      
                      <div>
                        <p className="text-sm font-medium text-gray-600">Имя пользователя</p>
                        <p className="text-sm text-gray-900">{user.username}</p>
                      </div>
                      
                    </div>
                  </div>
                </div>
              )}

              {/* Функциональные блоки */}
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    Доступные функции
                  </h3>
                  
                  <div className="text-center py-8">
                    <p className="text-gray-500">
                      Здесь будут размещены основные функции системы аналитики образования
                    </p>
                    <p className="text-sm text-gray-400 mt-2">
                      Функционал будет добавлен в следующих версиях
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardPage;
