import { Worker, Job } from 'bullmq';
import { ProcessTask } from '../types';
import { DashboardGenerator } from '../utils/dashboardGenerator';
import { ResultsQueueService } from '../services/resultsQueue';
import { QueueService } from '../services/queueService';

/**
 * Worker процессор для обработки задач из очереди BullMQ
 */
export class TaskProcessor {
  private static worker: Worker<ProcessTask> | null = null;

  /**
   * Инициализирует worker процессор
   * @param concurrency - количество параллельных задач (по умолчанию 2)
   */
  static initialize(concurrency: number = 2): void {
    const connection = QueueService.getConnection();

    console.log(`[Worker] Starting worker with concurrency: ${concurrency}`);

    // Создаем Worker для обработки задач
    this.worker = new Worker<ProcessTask>(
      'llm-processing',
      async (job: Job<ProcessTask>) => {
        return await this.processTask(job);
      },
      {
        connection,
        concurrency,
      }
    );

    // Слушатели событий Worker
    this.worker.on('completed', (job) => {
      console.log(`[Worker] Job ${job.id} completed successfully`);
    });

    this.worker.on('failed', (job, error) => {
      console.error(`[Worker] Job ${job?.id} failed:`, error.message);
    });

    this.worker.on('error', (error) => {
      console.error('[Worker] Worker error:', error);
    });

    console.log('[Worker] Worker initialized and ready to process tasks');
  }

  /**
   * Обрабатывает одну задачу
   */
  private static async processTask(job: Job<ProcessTask>): Promise<void> {
    const { taskId, question } = job.data;
    const resultsQueue = ResultsQueueService.getInstance();

    console.log(`[Worker] Processing task ${taskId}`);
    console.log(`[Worker] Question: ${question}`);

    try {
      // Генерируем dashboard через LLM + Neo4j + Perplexity
      console.log(`[Worker] Generating dashboard for task ${taskId}`);
      const result = await DashboardGenerator.generateDashboardWithWebSearch(question);

      // Логируем результат веб-поиска, если есть
      if (result.webSearchResult) {
        console.log(`[Worker] Web search completed (${result.webSearchResult.searchMode} mode)`);
        console.log(`[Worker] Search query: "${result.webSearchResult.query}"`);
        console.log(`[Worker] Content length: ${result.webSearchResult.content.length} chars`);
      }

      // Формируем результат с dashboard и опциональным webSearchResult
      // result.dashboard уже содержит {dashboard: {...}}, поэтому используем spread
      const responsePayload = {
        ...result.dashboard,
        ...(result.webSearchResult && { webSearchResult: result.webSearchResult }),
      };

      // Публикуем результат в очередь
      console.log(`[Worker] Publishing success result for task ${taskId}`);
      await resultsQueue.publishSuccess(taskId, responsePayload);

      console.log(`[Worker] Task ${taskId} completed successfully`);
    } catch (error) {
      console.error(`[Worker] Error processing task ${taskId}:`, error);

      // Определяем сообщение об ошибке
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

      // Публикуем ошибку в очередь
      try {
        await resultsQueue.publishError(taskId, errorMessage);
      } catch (queueError) {
        console.error(`[Worker] Failed to publish error for task ${taskId}:`, queueError);
      }

      // Пробрасываем ошибку дальше для BullMQ
      throw error;
    }
  }

  /**
   * Graceful shutdown процессора
   */
  static async shutdown(): Promise<void> {
    console.log('[Worker] Shutting down worker...');

    if (this.worker) {
      await this.worker.close();
    }

    const queueService = QueueService.getInstance();
    await queueService.close();

    const resultsQueue = ResultsQueueService.getInstance();
    await resultsQueue.close();

    console.log('[Worker] Worker shut down complete');
  }
}
