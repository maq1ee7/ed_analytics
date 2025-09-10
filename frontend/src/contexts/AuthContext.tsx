import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, AuthContextType, LoginRequest } from '../types/auth';
import api, { setTokens, clearTokens, getAccessToken, handleApiError } from '../utils/api';

// Создание контекста
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Провайдер контекста
interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Проверка аутентификации при загрузке
  useEffect(() => {
    const checkAuth = async (): Promise<void> => {
      try {
        const token = getAccessToken();
        if (!token) {
          setIsLoading(false);
          return;
        }

        // Проверяем валидность токена
        const response = await api.get('/auth/me');
        setUser(response.data.user);
      } catch (error) {
        console.error('Auth check failed:', error);
        clearTokens();
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Функция входа
  const login = async (credentials: LoginRequest): Promise<void> => {
    try {
      setIsLoading(true);
      
      const response = await api.post('/auth/login', credentials);
      const { user: userData, tokens } = response.data;
      
      // Сохраняем токены
      setTokens(tokens);
      setUser(userData);
      
      console.log('Login successful:', userData);
    } catch (error) {
      console.error('Login failed:', error);
      const apiError = handleApiError(error);
      throw new Error(apiError.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Функция выхода
  const logout = async (): Promise<void> => {
    try {
      setIsLoading(true);
      
      // Отправляем запрос на выход (очистка refresh token на сервере)
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout request failed:', error);
      // Продолжаем выход даже если запрос не прошел
    } finally {
      // Очищаем локальные данные
      clearTokens();
      setUser(null);
      setIsLoading(false);
      
      // Редирект на страницу логина
      window.location.href = '/login';
    }
  };

  // Функция обновления токена
  const refreshToken = async (): Promise<boolean> => {
    try {
      const response = await api.post('/auth/refresh');
      const { accessToken, user: userData } = response.data;
      
      // Обновляем access token
      localStorage.setItem('accessToken', accessToken);
      setUser(userData);
      
      return true;
    } catch (error) {
      console.error('Token refresh failed:', error);
      clearTokens();
      setUser(null);
      return false;
    }
  };

  const isAuthenticated = !!user;

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    login,
    logout,
    refreshToken,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Хук для использования контекста
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
