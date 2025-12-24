import { Worker, Job } from 'bullmq';
import { REDIS_HOST, REDIS_PORT } from '../config';
import { TelegramNotification } from '../types';
import { Telegraf } from 'telegraf';

/**
 * Сервис для работы с Redis BullMQ queue (получение уведомлений)
 */
export class RedisService {
  private worker: Worker<TelegramNotification>;
  private bot: Telegraf;
  private onQueryComplete: (queryUid: string) => void;

  constructor(bot: Telegraf, onQueryComplete: (queryUid: string) => void) {
    this.bot = bot;
    this.onQueryComplete = onQueryComplete;

    const connection = {
      host: REDIS_HOST,
      port: REDIS_PORT,
    };

    console.log(`[RedisService] Connecting to Redis at ${REDIS_HOST}:${REDIS_PORT}`);

    // Создаем Worker для обработки уведомлений
    this.worker = new Worker<TelegramNotification>(
      'telegram-notifications',
      async (job: Job<TelegramNotification>) => {
        await this.processNotification(job);
      },
      { connection }
    );

    // Слушатели событий Worker
    this.worker.on('completed', (job) => {
      console.log(`[RedisService] Job ${job.id} completed successfully`);
    });

    this.worker.on('failed', (job, error) => {
      console.error(`[RedisService] Job ${job?.id} failed:`, error.message);
    });

    this.worker.on('error', (error) => {
      console.error('[RedisService] Worker error:', error);
    });

    console.log('[RedisService] Subscribed to telegram-notifications queue');
  }

  /**
   * Обработчик уведомлений из очереди
   */
  private async processNotification(job: Job<TelegramNotification>): Promise<void> {
    const { chatId, uid, status, dashboardUrl, errorMessage, chartDescription, yearlyData } = job.data;

    console.log(`[RedisService] Processing notification for chat ${chatId}, uid: ${uid}, status: ${status}`);

    try {
      if (status === 'completed' && dashboardUrl) {
        // Формируем расширенное сообщение с описанием графика и данными
        let message = '✅ Дашборд готов!';

        // Добавляем описание графика, если оно есть
        if (chartDescription) {
          message += `\n\n📊 ${chartDescription}`;
        }

        // Добавляем данные по годам, если они есть
        if (yearlyData && yearlyData.length > 0) {
          message += '\n\n📈 Данные:';
          yearlyData.forEach(({ year, value }) => {
            message += `\n• ${year}: ${value}`;
          });
        }

        // Добавляем ссылку на дашборд
        message += `\n\n🔗 ${dashboardUrl}`;

        // Отправляем сообщение
        await this.bot.telegram.sendMessage(chatId, message);

        console.log(`[RedisService] Success notification sent to chat ${chatId}`);
      } else if (status === 'failed') {
        // Отправляем сообщение об ошибке
        const message = errorMessage || 'Произошла ошибка при обработке запроса. Попробуйте еще раз.';

        await this.bot.telegram.sendMessage(chatId, `❌ ${message}`);

        console.log(`[RedisService] Error notification sent to chat ${chatId}`);
      }

      // Вызываем callback для очистки сессии и отмены таймера
      this.onQueryComplete(uid);
    } catch (error) {
      console.error(`[RedisService] Failed to send notification to chat ${chatId}:`, error);
      throw error; // Пробросим ошибку для retry механизма BullMQ
    }
  }

  /**
   * Graceful shutdown
   */
  async close(): Promise<void> {
    console.log('[RedisService] Closing Redis connection...');
    await this.worker.close();
    console.log('[RedisService] Redis connection closed');
  }
}
