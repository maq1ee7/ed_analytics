import { query } from '../utils/database';

// Типы для структуры дашборда
export interface DashboardData {
  dashboard: {
    title: string;
    description: string;
    charts: any[]; // Массив графиков различных типов
  };
}

export type QueryStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface Query {
  id: number;
  user_id: number;
  uid: string; // UUID дашборда
  question: string;
  answer: DashboardData | null; // JSONB данные дашборда (null пока не обработан)
  dashboard_title?: string; // Название дашборда (опционально)
  status: QueryStatus; // Статус обработки
  error_message?: string; // Сообщение об ошибке (если failed)
  processing_started_at?: Date; // Время начала обработки
  processing_completed_at?: Date; // Время завершения
  created_at: Date;
}

export interface CreateQueryData {
  user_id: number;
  question: string;
  status?: QueryStatus; // По умолчанию pending
}

export class QueryModel {
  // Создание нового запроса (async, без дашборда)
  static async create(data: CreateQueryData): Promise<Query> {
    const result = await query(
      `INSERT INTO queries (user_id, question, status) 
       VALUES ($1, $2, $3) 
       RETURNING id, user_id, uid, question, answer, dashboard_title, status, 
                 error_message, processing_started_at, processing_completed_at, created_at`,
      [
        data.user_id, 
        data.question,
        data.status || 'pending'
      ]
    );

    return result.rows[0];
  }

  // Получение запросов пользователя
  static async findByUserId(userId: number): Promise<Query[]> {
    const result = await query(
      `SELECT id, user_id, uid, question, answer, dashboard_title, status, 
              error_message, processing_started_at, processing_completed_at, created_at 
       FROM queries 
       WHERE user_id = $1 
       ORDER BY created_at DESC`,
      [userId]
    );

    return result.rows;
  }

  // Получение запроса по ID
  static async findById(id: number): Promise<Query | null> {
    const result = await query(
      `SELECT id, user_id, uid, question, answer, dashboard_title, status, 
              error_message, processing_started_at, processing_completed_at, created_at 
       FROM queries 
       WHERE id = $1`,
      [id]
    );

    return result.rows[0] || null;
  }

  // Получение запроса по UID (для публичных ссылок и polling)
  static async findByUid(uid: string): Promise<Query | null> {
    const result = await query(
      `SELECT id, user_id, uid, question, answer, dashboard_title, status, 
              error_message, processing_started_at, processing_completed_at, created_at 
       FROM queries 
       WHERE uid = $1`,
      [uid]
    );

    return result.rows[0] || null;
  }

  // Обновление статуса на processing
  static async markAsProcessing(uid: string): Promise<Query | null> {
    const result = await query(
      `UPDATE queries 
       SET status = 'processing', processing_started_at = CURRENT_TIMESTAMP 
       WHERE uid = $1 
       RETURNING id, user_id, uid, question, answer, dashboard_title, status, 
                 error_message, processing_started_at, processing_completed_at, created_at`,
      [uid]
    );

    return result.rows[0] || null;
  }

  // Обновление с результатом (completed)
  static async updateWithResult(
    uid: string, 
    answer: DashboardData
  ): Promise<Query | null> {
    const result = await query(
      `UPDATE queries 
       SET status = 'completed', 
           answer = $1, 
           dashboard_title = $2,
           processing_completed_at = CURRENT_TIMESTAMP 
       WHERE uid = $3 
       RETURNING id, user_id, uid, question, answer, dashboard_title, status, 
                 error_message, processing_started_at, processing_completed_at, created_at`,
      [
        JSON.stringify(answer),
        answer.dashboard.title,
        uid
      ]
    );

    return result.rows[0] || null;
  }

  // Обновление с ошибкой (failed)
  static async updateWithError(
    uid: string, 
    errorMessage: string
  ): Promise<Query | null> {
    const result = await query(
      `UPDATE queries 
       SET status = 'failed', 
           error_message = $1,
           processing_completed_at = CURRENT_TIMESTAMP 
       WHERE uid = $2 
       RETURNING id, user_id, uid, question, answer, dashboard_title, status, 
                 error_message, processing_started_at, processing_completed_at, created_at`,
      [errorMessage, uid]
    );

    return result.rows[0] || null;
  }
}
