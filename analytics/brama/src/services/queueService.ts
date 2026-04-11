import { Queue, QueueEvents, Job } from 'bullmq';
import { ProcessTask } from '../types';

/**
 * Redis connection configuration
 */
const getConnection = () => ({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
});

/**
 * Сервис управления очередью задач BullMQ
 */
export class QueueService {
  private static instance: QueueService;
  private queue: Queue<ProcessTask>;
  private queueEvents: QueueEvents;

  private constructor() {
    const connection = getConnection();

    console.log(`[Queue] Connecting to Redis at ${connection.host}:${connection.port}`);

    // Создаем очередь BullMQ
    this.queue = new Queue<ProcessTask>('llm-processing', {
      connection,
      defaultJobOptions: {
        attempts: 1, // Не повторяем задачи при ошибке
        removeOnComplete: true, // Удаляем завершенные задачи
        removeOnFail: false, // Сохраняем failed задачи для анализа
      },
    });

    // QueueEvents для отслеживания событий
    this.queueEvents = new QueueEvents('llm-processing', { connection });

    // Слушатели событий очереди
    this.queueEvents.on('waiting', ({ jobId }) => {
      console.log(`[Queue] Job ${jobId} is waiting`);
    });

    this.queueEvents.on('active', ({ jobId }) => {
      console.log(`[Queue] Job ${jobId} started processing`);
    });

    this.queueEvents.on('completed', ({ jobId }) => {
      console.log(`[Queue] Job ${jobId} completed`);
    });

    this.queueEvents.on('failed', ({ jobId, failedReason }) => {
      console.error(`[Queue] Job ${jobId} failed:`, failedReason);
    });

    console.log('[Queue] Queue service initialized');
  }

  /**
   * Singleton pattern - возвращает единственный экземпляр
   */
  static getInstance(): QueueService {
    if (!QueueService.instance) {
      QueueService.instance = new QueueService();
    }
    return QueueService.instance;
  }

  /**
   * Возвращает конфигурацию подключения к Redis
   */
  static getConnection() {
    return getConnection();
  }

  /**
   * Добавляет задачу в очередь
   */
  async addTask(task: ProcessTask): Promise<Job<ProcessTask>> {
    console.log(`[Queue] Adding task ${task.taskId} to queue`);

    const job = await this.queue.add('process', task, {
      jobId: task.taskId, // Используем taskId как ID задачи
    });

    return job;
  }

  /**
   * Получает экземпляр очереди (для статистики)
   */
  getQueue(): Queue<ProcessTask> {
    return this.queue;
  }

  /**
   * Получает статистику очереди
   */
  async getStats() {
    const [waiting, active, completed, failed] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount(),
    ]);

    return { waiting, active, completed, failed };
  }

  /**
   * Закрывает соединение с очередью (для graceful shutdown)
   */
  async close(): Promise<void> {
    console.log('[Queue] Closing queue connection...');
    await this.queueEvents.close();
    await this.queue.close();
    console.log('[Queue] Queue closed');
  }
}
