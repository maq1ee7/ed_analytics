/**
 * Модуль для получения списка представлений для раздела из Neo4j
 */

import { Neo4jClient } from '../../shared/neo4jClient.js';
import { Logger } from '../../shared/logger.js';

const logger = Logger.withPrefix('ViewList');

export interface View {
  id: number;
  name: string;
  viewType: string;
}

/**
 * Получить список представлений для заданного раздела
 * @param neo4jClient - клиент Neo4j
 * @param sectionId - ID раздела
 * @returns массив представлений с id, name и viewType
 */
export async function getViewList(
  neo4jClient: Neo4jClient,
  sectionId: number
): Promise<View[]> {
  logger.debug(`Запрос представлений для раздела: ${sectionId}`);

  const query = `
    MATCH (parent)-[:СОДЕРЖИТ]->(child)
    WHERE id(parent) = $sectionId
    RETURN id(child) AS id, child.name AS name, child.view_type AS viewType
    ORDER BY child.name
  `;

  try {
    const result = await neo4jClient.executeQuery(query, { sectionId });

    const views: View[] = result.records.map((record: any) => ({
      id: record.get('id').toNumber(),
      name: record.get('name'),
      viewType: record.get('viewType') || 'unknown'
    }));

    logger.info(`Получено ${views.length} представлений для раздела ${sectionId}`);
    return views;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Неизвестная ошибка';
    logger.error(`Ошибка при получении представлений: ${message}`);
    throw new Error(`Не удалось получить список представлений: ${message}`);
  }
}
