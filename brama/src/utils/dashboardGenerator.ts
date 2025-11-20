import { DashboardData } from '../types';
import { QueryAgent } from '../query-agent';

/**
 * Генератор дашбордов с интеграцией LLM и Neo4j
 * Использует новую архитектуру на основе LangGraph и QueryAgent
 */
export class DashboardGenerator {
  private static queryAgent: QueryAgent | null = null;

  /**
   * Инициализирует сервисы (вызывается один раз при старте)
   */
  static initialize(): void {
    if (this.queryAgent) {
      console.log('[DashboardGenerator] Сервисы уже инициализированы');
      return;
    }

    console.log('[DashboardGenerator] Инициализация сервисов...');

    // Валидация обязательных переменных окружения
    const requiredEnvVars = [
      'OPENAI_API_KEY',
      'NEO4J_URI',
      'NEO4J_USERNAME',
      'NEO4J_PASSWORD'
    ];

    for (const varName of requiredEnvVars) {
      if (!process.env[varName]) {
        throw new Error(`${varName} is required`);
      }
    }

    // Проверка настроек LangSmith трасировки
    if (process.env.LANGSMITH_API_KEY && process.env.LANGSMITH_TRACING === 'true') {
      console.log('[DashboardGenerator] 🔍 LangSmith трасировка активирована');
      console.log(`[DashboardGenerator]    Проект: ${process.env.LANGSMITH_PROJECT || 'default'}`);
      console.log(`[DashboardGenerator]    Endpoint: ${process.env.LANGSMITH_ENDPOINT || 'https://api.smith.langchain.com'}`);
    }

    // Инициализация QueryAgent
    // QueryAgent внутри создаёт LLMClient и Neo4jClient с автоматической настройкой
    this.queryAgent = new QueryAgent();

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
    if (!this.queryAgent) {
      this.initialize();
    }

    try {
      // QueryAgent обрабатывает весь пайплайн:
      // 1. Выбор статформ через LLM
      // 2. Выбор раздела через LLM
      // 3. Выбор представления и координат ячейки через LLM
      // 4. Генерация dashboard через DashboardGenerator
      console.log('[DashboardGenerator] Запуск обработки запроса через QueryAgent...');
      const dashboard = await this.queryAgent!.processQuery(question);

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

    if (this.queryAgent) {
      await this.queryAgent.shutdown();
    }

    this.queryAgent = null;

    console.log('[DashboardGenerator] ✅ Подключения закрыты');
  }
}


