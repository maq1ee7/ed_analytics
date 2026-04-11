/**
 * Узел LangGraph: Выбор статформ на основе запроса пользователя
 */

import { AgentStateType } from '../state.js';
import { LLMClient } from '../../../shared/llmClient.js';
import { Neo4jClient } from '../../../shared/neo4jClient.js';
import { Logger } from '../../../shared/logger.js';
import { getStatformList } from '../../modules/statformList.js';
import {
  createStatformSelectionPrompt,
  createStatformSelectionMessage
} from '../../prompts/statformSelection.js';
import { StatformSelectionSchema, StatformSelectionResult } from '../../types.js';

const logger = Logger.withPrefix('SelectStatformNode');

/**
 * Узел для выбора статформ
 * @param state - текущее состояние агента
 * @param llmClient - клиент LLM
 * @param neo4jClient - клиент Neo4j
 * @returns обновленное состояние с выбранными статформами
 */
export async function selectStatformNode(
  state: AgentStateType,
  llmClient: LLMClient,
  neo4jClient: Neo4jClient
): Promise<Partial<AgentStateType>> {
  logger.info(`Этап 1: Выбор статформ для запроса "${state.query}"`);

  try {
    // 1. Получить список всех статформ из Neo4j
    const statforms = await getStatformList(neo4jClient);

    if (statforms.length === 0) {
      throw new Error('Список статформ пуст');
    }

    logger.debug(`Получено ${statforms.length} статформ для анализа`);

    // 2. Создать промпт для LLM
    const systemPrompt = createStatformSelectionPrompt(statforms);
    const userMessage = createStatformSelectionMessage(state.query);

    // 3. Вызвать LLM для выбора статформ
    const result = await llmClient.chatJSON<StatformSelectionResult>(
      systemPrompt,
      userMessage,
      StatformSelectionSchema,
      0.3 // Низкая температура для более детерминированного выбора
    );

    logger.info(
      `Выбраны статформы: [${result.statformIds.join(', ')}]` +
      (result.reasoning ? ` | ${result.reasoning}` : '')
    );

    // 4. Вернуть обновленное состояние
    return {
      statformSelection: result
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Неизвестная ошибка';
    logger.error(`Ошибка при выборе статформ: ${message}`);

    return {
      error: `Не удалось выбрать статформы: ${message}`
    };
  }
}
