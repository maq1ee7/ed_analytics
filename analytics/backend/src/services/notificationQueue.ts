import { Queue } from 'bullmq';

/**
 * Redis connection configuration
 */
const getConnection = () => ({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
});

/**
 * Интерфейс для уведомления в Telegram
 */
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

/**
 * Сервис для работы с очередью уведомлений Telegram (BullMQ)
 */
export class NotificationQueueService {
  private static instance: NotificationQueueService;
  private queue: Queue<TelegramNotification>;

  private constructor() {
    const connection = getConnection();

    console.log(`[NotificationQueue] Connecting to Redis at ${connection.host}:${connection.port}`);

    // Создаем очередь BullMQ для уведомлений
    this.queue = new Queue<TelegramNotification>('telegram-notifications', {
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

    console.log('[NotificationQueue] Notification queue initialized');
  }

  /**
   * Singleton pattern
   */
  static getInstance(): NotificationQueueService {
    if (!NotificationQueueService.instance) {
      NotificationQueueService.instance = new NotificationQueueService();
    }
    return NotificationQueueService.instance;
  }

  /**
   * Возвращает конфигурацию подключения к Redis
   */
  static getConnection() {
    return getConnection();
  }

  /**
   * Добавляет уведомление в очередь
   */
  async addNotification(notification: TelegramNotification): Promise<void> {
    console.log(`[NotificationQueue] Adding notification for chat ${notification.chatId}, uid: ${notification.uid}`);

    await this.queue.add('notification', notification, {
      jobId: `telegram-${notification.uid}-${Date.now()}`, // Уникальный ID
    });
  }

  /**
   * Получает очередь (для статистики)
   */
  getQueue(): Queue<TelegramNotification> {
    return this.queue;
  }

  /**
   * Закрывает соединение (graceful shutdown)
   */
  async close(): Promise<void> {
    console.log('[NotificationQueue] Closing notification queue...');
    await this.queue.close();
    console.log('[NotificationQueue] Notification queue closed');
  }
}
