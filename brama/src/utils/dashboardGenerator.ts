import { DashboardData } from '../types';
import { LLMService } from '../services/llmService';
import { Neo4jService } from '../services/neo4jService';

/**
 * Генератор дашбордов с интеграцией LLM и Neo4j
 */
export class DashboardGenerator {
  private static llmService: LLMService | null = null;
  private static neo4jService: Neo4jService | null = null;

  /**
   * Инициализирует сервисы (вызывается один раз при старте)
   */
  static initialize(): void {
    if (this.llmService && this.neo4jService) {
      console.log('[DashboardGenerator] Сервисы уже инициализированы');
      return;
    }

    console.log('[DashboardGenerator] Инициализация сервисов...');

    // Получаем переменные окружения
    const openaiApiKey = process.env.OPENAI_API_KEY;
    const model = process.env.DEEPSEEK_MODEL || 'deepseek-chat';
    const neo4jUri = process.env.NEO4J_URI || 'bolt://localhost:7687';
    const neo4jUser = process.env.NEO4J_USERNAME || 'neo4j';
    const neo4jPassword = process.env.NEO4J_PASSWORD;
    const defaultYear = parseInt(process.env.DEFAULT_YEAR || '2024', 10);

    // Валидация обязательных переменных
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY is required');
    }
    if (!neo4jPassword) {
      throw new Error('NEO4J_PASSWORD is required');
    }

    // Инициализация LLM Service
    this.llmService = new LLMService(
      openaiApiKey,
      model,
      neo4jUri,
      neo4jUser,
      neo4jPassword,
      defaultYear
    );

    // Инициализация Neo4j Service
    this.neo4jService = new Neo4jService(
      neo4jUri,
      neo4jUser,
      neo4jPassword
    );

    console.log('[DashboardGenerator] ✅ Сервисы инициализированы успешно');
  }

  /**
   * Генерирует ответ на вопрос пользователя
   * 
   * @param question - вопрос пользователя
   * @returns DashboardData
   */
  static async generateDashboard(question: string): Promise<DashboardData> {
    console.log(`[DashboardGenerator] Генерация dashboard для запроса: "${question}"`);
    
    // Инициализируем сервисы если еще не инициализированы
    if (!this.llmService || !this.neo4jService) {
      this.initialize();
    }

    try {
      // 1. LLM определяет параметры (3 шага)
      console.log('[DashboardGenerator] Шаг 1-3: Обработка запроса через LLM...');
      const params = await this.llmService!.processQuery(question);

      console.log('[DashboardGenerator] Параметры получены:', {
        form_code: params.form_code,
        view_type: params.view_type,
        section: params.section,
        col_index: params.col_index,
        row_index: params.row_index
      });

      // 2. Извлекаем данные из Neo4j и строим dashboard
      console.log('[DashboardGenerator] Шаг 4: Извлечение данных из Neo4j...');
      const dashboard = await this.neo4jService!.exportDashboard(
        params.form_code,
        params.view_type,
        params.section,
        params.col_index,
        params.row_index
      );

      console.log('[DashboardGenerator] ✅ Dashboard успешно сгенерирован');
      return dashboard;

    } catch (error) {
      console.error('[DashboardGenerator] ❌ Ошибка генерации dashboard:', error);
      throw error;
    }
  }

  /**
   * Закрывает подключения к сервисам (для graceful shutdown)
   */
  static async shutdown(): Promise<void> {
    console.log('[DashboardGenerator] Закрытие подключений к сервисам...');
    
    if (this.llmService) {
      await this.llmService.close();
    }
    
    if (this.neo4jService) {
      await this.neo4jService.close();
    }

    this.llmService = null;
    this.neo4jService = null;

    console.log('[DashboardGenerator] ✅ Подключения закрыты');
  }
}


