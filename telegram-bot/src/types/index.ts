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
  // Дополнительные данные для расширенного сообщения
  chartDescription?: string;
  yearlyData?: Array<{ year: number; value: number | null }>;
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
  timeoutId?: NodeJS.Timeout;
  // Для уточнения запросов (множественный выбор)
  pendingClarification?: {
    originalQuery: string;
    suggestions: ClarificationSuggestion[];
    selectedIds: Set<number>;  // Выбранные варианты
    messageId?: number;        // ID сообщения с кнопками для редактирования
  };
}

// Вариант уточнения запроса (без технических полей)
export interface ClarificationSuggestion {
  id: number;
  label: string;        // Короткий ярлык для кнопки (1-2 слова, макс 15 символов)
  description: string;  // Подробное описание (30-80 символов)
}

// Результат уточнения запроса от API
export interface ClarificationResult {
  suggestions: ClarificationSuggestion[];
  reasoning?: string;
}

// Ответ от API уточнений
export interface ClarificationResponse {
  success: boolean;
  clarifications: ClarificationResult;
}

