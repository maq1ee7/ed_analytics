/**
 * Типы для Telegram бота
 */

// Интерфейс уведомления из Bull queue
export interface TelegramNotification {
  chatId: number;
  uid: string;
  status: 'completed' | 'failed';
  dashboardUrl?: string;
  errorMessage?: string;
}

// Ответ от Backend API при создании запроса
export interface BackendQueryResponse {
  uid: string;
  status: string;
  question: string;
  message: string;
  created_at: string;
}

// Контекст сессии пользователя (для отслеживания активных запросов)
export interface UserSession {
  chatId: number;
  username?: string;
  activeQueryUid?: string;
  queryStartTime?: number;
}

