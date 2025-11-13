/**
 * Neo4j Service - сервис для экспорта данных из Neo4j в JSON dashboard
 * Портирован с Python модуля neo4j_exporter.py
 */

import neo4j, { Driver, Session } from 'neo4j-driver';
import { mapRegionToCode } from '../utils/regionMapper';
import { DashboardData } from '../types';

interface DataPoint {
  x: number; // год
  y: number | null; // значение
}

interface RegionValue {
  regionCode: string;
  value: number | null;
}

interface YearRegions {
  year: number;
  regions: RegionValue[];
}

/**
 * Класс для экспорта данных из Neo4j в dashboard JSON
 */
export class Neo4jService {
  private driver: Driver;

  constructor(neo4jUri: string, neo4jUser: string, neo4jPassword: string) {
    this.driver = neo4j.driver(
      neo4jUri,
      neo4j.auth.basic(neo4jUser, neo4jPassword)
    );
    console.log(`[Neo4jService] Подключение к Neo4j: ${neo4jUri}`);
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
   * Определяет диапазон лет для формы
   */
  private getYearsRange(formCode: string): number[] {
    if (formCode === 'OO_1') {
      return [2021, 2022, 2023, 2024];
    } else if (formCode === 'OO_2') {
      return [2019, 2020, 2021, 2022, 2023, 2024];
    } else {
      return [2021, 2022, 2023, 2024]; // Fallback
    }
  }

  /**
   * Находит узел StatTable по form_code и section
   */
  private async getStatTableNode(formCode: string, section: string): Promise<any> {
    const query = `
      MATCH (t:StatTable {form_code: $form_code, section_number: $section})
      RETURN t, elementId(t) as node_id
      LIMIT 1
    `;

    const result = await this.neo4jExec(query, { form_code: formCode, section });

    if (result.length === 0) {
      throw new Error(`StatTable not found: form_code=${formCode}, section=${section}`);
    }

    const nodeData = result[0].t.properties;
    nodeData._neo4j_id = result[0].node_id;
    console.log(`[Neo4jService] Найден StatTable: ${nodeData.full_name}, id=${nodeData._neo4j_id}`);
    return nodeData;
  }

  /**
   * Получает федеральный узел DataView
   */
  private async getFederalDataView(statTableId: string, viewType: string): Promise<any> {
    const query = `
      MATCH (t:StatTable)-[:HAS_VIEW]->(v:DataView {view_type: $view_type, is_federal: true})
      WHERE elementId(t) = $stat_table_id
      RETURN v, elementId(v) as node_id
      LIMIT 1
    `;

    const result = await this.neo4jExec(query, {
      stat_table_id: statTableId,
      view_type: viewType
    });

    if (result.length === 0) {
      throw new Error(`Federal DataView not found: view_type=${viewType}`);
    }

    const nodeData = result[0].v.properties;
    nodeData._neo4j_id = result[0].node_id;
    console.log(`[Neo4jService] Найден федеральный DataView: view_type=${viewType}, id=${nodeData._neo4j_id}`);
    return nodeData;
  }

  /**
   * Получает все региональные узлы RegionalData
   */
  private async getRegionalDataNodes(viewId: string): Promise<any[]> {
    const query = `
      MATCH (v:DataView)-[:HAS_REGION]->(r:RegionalData)
      WHERE elementId(v) = $view_id
      RETURN r, elementId(r) as node_id
    `;

    const result = await this.neo4jExec(query, { view_id: viewId });

    const nodes = result.map(rec => {
      const nodeData = rec.r.properties;
      nodeData._neo4j_id = rec.node_id;
      return nodeData;
    });

    console.log(`[Neo4jService] Найдено ${nodes.length} региональных узлов RegionalData`);
    return nodes;
  }

  /**
   * Извлекает значение ячейки по координатам из JSON таблицы
   */
  private extractCellValue(
    dataJsonStr: string | null,
    colIndex: number,
    rowIndex: number
  ): number | null {
    if (!dataJsonStr || dataJsonStr === '[]') {
      return null;
    }

    try {
      const dataRows = JSON.parse(dataJsonStr);

      // rowIndex=1 означает первую строку ДАННЫХ (не заголовок)
      // В массиве: строка 0 - заголовки, строка 1+ - данные
      if (rowIndex >= dataRows.length) {
        return null;
      }

      const row = dataRows[rowIndex];
      const colKey = `col_${colIndex}`;

      if (!(colKey in row)) {
        return null;
      }

      const valueStr = row[colKey];

      // Попытка преобразовать в float
      if (valueStr === null || valueStr === '' || valueStr === '-') {
        return null;
      }

      // Убрать пробелы и запятые
      const cleanValue = String(valueStr).trim().replace(/ /g, '').replace(/,/g, '.');

      const numValue = parseFloat(cleanValue);
      return isNaN(numValue) ? null : numValue;

    } catch (error) {
      console.error('[Neo4jService] Ошибка извлечения ячейки:', error);
      return null;
    }
  }

  /**
   * Строит данные для линейного графика из федеральных данных
   */
  private buildLinearChart(
    federalNode: any,
    colIndex: number,
    rowIndex: number,
    formCode: string
  ): any {
    const years = this.getYearsRange(formCode);
    const points: DataPoint[] = [];

    for (const year of years) {
      const dataKey = `data_${year}`;
      const dataJson = federalNode[dataKey] || '[]';

      const value = this.extractCellValue(dataJson, colIndex, rowIndex);
      points.push({ x: year, y: value });

      if (value !== null) {
        console.log(`[Neo4jService] Федеральные данные ${year}: ${value}`);
      }
    }

    const chart = {
      type: 'linear',
      title: 'Линейный график',
      data: {
        years: [{ points }]
      }
    };

    console.log(`[Neo4jService] Линейный график создан: ${points.length} точек`);
    return chart;
  }

  /**
   * Строит данные для карты России из региональных данных
   */
  private buildMapChart(
    regionalNodes: any[],
    colIndex: number,
    rowIndex: number,
    formCode: string
  ): any {
    const years = this.getYearsRange(formCode);
    const yearsData: YearRegions[] = [];

    for (const year of years) {
      const regionsValues: RegionValue[] = [];

      for (const regionalNode of regionalNodes) {
        const regionName = regionalNode.region_name;

        if (!regionName) {
          console.warn(`[Neo4jService] Пропущен узел без region_name: ${regionalNode._neo4j_id}`);
          continue;
        }

        // Маппинг региона в код
        try {
          const regionCode = mapRegionToCode(regionName);

          // Извлечь значение
          const dataKey = `data_${year}`;
          const dataJson = regionalNode[dataKey] || '[]';
          const value = this.extractCellValue(dataJson, colIndex, rowIndex);

          regionsValues.push({ regionCode, value });

          if (value !== null) {
            console.log(`[Neo4jService] Региональные данные ${year}, ${regionCode}: ${value}`);
          }
        } catch (error) {
          // Регион не найден в справочнике - бросаем исключение
          console.error(`[Neo4jService] Регион не найден: ${regionName}`);
          throw new Error(
            `Unknown region: '${regionName}'. Region not found in reference. Please update regions.json`
          );
        }
      }

      yearsData.push({ year, regions: regionsValues });
    }

    const chart = {
      type: 'russia_map',
      title: 'Интерактивная карта России',
      data: {
        years: yearsData
      }
    };

    const totalRegions = regionalNodes.length;
    console.log(`[Neo4jService] Карта регионов создана: ${yearsData.length} лет, ${totalRegions} регионов`);
    return chart;
  }

  /**
   * Главный метод экспорта данных из Neo4j в JSON dashboard
   * 
   * @param formCode - Код статистической формы (OO_1 или OO_2)
   * @param viewType - Тип представления (гоу_город, гоу_село, ноу_город, ноу_село)
   * @param section - Номер раздела (например, "2.5.2")
   * @param colIndex - Индекс колонки (начиная с 1)
   * @param rowIndex - Индекс строки (начиная с 1)
   * @returns DashboardData с полным JSON
   */
  async exportDashboard(
    formCode: string,
    viewType: string,
    section: string,
    colIndex: number,
    rowIndex: number
  ): Promise<DashboardData> {
    console.log('='.repeat(60));
    console.log(`[Neo4jService] Экспорт dashboard: form=${formCode}, view=${viewType}, section=${section}`);
    console.log(`[Neo4jService] Координаты: col=${colIndex}, row=${rowIndex}`);
    console.log('='.repeat(60));

    // 1. Найти узел StatTable
    const statTable = await this.getStatTableNode(formCode, section);
    const statTableId = statTable._neo4j_id;

    // 2. Получить федеральный DataView
    const federalView = await this.getFederalDataView(statTableId, viewType);
    const federalViewId = federalView._neo4j_id;

    // 3. Получить региональные узлы
    const regionalNodes = await this.getRegionalDataNodes(federalViewId);

    // 4. Построить линейный график (федеральные данные)
    const linearChart = this.buildLinearChart(
      federalView,
      colIndex,
      rowIndex,
      formCode
    );

    // 5. Построить карту регионов
    const mapChart = this.buildMapChart(
      regionalNodes,
      colIndex,
      rowIndex,
      formCode
    );

    // 6. Собрать dashboard
    const dashboard: DashboardData = {
      dashboard: {
        title: 'Аналитический Dashboard',
        description: 'Кастомизируемый dashboard с различными типами графиков и полными данными по регионам России',
        charts: [linearChart, mapChart]
      }
    };

    console.log('='.repeat(60));
    console.log('[Neo4jService] Экспорт завершен успешно!');
    console.log('='.repeat(60));

    return dashboard;
  }
}






