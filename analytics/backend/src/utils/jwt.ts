import jwt from 'jsonwebtoken';
import { JWTPayload, RefreshTokenPayload, User } from '../types/auth';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-key-change-in-production';

// Время жизни токенов
const ACCESS_TOKEN_EXPIRES_IN = '15m'; // 15 минут
const REFRESH_TOKEN_EXPIRES_IN = '7d'; // 7 дней

// Генерация access token
export const generateAccessToken = (user: User): string => {
  const payload: JWTPayload = {
    userId: user.id,
    username: user.username,
    role: user.role,
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRES_IN,
    issuer: 'ed_analytics',
    audience: 'ed_analytics_users',
  });
};

// Генерация refresh token
export const generateRefreshToken = (userId: number, tokenVersion: number = 1): string => {
  const payload: RefreshTokenPayload = {
    userId,
    tokenVersion,
  };

  return jwt.sign(payload, JWT_REFRESH_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRES_IN,
    issuer: 'ed_analytics',
    audience: 'ed_analytics_users',
  });
};

// Верификация access token
export const verifyAccessToken = (token: string): JWTPayload | null => {
  try {
    const payload = jwt.verify(token, JWT_SECRET, {
      issuer: 'ed_analytics',
      audience: 'ed_analytics_users',
    }) as JWTPayload;

    return payload;
  } catch (error) {
    console.error('Access token verification failed:', error);
    return null;
  }
};

// Верификация refresh token
export const verifyRefreshToken = (token: string): RefreshTokenPayload | null => {
  try {
    const payload = jwt.verify(token, JWT_REFRESH_SECRET, {
      issuer: 'ed_analytics',
      audience: 'ed_analytics_users',
    }) as RefreshTokenPayload;

    return payload;
  } catch (error) {
    console.error('Refresh token verification failed:', error);
    return null;
  }
};

// Извлечение токена из заголовка Authorization
export const extractTokenFromHeader = (authHeader: string | undefined): string | null => {
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
};

// Получение информации о токене без верификации (для отладки)
export const decodeToken = (token: string): any => {
  try {
    return jwt.decode(token);
  } catch (error) {
    console.error('Token decode failed:', error);
    return null;
  }
};
