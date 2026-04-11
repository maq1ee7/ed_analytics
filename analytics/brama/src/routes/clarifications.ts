import { Router, Request, Response } from 'express';
import { apiKeyAuth } from '../middleware/apiKeyAuth';
import { DashboardGenerator } from '../utils/dashboardGenerator';

const router = Router();

/**
 * POST /api/clarifications
 * Получает варианты уточнения запроса пользователя
 * Защищен API ключом
 */
router.post('/', apiKeyAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { question } = req.body;

    // Валидация входных данных
    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      res.status(400).json({
        error: 'Invalid request',
        message: 'question is required and must be a non-empty string'
      });
      return;
    }

    console.log(`[API] Getting clarifications for: "${question}"`);

    // Получаем варианты уточнения
    const clarifications = await DashboardGenerator.getClarifications(question.trim());

    console.log(`[API] Generated ${clarifications.suggestions.length} clarification options`);

    // Возвращаем успешный ответ
    res.json({
      success: true,
      clarifications
    });

  } catch (error) {
    console.error('[API] Error getting clarifications:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get clarifications'
    });
  }
});

export default router;
