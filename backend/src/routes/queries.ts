import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { QueryModel } from '../models/Query';
import axios from 'axios';

const router = Router();

// Middleware для проверки API ключа (для callback'ов от Brama)
const apiKeyAuth = (req: Request, res: Response, next: Function): void => {
  const apiKey = req.headers['x-api-key'] as string;
  const allowedApiKey = process.env.BACKEND_CORE_API_KEY;

  if (!apiKey || apiKey !== allowedApiKey) {
    res.status(403).json({
      error: 'Forbidden',
      message: 'Invalid API key'
    });
    return;
  }

  next();
};

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

// Получение статуса задачи по UID (для polling)
router.get('/status/:uid', async (req: Request, res: Response): Promise<void> => {
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
        error: 'Query not found',
        message: 'No query found with the provided UID'
      });
      return;
    }

    // Возвращаем статус и данные
    res.json({
      uid: query.uid,
      status: query.status,
      question: query.question,
      answer: query.answer,
      dashboard_title: query.dashboard_title,
      error_message: query.error_message,
      created_at: query.created_at,
      processing_started_at: query.processing_started_at,
      processing_completed_at: query.processing_completed_at
    });

  } catch (error) {
    console.error('Get query status error:', error);
    res.status(500).json({
      error: 'Failed to get query status',
      message: 'Internal server error during status retrieval'
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
      status: query.status,
      error_message: query.error_message,
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

// Создание нового запроса (асинхронный)
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

    // Создаем запрос в БД со статусом pending
    const savedQuery = await QueryModel.create({
      user_id: req.user.id,
      question: question.trim(),
      status: 'pending'
    });

    console.log(`[Backend] Created query ${savedQuery.uid} with status: pending`);

    // Отправляем задачу в Brama для обработки
    const bramaUrl = process.env.BACKEND_CORE_URL || 'http://brama:5001';
    const apiKey = process.env.BACKEND_CORE_API_KEY;
    const backendUrl = process.env.BACKEND_URL || 'http://backend:5000';

    try {
      await axios.post(
        `${bramaUrl}/api/process`,
        {
          taskId: savedQuery.uid,
          question: savedQuery.question,
          callbackUrl: `${backendUrl}/api/queries/callbacks/${savedQuery.uid}`
        },
        {
          headers: {
            'X-API-Key': apiKey,
            'Content-Type': 'application/json'
          },
          timeout: 5000 // 5 секунд таймаут для отправки в очередь
        }
      );

      console.log(`[Backend] Task ${savedQuery.uid} sent to Brama successfully`);

      // Обновляем статус на processing
      await QueryModel.markAsProcessing(savedQuery.uid);

    } catch (bramaError) {
      console.error('[Backend] Failed to send task to Brama:', bramaError);
      
      // Если Brama недоступен, помечаем задачу как failed
      await QueryModel.updateWithError(
        savedQuery.uid, 
        'Processing service is temporarily unavailable'
      );

      res.status(503).json({
        error: 'Service unavailable',
        message: 'Processing service is temporarily unavailable. Please try again later.',
        uid: savedQuery.uid,
        status: 'failed'
      });
      return;
    }

    // Возвращаем результат клиенту
    res.json({
      uid: savedQuery.uid,
      status: 'processing',
      question: savedQuery.question,
      message: 'Query is being processed. Use polling to check status.',
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

// Callback endpoint для получения результатов от Brama
router.post('/callbacks/:uid', apiKeyAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { uid } = req.params;
    const { status, result, error } = req.body;

    console.log(`[Backend] Received callback for task ${uid}, status: ${status}`);

    // Валидация UUID формата
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(uid)) {
      res.status(400).json({
        error: 'Invalid UID',
        message: 'UID must be a valid UUID format'
      });
      return;
    }

    // Проверяем существование запроса
    const query = await QueryModel.findByUid(uid);
    if (!query) {
      res.status(404).json({
        error: 'Query not found',
        message: 'No query found with the provided UID'
      });
      return;
    }

    // Обрабатываем результат в зависимости от статуса
    if (status === 'completed' && result) {
      await QueryModel.updateWithResult(uid, result);
      console.log(`[Backend] Task ${uid} marked as completed`);
      
      res.json({ success: true, message: 'Result saved successfully' });
      
    } else if (status === 'failed' && error) {
      await QueryModel.updateWithError(uid, error);
      console.log(`[Backend] Task ${uid} marked as failed: ${error}`);
      
      res.json({ success: true, message: 'Error saved successfully' });
      
    } else {
      res.status(400).json({
        error: 'Invalid callback data',
        message: 'Status must be "completed" with result or "failed" with error'
      });
    }

  } catch (error) {
    console.error('Callback processing error:', error);
    res.status(500).json({
      error: 'Callback processing failed',
      message: 'Internal server error during callback processing'
    });
  }
});

export default router;
