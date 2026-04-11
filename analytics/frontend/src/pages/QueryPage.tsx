import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { submitQuery, pollQueryStatus, handleApiError, QueryStatus } from '../utils/api';

const QueryPage: React.FC = () => {
  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<QueryStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!question.trim()) {
      setError('Пожалуйста, введите ваш вопрос');
      return;
    }

    setIsLoading(true);
    setError(null);
    setProcessingStatus(null);

    try {
      // Отправляем запрос в очередь обработки
      const submitResponse = await submitQuery(question.trim());
      console.log('Query submitted:', submitResponse.uid);
      
      setProcessingStatus(submitResponse.status);

      // Начинаем polling статуса
      const result = await pollQueryStatus(
        submitResponse.uid,
        (status) => {
          console.log('Polling status:', status);
          setProcessingStatus(status);
        },
        2000, // Проверяем каждые 2 секунды
        150   // Максимум 5 минут
      );

      console.log('Query completed:', result);

      // Если завершено успешно - редирект на дашборд
      if (result.status === 'completed') {
        navigate('/dashboard');
      } else if (result.status === 'failed') {
        setError(result.error_message || 'Произошла ошибка при обработке запроса');
      }

    } catch (err) {
      const apiError = handleApiError(err);
      setError(apiError.message || 'Произошла ошибка при обработке запроса');
    } finally {
      setIsLoading(false);
      setProcessingStatus(null);
    }
  };

  const handleCancel = () => {
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Задайте ваш вопрос
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Введите вопрос для анализа данных
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="question" className="block text-sm font-medium text-gray-700">
                Ваш вопрос
              </label>
              <div className="mt-1">
                <textarea
                  id="question"
                  name="question"
                  rows={4}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="Например: Сколько учеников в регионах РФ?"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </div>

            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="text-sm text-red-700">
                  {error}
                </div>
              </div>
            )}

            <div className="flex space-x-4">
              <button
                type="submit"
                disabled={isLoading || !question.trim()}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {processingStatus === 'pending' && 'В очереди...'}
                    {processingStatus === 'processing' && 'Обрабатывается...'}
                    {!processingStatus && 'Отправка...'}
                  </div>
                ) : (
                  'Отправить запрос'
                )}
              </button>

              <button
                type="button"
                onClick={handleCancel}
                disabled={isLoading}
                className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Отмена
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default QueryPage;
