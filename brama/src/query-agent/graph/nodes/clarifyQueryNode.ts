/**
 * Узел LangGraph: Генерация вариантов уточнения запроса
 */

import { AgentStateType } from '../state.js';
import { LLMClient } from '../../../shared/llmClient.js';
import { Neo4jClient } from '../../../shared/neo4jClient.js';
import { Logger } from '../../../shared/logger.js';
import { getStatformList } from '../../modules/statformList.js';
import { getSectionList } from '../../modules/sectionList.js';
import {
  createClarificationPrompt,
  createClarificationMessage,
  StatformWithSections
} from '../../prompts/queryClarification.js';
import { ClarificationResultSchema, ClarificationResult } from '../../types.js';

const logger = Logger.withPrefix('ClarifyQueryNode');

/**
 * Узел для генерации вариантов уточнения запроса
 * @param state - текущее состояние агента
 * @param llmClient - клиент LLM
 * @param neo4jClient - клиент Neo4j
 * @returns обновленное состояние с вариантами уточнения
 */
export async function clarifyQueryNode(
  state: AgentStateType,
  llmClient: LLMClient,
  neo4jClient: Neo4jClient
): Promise<Partial<AgentStateType>> {
  logger.info(`Этап 0: Генерация вариантов уточнения для запроса "${state.query}"`);

  try {
    // 1. Получить список всех статформ из Neo4j
    const statforms = await getStatformList(neo4jClient);

    if (statforms.length === 0) {
      throw new Error('Список статформ пуст');
    }

    logger.debug(`Получено ${statforms.length} статформ`);

    // 2. Получить разделы для каждой статформы
    const statformsWithSections: StatformWithSections[] = [];

    for (const statform of statforms) {
      const sections = await getSectionList(neo4jClient, [statform.id]);
      statformsWithSections.push({
        statform,
        sections
      });
      logger.debug(`Статформа "${statform.name}": ${sections.length} разделов`);
    }

    // 3. Создать промпт для LLM
    const systemPrompt = createClarificationPrompt(statformsWithSections);
    const userMessage = createClarificationMessage(state.query);

    // 4. Вызвать LLM для генерации вариантов
    const result = await llmClient.chatJSON<ClarificationResult>(
      systemPrompt,
      userMessage,
      ClarificationResultSchema,
      0.7 // Более высокая температура для разнообразия вариантов
    );

    logger.info(
      `Сгенерировано ${result.suggestions.length} вариантов уточнения` +
      (result.reasoning ? ` | ${result.reasoning}` : '')
    );

    // Логируем варианты
    result.suggestions.forEach((s, i) => {
      logger.debug(`Вариант ${i + 1}: ${s.label} — ${s.description}`);
    });

    // 5. Вернуть обновленное состояние
    return {
      clarification: result
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Неизвестная ошибка';
    logger.error(`Ошибка при генерации вариантов уточнения: ${message}`);

    return {
      error: `Не удалось сгенерировать варианты уточнения: ${message}`
    };
  }
}
