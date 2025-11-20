/**
 * ОБЯЗАТЕЛЬНЫЙ КОНТРАКТ для интеграции с brama
 * Эти интерфейсы должны точно соответствовать требованиям backend
 */

/**
 * Главный интерфейс ответа dashboard-service
 */
export interface DashboardData {
  dashboard: {
    title: string;                              // Оригинальный запрос пользователя
    description: string;                        // Описание с метаданными
    charts: [LinearChart, RussiaMapChart];      // Всегда ровно 2 графика
  };
}

/**
 * График линейной диаграммы (федеральные данные по годам)
 */
export interface LinearChart {
  type: 'linear';
  title: string;                                // Название графика
  data: {
    years: Array<{
      points: Array<{
        x: number;                              // Год (2021, 2022, ...)
        y: number | null;                       // Значение или null
      }>;
    }>;
  };
}

/**
 * График карты России (региональные данные)
 */
export interface RussiaMapChart {
  type: 'russia_map';
  title: string;                                // Название графика
  data: {
    years: Array<{
      year: number;                             // Год
      regions: Array<{
        regionCode: string;                     // Код региона в формате 'RU-XXX'
        value: number | null;                   // Значение или null
      }>;
    }>;
  };
}

/**
 * Входные данные для DashboardGenerator
 * Эти данные приходят из query-agent (будет реализован позже)
 */
export interface DashboardServiceInput {
  query: string;                                // Оригинальный запрос пользователя
  viewId: number;                               // ID узла Представления в Neo4j
  colIndex: number;                             // Индекс колонки в таблице
  rowIndex: number;                             // Индекс строки в таблице
  metadata: ViewMetadata;                       // Метаданные для description
}

/**
 * Метаданные о выбранном представлении
 */
export interface ViewMetadata {
  viewName: string;                             // Название представления
  sectionName: string;                          // Название раздела
  statformName: string;                         // Название статформы
}

/**
 * Координаты ячейки в таблице
 */
export interface CellCoordinates {
  viewId: number;
  colIndex: number;
  rowIndex: number;
}

/**
 * ВНУТРЕННИЕ ТИПЫ для обработки данных
 */

/**
 * Значение ячейки с флагом null
 */
export interface CellValue {
  value: number | null;
  isNull: boolean;
}

/**
 * Извлечённые федеральные данные
 */
export interface ExtractedFederalData {
  years: number[];
  dataByYear: Map<number, CellValue>;
}

/**
 * Региональное значение
 */
export interface RegionValue {
  regionCode: string;
  value: number | null;
  regionName?: string;
}

/**
 * Извлечённые региональные данные
 */
export interface ExtractedRegionalData {
  years: number[];
  regionsByYear: Map<number, RegionValue[]>;
  allRegionCodes: Set<string>;
}

/**
 * Данные региона из Neo4j
 */
export interface RegionDataRow {
  regionCode: string;
  regionName: string;
  federalDistrict: string;
  [key: string]: any;                           // data_2021, data_2022, и т.д.
}

/**
 * Схема таблицы
 */
export interface TableSchema {
  data: any[][];                                // Полные данные таблицы
  headers: string[];                            // Заголовки колонок
  rowLabels: string[];                          // Метки строк
}

/**
 * Тип ошибки dashboard-service
 */
export interface DashboardError extends Error {
  code: string;
  userMessage: string;                          // Сообщение на русском для пользователя
  details?: Record<string, any>;
}
