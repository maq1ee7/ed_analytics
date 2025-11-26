import { Job } from 'bull';
import { ProcessTask } from '../types';
import { DashboardGenerator } from '../utils/dashboardGenerator';
import { CallbackSender } from '../utils/callbackSender';
import { QueueService } from '../services/queueService';

/**
 * Worker процессор для обработки задач из очереди
 */
export class TaskProcessor {
  private static concurrency: number;

  /**
   * Инициализирует worker процессор
   * @param concurrency - количество параллельных задач (по умолчанию 2)
   */
  static initialize(concurrency: number = 2): void {
    this.concurrency = concurrency;
    const queueService = QueueService.getInstance();
    const queue = queueService.getQueue();

    console.log(`[Worker] Starting worker with concurrency: ${concurrency}`);

    // Регистрируем процессор задач
    queue.process(concurrency, async (job: Job<ProcessTask>) => {
      return await this.processTask(job);
    });

    console.log('[Worker] Worker initialized and ready to process tasks');
  }

  /**
   * Обрабатывает одну задачу
   */
  private static async processTask(job: Job<ProcessTask>): Promise<void> {
    const { taskId, question, callbackUrl } = job.data;

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
        ...(result.webSearchResult && { webSearchResult: result.webSearchResult })
      };

      // Отправляем результат в Backend
      console.log(`[Worker] Sending success result for task ${taskId}`);
      await CallbackSender.sendSuccess(callbackUrl, responsePayload);

      console.log(`[Worker] Task ${taskId} completed successfully`);

    } catch (error) {
      console.error(`[Worker] Error processing task ${taskId}:`, error);

      // Определяем сообщение об ошибке
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

      // Пытаемся отправить ошибку в Backend
      try {
        await CallbackSender.sendError(callbackUrl, errorMessage);
      } catch (callbackError) {
        console.error(`[Worker] Failed to send error callback for task ${taskId}:`, callbackError);
      }

      // Пробрасываем ошибку дальше для Bull
      throw error;
    }
  }

  /**
   * Graceful shutdown процессора
   */
  static async shutdown(): Promise<void> {
    console.log('[Worker] Shutting down worker...');
    const queueService = QueueService.getInstance();
    await queueService.close();
    console.log('[Worker] Worker shut down complete');
  }
}


