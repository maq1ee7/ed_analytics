import { neo4jClient } from '../shared/neo4jClient.js';
import { CellExtractor } from './cellExtractor.js';
import { LinearChartFormatter } from './chartFormatters/linearChart.js';
import { RussiaMapChartFormatter } from './chartFormatters/russiaMapChart.js';
import { DashboardData, DashboardServiceInput } from './types.js';

/**
 * Главный класс для генерации Dashboard
 * Замена Neo4jService в проекте brama
 *
 * ОБЯЗАТЕЛЬНЫЙ КОНТРАКТ:
 * - Вход: viewId, colIndex, rowIndex, query, metadata
 * - Выход: DashboardData с двумя графиками (linear + russia_map)
 */
export class DashboardGenerator {
  private cellExtractor: CellExtractor;
  private linearFormatter: LinearChartFormatter;
  private russiaMapFormatter: RussiaMapChartFormatter;

  constructor() {
    this.cellExtractor = new CellExtractor();
    this.linearFormatter = new LinearChartFormatter();
    this.russiaMapFormatter = new RussiaMapChartFormatter();
  }

  /**
   * Генерация dashboard на основе входных данных
   * @param input - Входные параметры (viewId, координаты, запрос, метаданные)
   * @returns Promise<DashboardData> - Готовый dashboard с 2 графиками
   * @throws Error с сообщением на русском языке при ошибках
   */
  async generateDashboard(input: DashboardServiceInput): Promise<DashboardData> {
    try {
      console.log('\n🚀 Начало генерации dashboard...');
      console.log(`📝 Запрос: "${input.query}"`);
      console.log(`🔍 ViewId: ${input.viewId}, Координаты: [${input.rowIndex}, ${input.colIndex}]`);

      // STEP 1: Валидация входных параметров
      this.validateInput(input);

      // STEP 2: Инициализация подключения к Neo4j (если ещё не подключено)
      await this.ensureNeo4jConnection();

      // STEP 3: Получение доступных годов
      const years = await neo4jClient.getAvailableYears(input.viewId);
      console.log(`📅 Доступные годы: ${years.join(', ')}`);

      // STEP 4: Извлечение федеральных данных
      console.log('\n📊 Извлечение федеральных данных...');
      const federalData = await neo4jClient.getFederalData(input.viewId, years);
      const extractedFederalData = this.cellExtractor.extractFederalData(
        federalData,
        input.colIndex,
        input.rowIndex,
        years
      );

      // STEP 5: Форматирование Linear Chart
      const linearChart = this.linearFormatter.format(extractedFederalData, years);

      // STEP 6: Извлечение региональных данных
      console.log('\n🗺️  Извлечение региональных данных...');
      const regionalData = await neo4jClient.getRegionalData(input.viewId, years);
      const extractedRegionalData = this.cellExtractor.extractRegionalData(
        regionalData,
        input.colIndex,
        input.rowIndex,
        years
      );

      // STEP 7: Форматирование Russia Map Chart
      const russiaMapChart = this.russiaMapFormatter.format(extractedRegionalData, years);

      // STEP 8: Генерация description
      const description = await this.generateDescription(input, years[0]);

      // STEP 9: Сборка финального DashboardData
      const dashboardData: DashboardData = {
        dashboard: {
          title: input.query,
          description,
          charts: [linearChart, russiaMapChart],
        },
      };

      console.log('\n✅ Dashboard успешно сгенерирован!\n');
      return dashboardData;
    } catch (error) {
      console.error('\n❌ Ошибка генерации dashboard:', error);
      throw this.formatError(error);
    }
  }

  /**
   * Валидация входных параметров
   */
  private validateInput(input: DashboardServiceInput): void {
    if (!input.viewId || input.viewId < 0) {
      throw new Error('Некорректный ID представления');
    }

    if (input.colIndex < 0) {
      throw new Error('Индекс колонки не может быть отрицательным');
    }

    if (input.rowIndex < 0) {
      throw new Error('Индекс строки не может быть отрицательным');
    }

    if (!input.query || input.query.trim() === '') {
      throw new Error('Запрос не может быть пустым');
    }

    if (!input.metadata) {
      throw new Error('Метаданные отсутствуют');
    }
  }

  /**
   * Проверка и инициализация подключения к Neo4j
   */
  private async ensureNeo4jConnection(): Promise<void> {
    try {
      await neo4jClient.connect();
    } catch (error) {
      // Если уже подключено, ошибка будет проигнорирована
      // Если подключение не удалось, выбросится ошибка
    }
  }

  /**
   * Генерация description с метаданными
   * @param input - Входные параметры
   * @param firstYear - Первый доступный год (для получения схемы)
   * @returns Строка описания
   */
  private async generateDescription(
    input: DashboardServiceInput,
    firstYear: number
  ): Promise<string> {
    try {
      // Получаем схему таблицы для первого года
      const schema = await neo4jClient.getTableSchema(input.viewId, firstYear);

      // Безопасное извлечение названия колонки и строки
      const columnName =
        schema.headers[input.colIndex] || `Колонка ${input.colIndex}`;
      const rowName =
        schema.rowLabels[input.rowIndex] || `Строка ${input.rowIndex}`;

      // Формируем description
      const parts = [
        `${columnName}, ${rowName}`,
        `Статформа: ${input.metadata.statformName}`,
        `Раздел: ${input.metadata.sectionName}`,
        `Представление: ${input.metadata.viewName}`,
      ];

      return parts.join(' | ');
    } catch (error) {
      console.warn('⚠️  Не удалось получить схему таблицы, используем fallback description');

      // Fallback description без названий колонок/строк
      return [
        `Ячейка [${input.rowIndex}, ${input.colIndex}]`,
        `Статформа: ${input.metadata.statformName}`,
        `Раздел: ${input.metadata.sectionName}`,
        `Представление: ${input.metadata.viewName}`,
      ].join(' | ');
    }
  }

  /**
   * Форматирование ошибки в понятное сообщение на русском
   * @param error - Оригинальная ошибка
   * @returns Error с русским сообщением
   */
  private formatError(error: any): Error {
    if (error instanceof Error) {
      // Если сообщение уже на русском, оставляем как есть
      return error;
    }

    // Для неизвестных ошибок
    return new Error('Произошла неожиданная ошибка при генерации dashboard');
  }

  /**
   * Graceful shutdown - закрытие соединений
   */
  static async shutdown(): Promise<void> {
    await neo4jClient.shutdown();
  }
}
