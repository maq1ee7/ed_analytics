import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, extractTokenFromHeader } from '../utils/jwt';
import { UserModel } from '../models/User';

// Middleware для проверки авторизации
export const authenticateToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Извлекаем токен из заголовка Authorization
    const token = extractTokenFromHeader(req.headers.authorization);
    
    if (!token) {
      res.status(401).json({
        error: 'Access token required',
        message: 'No token provided in Authorization header'
      });
      return;
    }

    // Верифицируем токен
    const payload = verifyAccessToken(token);
    
    if (!payload) {
      res.status(401).json({
        error: 'Invalid token',
        message: 'Token is invalid or expired'
      });
      return;
    }

    // Получаем пользователя из базы данных
    const user = await UserModel.findById(payload.userId);
    
    if (!user) {
      res.status(401).json({
        error: 'User not found',
        message: 'User associated with token does not exist'
      });
      return;
    }

    // Добавляем пользователя в объект запроса
    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication middleware error:', error);
    res.status(500).json({
      error: 'Authentication error',
      message: 'Internal server error during authentication'
    });
  }
};
