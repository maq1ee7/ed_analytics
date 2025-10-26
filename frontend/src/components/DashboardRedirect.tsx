import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getLatestDashboardUid } from '../utils/api';

const DashboardRedirect: React.FC = () => {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [latestUid, setLatestUid] = useState<string | null>(null);
  const [isCheckingUid, setIsCheckingUid] = useState(true);

  useEffect(() => {
    const checkLatestDashboard = async (): Promise<void> => {
      // Ждём окончания проверки авторизации
      if (authLoading) {
        return;
      }

      // Если пользователь не авторизован, сразу редирект на логин
      if (!isAuthenticated) {
        setIsCheckingUid(false);
        return;
      }

      // Если авторизован, пытаемся получить последний дашборд
      try {
        const uid = await getLatestDashboardUid();
        console.log('Latest dashboard UID:', uid);
        setLatestUid(uid);
      } catch (error) {
        console.error('Error fetching latest dashboard:', error);
        setLatestUid(null);
      } finally {
        setIsCheckingUid(false);
      }
    };

    checkLatestDashboard();
  }, [isAuthenticated, authLoading]);

  // Показываем loader во время проверки
  if (authLoading || isCheckingUid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center space-y-3">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          <p className="text-gray-600">Загрузка...</p>
        </div>
      </div>
    );
  }

  // Если не авторизован - редирект на логин
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Если авторизован и есть последний дашборд - редирект на него
  if (latestUid) {
    console.log('Redirecting to dashboard:', `/dashboard/${latestUid}`);
    return <Navigate to={`/dashboard/${latestUid}`} replace />;
  }

  // Если авторизован, но нет дашбордов - редирект на страницу создания запроса
  console.log('No dashboards found, redirecting to /query');
  return <Navigate to="/query" replace />;
};

export default DashboardRedirect;

