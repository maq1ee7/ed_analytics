import { Queue } from 'bullmq';

/**
 * Redis connection configuration
 */
const getConnection = () => ({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
});

/**
 * Интерфейс результата обработки от Brama
 */
export interface ProcessResult {
  taskId: string;
  status: 'completed' | 'failed';
  result?: {
    dashboard: {
      title: string;
      description: string;
      charts: any[];
    };
    webSearchResult?: {
      searchMode: 'fast' | 'deep';
      content: string;
      sources?: string[];
      query: string;
    };
  };
  error?: string;
}

/**
 * Сервис для работы с очередью результатов обработки (BullMQ)
 * 
 * Эта очередь используется для передачи результатов от Brama в Backend.
 * Brama (Producer) → Queue → Backend (Consumer)
 */
export class ResultsQueueService {
  private static instance: ResultsQueueService;
  private queue: Queue<ProcessResult>;

  private constructor() {
    const connection = getConnection();

    console.log(`[ResultsQueue] Connecting to Redis at ${connection.host}:${connection.port}`);

    // Создаем очередь BullMQ для результатов
    this.queue = new Queue<ProcessResult>('brama-results', {
      connection,
      defaultJobOptions: {
        attempts: 3, // 3 попытки
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
   * Возвращает конфигурацию подключения к Redis
   */
  static getConnection() {
    return getConnection();
  }

  /**
   * Получает очередь (для Worker в Backend)
   */
  getQueue(): Queue<ProcessResult> {
    return this.queue;
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



