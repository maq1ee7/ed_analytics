import { Queue } from 'bullmq';

/**
 * Redis connection configuration
 */
const getConnection = () => ({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
});

/**
 * Интерфейс для уведомления о веб-поиске в Telegram
 */
export interface WebSearchNotification {
  chatId: number;
  uid: string;
  searchMode: 'fast' | 'deep';
  content: string;
  sources?: string[];
  query: string;
}

/**
 * Сервис для работы с очередью уведомлений о веб-поиске (BullMQ)
 */
export class WebSearchQueueService {
  private static instance: WebSearchQueueService;
  private queue: Queue<WebSearchNotification>;

  private constructor() {
    const connection = getConnection();

    console.log(`[WebSearchQueue] Connecting to Redis at ${connection.host}:${connection.port}`);

    // Создаем очередь BullMQ для уведомлений о веб-поиске
    this.queue = new Queue<WebSearchNotification>('telegram-web-search', {
      connection,
      defaultJobOptions: {
        attempts: 3, // 3 попытки отправки уведомления
        removeOnComplete: true,
        removeOnFail: false,
        backoff: {
          type: 'exponential',
          delay: 2000, // Задержка между попытками: 2s, 4s, 8s
        },
      },
    });

    console.log('[WebSearchQueue] Web search queue initialized');
  }

  /**
   * Singleton pattern
   */
  static getInstance(): WebSearchQueueService {
    if (!WebSearchQueueService.instance) {
      WebSearchQueueService.instance = new WebSearchQueueService();
    }
    return WebSearchQueueService.instance;
  }

  /**
   * Возвращает конфигурацию подключения к Redis
   */
  static getConnection() {
    return getConnection();
  }

  /**
   * Добавляет уведомление о веб-поиске в очередь
   */
  async addNotification(notification: WebSearchNotification): Promise<void> {
    console.log(`[WebSearchQueue] Adding web search notification for chat ${notification.chatId}, uid: ${notification.uid}, mode: ${notification.searchMode}`);

    await this.queue.add('websearch', notification, {
      jobId: `websearch-${notification.uid}-${Date.now()}`, // Уникальный ID
    });
  }

  /**
   * Получает очередь (для статистики)
   */
  getQueue(): Queue<WebSearchNotification> {
    return this.queue;
  }

  /**
   * Закрывает соединение (graceful shutdown)
   */
  async close(): Promise<void> {
    console.log('[WebSearchQueue] Closing web search queue...');
    await this.queue.close();
    console.log('[WebSearchQueue] Web search queue closed');
  }
}
