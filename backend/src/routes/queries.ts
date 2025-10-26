import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { QueryModel } from '../models/Query';
import { DashboardGenerator } from '../utils/dashboardGenerator';

const router = Router();

// Интерфейс для запроса
interface SubmitQueryRequest {
  question: string;
}

// Получение истории запросов пользователя
router.get('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    // Проверяем, что пользователь аутентифицирован
    if (!req.user) {
      res.status(401).json({
        error: 'Authentication required',
        message: 'User must be authenticated to get queries'
      });
      return;
    }

    // Получаем запросы пользователя
    const queries = await QueryModel.findByUserId(req.user.id);

    // Возвращаем список запросов
    res.json({
      queries: queries.map(query => ({
        id: query.id,
        uid: query.uid,
        question: query.question,
        answer: query.answer,
        dashboard_title: query.dashboard_title,
        created_at: query.created_at
      }))
    });

  } catch (error) {
    console.error('Get queries error:', error);
    res.status(500).json({
      error: 'Failed to get queries',
      message: 'Internal server error during queries retrieval'
    });
  }
});

// Получение дашборда по UID (публичный маршрут)
router.get('/:uid', async (req: Request, res: Response): Promise<void> => {
  try {
    const { uid } = req.params;

    // Валидация UUID формата
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(uid)) {
      res.status(400).json({
        error: 'Invalid UID',
        message: 'UID must be a valid UUID format'
      });
      return;
    }

    // Получаем запрос по UID
    const query = await QueryModel.findByUid(uid);

    if (!query) {
      res.status(404).json({
        error: 'Dashboard not found',
        message: 'No dashboard found with the provided UID'
      });
      return;
    }

    // Возвращаем дашборд
    res.json({
      uid: query.uid,
      question: query.question,
      answer: query.answer,
      dashboard_title: query.dashboard_title,
      created_at: query.created_at
    });

  } catch (error) {
    console.error('Get dashboard by UID error:', error);
    res.status(500).json({
      error: 'Failed to get dashboard',
      message: 'Internal server error during dashboard retrieval'
    });
  }
});

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

    // Генерируем дашборд на основе вопроса
    // TODO: Заменить на реальный генератор с AI
    const dashboardData = await DashboardGenerator.generateDashboard(question.trim());

    // Сохраняем запрос в базу данных
    const savedQuery = await QueryModel.create({
      user_id: req.user.id,
      question: question.trim(),
      answer: dashboardData
    });

    // Возвращаем результат
    res.json({
      id: savedQuery.id,
      uid: savedQuery.uid,
      question: savedQuery.question,
      answer: savedQuery.answer,
      dashboard_title: savedQuery.dashboard_title,
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
