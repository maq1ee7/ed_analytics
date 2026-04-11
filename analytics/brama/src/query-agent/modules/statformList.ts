/**
 * Модуль для получения списка статформ из Neo4j
 */

import { Neo4jClient } from '../../shared/neo4jClient.js';
import { Logger } from '../../shared/logger.js';

const logger = Logger.withPrefix('StatformList');

export interface Statform {
  id: number;
  name: string;
  description: string;
}

/**
 * Получить список всех статформ из Neo4j
 * @param neo4jClient - клиент Neo4j
 * @returns массив статформ с id, name и description
 */
export async function getStatformList(neo4jClient: Neo4jClient): Promise<Statform[]> {
  logger.debug('Запрос списка статформ из Neo4j');

  const query = `
    MATCH (n:СТАТФОРМА)
    RETURN n.name AS name, n.description AS description, id(n) AS id
    ORDER BY n.name
  `;

  try {
    const result = await neo4jClient.executeQuery(query);

    const statforms: Statform[] = result.records.map((record: any) => ({
      id: record.get('id').toNumber(),
      name: record.get('name'),
      description: record.get('description') || ''
    }));

    logger.info(`Получено ${statforms.length} статформ`);
    return statforms;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Неизвестная ошибка';
    logger.error(`Ошибка при получении статформ: ${message}`);
    throw new Error(`Не удалось получить список статформ: ${message}`);
  }
}
