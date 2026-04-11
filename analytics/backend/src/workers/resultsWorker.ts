import { Worker, Job } from 'bullmq';
import { QueryModel } from '../models/Query';
import { NotificationQueueService } from '../services/notificationQueue';
import { WebSearchQueueService } from '../services/webSearchQueue';
import { ProcessResult, ResultsQueueService } from '../services/resultsQueue';

/**
 * Worker для обработки результатов от Brama
 * 
 * Подписывается на очередь 'brama-results' и обрабатывает результаты:
 * - Обновляет запрос в БД
 * - Отправляет уведомления в Telegram (если нужно)
 */
export class ResultsWorker {
  private static worker: Worker<ProcessResult> | null = null;

  /**
   * Инициализирует worker
   */
  static initialize(): void {
    const connection = ResultsQueueService.getConnection();

    console.log('[ResultsWorker] Starting worker for brama-results queue');

    // Создаем Worker для обработки результатов
    this.worker = new Worker<ProcessResult>(
      'brama-results',
      async (job: Job<ProcessResult>) => {
        await this.processResult(job);
      },
      { connection }
    );

    // Слушатели событий Worker
    this.worker.on('completed', (job) => {
      console.log(`[ResultsWorker] Job ${job.id} completed successfully`);
    });

    this.worker.on('failed', (job, error) => {
      console.error(`[ResultsWorker] Job ${job?.id} failed:`, error.message);
    });

    this.worker.on('error', (error) => {
      console.error('[ResultsWorker] Worker error:', error);
    });

    console.log('[ResultsWorker] Worker initialized and ready to process results');
  }

  /**
   * Обрабатывает один результат
   */
  private static async processResult(job: Job<ProcessResult>): Promise<void> {
    const { taskId, status, result, error } = job.data;

    console.log(`[ResultsWorker] Processing result for task ${taskId}, status: ${status}`);

    // Проверяем существование запроса
    const query = await QueryModel.findByUid(taskId);
    if (!query) {
      console.error(`[ResultsWorker] Query not found: ${taskId}`);
      throw new Error(`Query not found: ${taskId}`);
    }

    // Обрабатываем результат в зависимости от статуса
    if (status === 'completed' && result) {
      await QueryModel.updateWithResult(taskId, result);
      console.log(`[ResultsWorker] Task ${taskId} marked as completed`);

      // Если это запрос от Telegram, отправляем уведомление
      if (query.telegram_chat_id) {
        await this.sendTelegramNotification(query.telegram_chat_id, result, taskId);
      }
    } else if (status === 'failed' && error) {
      await QueryModel.updateWithError(taskId, error);
      console.log(`[ResultsWorker] Task ${taskId} marked as failed: ${error}`);

      // Если это запрос от Telegram, отправляем уведомление об ошибке
      if (query.telegram_chat_id) {
        const notificationQueue = NotificationQueueService.getInstance();

        await notificationQueue.addNotification({
          chatId: query.telegram_chat_id,
          uid: taskId,
          status: 'failed',
          errorMessage: 'Произошла ошибка при обработке запроса. Попробуйте еще раз.',
        });

        console.log(`[ResultsWorker] Telegram error notification queued for chat ${query.telegram_chat_id}`);
      }
    } else {
      throw new Error(`Invalid result data: status=${status}, hasResult=${!!result}, hasError=${!!error}`);
    }
  }

  /**
   * Отправляет уведомление в Telegram
   */
  private static async sendTelegramNotification(
    chatId: number,
    result: any,
    taskId: string
  ): Promise<void> {
    const serverIp = process.env.SERVER_IP || '130.193.46.4';
    const dashboardUrl = `http://${serverIp}/dashboard/${taskId}`;
    const notificationQueue = NotificationQueueService.getInstance();

    // Извлекаем данные из DashboardData для расширенного сообщения
    let chartDescription: string | undefined;
    let yearlyData: Array<{ year: number; value: number | null }> | undefined;

    try {
      // Извлекаем описание с метаданными (статформа, раздел, строка, ячейка)
      if (result?.dashboard?.description) {
        chartDescription = result.dashboard.description;
      }

      // Извлекаем данные линейного графика по годам
      if (result?.dashboard?.charts?.[0]) {
        const linearChart = result.dashboard.charts[0];

        // Проверяем, что это линейный график
        if (linearChart.type === 'linear') {
          // Извлекаем данные по годам
          if (linearChart.data?.years?.[0]?.points) {
            yearlyData = linearChart.data.years[0].points.map((point: any) => ({
              year: point.x,
              value: point.y,
            }));
          }
        }
      }
    } catch (err) {
      console.warn(`[ResultsWorker] Failed to extract chart data for notification: ${err}`);
    }

    await notificationQueue.addNotification({
      chatId,
      uid: taskId,
      status: 'completed',
      dashboardUrl,
      chartDescription,
      yearlyData,
    });

    console.log(`[ResultsWorker] Telegram notification queued for chat ${chatId}`);

    // Send web search notification if available
    if (result?.webSearchResult) {
      const webSearchQueue = WebSearchQueueService.getInstance();

      await webSearchQueue.addNotification({
        chatId,
        uid: taskId,
        searchMode: result.webSearchResult.searchMode,
        content: result.webSearchResult.content,
        sources: result.webSearchResult.sources,
        query: result.webSearchResult.query,
      });

      console.log(`[ResultsWorker] Web search notification queued for chat ${chatId}`);
    }
  }

  /**
   * Graceful shutdown
   */
  static async shutdown(): Promise<void> {
    console.log('[ResultsWorker] Shutting down worker...');

    if (this.worker) {
      await this.worker.close();
    }

    console.log('[ResultsWorker] Worker shut down complete');
  }
}

