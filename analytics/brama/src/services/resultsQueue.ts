import { Queue } from 'bullmq';
import { ProcessResult } from '../types';

/**
 * Redis connection configuration
 */
const getConnection = () => ({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
});

/**
 * Интерфейс результата для очереди (расширенный для передачи в Backend)
 */
export interface QueueProcessResult {
  taskId: string;
  status: 'completed' | 'failed';
  result?: any;
  error?: string;
}

/**
 * Сервис для публикации результатов обработки в очередь (BullMQ)
 * 
 * Brama (Producer) → Queue → Backend (Consumer)
 */
export class ResultsQueueService {
  private static instance: ResultsQueueService;
  private queue: Queue<QueueProcessResult>;

  private constructor() {
    const connection = getConnection();

    console.log(`[ResultsQueue] Connecting to Redis at ${connection.host}:${connection.port}`);

    // Создаем очередь BullMQ для результатов
    this.queue = new Queue<QueueProcessResult>('brama-results', {
      connection,
      defaultJobOptions: {
        attempts: 3,
        removeOnComplete: true,
        removeOnFail: false,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    });

    console.log('[ResultsQueue] Results queue initialized');
  }

  /**
   * Singleton pattern
   */
  static getInstance(): ResultsQueueService {
    if (!ResultsQueueService.instance) {
      ResultsQueueService.instance = new ResultsQueueService();
    }
    return ResultsQueueService.instance;
  }

  /**
   * Публикует успешный результат в очередь
   */
  async publishSuccess(taskId: string, result: any): Promise<void> {
    console.log(`[ResultsQueue] Publishing success result for task ${taskId}`);

    await this.queue.add('result', {
      taskId,
      status: 'completed',
      result,
    }, {
      jobId: `result-${taskId}-${Date.now()}`,
    });

    console.log(`[ResultsQueue] Success result published for task ${taskId}`);
  }

  /**
   * Публикует ошибку в очередь
   */
  async publishError(taskId: string, error: string): Promise<void> {
    console.log(`[ResultsQueue] Publishing error for task ${taskId}`);

    await this.queue.add('result', {
      taskId,
      status: 'failed',
      error,
    }, {
      jobId: `result-${taskId}-${Date.now()}`,
    });

    console.log(`[ResultsQueue] Error published for task ${taskId}`);
  }

  /**
   * Закрывает соединение (graceful shutdown)
   */
  async close(): Promise<void> {
    console.log('[ResultsQueue] Closing results queue...');
    await this.queue.close();
    console.log('[ResultsQueue] Results queue closed');
  }
}



