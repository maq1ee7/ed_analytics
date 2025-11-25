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
   * Поддерживает одно или несколько представлений (с автоматическим суммированием)
   * @param input - Входные параметры (viewIds, координаты, запрос, метаданные)
   * @returns Promise<DashboardData> - Готовый dashboard с 2 графиками
   * @throws Error с сообщением на русском языке при ошибках
   */
  async generateDashboard(input: DashboardServiceInput): Promise<DashboardData> {
    try {
      console.log('\n🚀 Начало генерации dashboard...');
      console.log(`📝 Запрос: "${input.query}"`);
      console.log(`🔍 ViewIds: [${input.viewIds.join(', ')}], Координаты: [${input.rowIndex}, ${input.colIndex}]`);

      // STEP 1: Валидация входных параметров
      this.validateInput(input);

      // STEP 2: Инициализация подключения к Neo4j (если ещё не подключено)
      await this.ensureNeo4jConnection();

      // STEP 3: Определить режим работы (одно представление или множественные)
      if (input.viewIds.length === 1) {
        // Простой случай: одно представление
        console.log('📌 Режим: одно представление');
        return await this.generateSingleViewDashboard(input);
      } else {
        // Сложный случай: множественные представления с суммированием
        console.log(`📌 Режим: ${input.viewIds.length} представлений с суммированием`);
        return await this.generateMultiViewDashboard(input);
      }
    } catch (error) {
      console.error('\n❌ Ошибка генерации dashboard:', error);
      throw this.formatError(error);
    }
  }

  /**
   * Генерация dashboard для одного представления (старая логика)
   */
  private async generateSingleViewDashboard(input: DashboardServiceInput): Promise<DashboardData> {
    const viewId = input.viewIds[0];

    // Получение доступных годов
    const years = await neo4jClient.getAvailableYears(viewId);
    console.log(`📅 Доступные годы: ${years.join(', ')}`);

    // Извлечение федеральных данных
    console.log('\n📊 Извлечение федеральных данных...');
    const federalData = await neo4jClient.getFederalData(viewId, years);
    const extractedFederalData = this.cellExtractor.extractFederalData(
      federalData,
      input.colIndex,
      input.rowIndex,
      years
    );

    // Форматирование Linear Chart
    const linearChart = this.linearFormatter.format(extractedFederalData, years);

    // Извлечение региональных данных
    console.log('\n🗺️  Извлечение региональных данных...');
    const regionalData = await neo4jClient.getRegionalData(viewId, years);
    const extractedRegionalData = this.cellExtractor.extractRegionalData(
      regionalData,
      input.colIndex,
      input.rowIndex,
      years
    );

    // Форматирование Russia Map Chart
    const russiaMapChart = this.russiaMapFormatter.format(extractedRegionalData, years);

    // Генерация description
    const description = await this.generateDescription(input, years[0]);

    // Сборка финального DashboardData
    const dashboardData: DashboardData = {
      dashboard: {
        title: input.query,
        description,
        charts: [linearChart, russiaMapChart],
      },
    };

    console.log('\n✅ Dashboard успешно сгенерирован!\n');
    return dashboardData;
  }

  /**
   * Генерация dashboard для нескольких представлений с суммированием
   */
  private async generateMultiViewDashboard(input: DashboardServiceInput): Promise<DashboardData> {
    // STEP 1: Для каждого представления получить доступные годы
    const yearsPerView: number[][] = [];
    for (const viewId of input.viewIds) {
      const years = await neo4jClient.getAvailableYears(viewId);
      yearsPerView.push(years);
      console.log(`📅 ViewId ${viewId}: доступные годы ${years.join(', ')}`);
    }

    // STEP 2: Найти пересечение годов (только те годы, которые есть во ВСЕХ представлениях)
    const commonYears = this.getCommonYears(yearsPerView);
    console.log(`📅 Общие годы для всех представлений: ${commonYears.join(', ')}`);

    if (commonYears.length === 0) {
      throw new Error('Нет общих годов данных для выбранных представлений');
    }

    // STEP 3: Параллельно извлечь федеральные данные из всех представлений
    console.log('\n📊 Извлечение федеральных данных из всех представлений...');
    const federalDataPromises = input.viewIds.map(async (viewId, idx) => {
      const federalData = await neo4jClient.getFederalData(viewId, commonYears);
      const extracted = this.cellExtractor.extractFederalData(
        federalData,
        input.colIndex,
        input.rowIndex,
        commonYears
      );
      console.log(`✅ ViewId ${viewId} (${idx + 1}/${input.viewIds.length}): федеральные данные извлечены`);
      return extracted;
    });
    const allFederalData = await Promise.all(federalDataPromises);

    // STEP 4: Суммировать федеральные данные
    const aggregatedFederalData = this.cellExtractor.sumFederalDataMultiView(
      allFederalData,
      commonYears
    );

    // STEP 5: Форматирование Linear Chart
    const linearChart = this.linearFormatter.format(aggregatedFederalData, commonYears);

    // STEP 6: Параллельно извлечь региональные данные из всех представлений
    console.log('\n🗺️  Извлечение региональных данных из всех представлений...');
    const regionalDataPromises = input.viewIds.map(async (viewId, idx) => {
      const regionalData = await neo4jClient.getRegionalData(viewId, commonYears);
      const extracted = this.cellExtractor.extractRegionalData(
        regionalData,
        input.colIndex,
        input.rowIndex,
        commonYears
      );
      console.log(`✅ ViewId ${viewId} (${idx + 1}/${input.viewIds.length}): региональные данные извлечены`);
      return extracted;
    });
    const allRegionalData = await Promise.all(regionalDataPromises);

    // STEP 7: Суммировать региональные данные
    const aggregatedRegionalData = this.cellExtractor.sumRegionalDataMultiView(
      allRegionalData,
      commonYears
    );

    // STEP 8: Форматирование Russia Map Chart
    const russiaMapChart = this.russiaMapFormatter.format(aggregatedRegionalData, commonYears);

    // STEP 9: Генерация description
    const description = await this.generateDescription(input, commonYears[0]);

    // STEP 10: Сборка финального DashboardData
    const dashboardData: DashboardData = {
      dashboard: {
        title: input.query,
        description,
        charts: [linearChart, russiaMapChart],
      },
    };

    console.log('\n✅ Dashboard с агрегированными данными успешно сгенерирован!\n');
    return dashboardData;
  }

  /**
   * Найти пересечение годов из нескольких массивов
   * @param yearsArrays - Массив массивов годов
   * @returns Отсортированный массив общих годов
   */
  private getCommonYears(yearsArrays: number[][]): number[] {
    if (yearsArrays.length === 0) return [];
    if (yearsArrays.length === 1) return yearsArrays[0];

    // Используем первый массив как базу
    const base = new Set(yearsArrays[0]);

    // Фильтруем только те годы, которые есть во всех массивах
    const common = Array.from(base).filter(year =>
      yearsArrays.every(years => years.includes(year))
    );

    // Сортируем по возрастанию
    return common.sort((a, b) => a - b);
  }

  /**
   * Валидация входных параметров
   */
  private validateInput(input: DashboardServiceInput): void {
    if (!input.viewIds || !Array.isArray(input.viewIds) || input.viewIds.length === 0) {
      throw new Error('Не указаны ID представлений');
    }

    if (input.viewIds.some(id => id < 0)) {
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
      // Получаем схему таблицы для первого представления
      const firstViewId = input.viewIds[0];
      const schema = await neo4jClient.getTableSchema(firstViewId, firstYear);

      // Безопасное извлечение названия колонки и строки
      const columnName =
        schema.headers[input.colIndex] || `Колонка ${input.colIndex}`;
      const rowName =
        schema.rowLabels[input.rowIndex] || `Строка ${input.rowIndex}`;

      // Формируем представления (перечисляем или указываем количество)
      const viewsDescription = input.metadata.viewNames.length === 1
        ? `Представление: ${input.metadata.viewNames[0]}`
        : `Представления: ${input.metadata.viewNames.join(', ')}`;

      // Формируем description
      const parts = [
        `${columnName}, ${rowName}`,
        `Статформа: ${input.metadata.statformName}`,
        `Раздел: ${input.metadata.sectionName}`,
        viewsDescription,
      ];

      return parts.join(' | ');
    } catch (error) {
      console.warn('⚠️  Не удалось получить схему таблицы, используем fallback description');

      // Формируем представления для fallback
      const viewsDescription = input.metadata.viewNames.length === 1
        ? `Представление: ${input.metadata.viewNames[0]}`
        : `Представления: ${input.metadata.viewNames.join(', ')}`;

      // Fallback description без названий колонок/строк
      return [
        `Ячейка [${input.rowIndex}, ${input.colIndex}]`,
        `Статформа: ${input.metadata.statformName}`,
        `Раздел: ${input.metadata.sectionName}`,
        viewsDescription,
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
