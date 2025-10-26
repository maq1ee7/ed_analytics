import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { AuthTokens, ApiError } from '../types/auth';

// Базовый URL API
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Создание экземпляра axios
const api: AxiosInstance = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 10000,
  withCredentials: true, // Для отправки cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

// Функции для работы с токенами в localStorage
export const getAccessToken = (): string | null => {
  return localStorage.getItem('accessToken');
};

export const setAccessToken = (token: string): void => {
  localStorage.setItem('accessToken', token);
};

export const removeAccessToken = (): void => {
  localStorage.removeItem('accessToken');
};

export const getRefreshToken = (): string | null => {
  return localStorage.getItem('refreshToken');
};

export const setRefreshToken = (token: string): void => {
  localStorage.setItem('refreshToken', token);
};

export const removeRefreshToken = (): void => {
  localStorage.removeItem('refreshToken');
};

export const setTokens = (tokens: AuthTokens): void => {
  setAccessToken(tokens.accessToken);
  setRefreshToken(tokens.refreshToken);
};

export const clearTokens = (): void => {
  removeAccessToken();
  removeRefreshToken();
};

// Переменная для отслеживания процесса обновления токена
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null): void => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token);
    }
  });
  
  failedQueue = [];
};

// Request interceptor для добавления токена авторизации
api.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor для обработки ошибок авторизации
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error) => {
    const originalRequest = error.config;

    // Если ошибка 401 и запрос еще не повторялся
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Если токен уже обновляется, добавляем запрос в очередь
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = getRefreshToken();
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        // Пытаемся обновить токен
        const response = await axios.post(`${API_BASE_URL}/api/auth/refresh`, {
          refreshToken
        }, {
          withCredentials: true
        });

        const { accessToken } = response.data;
        setAccessToken(accessToken);
        
        // Обновляем заголовок для повторного запроса
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        
        processQueue(null, accessToken);
        
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        clearTokens();
        
        // Редирект на страницу логина
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// Функция для обработки ошибок API
export const handleApiError = (error: any): ApiError => {
  if (error.response?.data) {
    return error.response.data;
  }
  
  return {
    error: 'Network Error',
    message: error.message || 'Произошла ошибка сети'
  };
};

// Интерфейсы для запросов
export interface QueryRequest {
  question: string;
}

export interface QueryResponse {
  id: number;
  uid: string;
  question: string;
  answer: any; // DashboardData object (JSONB from PostgreSQL)
  dashboard_title: string;
  created_at: string;
}

export interface UserQueriesResponse {
  queries: QueryResponse[];
}

// API методы для работы с запросами
export const submitQuery = async (question: string): Promise<QueryResponse> => {
  const response = await api.post<QueryResponse>('/queries', { question });
  return response.data;
};

export const getUserQueries = async (): Promise<QueryResponse[]> => {
  const response = await api.get<UserQueriesResponse>('/queries');
  return response.data.queries;
};

// Получение дашборда по UID (публичный метод, не требует авторизации)
export const getDashboardByUid = async (uid: string): Promise<QueryResponse> => {
  const response = await api.get<QueryResponse>(`/queries/${uid}`);
  return response.data;
};

// Получение UID последнего дашборда пользователя
export const getLatestDashboardUid = async (): Promise<string | null> => {
  try {
    const queries = await getUserQueries();
    console.log('User queries received:', queries.length);
    if (queries.length === 0) {
      console.log('No queries found for user');
      return null;
    }
    // Запросы уже отсортированы по created_at DESC на backend
    console.log('Latest query UID:', queries[0].uid);
    return queries[0].uid;
  } catch (error) {
    console.error('Error getting latest dashboard UID:', error);
    return null;
  }
};

export default api;
