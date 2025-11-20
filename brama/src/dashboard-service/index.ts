/**
 * Dashboard Service - Модуль генерации dashboard для интеграции в brama
 * Замена Neo4jService
 *
 * Экспортируемый контракт:
 * - DashboardGenerator.generateDashboard(input) - основной метод
 * - DashboardGenerator.shutdown() - graceful shutdown
 * - Все TypeScript интерфейсы для типизации
 */

export { DashboardGenerator } from './dashboardGenerator.js';

// Экспорт типов для использования в других модулях
export type {
  DashboardData,
  LinearChart,
  RussiaMapChart,
  DashboardServiceInput,
  ViewMetadata,
  CellCoordinates,
} from './types.js';
