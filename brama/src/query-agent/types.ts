/**
 * TypeScript интерфейсы для Query Agent
 */

import { z } from 'zod';

// ============================================================================
// Результаты этапов обработки
// ============================================================================

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
 * Координаты ячейки в таблице
 */
export interface CellCoordinates {
  viewId: number;      // ID представления
  colIndex: number;    // Индекс колонки
  rowIndex: number;    // Индекс строки
}

/**
 * Результат выбора представления и координат ячейки (Этап 3)
 */
export interface ViewSelectionResult {
  cell: CellCoordinates;  // Координаты ячейки
  metadata: {
    viewName: string;      // Название представления
    sectionName: string;   // Название раздела
    statformName: string;  // Название статформы
  };
  reasoning?: string;      // Пояснение выбора
}

// ============================================================================
// Zod схемы для валидации LLM ответов
// ============================================================================

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
  viewId: z.number(),
  colIndex: z.number().min(0),
  rowIndex: z.number().min(0)
});

/**
 * Zod схема для результата выбора представления
 */
export const ViewSelectionSchema = z.object({
  cell: CellCoordinatesSchema,
  metadata: z.object({
    viewName: z.string(),
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

  // Результаты этапов
  statformSelection?: StatformSelectionResult;
  sectionSelection?: SectionSelectionResult;
  viewSelection?: ViewSelectionResult;

  // Финальный результат
  dashboardData?: any;  // DashboardData из dashboard-service

  // Ошибки
  error?: string;
}
