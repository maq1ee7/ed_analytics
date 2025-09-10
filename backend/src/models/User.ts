import { query } from '../utils/database';
import { User, UserWithPassword } from '../types/auth';
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

export class UserModel {
  // Поиск пользователя по username
  static async findByUsername(username: string): Promise<UserWithPassword | null> {
    const result = await query(
      `SELECT id, username, password_hash, role 
       FROM users 
       WHERE username = $1`,
      [username]
    );

    return result.rows[0] || null;
  }

  // Поиск пользователя по ID
  static async findById(id: number): Promise<User | null> {
    const result = await query(
      `SELECT id, username, role 
       FROM users 
       WHERE id = $1`,
      [id]
    );

    return result.rows[0] || null;
  }

  // Проверка пароля
  static async verifyPassword(password: string, passwordHash: string): Promise<boolean> {
    return bcrypt.compare(password, passwordHash);
  }

}
