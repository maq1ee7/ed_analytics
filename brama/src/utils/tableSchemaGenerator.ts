/**
 * Генератор схемы таблицы из Neo4j
 * Портирован с Python скрипта generate_table_schema.py
 */

import neo4j, { Driver, Session } from 'neo4j-driver';

interface TableRow {
  id: number;
  [key: string]: any; // col_1, col_2, col_3, ...
}

/**
 * Класс для генерации схемы таблицы из Neo4j
 */
export class TableSchemaGenerator {
  private driver: Driver;

  constructor(neo4jUri: string, neo4jUser: string, neo4jPassword: string) {
    this.driver = neo4j.driver(
      neo4jUri,
      neo4j.auth.basic(neo4jUser, neo4jPassword)
    );
    console.log(`[TableSchemaGenerator] Подключение к Neo4j: ${neo4jUri}`);
  }

  /**
   * Закрывает подключение к Neo4j
   */
  async close(): Promise<void> {
    await this.driver.close();
  }

  /**
   * Выполняет Cypher запрос
   */
  private async neo4jExec(query: string, params: Record<string, any> = {}): Promise<any[]> {
    const session: Session = this.driver.session();
    try {
      const result = await session.run(query, params);
      return result.records.map(record => record.toObject());
    } finally {
      await session.close();
    }
  }

  /**
   * Находит узел StatTable по form_code и section
   */
  private async findStatTable(formCode: string, section: string): Promise<any | null> {
    const query = `
      MATCH (t:StatTable {form_code: $form_code, section_number: $section})
      RETURN t, elementId(t) as element_id
      LIMIT 1
    `;

    const result = await this.neo4jExec(query, { form_code: formCode, section });

    if (result.length === 0) {
      console.error(`[TableSchemaGenerator] StatTable не найден: form_code=${formCode}, section=${section}`);
      return null;
    }

    const nodeData = result[0].t.properties;
    nodeData._element_id = result[0].element_id;
    return nodeData;
  }

  /**
   * Получает федеральный DataView с данными за указанный год
   */
  private async getFederalDataView(statTableId: string, year: number): Promise<TableRow[] | null> {
    const query = `
      MATCH (t:StatTable)-[:HAS_VIEW]->(v:DataView {is_federal: true})
      WHERE elementId(t) = $stat_table_id
      RETURN v.data_${year} as json_data, v.view_type as view_type
      LIMIT 1
    `;

    const result = await this.neo4jExec(query, { stat_table_id: statTableId });

    if (result.length === 0 || !result[0].json_data) {
      console.error(`[TableSchemaGenerator] Федеральные данные за ${year} год не найдены`);
      return null;
    }

    try {
      const data = JSON.parse(result[0].json_data);
      return data;
    } catch (error) {
      console.error(`[TableSchemaGenerator] Ошибка парсинга JSON:`, error);
      return null;
    }
  }

  /**
   * Генерирует Markdown таблицу для первых 2 колонок
   */
  private generateFirstTwoColumnsTable(jsonData: TableRow[]): string {
    const lines: string[] = [];
    lines.push('| col_1 | col_2 |');
    lines.push('|-------|-------|');

    for (const row of jsonData) {
      const col1 = String(row.col_1 || '').replace(/\|/g, '\\|');
      const col2 = String(row.col_2 || '').replace(/\|/g, '\\|');
      lines.push(`| ${col1} | ${col2} |`);
    }

    return lines.join('\n');
  }

  /**
   * Генерирует CSV для заголовков и первых 2 строк данных
   */
  private generateFirstTwoRowsCsv(jsonData: TableRow[]): string {
    if (jsonData.length < 3) {
      return '_Недостаточно данных для отображения первых 2 строк_';
    }

    const lines: string[] = [];

    // Получаем список колонок (пропускаем id)
    const row0 = jsonData[0]; // id=1 (заголовки)
    const columns = Object.keys(row0).filter(key => key !== 'id');

    lines.push('```csv');

    // Строка заголовков (id=1)
    const headerValues = columns.map(col => String(row0[col] || ''));
    lines.push(headerValues.join(','));

    // Первая строка данных (id=2)
    const row1 = jsonData[1];
    const values1 = columns.map(col => String(row1[col] || ''));
    lines.push(values1.join(','));

    // Вторая строка данных (id=3)
    if (jsonData.length > 2) {
      const row2 = jsonData[2];
      const values2 = columns.map(col => String(row2[col] || ''));
      lines.push(values2.join(','));
    }

    lines.push('```');

    return lines.join('\n');
  }

  /**
   * Генерирует схему таблицы в виде Markdown строки
   * 
   * @param formCode - Код статистической формы (OO_1 или OO_2)
   * @param section - Номер раздела (например, "2.5.2")
   * @param year - Год данных (2021-2024)
   * @returns Markdown строка со схемой таблицы
   */
  async generateSchema(
    formCode: string,
    section: string,
    year: number
  ): Promise<string> {
    console.log('='.repeat(80));
    console.log(`[TableSchemaGenerator] Генерация схемы: form=${formCode}, section=${section}, year=${year}`);
    console.log('='.repeat(80));

    // 1. Найти StatTable
    const statTable = await this.findStatTable(formCode, section);
    if (!statTable) {
      throw new Error(`StatTable не найден: form_code=${formCode}, section=${section}`);
    }

    console.log(`[TableSchemaGenerator] Найден StatTable: ${statTable.full_name}`);

    // 2. Получить федеральные данные
    const jsonData = await this.getFederalDataView(statTable._element_id, year);
    if (!jsonData) {
      throw new Error(`Данные за ${year} год не найдены`);
    }

    console.log(`[TableSchemaGenerator] Извлечено ${jsonData.length} строк данных`);

    // 3. Генерация Markdown
    const mdLines: string[] = [];

    // Заголовок
    mdLines.push(`# Схема таблицы ${formCode} / ${section} (${year})`);
    mdLines.push('');

    // Метаданные
    mdLines.push('## Метаданные');
    mdLines.push('');
    mdLines.push(`- **Форма:** ${formCode}`);
    mdLines.push(`- **Раздел:** ${section}`);
    mdLines.push(`- **Год:** ${year}`);
    mdLines.push(`- **Название таблицы:** ${statTable.full_name || 'N/A'}`);
    mdLines.push(`- **Всего строк:** ${jsonData.length}`);

    // Подсчитаем количество колонок
    if (jsonData.length > 0) {
      const colCount = Object.keys(jsonData[0]).filter(k => k !== 'id').length;
      mdLines.push(`- **Всего колонок:** ${colCount}`);
    }

    mdLines.push('');
    mdLines.push('---');
    mdLines.push('');

    // Первые 2 колонки
    mdLines.push('## Первые 2 колонки (col_1, col_2)');
    mdLines.push('');
    mdLines.push('_Все строки таблицы:_');
    mdLines.push('');
    mdLines.push(this.generateFirstTwoColumnsTable(jsonData));
    mdLines.push('');
    mdLines.push('---');
    mdLines.push('');

    // Первые 2 строки
    mdLines.push('## Заголовки и первые 2 строки данных');
    mdLines.push('');
    mdLines.push('_Все колонки (строка заголовков + первые две строки данных):_');
    mdLines.push('');
    mdLines.push(this.generateFirstTwoRowsCsv(jsonData));
    mdLines.push('');

    const mdContent = mdLines.join('\n');

    console.log('='.repeat(80));
    console.log('[TableSchemaGenerator] ✅ Схема таблицы успешно сгенерирована!');
    console.log('='.repeat(80));

    return mdContent;
  }
}






