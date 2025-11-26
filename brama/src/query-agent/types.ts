/**
 * TypeScript интерфейсы для Query Agent
 */

import { z } from 'zod';

// ============================================================================
// Результаты этапов обработки
// ============================================================================

/**
 * Один вариант уточнения запроса (Этап 0 - Clarification)
 * Содержит только человеко-читаемое описание (без технических полей)
 */
export interface ClarificationSuggestion {
  id: number;           // Порядковый номер (1-7)
  label: string;        // Короткий ярлык (1-2 слова, макс 15 символов) — для кнопки
  description: string;  // Подробное описание (30-80 символов) — для показа пользователю
}

/**
 * Результат уточнения запроса (Этап 0)
 */
export interface ClarificationResult {
  suggestions: ClarificationSuggestion[];  // 4-7 вариантов уточнения (в зависимости от неопределенности)
  reasoning?: string;                       // Пояснение (опционально)
}

/**
 * Результат выбора статформ (Этап 1)
 */
export interface StatformSelectionResult {
  statformIds: number[];  // Массив ID выбранных статформ (max 2)
  reasoning?: string;      // Пояснение выбора (опционально)
}

/**
 * Результат выбора раздела (Этап 2)
 */
export interface SectionSelectionResult {
  sectionId: number;       // ID выбранного раздела
  sectionName: string;     // Название раздела
  reasoning?: string;      // Пояснение выбора
}

/**
 * Координаты ячейки в таблице (только row и col, без viewId)
 */
export interface CellCoordinates {
  colIndex: number;    // Индекс колонки
  rowIndex: number;    // Индекс строки
}

/**
 * Результат выбора представления и координат ячейки (Этап 3)
 * Поддерживает выбор одного или нескольких представлений для агрегации
 */
export interface ViewSelectionResult {
  viewIds: number[];         // Массив ID представлений (может быть 1 или более)
  cellCoordinates: CellCoordinates;  // Координаты ячейки (одинаковые для всех представлений)

  // ВРЕМЕННО: для объединения похожих ячеек (TODO: удалить после исправления схем)
  similarCellCoordinate?: CellCoordinates;  // Одна дополнительная похожая ячейка

  metadata: {
    viewNames: string[];     // Массив названий представлений
    sectionName: string;     // Название раздела
    statformName: string;    // Название статформы
  };
  reasoning?: string;        // Пояснение выбора
}

// ============================================================================
// Zod схемы для валидации LLM ответов
// ============================================================================

/**
 * Zod схема для варианта уточнения
 */
export const ClarificationSuggestionSchema = z.object({
  id: z.number().min(1).max(7),
  label: z.string().max(15),
  description: z.string().min(30).max(80)
});

/**
 * Zod схема для результата уточнения запроса
 */
export const ClarificationResultSchema = z.object({
  suggestions: z.array(ClarificationSuggestionSchema).min(4).max(7),
  reasoning: z.string().optional()
});

/**
 * Zod схема для результата выбора статформ
 */
export const StatformSelectionSchema = z.object({
  statformIds: z.array(z.number()).min(1).max(2),
  reasoning: z.string().optional()
});

/**
 * Zod схема для результата выбора раздела
 */
export const SectionSelectionSchema = z.object({
  sectionId: z.number(),
  sectionName: z.string(),
  reasoning: z.string().optional()
});

/**
 * Zod схема для координат ячейки
 */
export const CellCoordinatesSchema = z.object({
  colIndex: z.number().min(0),
  rowIndex: z.number().min(0)
});

/**
 * Zod схема для результата выбора представления
 */
export const ViewSelectionSchema = z.object({
  viewIds: z.array(z.number()).min(1),  // Массив ID представлений (минимум 1, без ограничения максимума)
  cellCoordinates: CellCoordinatesSchema,

  // ВРЕМЕННО: опциональное поле для одной похожей координаты
  similarCellCoordinate: CellCoordinatesSchema.optional(),

  metadata: z.object({
    viewNames: z.array(z.string()),  // Массив названий представлений
    sectionName: z.string(),
    statformName: z.string()
  }),
  reasoning: z.string().optional()
});

// ============================================================================
// State для LangGraph
// ============================================================================

/**
 * Состояние агента в процессе обработки запроса
 */
export interface AgentState {
  // Входные данные
  query: string;  // Оригинальный запрос пользователя

  // Результат уточнения (Этап 0)
  clarification?: ClarificationResult;

  // Результаты этапов
  statformSelection?: StatformSelectionResult;
  sectionSelection?: SectionSelectionResult;
  viewSelection?: ViewSelectionResult;

  // Финальный результат
  dashboardData?: any;  // DashboardData из dashboard-service

  // Ошибки
  error?: string;
}
