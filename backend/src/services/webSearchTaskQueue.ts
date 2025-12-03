import Bull from 'bull';

/**
 * Задача веб-поиска для отправки в Brama
 */
export interface WebSearchTask {
  uid: string;
  question: string;
  context: {
    statformIds: number[];
    sectionId?: number;
    viewCellData?: any;
  };
  callbackUrl: string;
}

/**
 * Сервис очереди задач веб-поиска
 * Отправляет задачи веб-поиска из Backend в Brama (через Redis Bull)
 */
export class WebSearchTaskQueueService {
  private static instance: WebSearchTaskQueueService;
  private queue: Bull.Queue<WebSearchTask>;

  private constructor() {
    const redisUrl = process.env.REDIS_URL || 'redis://redis:6379';

    this.queue = new Bull('web-search-tasks', redisUrl, {
      defaultJobOptions: {
        attempts: 1,  // Не retry, т.к. это не критично (graceful degradation)
        timeout: 300000,  // 300 секунд таймаут (Perplexity 2 мин + запас на обработку)
        removeOnComplete: true,  // Автоматически удалять выполненные задачи
        removeOnFail: true  // Автоматически удалять failed задачи
      }
    });

    console.log('[WebSearchTaskQueue] Initialized');
  }

  /**
   * Получить singleton instance
   */
  static getInstance(): WebSearchTaskQueueService {
    if (!this.instance) {
      this.instance = new WebSearchTaskQueueService();
    }
    return this.instance;
  }

  /**
   * Добавить задачу веб-поиска в очередь
   * @param task - задача веб-поиска с контекстом из LangGraph
   */
  async addTask(task: WebSearchTask): Promise<void> {
    try {
      await this.queue.add('web-search', task);
      console.log(`[WebSearchTaskQueue] Task added for ${task.uid}`);
    } catch (error) {
      console.error(`[WebSearchTaskQueue] Failed to add task for ${task.uid}:`, error);
      // Не бросаем ошибку - graceful degradation для веб-поиска
    }
  }

  /**
   * Получить статистику очереди
   */
  async getStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
  }> {
    const [waiting, active, completed, failed] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount()
    ]);

    return { waiting, active, completed, failed };
  }

  /**
   * Закрыть очередь (для graceful shutdown)
   */
  async close(): Promise<void> {
    await this.queue.close();
    console.log('[WebSearchTaskQueue] Closed');
  }
}
