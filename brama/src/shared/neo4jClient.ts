import neo4j, { Driver, Session, Integer } from 'neo4j-driver';

/**
 * Neo4j Client для работы с графовой БД
 * Предоставляет методы для извлечения данных статформ
 */
export class Neo4jClient {
  private driver: Driver | null = null;
  private static instance: Neo4jClient | null = null;

  private constructor() {}

  /**
   * Получить singleton instance клиента
   */
  static getInstance(): Neo4jClient {
    if (!Neo4jClient.instance) {
      Neo4jClient.instance = new Neo4jClient();
    }
    return Neo4jClient.instance;
  }

  /**
   * Инициализация подключения к Neo4j
   */
  async connect(): Promise<void> {
    // Если уже подключено, пропускаем
    if (this.driver) {
      return;
    }

    const uri = process.env.NEO4J_URI;
    const username = process.env.NEO4J_USERNAME;
    const password = process.env.NEO4J_PASSWORD;

    if (!uri || !username || !password) {
      throw new Error(
        'Отсутствуют параметры подключения к Neo4j. Проверьте .env файл (NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD)'
      );
    }

    try {
      this.driver = neo4j.driver(uri, neo4j.auth.basic(username, password));

      // Проверка подключения
      await this.driver.verifyConnectivity();
      console.log('✅ Подключение к Neo4j установлено');
    } catch (error) {
      console.error('❌ Ошибка подключения к Neo4j:', error);
      throw new Error('Не удалось подключиться к Neo4j');
    }
  }

  /**
   * Получить сессию для выполнения запросов
   */
  private getSession(): Session {
    if (!this.driver) {
      throw new Error('Neo4j driver не инициализирован. Вызовите connect() сначала');
    }
    return this.driver.session();
  }

  /**
   * Выполнить Cypher запрос и вернуть результат
   * Публичный API для выполнения произвольных запросов
   * @param query - Cypher запрос
   * @param params - Параметры запроса
   * @returns Результат выполнения запроса
   */
  async executeQuery(query: string, params: Record<string, any> = {}): Promise<any> {
    const session = this.getSession();
    try {
      const result = await session.run(query, params);
      return result;
    } finally {
      await session.close();
    }
  }

  /**
   * Получить список доступных годов для представления
   * @param viewId - ID узла представления
   * @returns Отсортированный массив годов
   */
  async getAvailableYears(viewId: number): Promise<number[]> {
    const session = this.getSession();

    try {
      const cypher = `
        MATCH (view)
        WHERE id(view) = $viewId
        RETURN keys(view) AS property_names
      `;

      const result = await session.run(cypher, { viewId: neo4j.int(viewId) });

      if (result.records.length === 0) {
        throw new Error('Представление не найдено в базе данных');
      }

      const propertyNames = result.records[0].get('property_names') as string[];

      // Фильтруем свойства начинающиеся с 'data_' и извлекаем годы
      const years = propertyNames
        .filter(prop => prop.startsWith('data_'))
        .map(prop => parseInt(prop.replace('data_', ''), 10))
        .filter(year => !isNaN(year))
        .sort((a, b) => a - b);

      if (years.length === 0) {
        throw new Error('Данные за этот период недоступны');
      }

      console.log(`📅 Найдены годы для viewId ${viewId}:`, years);
      return years;
    } catch (error) {
      console.error('Ошибка получения доступных годов:', error);
      throw error;
    } finally {
      await session.close();
    }
  }

  /**
   * Получить федеральные данные из свойств узла Представления
   * @param viewId - ID узла представления
   * @param years - Массив годов для извлечения
   * @returns Объект с данными по годам
   */
  async getFederalData(
    viewId: number,
    years: number[]
  ): Promise<Record<string, any[][]>> {
    const session = this.getSession();

    try {
      // Динамически формируем список свойств для запроса
      const properties = years.map(year => `view.data_${year} AS data_${year}`).join(', ');

      const cypher = `
        MATCH (view)
        WHERE id(view) = $viewId
        RETURN ${properties}
      `;

      const result = await session.run(cypher, { viewId: neo4j.int(viewId) });

      if (result.records.length === 0) {
        throw new Error('Федеральные данные не найдены');
      }

      const record = result.records[0];
      const federalData: Record<string, any[][]> = {};

      for (const year of years) {
        const dataKey = `data_${year}`;
        let yearData = record.get(dataKey);

        if (yearData !== null && yearData !== undefined) {
          // Если данные пришли как JSON-строка, парсим
          if (typeof yearData === 'string') {
            try {
              yearData = JSON.parse(yearData);
              console.log(`🔄 Распарсили JSON для ${year}: ${Array.isArray(yearData) ? yearData.length + ' строк' : 'не массив'}`);
            } catch (error) {
              console.error(`❌ Ошибка парсинга JSON для ${year}:`, error);
              yearData = [];
            }
          }

          // Преобразуем из формата [{col_0, col_1, ...}] в [[val0, val1, ...]]
          if (Array.isArray(yearData) && yearData.length > 0 && typeof yearData[0] === 'object') {
            yearData = this.convertObjectArrayToMatrix(yearData);
            console.log(`🔄 Преобразовали в матрицу: ${yearData.length} строк x ${yearData[0]?.length || 0} колонок`);
          }

          federalData[dataKey] = yearData;
        } else {
          console.warn(`⚠️  Данные за ${year} год отсутствуют`);
          federalData[dataKey] = [];
        }
      }

      console.log(`📊 Получены федеральные данные для viewId ${viewId}`);
      return federalData;
    } catch (error) {
      console.error('Ошибка получения федеральных данных:', error);
      throw error;
    } finally {
      await session.close();
    }
  }

  /**
   * Получить региональные данные из связей Представление-Регион
   * @param viewId - ID узла представления
   * @param years - Массив годов для извлечения
   * @returns Массив объектов с региональными данными
   */
  async getRegionalData(
    viewId: number,
    years: number[]
  ): Promise<Array<{
    regionCode: string;
    regionName: string;
    federalDistrict: string;
    [key: string]: any;
  }>> {
    const session = this.getSession();

    try {
      // Динамически формируем список свойств связей
      const properties = years.map(year => `r.data_${year} AS data_${year}`).join(', ');

      const cypher = `
        MATCH (view)-[r]->(region)
        WHERE id(view) = $viewId
        RETURN
          region.unicode AS regionCode,
          region.name AS regionName,
          region.federalDistrict AS federalDistrict,
          ${properties}
      `;

      const result = await session.run(cypher, { viewId: neo4j.int(viewId) });

      if (result.records.length === 0) {
        console.warn('⚠️  Региональные данные не найдены');
        return [];
      }

      const regionalData = result.records.map(record => {
        const data: any = {
          regionCode: record.get('regionCode'),
          regionName: record.get('regionName'),
          federalDistrict: record.get('federalDistrict'),
        };

        // Добавляем данные по годам
        for (const year of years) {
          const dataKey = `data_${year}`;
          let yearData = record.get(dataKey);

          // Парсим JSON если пришла строка
          if (yearData && typeof yearData === 'string') {
            try {
              yearData = JSON.parse(yearData);
            } catch (error) {
              console.error(`❌ Ошибка парсинга региональных данных для ${data.regionCode} (${year}):`, error);
              yearData = null;
            }
          }

          // Преобразуем из формата [{col_0, col_1, ...}] в [[val0, val1, ...]]
          if (Array.isArray(yearData) && yearData.length > 0 && typeof yearData[0] === 'object') {
            yearData = this.convertObjectArrayToMatrix(yearData);
          }

          data[dataKey] = yearData || null;
        }

        return data;
      });

      console.log(`🗺️  Получены региональные данные для ${regionalData.length} регионов`);
      return regionalData;
    } catch (error) {
      console.error('Ошибка получения региональных данных:', error);
      throw error;
    } finally {
      await session.close();
    }
  }

  /**
   * Получить схему таблицы (заголовки и строки) для конкретного года
   * Используется для генерации description
   * @param viewId - ID узла представления
   * @param year - Год для получения схемы
   * @returns Объект с данными таблицы
   */
  async getTableSchema(
    viewId: number,
    year: number
  ): Promise<{ data: any[][]; headers: string[]; rowLabels: string[] }> {
    const session = this.getSession();

    try {
      const cypher = `
        MATCH (view)
        WHERE id(view) = $viewId
        RETURN view.data_${year} AS tableData
      `;

      const result = await session.run(cypher, { viewId: neo4j.int(viewId) });

      if (result.records.length === 0 || !result.records[0].get('tableData')) {
        throw new Error(`Схема таблицы за ${year} год не найдена`);
      }

      let data = result.records[0].get('tableData');

      // Парсим JSON если пришла строка
      if (typeof data === 'string') {
        try {
          data = JSON.parse(data);
        } catch (error) {
          throw new Error(`Ошибка парсинга схемы таблицы: ${error}`);
        }
      }

      // Преобразуем из формата [{col_0, col_1, ...}] в [[val0, val1, ...]]
      if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'object') {
        data = this.convertObjectArrayToMatrix(data);
      }

      // Извлекаем заголовки из первой строки
      const headers = data.length > 0 ? data[0].map(String) : [];

      // Извлекаем метки строк из второй колонки (row[1])
      // Первая колонка (row[0]) содержит номера строк, вторая (row[1]) - названия
      const rowLabels = data.map((row: any[]) => (row.length > 1 ? String(row[1]) : ''));

      return { data, headers, rowLabels };
    } catch (error) {
      console.error('Ошибка получения схемы таблицы:', error);
      throw error;
    } finally {
      await session.close();
    }
  }

  /**
   * Преобразовать массив объектов {col_0, col_1, ...} в двумерный массив
   * @param objectArray - Массив объектов из Neo4j
   * @returns Двумерный массив
   */
  private convertObjectArrayToMatrix(objectArray: any[]): any[][] {
    const matrix: any[][] = [];

    for (const obj of objectArray) {
      const row: any[] = [];

      // Получаем отсортированные ключи (col_0, col_1, col_2, ...)
      const keys = Object.keys(obj).sort((a, b) => {
        const numA = parseInt(a.replace('col_', ''), 10);
        const numB = parseInt(b.replace('col_', ''), 10);
        return numA - numB;
      });

      // Извлекаем значения в порядке колонок
      for (const key of keys) {
        row.push(obj[key]);
      }

      matrix.push(row);
    }

    return matrix;
  }

  /**
   * Graceful shutdown - закрытие всех соединений
   */
  async shutdown(): Promise<void> {
    if (this.driver) {
      await this.driver.close();
      console.log('✅ Соединение с Neo4j закрыто');
      this.driver = null;
    }
  }
}

/**
 * Экспорт singleton instance для использования в приложении
 */
export const neo4jClient = Neo4jClient.getInstance();
