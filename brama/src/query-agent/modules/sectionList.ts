/**
 * Модуль для получения списка разделов для статформы из Neo4j
 */

import { Neo4jClient } from '../../shared/neo4jClient.js';
import { Logger } from '../../shared/logger.js';

const logger = Logger.withPrefix('SectionList');

export interface Section {
  id: number;
  name: string;
  fullName: string;
}

/**
 * Получить список разделов для заданных статформ
 * @param neo4jClient - клиент Neo4j
 * @param statformIds - массив ID статформ
 * @returns массив разделов с id, name и fullName
 */
export async function getSectionList(
  neo4jClient: Neo4jClient,
  statformIds: number[]
): Promise<Section[]> {
  logger.debug(`Запрос разделов для статформ: ${statformIds.join(', ')}`);

  const query = `
    MATCH (parent)-[:СОДЕРЖИТ]->(child)
    WHERE id(parent) IN $statformIds
    RETURN id(child) AS id, child.name AS name, child.full_name AS fullName
    ORDER BY child.name
  `;

  try {
    const result = await neo4jClient.executeQuery(query, { statformIds });

    const sections: Section[] = result.records.map((record: any) => ({
      id: record.get('id').toNumber(),
      name: record.get('name'),
      fullName: record.get('fullName') || record.get('name')
    }));

    logger.info(`Получено ${sections.length} разделов для статформ [${statformIds.join(', ')}]`);
    return sections;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Неизвестная ошибка';
    logger.error(`Ошибка при получении разделов: ${message}`);
    throw new Error(`Не удалось получить список разделов: ${message}`);
  }
}
