import fs from 'fs';
import path from 'path';
import { DashboardData } from '../types';

/**
 * Mock генератор дашбордов
 * Загружает dashboardExample.json в качестве заглушки
 * 
 * TODO: Заменить на реальную интеграцию с LLM
 */
export class DashboardGenerator {
  private static cachedDashboard: DashboardData | null = null;

  /**
   * Загружает пример дашборда из JSON файла
   */
  static loadDashboardExample(): DashboardData {
    try {
      // Используем кэш для избежания повторного чтения файла
      if (this.cachedDashboard) {
        return this.cachedDashboard;
      }

      // Путь к файлу dashboardExample.json в brama/data
      const dashboardPath = path.join(
        __dirname, 
        '../../data/dashboardExample.json'
      );

      // Проверяем существование файла
      if (!fs.existsSync(dashboardPath)) {
        console.error('Dashboard example file not found:', dashboardPath);
        throw new Error('Dashboard example file not found');
      }

      // Читаем и парсим JSON
      const fileContent = fs.readFileSync(dashboardPath, 'utf-8');
      const dashboard = JSON.parse(fileContent) as DashboardData;

      // Кэшируем результат
      this.cachedDashboard = dashboard;

      console.log('Dashboard example loaded successfully');
      return dashboard;

    } catch (error) {
      console.error('Error loading dashboard example:', error);
      throw new Error('Failed to load dashboard example');
    }
  }

  /**
   * Генерирует ответ на вопрос пользователя
   * Mock реализация - возвращает dashboardExample.json
   * 
   * @param question - вопрос пользователя
   * @returns DashboardData
   */
  static async generateDashboard(question: string): Promise<DashboardData> {
    console.log('Generating dashboard for question:', question);
    
    // TODO: Здесь будет интеграция с LLM:
    // - Отправка запроса в OpenAI/Claude/другой LLM
    // - Парсинг ответа
    // - Формирование структуры дашборда
    
    // Пока просто возвращаем пример
    return this.loadDashboardExample();
  }

  /**
   * Очищает кэш (полезно для тестирования)
   */
  static clearCache(): void {
    this.cachedDashboard = null;
  }
}


