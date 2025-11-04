/**
 * Типы для Brama Backend
 */

// Задача для обработки
export interface ProcessTask {
  taskId: string;
  question: string;
  callbackUrl: string;
}

// Результат обработки
export interface ProcessResult {
  status: 'completed' | 'failed';
  result?: DashboardData;
  error?: string;
}

// Типы для Dashboard (копия из основного backend)
export interface DashboardData {
  dashboard: {
    title: string;
    description: string;
    charts: ChartConfig[];
  };
}

export interface ChartConfig {
  type: string;
  title: string;
  data: any;
}

// Расширение Express Request для типизации
declare global {
  namespace Express {
    interface Request {
      apiKey?: string;
    }
  }
}


