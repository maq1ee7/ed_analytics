import Bull, { Queue } from 'bull';

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
 * Сервис для работы с очередью уведомлений о веб-поиске
 */
export class WebSearchQueueService {
  private static instance: WebSearchQueueService;
  private queue: Queue<WebSearchNotification>;

  private constructor() {
    const redisHost = process.env.REDIS_HOST || 'localhost';
    const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);

    console.log(`[WebSearchQueue] Connecting to Redis at ${redisHost}:${redisPort}`);

    // Создаем очередь Bull для уведомлений о веб-поиске
    this.queue = new Bull<WebSearchNotification>('telegram-web-search', {
      redis: {
        host: redisHost,
        port: redisPort,
        maxRetriesPerRequest: null,
        enableReadyCheck: false
      },
      defaultJobOptions: {
        attempts: 3, // 3 попытки отправки уведомления
        removeOnComplete: true,
        removeOnFail: false,
        backoff: {
          type: 'exponential',
          delay: 2000 // Задержка между попытками: 2s, 4s, 8s
        }
      }
    });

    // Слушатели событий
    this.queue.on('error', (error) => {
      console.error('[WebSearchQueue] Error:', error);
    });

    this.queue.on('completed', (job) => {
      console.log(`[WebSearchQueue] Web search notification ${job.id} sent successfully`);
    });

    this.queue.on('failed', (job, error) => {
      console.error(`[WebSearchQueue] Web search notification ${job.id} failed:`, error.message);
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
   * Добавляет уведомление о веб-поиске в очередь
   */
  async addNotification(notification: WebSearchNotification): Promise<void> {
    console.log(`[WebSearchQueue] Adding web search notification for chat ${notification.chatId}, uid: ${notification.uid}, mode: ${notification.searchMode}`);

    await this.queue.add(notification, {
      jobId: `websearch-${notification.uid}-${Date.now()}` // Уникальный ID
    });
  }

  /**
   * Получает очередь для регистрации процессора (используется в telegram-bot)
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
