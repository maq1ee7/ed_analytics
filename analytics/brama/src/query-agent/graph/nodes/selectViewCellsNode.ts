/**
 * Узел LangGraph: Выбор представления и координат ячейки
 */

import { AgentStateType } from '../state.js';
import { LLMClient } from '../../../shared/llmClient.js';
import { Neo4jClient } from '../../../shared/neo4jClient.js';
import { Logger } from '../../../shared/logger.js';
import { getViewList } from '../../modules/viewList.js';
import { getTableSchema } from '../../modules/schemaBuilder.js';
import {
  createViewCellSelectionPrompt,
  createViewCellSelectionMessage
} from '../../prompts/viewCellSelection.js';
import { ViewSelectionSchema, ViewSelectionResult } from '../../types.js';
import { getStatformList } from '../../modules/statformList.js';

const logger = Logger.withPrefix('SelectViewCellsNode');

/**
 * Узел для выбора представления и координат ячейки
 * @param state - текущее состояние агента
 * @param llmClient - клиент LLM
 * @param neo4jClient - клиент Neo4j
 * @returns обновленное состояние с выбранным представлением и координатами
 */
export async function selectViewCellsNode(
  state: AgentStateType,
  llmClient: LLMClient,
  neo4jClient: Neo4jClient
): Promise<Partial<AgentStateType>> {
  logger.info(`Этап 3: Выбор представления и координат ячейки для запроса "${state.query}"`);

  try {
    // Проверка наличия результатов предыдущих этапов
    if (!state.statformSelection || !state.sectionSelection) {
      throw new Error('Не выбраны статформы или раздел на предыдущих этапах');
    }

    const sectionId = state.sectionSelection.sectionId;
    const sectionName = state.sectionSelection.sectionName;

    // 1. Получить список представлений для раздела
    const views = await getViewList(neo4jClient, sectionId);

    if (views.length === 0) {
      throw new Error(`Нет представлений для раздела ${sectionId}`);
    }

    logger.debug(`Получено ${views.length} представлений для анализа`);

    // 2. Получить схему таблицы для первого представления
    // (структура одинаковая для всех представлений раздела)
    const firstView = views[0];
    const schema = await getTableSchema(neo4jClient, firstView.id, firstView.name);

    logger.debug(`Получена схема таблицы (одинаковая для всех представлений)`);

    // 3. Получить название статформы для метаданных
    const statforms = await getStatformList(neo4jClient);
    const statformId = state.statformSelection.statformIds[0];
    const statform = statforms.find(sf => sf.id === statformId);
    const statformName = statform?.name || 'Неизвестная статформа';

    // 4. Создать промпт для LLM
    const systemPrompt = createViewCellSelectionPrompt(schema, views);
    const userMessage = createViewCellSelectionMessage(state.query, sectionName, statformName);

    // 5. Вызвать LLM для выбора ячейки
    const result = await llmClient.chatJSON<ViewSelectionResult>(
      systemPrompt,
      userMessage,
      ViewSelectionSchema,
      0.3 // Низкая температура для более детерминированного выбора
    );

    logger.info(
      `Выбрано представлений: ${result.viewIds.length}, ` +
      `viewIds=[${result.viewIds.join(', ')}], ` +
      `координаты: row=${result.cellCoordinates.rowIndex}, col=${result.cellCoordinates.colIndex}` +
      (result.reasoning ? ` | ${result.reasoning}` : '')
    );

    // 6. Вернуть обновленное состояние
    return {
      viewSelection: result
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Неизвестная ошибка';
    logger.error(`Ошибка при выборе представления и координат: ${message}`);

    return {
      error: `Не удалось выбрать представление и координаты: ${message}`
    };
  }
}
