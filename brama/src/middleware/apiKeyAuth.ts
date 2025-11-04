import { Request, Response, NextFunction } from 'express';

/**
 * Middleware для проверки API ключа
 * Защищает endpoints от несанкционированного доступа
 */
export const apiKeyAuth = (req: Request, res: Response, next: NextFunction): void => {
  const apiKey = req.headers['x-api-key'] as string;
  const allowedApiKey = process.env.ALLOWED_API_KEY;

  // Проверяем наличие API ключа
  if (!apiKey) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'API key is required'
    });
    return;
  }

  // Проверяем корректность API ключа
  if (apiKey !== allowedApiKey) {
    res.status(403).json({
      error: 'Forbidden',
      message: 'Invalid API key'
    });
    return;
  }

  // API ключ валидный, продолжаем
  req.apiKey = apiKey;
  next();
};


