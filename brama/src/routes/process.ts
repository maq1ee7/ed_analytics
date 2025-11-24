import { Router, Request, Response } from 'express';
import { apiKeyAuth } from '../middleware/apiKeyAuth';
import { QueueService } from '../services/queueService';
import { ProcessTask } from '../types';

const router = Router();

/**
 * POST /api/process
 * Добавляет задачу в очередь для обработки
 * Защищен API ключом
 */
router.post('/', apiKeyAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { taskId, question, callbackUrl }: ProcessTask = req.body;

    // Валидация входных данных
    if (!taskId || typeof taskId !== 'string') {
      res.status(400).json({
        error: 'Invalid request',
        message: 'taskId is required and must be a string'
      });
      return;
    }

    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      res.status(400).json({
        error: 'Invalid request',
        message: 'question is required and must be a non-empty string'
      });
      return;
    }

    if (!callbackUrl || typeof callbackUrl !== 'string') {
      res.status(400).json({
        error: 'Invalid request',
        message: 'callbackUrl is required and must be a string'
      });
      return;
    }

    // Валидация URL формата
    try {
      new URL(callbackUrl);
    } catch {
      res.status(400).json({
        error: 'Invalid request',
        message: 'callbackUrl must be a valid URL'
      });
      return;
    }

    // Добавляем задачу в очередь
    const queueService = QueueService.getInstance();
    await queueService.addTask({ taskId, question, callbackUrl });

    console.log(`[API] Task ${taskId} added to queue`);

    // Возвращаем успешный ответ
    res.json({
      success: true,
      taskId,
      message: 'Task added to queue'
    });

  } catch (error) {
    console.error('[API] Error adding task to queue:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to add task to queue'
    });
  }
});

export default router;


