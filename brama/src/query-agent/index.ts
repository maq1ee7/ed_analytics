/**
 * Query Agent - главный модуль для обработки запросов пользователей
 * Замена LLMService из проекта brama
 */

import { LLMClient } from '../shared/llmClient.js';
import { Neo4jClient } from '../shared/neo4jClient.js';
import { Logger } from '../shared/logger.js';
import { buildQueryGraph, buildClarificationGraph } from './graph/graph.js';
import type { DashboardData } from '../dashboard-service/types.js';
import type { ClarificationResult } from './types.js';

const logger = Logger.withPrefix('QueryAgent');

/**
 * Query Agent - обработчик запросов пользователей через LangGraph
 */
export class QueryAgent {
  private llmClient: LLMClient;
  private neo4jClient: Neo4jClient;
  private graph: ReturnType<typeof buildQueryGraph>;
  private clarificationGraph: ReturnType<typeof buildClarificationGraph>;

  constructor() {
    logger.info('Инициализация QueryAgent');

    // Инициализация клиентов
    this.llmClient = new LLMClient();
    this.neo4jClient = Neo4jClient.getInstance();

    // Построение LangGraph графов
    this.graph = buildQueryGraph(this.llmClient, this.neo4jClient);
    this.clarificationGraph = buildClarificationGraph(this.llmClient, this.neo4jClient);

    logger.info('QueryAgent успешно инициализирован');
  }

  /**
   * Обработать запрос пользователя и вернуть DashboardData
   * @param question - текстовый запрос пользователя (может быть уточненным)
   * @returns Promise<DashboardData> - готовый dashboard с 2 графиками
   * @throws Error с сообщением на русском языке при ошибках
   */
  async processQuery(question: string): Promise<DashboardData> {
    logger.info(`Начало обработки запроса: "${question}"`);

    try {
      // Подключиться к Neo4j
      await this.neo4jClient.connect();

      // Запустить граф обработки
      const initialState = {
        query: question
      };

      logger.debug('Запуск LangGraph графа');
      const finalState = await this.graph.invoke(initialState);

      // Проверить наличие ошибок
      if (finalState.error) {
        throw new Error(finalState.error);
      }

      // Проверить наличие результата
      if (!finalState.dashboardData) {
        throw new Error('Граф не вернул данные dashboard');
      }

      logger.info('Запрос успешно обработан');
      return finalState.dashboardData as DashboardData;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Неизвестная ошибка';
      logger.error(`Ошибка при обработке запроса: ${message}`);
      throw new Error(`Не удалось обработать запрос: ${message}`);
    }
  }

  /**
   * Получить варианты уточнения запроса
   * @param question - текстовый запрос пользователя
   * @returns Promise<ClarificationResult> - 4 варианта уточнения
   * @throws Error с сообщением на русском языке при ошибках
   */
  async getClarifications(question: string): Promise<ClarificationResult> {
    logger.info(`Получение вариантов уточнения для запроса: "${question}"`);

    try {
      // Подключиться к Neo4j
      await this.neo4jClient.connect();

      // Запустить граф уточнения
      const initialState = {
        query: question
      };

      logger.debug('Запуск LangGraph графа уточнения');
      const finalState = await this.clarificationGraph.invoke(initialState);

      // Проверить наличие ошибок
      if (finalState.error) {
        throw new Error(finalState.error);
      }

      // Проверить наличие результата
      if (!finalState.clarification) {
        throw new Error('Граф не вернул варианты уточнения');
      }

      logger.info(`Получено ${finalState.clarification.suggestions.length} вариантов уточнения`);
      return finalState.clarification as ClarificationResult;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Неизвестная ошибка';
      logger.error(`Ошибка при получении уточнений: ${message}`);
      throw new Error(`Не удалось получить варианты уточнения: ${message}`);
    }
  }

  /**
   * Graceful shutdown всех компонентов
   */
  async shutdown(): Promise<void> {
    logger.info('Завершение работы QueryAgent');

    try {
      await this.llmClient.shutdown();
      await this.neo4jClient.shutdown();
      logger.info('QueryAgent успешно завершил работу');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Неизвестная ошибка';
      logger.error(`Ошибка при завершении работы: ${message}`);
    }
  }
}

// Экспорт типов для использования в других модулях
export type { DashboardData } from '../dashboard-service/types.js';
export type {
  ClarificationResult,
  ClarificationSuggestion,
  StatformSelectionResult,
  SectionSelectionResult,
  ViewSelectionResult,
  CellCoordinates
} from './types.js';
