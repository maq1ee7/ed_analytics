/**
 * Узел LangGraph: Выбор раздела на основе статформ
 */

import { AgentStateType } from '../state.js';
import { LLMClient } from '../../../shared/llmClient.js';
import { Neo4jClient } from '../../../shared/neo4jClient.js';
import { Logger } from '../../../shared/logger.js';
import { getSectionList } from '../../modules/sectionList.js';
import {
  createSectionSelectionPrompt,
  createSectionSelectionMessage
} from '../../prompts/sectionSelection.js';
import { SectionSelectionSchema, SectionSelectionResult } from '../../types.js';

const logger = Logger.withPrefix('SelectSectionNode');

/**
 * Узел для выбора раздела
 * @param state - текущее состояние агента
 * @param llmClient - клиент LLM
 * @param neo4jClient - клиент Neo4j
 * @returns обновленное состояние с выбранным разделом
 */
export async function selectSectionNode(
  state: AgentStateType,
  llmClient: LLMClient,
  neo4jClient: Neo4jClient
): Promise<Partial<AgentStateType>> {
  logger.info(`Этап 2: Выбор раздела для запроса "${state.query}"`);

  try {
    // Проверка наличия результатов предыдущего этапа
    if (!state.statformSelection || state.statformSelection.statformIds.length === 0) {
      throw new Error('Не выбраны статформы на предыдущем этапе');
    }

    const statformIds = state.statformSelection.statformIds;

    // 1. Получить список разделов для выбранных статформ
    const sections = await getSectionList(neo4jClient, statformIds);

    if (sections.length === 0) {
      throw new Error(`Нет разделов для статформ [${statformIds.join(', ')}]`);
    }

    logger.debug(`Получено ${sections.length} разделов для анализа`);

    // 2. Создать промпт для LLM
    const systemPrompt = createSectionSelectionPrompt(sections);
    const userMessage = createSectionSelectionMessage(state.query);

    // 3. Вызвать LLM для выбора раздела
    const result = await llmClient.chatJSON<SectionSelectionResult>(
      systemPrompt,
      userMessage,
      SectionSelectionSchema,
      0.3 // Низкая температура для более детерминированного выбора
    );

    logger.info(
      `Выбран раздел: ${result.sectionId} (${result.sectionName})` +
      (result.reasoning ? ` | ${result.reasoning}` : '')
    );

    // 4. Вернуть обновленное состояние
    return {
      sectionSelection: result
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Неизвестная ошибка';
    logger.error(`Ошибка при выборе раздела: ${message}`);

    return {
      error: `Не удалось выбрать раздел: ${message}`
    };
  }
}
