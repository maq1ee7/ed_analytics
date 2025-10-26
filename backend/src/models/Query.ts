import { query } from '../utils/database';

// Типы для структуры дашборда
export interface DashboardData {
  dashboard: {
    title: string;
    description: string;
    charts: any[]; // Массив графиков различных типов
  };
}

export interface Query {
  id: number;
  user_id: number;
  uid: string; // UUID дашборда
  question: string;
  answer: DashboardData; // JSONB данные дашборда
  dashboard_title?: string; // Название дашборда (опционально)
  created_at: Date;
}

export interface CreateQueryData {
  user_id: number;
  question: string;
  answer: DashboardData; // JSONB данные дашборда
  dashboard_title?: string; // Название дашборда (опционально)
}

export class QueryModel {
  // Создание нового запроса с дашбордом
  static async create(data: CreateQueryData): Promise<Query> {
    const result = await query(
      `INSERT INTO queries (user_id, question, answer, dashboard_title) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id, user_id, uid, question, answer, dashboard_title, created_at`,
      [
        data.user_id, 
        data.question, 
        JSON.stringify(data.answer), // Конвертируем объект в JSON
        data.dashboard_title || data.answer.dashboard.title // Берем title из JSON если не передан
      ]
    );

    return result.rows[0];
  }

  // Получение запросов пользователя
  static async findByUserId(userId: number): Promise<Query[]> {
    const result = await query(
      `SELECT id, user_id, uid, question, answer, dashboard_title, created_at 
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
      `SELECT id, user_id, uid, question, answer, dashboard_title, created_at 
       FROM queries 
       WHERE id = $1`,
      [id]
    );

    return result.rows[0] || null;
  }

  // Получение запроса по UID (для публичных ссылок)
  static async findByUid(uid: string): Promise<Query | null> {
    const result = await query(
      `SELECT id, user_id, uid, question, answer, dashboard_title, created_at 
       FROM queries 
       WHERE uid = $1`,
      [uid]
    );

    return result.rows[0] || null;
  }

  // Обновление дашборда
  static async updateDashboard(
    id: number, 
    answer: DashboardData, 
    dashboard_title?: string
  ): Promise<Query | null> {
    const result = await query(
      `UPDATE queries 
       SET answer = $1, dashboard_title = $2 
       WHERE id = $3 
       RETURNING id, user_id, uid, question, answer, dashboard_title, created_at`,
      [
        JSON.stringify(answer),
        dashboard_title || answer.dashboard.title,
        id
      ]
    );

    return result.rows[0] || null;
  }
}
