import { query } from '../utils/database';

export interface Query {
  id: number;
  user_id: number;
  question: string;
  answer: string;
  created_at: Date;
}

export interface CreateQueryData {
  user_id: number;
  question: string;
  answer: string;
}

export class QueryModel {
  // Создание нового запроса
  static async create(data: CreateQueryData): Promise<Query> {
    const result = await query(
      `INSERT INTO queries (user_id, question, answer) 
       VALUES ($1, $2, $3) 
       RETURNING id, user_id, question, answer, created_at`,
      [data.user_id, data.question, data.answer]
    );

    return result.rows[0];
  }

  // Получение запросов пользователя (для будущего использования)
  static async findByUserId(userId: number): Promise<Query[]> {
    const result = await query(
      `SELECT id, user_id, question, answer, created_at 
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
      `SELECT id, user_id, question, answer, created_at 
       FROM queries 
       WHERE id = $1`,
      [id]
    );

    return result.rows[0] || null;
  }
}
