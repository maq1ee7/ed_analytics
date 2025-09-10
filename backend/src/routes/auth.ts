import { Router, Request, Response } from 'express';
import { LoginRequest, LoginResponse } from '../types/auth';
import { UserModel } from '../models/User';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Вход в систему
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password }: LoginRequest = req.body;

    // Валидация входных данных
    if (!username || !password) {
      res.status(400).json({
        error: 'Missing credentials',
        message: 'Username and password are required'
      });
      return;
    }

    // Поиск пользователя
    const userWithPassword = await UserModel.findByUsername(username);
    
    if (!userWithPassword) {
      res.status(401).json({
        error: 'Invalid credentials',
        message: 'Username or password is incorrect'
      });
      return;
    }

    // Проверка пароля
    const isPasswordValid = await UserModel.verifyPassword(password, userWithPassword.password_hash);
    
    if (!isPasswordValid) {
      res.status(401).json({
        error: 'Invalid credentials',
        message: 'Username or password is incorrect'
      });
      return;
    }

    // Создание пользователя без пароля для ответа
    const user = {
      id: userWithPassword.id,
      username: userWithPassword.username,
      role: userWithPassword.role,
    };

    // Генерация токенов
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user.id);

    // Установка refresh token в httpOnly cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 дней
    });

    // Ответ с пользователем и access token
    const response: LoginResponse = {
      user,
      tokens: {
        accessToken,
        refreshToken, // Также отправляем в ответе для localStorage
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Login failed',
      message: 'Internal server error during login'
    });
  }
});

// Обновление access token через refresh token
router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
  try {
    // Получаем refresh token из cookie или body
    const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;

    if (!refreshToken) {
      res.status(401).json({
        error: 'Refresh token required',
        message: 'No refresh token provided'
      });
      return;
    }

    // Верификация refresh token
    const payload = verifyRefreshToken(refreshToken);
    
    if (!payload) {
      res.status(401).json({
        error: 'Invalid refresh token',
        message: 'Refresh token is invalid or expired'
      });
      return;
    }

    // Получение пользователя
    const user = await UserModel.findById(payload.userId);
    
    if (!user) {
      res.status(401).json({
        error: 'User not found',
        message: 'User associated with refresh token does not exist'
      });
      return;
    }

    // Генерация нового access token
    const newAccessToken = generateAccessToken(user);

    res.json({
      accessToken: newAccessToken,
      user
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({
      error: 'Token refresh failed',
      message: 'Internal server error during token refresh'
    });
  }
});

// Выход из системы
router.post('/logout', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    // Очистка refresh token cookie
    res.clearCookie('refreshToken');

    res.json({
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      error: 'Logout failed',
      message: 'Internal server error during logout'
    });
  }
});

// Получение информации о текущем пользователе
router.get('/me', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        error: 'User not found',
        message: 'No user information available'
      });
      return;
    }

    res.json({
      user: req.user
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({
      error: 'Failed to get user info',
      message: 'Internal server error while fetching user information'
    });
  }
});

export default router;
