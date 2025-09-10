import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { QueryModel } from '../models/Query';
import { generateRandomResponse } from '../utils/responseGenerator';

const router = Router();

// Интерфейс для запроса
interface SubmitQueryRequest {
  question: string;
}

// Создание нового запроса
router.post('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { question }: SubmitQueryRequest = req.body;

    // Валидация входных данных
    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      res.status(400).json({
        error: 'Invalid question',
        message: 'Question is required and must be a non-empty string'
      });
      return;
    }

    // Проверяем, что пользователь аутентифицирован
    if (!req.user) {
      res.status(401).json({
        error: 'Authentication required',
        message: 'User must be authenticated to submit queries'
      });
      return;
    }

    // Имитация обработки запроса - задержка 3 секунды
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Генерируем случайный ответ
    const answer = generateRandomResponse();

    // Сохраняем запрос в базу данных
    const savedQuery = await QueryModel.create({
      user_id: req.user.id,
      question: question.trim(),
      answer
    });

    // Возвращаем результат
    res.json({
      id: savedQuery.id,
      question: savedQuery.question,
      answer: savedQuery.answer,
      created_at: savedQuery.created_at
    });

  } catch (error) {
    console.error('Submit query error:', error);
    res.status(500).json({
      error: 'Query submission failed',
      message: 'Internal server error during query processing'
    });
  }
});

export default router;
