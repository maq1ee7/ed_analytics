import { Logger } from './logger.js';

const logger = Logger.withPrefix('PerplexityClient');

export type PerplexityModel = 'sonar' | 'sonar-pro';

export interface PerplexityResponse {
  content: string;
  sources?: string[];
  rawContent?: string; // Оригинальный ответ до очистки (для отладки)
}

/**
 * Очищает ответ от Perplexity от всего лишнего контента после основного содержимого
 * Удаляет списки источников, ссылки, дополнительный текст - всё что идет после основной таблицы/текста
 *
 * @param content - Сырой ответ от Perplexity
 * @returns Очищенный ответ
 */
function cleanPerplexityResponse(content: string): string {
  // Разбиваем на строки
  const lines = content.split('\n');

  // Ищем последнюю строку с таблицей (строка содержащая | и не пустая)
  let lastTableLineIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    // Это строка таблицы, если содержит | и не только разделитель
    if (line.includes('|') && line.length > 0) {
      lastTableLineIndex = i;
    }
  }

  // Если нашли таблицу, возвращаем только её
  if (lastTableLineIndex !== -1) {
    // Берем все строки от начала до конца таблицы включительно
    // Всё что после таблицы - удаляем полностью (источники, ссылки и т.д.)
    const cleanedContent = lines.slice(0, lastTableLineIndex + 1).join('\n').trim();

    logger.debug(
      `Очистка ответа Perplexity: было ${content.length} символов, стало ${cleanedContent.length} символов (удалено ${content.length - cleanedContent.length})`
    );

    return cleanedContent;
  }

  // Если таблицы нет, возвращаем как есть (но можем добавить другие правила очистки)
  logger.debug('Очистка ответа Perplexity: таблица не найдена, возвращаем оригинал');
  return content.trim();
}

/**
 * Структура ответа от Perplexity API
 */
interface PerplexityAPIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
  citations?: string[];
}

export class PerplexityClient {
  private static instance: PerplexityClient;
  private apiKey: string;
  private baseUrl = 'https://api.perplexity.ai/chat/completions';

  private constructor() {
    const apiKey = process.env.PERPLEXITY_API_KEY;
    if (!apiKey) {
      throw new Error('PERPLEXITY_API_KEY не установлен в переменных окружения');
    }
    this.apiKey = apiKey;
    logger.info('PerplexityClient инициализирован');
  }

  public static getInstance(): PerplexityClient {
    if (!PerplexityClient.instance) {
      PerplexityClient.instance = new PerplexityClient();
    }
    return PerplexityClient.instance;
  }

  /**
   * Быстрый веб-поиск с использованием модели sonar
   */
  public async fastSearch(query: string): Promise<PerplexityResponse> {
    logger.info(`Запуск быстрого поиска: "${query}"`);

    return this.callPerplexity({
      model: 'sonar',
      query,
      webSearchOptions: {
        search_context_size: 'low',
      },
      timeout: 30000, // 30 секунд
    });
  }

  /**
   * Глубокий веб-поиск с использованием модели sonar-pro
   */
  public async deepResearch(query: string): Promise<PerplexityResponse> {
    logger.info(`Запуск глубокого исследования (sonar-pro): "${query}"`);

    return this.callPerplexity({
      model: 'sonar-pro',
      query,
      webSearchOptions: undefined,  // Не передаем дополнительные параметры
      reasoningEffort: undefined,   // Не передаем дополнительные параметры
      timeout: 90000, // 90 секунд
    });
  }

  /**
   * Общий метод вызова Perplexity API
   */
  private async callPerplexity(options: {
    model: PerplexityModel;
    query: string;
    webSearchOptions?: {
      search_context_size: 'low' | 'high';
    };
    reasoningEffort?: 'low' | 'medium' | 'high';
    timeout: number;
  }): Promise<PerplexityResponse> {
    const { model, query, webSearchOptions, reasoningEffort, timeout } = options;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'system',
              content: 'Отвечай на русском языке. Предоставь краткую и релевантную информацию по запросу.',
            },
            {
              role: 'user',
              content: query,
            },
          ],
          enable_search_classifier: true,
          ...(webSearchOptions && { web_search_options: webSearchOptions }),
          ...(reasoningEffort && { reasoning_effort: reasoningEffort }),
          max_tokens: 800,
          temperature: 0.3,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Perplexity API ошибка ${response.status}: ${errorText}`);
      }

      const data = await response.json() as PerplexityAPIResponse;

      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('Некорректный формат ответа от Perplexity API');
      }

      const rawContent = data.choices[0].message.content;

      // Очищаем ответ от лишних ссылок и источников в конце
      const content = cleanPerplexityResponse(rawContent);

      // Извлекаем источники, если они есть
      const sources = data.citations || [];

      logger.info(`Получен ответ от Perplexity (${model}), длина: ${content.length} символов (очищено), источников: ${sources.length}`);

      return {
        content,
        sources: sources.length > 0 ? sources : undefined,
        rawContent, // Сохраняем оригинал для отладки
      };

    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          logger.error(`Таймаут запроса к Perplexity API (${timeout}ms)`);
          throw new Error(`Превышено время ожидания ответа от веб-поиска (${timeout / 1000}с)`);
        }

        logger.error(`Ошибка вызова Perplexity API: ${error.message}`);
        throw error;
      }

      logger.error('Неизвестная ошибка при вызове Perplexity API');
      throw new Error('Неизвестная ошибка веб-поиска');
    }
  }
}
