/**
 * Узел LangGraph: Веб-поиск через Perplexity API
 * Анализирует найденные данные и выполняет веб-поиск для обогащения ответа
 */

import { AgentStateType } from '../state.js';
import { LLMClient } from '../../../shared/llmClient.js';
import { Neo4jClient } from '../../../shared/neo4jClient.js';
import { PerplexityClient } from '../../../shared/perplexityClient.js';
import { Logger } from '../../../shared/logger.js';
import { buildWebSearchDecisionPrompt } from '../../prompts/webSearchDecision.js';
import {
  WebSearchDecisionSchema,
  WebSearchDecision,
  WebSearchResult
} from '../../types.js';

const logger = Logger.withPrefix('PerplexityWebSearchNode');

/**
 * Узел для выполнения веб-поиска через Perplexity API
 * @param state - текущее состояние агента
 * @param llmClient - клиент LLM для принятия решения о режиме поиска
 * @param neo4jClient - клиент Neo4j (не используется, но требуется сигнатурой)
 * @returns обновленное состояние с результатами веб-поиска
 */
export async function perplexityWebSearchNode(
  state: AgentStateType,
  llmClient: LLMClient,
  neo4jClient: Neo4jClient
): Promise<Partial<AgentStateType>> {
  logger.info(`Этап 4: Веб-поиск для запроса "${state.query}"`);

  try {
    // Проверка наличия результатов предыдущего этапа
    if (!state.viewSelection) {
      throw new Error('Не выбрано представление на предыдущем этапе');
    }

    // Шаг 1: LLM принимает решение о режиме веб-поиска
    logger.info('Анализ найденных данных для определения режима поиска');

    const { systemPrompt, userMessage } = buildWebSearchDecisionPrompt(
      state.query,
      state.viewSelection
    );

    const decision = await llmClient.chatJSON<WebSearchDecision>(
      systemPrompt,
      userMessage,
      WebSearchDecisionSchema,
      0.3 // Низкая температура для детерминированного выбора
    );

    logger.info(
      `Решение: режим "${decision.searchMode}", запрос: "${decision.searchQuery}"`
    );
    if (decision.reasoning) {
      logger.debug(`Обоснование: ${decision.reasoning}`);
    }

    // Шаг 2: Выполнение веб-поиска через Perplexity API
    const perplexityClient = PerplexityClient.getInstance();

    let perplexityResponse;
    try {
      if (decision.searchMode === 'fast') {
        logger.info('Запуск быстрого веб-поиска (sonar)');
        perplexityResponse = await perplexityClient.fastSearch(decision.searchQuery);
      } else {
        logger.info('Запуск глубокого веб-исследования (sonar-deep-research)');
        perplexityResponse = await perplexityClient.deepResearch(decision.searchQuery);
      }

      // Формирование результата
      const webSearchResult: WebSearchResult = {
        searchMode: decision.searchMode,
        content: perplexityResponse.content,
        sources: perplexityResponse.sources,
        query: decision.searchQuery
      };

      logger.info(
        `Веб-поиск завершен успешно (${decision.searchMode}), получено ${perplexityResponse.content.length} символов`
      );

      return {
        webSearch: webSearchResult
      };

    } catch (perplexityError) {
      // Graceful degradation: если Perplexity не ответил, продолжаем без веб-данных
      const errorMessage = perplexityError instanceof Error
        ? perplexityError.message
        : 'Неизвестная ошибка Perplexity API';

      logger.error(`Ошибка веб-поиска: ${errorMessage}`);
      logger.info('Продолжаем обработку без веб-данных (graceful degradation)');

      // Возвращаем undefined для webSearch, чтобы продолжить без веб-контекста
      return {
        webSearch: undefined
      };
    }

  } catch (error) {
    // Ошибка на этапе принятия решения или другая критическая ошибка
    const message = error instanceof Error ? error.message : 'Неизвестная ошибка';
    logger.error(`Критическая ошибка узла веб-поиска: ${message}`);

    // Graceful degradation: продолжаем без веб-данных
    logger.info('Продолжаем обработку без веб-данных');
    return {
      webSearch: undefined
    };
  }
}
