import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import QueriesHistory from '../components/QueriesHistory';
import ChartsGrid from '../components/Dashboard/ChartsGrid';
import SnackBar from '../components/SnackBar';

const DashboardPage: React.FC = () => {
  const { uid } = useParams<{ uid?: string }>();
  const navigate = useNavigate();
  const { user, logout, isAuthenticated } = useAuth();

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

  const handleLogin = (): void => {
    navigate('/login');
  };

  const handleLoginKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleLogin();
    }
  };


  return (
    <div className="min-h-screen bg-gray-50">
      {/* SnackBar для неавторизованных пользователей */}
      {!isAuthenticated && uid && (
        <SnackBar
          message="Авторизуйтесь, чтобы создать свой дашборд"
          show={true}
        />
      )}

      {/* Навигационная панель */}
      <nav className="bg-white shadow-sm">
        <div className="w-full pr-4 sm:pr-6 lg:pr-8">
          <div className="flex justify-between h-16">
            {/* Заголовок показываем только для авторизованных */}
            {isAuthenticated && (
              <div className="flex items-center">
                <h1 className="text-lg font-semibold text-gray-900 p-4">
                  Система аналитики образования
                </h1>
              </div>
            )}
            
            {/* Для неавторизованных - пустой div для выравнивания */}
            {!isAuthenticated && <div></div>}
            
            <div className="flex items-center space-x-4">
              {isAuthenticated && user ? (
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
              ) : (
                <button
                  onClick={handleLogin}
                  onKeyDown={handleLoginKeyDown}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  aria-label="Войти в систему"
                  tabIndex={0}
                >
                  Войти
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Основной контент с боковой панелью */}
      <div className="flex" style={{ height: 'calc(100vh - 4rem)' }}>
        {/* Левая панель - История запросов (только для авторизованных) */}
        {isAuthenticated && (
          <div className="w-1/4 min-w-80">
            <QueriesHistory />
          </div>
        )}

        {/* Правая панель - Основной контент */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
            <div className="px-4 py-6 sm:px-0">
              <ChartsGrid uid={uid} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardPage;
