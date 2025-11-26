import Bull, { Queue, Job } from 'bull';
import { REDIS_HOST, REDIS_PORT } from '../config';
import { WebSearchNotification } from '../types';
import { Telegraf } from 'telegraf';

/**
 * Сервис для обработки уведомлений о веб-поиске из Redis Bull queue
 */
export class WebSearchService {
  private queue: Queue<WebSearchNotification>;
  private bot: Telegraf;

  constructor(bot: Telegraf) {
    this.bot = bot;

    console.log(`[WebSearchService] Connecting to Redis at ${REDIS_HOST}:${REDIS_PORT}`);

    // Подключаемся к очереди telegram-web-search
    this.queue = new Bull<WebSearchNotification>('telegram-web-search', {
      redis: {
        host: REDIS_HOST,
        port: REDIS_PORT,
        maxRetriesPerRequest: null,
        enableReadyCheck: false
      }
    });

    // Регистрируем обработчик уведомлений
    this.queue.process(this.processWebSearchNotification.bind(this));

    // Слушатели событий
    this.queue.on('error', (error) => {
      console.error('[WebSearchService] Queue error:', error);
    });

    this.queue.on('completed', (job) => {
      console.log(`[WebSearchService] Job ${job.id} completed successfully`);
    });

    this.queue.on('failed', (job, error) => {
      console.error(`[WebSearchService] Job ${job.id} failed:`, error.message);
    });

    console.log('[WebSearchService] Subscribed to telegram-web-search queue');
  }

  /**
   * Обработчик уведомлений о веб-поиске из очереди
   */
  private async processWebSearchNotification(job: Job<WebSearchNotification>): Promise<void> {
    const { chatId, uid, searchMode, content, sources, query } = job.data;

    console.log(`[WebSearchService] Processing web search notification for chat ${chatId}, uid: ${uid}, mode: ${searchMode}`);

    try {
      // Формируем сообщение о результатах веб-поиска
      let message = '';

      // Заголовок с индикацией режима поиска
      if (searchMode === 'deep') {
        message = '🔍 **Глубокий веб-поиск**';
      } else {
        message = '⚡ **Быстрый веб-поиск**';
      }

      // Добавляем поисковый запрос
      message += `\n\n📝 Запрос: "${query}"`;

      // Добавляем основной контент
      message += `\n\n${content}`;

      // Добавляем источники, если есть
      if (sources && sources.length > 0) {
        message += '\n\n🔗 Источники:';
        sources.forEach((source, index) => {
          message += `\n${index + 1}. ${source}`;
        });
      }

      // Отправляем сообщение с Markdown форматированием
      await this.bot.telegram.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
        link_preview_options: { is_disabled: true }
      });

      console.log(`[WebSearchService] Web search notification sent to chat ${chatId}`);

    } catch (error) {
      // Если не удалось отправить с Markdown, пробуем без форматирования
      try {
        let plainMessage = '';

        if (searchMode === 'deep') {
          plainMessage = '🔍 Глубокий веб-поиск';
        } else {
          plainMessage = '⚡ Быстрый веб-поиск';
        }

        plainMessage += `\n\nЗапрос: "${query}"`;
        plainMessage += `\n\n${content}`;

        if (sources && sources.length > 0) {
          plainMessage += '\n\n🔗 Источники:';
          sources.forEach((source, index) => {
            plainMessage += `\n${index + 1}. ${source}`;
          });
        }

        await this.bot.telegram.sendMessage(chatId, plainMessage, {
          link_preview_options: { is_disabled: true }
        });

        console.log(`[WebSearchService] Web search notification sent (plain text) to chat ${chatId}`);

      } catch (retryError) {
        console.error(`[WebSearchService] Failed to send web search notification to chat ${chatId}:`, retryError);
        throw retryError; // Пробросим ошибку для retry механизма Bull
      }
    }
  }

  /**
   * Graceful shutdown
   */
  async close(): Promise<void> {
    console.log('[WebSearchService] Closing web search queue connection...');
    await this.queue.close();
    console.log('[WebSearchService] Web search queue connection closed');
  }
}
