/**
 * Модуль для получения схем таблиц и доступных годов из Neo4j
 */

import { Neo4jClient } from '../../shared/neo4jClient.js';
import { Logger } from '../../shared/logger.js';

const logger = Logger.withPrefix('SchemaBuilder');

export interface TableSchema {
  viewId: number;
  viewName: string;
  availableYears: number[];
  sampleYear: number;
  sampleData: string[][]; // Первые несколько строк таблицы для анализа
  headers: string[]; // Заголовки колонок (из первой строки)
  rowNames: string[]; // Названия строк (из второй колонки, начиная со строки 1)
}

/**
 * Получить схему таблицы для представления
 * @param neo4jClient - клиент Neo4j
 * @param viewId - ID представления
 * @param viewName - название представления
 * @param sampleRows - количество строк для примера (по умолчанию 5)
 * @returns схема таблицы с доступными годами и примером данных
 */
export async function getTableSchema(
  neo4jClient: Neo4jClient,
  viewId: number,
  viewName: string,
  sampleRows: number = 5
): Promise<TableSchema> {
  logger.debug(`Запрос схемы таблицы для представления ${viewId}`);

  try {
    // 1. Получить доступные годы
    const availableYears = await neo4jClient.getAvailableYears(viewId);

    if (availableYears.length === 0) {
      throw new Error(`Нет доступных данных для представления ${viewId}`);
    }

    logger.debug(`Доступные годы для представления ${viewId}: ${availableYears.join(', ')}`);

    // 2. Попробовать получить данные, начиная с последнего года
    // Если данных нет, пробуем предыдущие годы
    let sampleYear: number | null = null;
    let tableData: string[][] | null = null;

    // Сортируем годы по убыванию и пробуем получить данные
    const sortedYears = [...availableYears].sort((a, b) => b - a);

    for (const year of sortedYears) {
      try {
        const sampleData = await neo4jClient.getFederalData(viewId, [year]);
        const dataKey = `data_${year}`;

        // ИСПРАВЛЕНИЕ: используем правильный ключ data_YYYY
        if (sampleData[dataKey] && sampleData[dataKey].length > 0) {
          sampleYear = year;
          tableData = sampleData[dataKey];
          logger.debug(`Данные найдены для года ${year}`);
          break;
        }
      } catch (error) {
        logger.debug(`Нет данных для года ${year}, пробуем следующий`);
        continue;
      }
    }

    // Если не нашли данные ни для одного года
    if (sampleYear === null || tableData === null) {
      throw new Error(`Нет данных ни для одного из доступных годов: ${availableYears.join(', ')}`);
    }

    // 4. Извлечь заголовки (первая строка таблицы)
    const headers = tableData[0].map(cell => String(cell));

    // 5. Извлечь названия строк (вторая колонка, начиная со строки 1)
    const rowNames = tableData
      .slice(1) // Пропускаем заголовок
      .map(row => String(row[1] || '')) // Берем вторую колонку (index 1)
      .filter(name => name.trim() !== ''); // Убираем пустые

    // 6. Взять первые N строк для примера (включая заголовки)
    const limitedData = tableData.slice(0, Math.min(sampleRows + 1, tableData.length));

    logger.info(
      `Схема получена для представления ${viewId}: ${availableYears.length} лет, ` +
      `${limitedData.length} строк примера, ${rowNames.length} названий строк`
    );

    return {
      viewId,
      viewName,
      availableYears,
      sampleYear,
      sampleData: limitedData,
      headers,
      rowNames
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Неизвестная ошибка';
    logger.error(`Ошибка при получении схемы таблицы: ${message}`);
    throw new Error(`Не удалось получить схему таблицы для представления ${viewId}: ${message}`);
  }
}

/**
 * Форматировать схему таблицы в текстовое представление для LLM
 * @param schema - схема таблицы
 * @returns форматированная строка для передачи LLM
 */
export function formatSchemaForLLM(schema: TableSchema): string {
  const lines = [
    `Представление: ${schema.viewName} (ID: ${schema.viewId})`,
    `Доступные годы: ${schema.availableYears.join(', ')}`,
    ``,
    `Пример структуры таблицы (год ${schema.sampleYear}):`,
    ``
  ];

  // Форматировать таблицу
  schema.sampleData.forEach((row, rowIndex) => {
    const rowStr = row.map((cell, colIndex) => `[${rowIndex},${colIndex}] ${cell}`).join(' | ');
    lines.push(rowStr);
  });

  return lines.join('\n');
}
