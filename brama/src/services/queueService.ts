import Bull, { Queue, Job } from 'bull';
import { ProcessTask } from '../types';

/**
 * Сервис управления очередью задач Bull
 */
export class QueueService {
  private static instance: QueueService;
  private queue: Queue<ProcessTask>;

  private constructor() {
    const redisHost = process.env.REDIS_HOST || 'localhost';
    const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);

    console.log(`[Queue] Connecting to Redis at ${redisHost}:${redisPort}`);

    // Создаем очередь Bull
    this.queue = new Bull<ProcessTask>('llm-processing', {
      redis: {
        host: redisHost,
        port: redisPort,
        maxRetriesPerRequest: null,
        enableReadyCheck: false
      },
      defaultJobOptions: {
        attempts: 1, // Не повторяем задачи при ошибке
        removeOnComplete: true, // Удаляем завершенные задачи
        removeOnFail: false, // Сохраняем failed задачи для анализа
        timeout: 300000 // Таймаут 5 минут (300 секунд)
      }
    });

    // Слушатели событий очереди
    this.queue.on('error', (error) => {
      console.error('[Queue] Error:', error);
    });

    this.queue.on('waiting', (jobId) => {
      console.log(`[Queue] Job ${jobId} is waiting`);
    });

    this.queue.on('active', (job) => {
      console.log(`[Queue] Job ${job.id} started processing`);
    });

    this.queue.on('completed', (job) => {
      console.log(`[Queue] Job ${job.id} completed`);
    });

    this.queue.on('failed', (job, error) => {
      console.error(`[Queue] Job ${job.id} failed:`, error.message);
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
   * Добавляет задачу в очередь
   */
  async addTask(task: ProcessTask): Promise<Job<ProcessTask>> {
    console.log(`[Queue] Adding task ${task.taskId} to queue`);
    
    const job = await this.queue.add(task, {
      jobId: task.taskId, // Используем taskId как ID задачи в Bull
      timeout: 300000 // 5 минут таймаут
    });

    return job;
  }

  /**
   * Получает экземпляр очереди для регистрации процессора
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
      this.queue.getFailedCount()
    ]);

    return { waiting, active, completed, failed };
  }

  /**
   * Закрывает соединение с очередью (для graceful shutdown)
   */
  async close(): Promise<void> {
    console.log('[Queue] Closing queue connection...');
    await this.queue.close();
    console.log('[Queue] Queue closed');
  }
}


