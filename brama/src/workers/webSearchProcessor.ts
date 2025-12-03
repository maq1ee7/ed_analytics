import Bull, { Job } from 'bull';
import { perplexityWebSearchNode } from '../query-agent/graph/nodes/perplexityWebSearchNode.js';
import { CallbackSender } from '../utils/callbackSender.js';
import { LLMClient } from '../shared/llmClient.js';
import { Neo4jClient } from '../shared/neo4jClient.js';
import { Logger } from '../shared/logger.js';

const logger = Logger.withPrefix('WebSearchProcessor');

/**
 * Задача веб-поиска из очереди
 */
interface WebSearchTask {
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
 * Worker процессор для обработки задач веб-поиска
 * Выполняется параллельно с основным LangGraph workflow
 */
export class WebSearchProcessor {
  private queue: Bull.Queue<WebSearchTask>;
  private llmClient: LLMClient;
  private neo4jClient: Neo4jClient;

  constructor(concurrency: number = 5) {
    logger.info(`Инициализация WebSearchProcessor с concurrency: ${concurrency}`);

    // Создаем очередь для веб-поиска
    const redisUrl = process.env.REDIS_URL || 'redis://redis:6379';
    this.queue = new Bull('web-search-tasks', redisUrl, {
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: false
      }
    });

    // Инициализация клиентов
    this.llmClient = new LLMClient();
    this.neo4jClient = Neo4jClient.getInstance();

    // Регистрируем процессор задач с именем 'web-search'
    this.queue.process('web-search', concurrency, async (job: Job<WebSearchTask>) => {
      return await this.processWebSearch(job);
    });

    // Добавляем обработчики событий для отладки
    this.queue.on('active', (job) => {
      logger.info(`[WebSearchQueue] Job ${job.id} started processing`);
    });

    this.queue.on('completed', (job) => {
      logger.info(`[WebSearchQueue] Job ${job.id} completed`);
    });

    this.queue.on('failed', (job, err) => {
      logger.error(`[WebSearchQueue] Job ${job?.id} failed:`, err);
    });

    this.queue.on('error', (error) => {
      logger.error('[WebSearchQueue] Queue error:', error);
    });

    logger.info('WebSearchProcessor успешно инициализирован');
  }

  /**
   * Обрабатывает одну задачу веб-поиска
   */
  private async processWebSearch(job: Job<WebSearchTask>): Promise<void> {
    const { uid, question, context, callbackUrl } = job.data;

    logger.info(`Обработка задачи веб-поиска для ${uid}`);
    logger.debug(`Запрос: "${question}"`);
    logger.debug(`Контекст:`, context);

    try {
      // Подключиться к Neo4j
      await this.neo4jClient.connect();

      // Создать состояние для узла веб-поиска
      const state = {
        query: question,
        statformSelection: {
          statformIds: context.statformIds || []
        },
        sectionSelection: context.sectionId ? {
          sectionId: context.sectionId
        } : undefined,
        viewSelection: context.viewCellData
      };

      logger.debug('Запуск perplexityWebSearchNode');

      // Выполнить веб-поиск
      const result = await perplexityWebSearchNode(
        state as any,
        this.llmClient,
        this.neo4jClient
      );

      // Проверить наличие результата веб-поиска
      if (result.webSearch) {
        logger.info(`Веб-поиск выполнен успешно (режим: ${result.webSearch.searchMode})`);
        logger.debug(`Запрос к Perplexity: "${result.webSearch.query}"`);
        logger.debug(`Длина контента: ${result.webSearch.content.length} символов`);

        // Отправить результат веб-поиска в Backend
        await CallbackSender.sendWebSearchResult(callbackUrl, result.webSearch);

        logger.info(`Результат веб-поиска отправлен для ${uid}`);
      } else {
        logger.warn(`Веб-поиск не вернул результат для ${uid} (graceful degradation)`);
      }

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Неизвестная ошибка';
      logger.error(`Ошибка при обработке веб-поиска для ${uid}: ${message}`);

      // НЕ бросаем ошибку - graceful degradation для веб-поиска
      // Пользователь все равно получил дашборд, веб-поиск - это дополнительная информация
    }
  }

  /**
   * Graceful shutdown процессора
   */
  async shutdown(): Promise<void> {
    logger.info('Завершение работы WebSearchProcessor');

    try {
      await this.queue.close();
      await this.llmClient.shutdown();
      await this.neo4jClient.shutdown();

      logger.info('WebSearchProcessor успешно завершил работу');
    } catch (error) {
      logger.error('Ошибка при завершении WebSearchProcessor:', error);
    }
  }
}
