import Bull, { Queue } from 'bull';

/**
 * Интерфейс для уведомления в Telegram
 */
export interface TelegramNotification {
  chatId: number;
  uid: string;
  status: 'completed' | 'failed';
  dashboardUrl?: string;
  errorMessage?: string;
}

/**
 * Сервис для работы с очередью уведомлений Telegram
 */
export class NotificationQueueService {
  private static instance: NotificationQueueService;
  private queue: Queue<TelegramNotification>;

  private constructor() {
    const redisHost = process.env.REDIS_HOST || 'localhost';
    const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);

    console.log(`[NotificationQueue] Connecting to Redis at ${redisHost}:${redisPort}`);

    // Создаем очередь Bull для уведомлений
    this.queue = new Bull<TelegramNotification>('telegram-notifications', {
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
      console.error('[NotificationQueue] Error:', error);
    });

    this.queue.on('completed', (job) => {
      console.log(`[NotificationQueue] Notification ${job.id} sent successfully`);
    });

    this.queue.on('failed', (job, error) => {
      console.error(`[NotificationQueue] Notification ${job.id} failed:`, error.message);
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
   * Добавляет уведомление в очередь
   */
  async addNotification(notification: TelegramNotification): Promise<void> {
    console.log(`[NotificationQueue] Adding notification for chat ${notification.chatId}, uid: ${notification.uid}`);
    
    await this.queue.add(notification, {
      jobId: `telegram-${notification.uid}-${Date.now()}` // Уникальный ID
    });
  }

  /**
   * Получает очередь для регистрации процессора (используется в telegram-bot)
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

