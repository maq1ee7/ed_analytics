/**
 * Определение состояния (State) для LangGraph
 */

import { Annotation } from '@langchain/langgraph';
import {
  ClarificationResult,
  StatformSelectionResult,
  SectionSelectionResult,
  ViewSelectionResult
} from '../types.js';

/**
 * Определение структуры состояния агента
 *
 * AgentState содержит все данные, которые передаются между узлами графа
 */
export const AgentState = Annotation.Root({
  // Входные данные
  query: Annotation<string>({
    reducer: (_, value) => value,
    default: () => ''
  }),

  // Результат этапа 0: уточнение запроса
  clarification: Annotation<ClarificationResult | undefined>({
    reducer: (_, value) => value,
    default: () => undefined
  }),

  // Результат этапа 1: выбор статформ
  statformSelection: Annotation<StatformSelectionResult | undefined>({
    reducer: (_, value) => value,
    default: () => undefined
  }),

  // Результат этапа 2: выбор раздела
  sectionSelection: Annotation<SectionSelectionResult | undefined>({
    reducer: (_, value) => value,
    default: () => undefined
  }),

  // Результат этапа 3: выбор представления и координат ячейки
  viewSelection: Annotation<ViewSelectionResult | undefined>({
    reducer: (_, value) => value,
    default: () => undefined
  }),

  // Финальный результат: DashboardData
  dashboardData: Annotation<any>({
    reducer: (_, value) => value,
    default: () => undefined
  }),

  // Ошибки
  error: Annotation<string | undefined>({
    reducer: (_, value) => value,
    default: () => undefined
  })
});

/**
 * Тип состояния агента (извлекается из Annotation)
 */
export type AgentStateType = typeof AgentState.State;
