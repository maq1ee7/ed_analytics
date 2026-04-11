/**
 * Узел LangGraph: Генерация dashboard через DashboardService
 * Этот узел НЕ использует LLM - только извлечение данных из Neo4j
 */

import { AgentStateType } from '../state.js';
import { Logger } from '../../../shared/logger.js';
import { DashboardGenerator } from '../../../dashboard-service/dashboardGenerator.js';

const logger = Logger.withPrefix('GenerateDashboardNode');

/**
 * Узел для генерации dashboard
 * @param state - текущее состояние агента
 * @returns обновленное состояние с финальным DashboardData
 */
export async function generateDashboardNode(
  state: AgentStateType
): Promise<Partial<AgentStateType>> {
  logger.info(`Этап 4: Генерация dashboard для запроса "${state.query}"`);

  try {
    // Проверка наличия всех необходимых данных
    if (!state.viewSelection) {
      throw new Error('Не выбрано представление и координаты на предыдущем этапе');
    }

    const { viewIds, cellCoordinates, metadata, similarCellCoordinate } = state.viewSelection;

    // Подготовить входные данные для DashboardGenerator
    const dashboardInput = {
      query: state.query,
      viewIds: viewIds,
      colIndex: cellCoordinates.colIndex,
      rowIndex: cellCoordinates.rowIndex,

      // ВРЕМЕННО: передаем похожую координату (если есть)
      similarCellCoordinate: similarCellCoordinate,

      metadata: {
        viewNames: metadata.viewNames,
        sectionName: metadata.sectionName,
        statformName: metadata.statformName
      }
    };

    logger.debug(
      `Вызов DashboardGenerator с параметрами: ` +
      `viewIds=[${viewIds.join(', ')}], row=${cellCoordinates.rowIndex}, col=${cellCoordinates.colIndex}`
    );

    // Создать экземпляр генератора и получить dashboard
    const generator = new DashboardGenerator();
    const dashboardData = await generator.generateDashboard(dashboardInput);

    logger.info('Dashboard успешно сгенерирован');

    // Вернуть обновленное состояние с финальным результатом
    return {
      dashboardData
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Неизвестная ошибка';
    logger.error(`Ошибка при генерации dashboard: ${message}`);

    return {
      error: `Не удалось сгенерировать dashboard: ${message}`
    };
  }
}
