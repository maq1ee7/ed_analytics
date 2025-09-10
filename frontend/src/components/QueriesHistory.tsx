import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUserQueries, handleApiError, QueryResponse } from '../utils/api';

const QueriesHistory: React.FC = () => {
  const [queries, setQueries] = useState<QueryResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchQueries = async (): Promise<void> => {
      try {
        setIsLoading(true);
        setError(null);
        const userQueries = await getUserQueries();
        setQueries(userQueries);
      } catch (err) {
        const apiError = handleApiError(err);
        setError(apiError.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchQueries();
  }, []);

  const handleNewQuery = (): void => {
    navigate('/query');
  };

  const handleNewQueryKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleNewQuery();
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const truncateQuestion = (question: string, maxLength: number = 50): string => {
    if (question.length <= maxLength) {
      return question;
    }
    return question.substring(0, maxLength) + '...';
  };

  return (
    <div className="h-full bg-white border-r border-gray-200 flex flex-col">
      {/* Заголовок панели */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">
          История запросов
        </h2>
      </div>

      {/* Кнопка "Новый запрос" */}
      <div className="p-4 border-b border-gray-200">
        <button
          onClick={handleNewQuery}
          onKeyDown={handleNewQueryKeyDown}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-md transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          aria-label="Создать новый запрос"
          tabIndex={0}
        >
          ➕ Новый запрос
        </button>
      </div>

      {/* Содержимое списка */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 text-center">
            <div className="flex flex-col items-center space-y-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              <p className="text-sm text-gray-600">Загрузка...</p>
            </div>
          </div>
        ) : error ? (
          <div className="p-4">
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        ) : queries.length === 0 ? (
          <div className="p-4 text-center">
            <div className="text-gray-500">
              <p className="text-sm">У вас пока нет запросов</p>
              <p className="text-xs mt-1">Нажмите "Новый запрос" чтобы начать</p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {queries.map((query) => (
              <div
                key={query.id}
                className="p-4 hover:bg-gray-50 transition duration-150 ease-in-out"
              >
                <div className="space-y-2">
                  <div className="text-sm font-medium text-gray-900">
                    {truncateQuestion(query.question)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatDate(query.created_at)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default QueriesHistory;
