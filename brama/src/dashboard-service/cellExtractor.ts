import {
  CellValue,
  ExtractedFederalData,
  ExtractedRegionalData,
  RegionDataRow,
  RegionValue,
} from './types.js';

/**
 * Модуль для извлечения значений ячеек из данных Neo4j
 * Обрабатывает координаты [rowIndex][colIndex] и преобразует данные в типизированные структуры
 */
export class CellExtractor {
  /**
   * Извлечь федеральные данные из свойств view.data_YYYY
   * @param federalData - Объект с данными по годам из Neo4j
   * @param colIndex - Индекс колонки
   * @param rowIndex - Индекс строки
   * @param years - Массив годов для обработки
   * @returns Извлечённые федеральные данные
   */
  extractFederalData(
    federalData: Record<string, any[][]>,
    colIndex: number,
    rowIndex: number,
    years: number[]
  ): ExtractedFederalData {
    const dataByYear = new Map<number, CellValue>();

    console.log(`\n📋 Структура федеральных данных:`);
    for (const year of years) {
      const dataProperty = `data_${year}`;
      const yearData = federalData[dataProperty];

      if (yearData && Array.isArray(yearData)) {
        console.log(`  ${year}: ${yearData.length} строк, первая строка: ${yearData[0]?.length || 0} колонок`);
      } else {
        console.log(`  ${year}: данные отсутствуют`);
      }
    }
    console.log('');

    for (const year of years) {
      const dataProperty = `data_${year}`;
      const yearData = federalData[dataProperty];

      // Проверка существования данных за год
      if (!yearData || !Array.isArray(yearData)) {
        console.warn(`⚠️  Федеральные данные за ${year} год отсутствуют`);
        dataByYear.set(year, { value: null, isNull: true });
        continue;
      }

      // Проверка границ rowIndex
      if (rowIndex < 0 || rowIndex >= yearData.length) {
        console.warn(
          `⚠️  rowIndex ${rowIndex} выходит за границы данных (${yearData.length} строк) за ${year} год`
        );
        dataByYear.set(year, { value: null, isNull: true });
        continue;
      }

      const row = yearData[rowIndex];

      // Проверка что строка является массивом
      if (!Array.isArray(row)) {
        console.warn(`⚠️  Строка ${rowIndex} не является массивом за ${year} год`);
        dataByYear.set(year, { value: null, isNull: true });
        continue;
      }

      // Проверка границ colIndex
      if (colIndex < 0 || colIndex >= row.length) {
        console.warn(
          `⚠️  colIndex ${colIndex} выходит за границы строки (${row.length} колонок) за ${year} год`
        );
        dataByYear.set(year, { value: null, isNull: true });
        continue;
      }

      // Извлечение и парсинг значения
      const rawValue = row[colIndex];
      console.log(`🔍 Федеральные ${year}: row[${rowIndex}][${colIndex}] = ${JSON.stringify(rawValue)} (тип: ${typeof rawValue})`);

      const parsedValue = this.parseValue(rawValue);

      dataByYear.set(year, {
        value: parsedValue,
        isNull: parsedValue === null,
      });

      if (parsedValue !== null) {
        console.log(`✅ Федеральные данные за ${year}: ${parsedValue}`);
      } else {
        console.warn(`⚠️  Не удалось распарсить значение за ${year}: ${JSON.stringify(rawValue)}`);
      }
    }

    return { years, dataByYear };
  }

  /**
   * Извлечь региональные данные из связей view-region
   * @param regionalDataRows - Массив региональных данных из Neo4j
   * @param colIndex - Индекс колонки
   * @param rowIndex - Индекс строки
   * @param years - Массив годов для обработки
   * @returns Извлечённые региональные данные
   */
  extractRegionalData(
    regionalDataRows: RegionDataRow[],
    colIndex: number,
    rowIndex: number,
    years: number[]
  ): ExtractedRegionalData {
    const regionsByYear = new Map<number, RegionValue[]>();
    const allRegionCodes = new Set<string>();

    // Инициализация массивов для каждого года
    for (const year of years) {
      regionsByYear.set(year, []);
    }

    // Обработка каждого региона
    for (const region of regionalDataRows) {
      // Валидация кода региона
      if (!region.regionCode || !this.isValidRegionCode(region.regionCode)) {
        console.warn(
          `⚠️  Некорректный код региона: ${JSON.stringify(region.regionCode)} (название: ${JSON.stringify(region.regionName)})`
        );
        console.warn(`   Полный объект региона:`, {
          regionCode: region.regionCode,
          regionName: region.regionName,
          federalDistrict: region.federalDistrict,
          hasData2021: !!region.data_2021,
          hasData2022: !!region.data_2022,
        });
        continue;
      }

      allRegionCodes.add(region.regionCode);

      // Извлечение данных для каждого года
      for (const year of years) {
        const dataProperty = `data_${year}`;
        const yearData = region[dataProperty];

        let value: number | null = null;

        // Проверка существования данных за год
        if (Array.isArray(yearData)) {
          // Проверка границ rowIndex
          if (rowIndex >= 0 && rowIndex < yearData.length) {
            const row = yearData[rowIndex];

            // Проверка что строка является массивом и границ colIndex
            if (Array.isArray(row) && colIndex >= 0 && colIndex < row.length) {
              const rawValue = row[colIndex];
              value = this.parseValue(rawValue);

              // Логируем только первый регион для каждого года
              if (region.regionCode === regionalDataRows[0]?.regionCode) {
                console.log(`🔍 Регион ${region.regionCode} (${year}): row[${rowIndex}][${colIndex}] = ${JSON.stringify(rawValue)} (тип: ${typeof rawValue})`);
              }
            }
          }
        }

        // Добавление регионального значения
        regionsByYear.get(year)!.push({
          regionCode: region.regionCode,
          value,
          regionName: region.regionName,
        });
      }
    }

    // Логирование результатов
    for (const year of years) {
      const regions = regionsByYear.get(year)!;
      const validCount = regions.filter(r => r.value !== null).length;
      console.log(
        `🗺️  Региональные данные за ${year}: ${validCount}/${regions.length} регионов имеют значения`
      );
    }

    return { years, regionsByYear, allRegionCodes };
  }

  /**
   * Парсинг значения ячейки в number или null
   * @param value - Сырое значение из Neo4j
   * @returns Числовое значение или null
   */
  private parseValue(value: any): number | null {
    // Обработка null и undefined
    if (value === null || value === undefined) {
      return null;
    }

    // Если уже число
    if (typeof value === 'number') {
      return Number.isNaN(value) ? null : value;
    }

    // Попытка парсинга строки
    if (typeof value === 'string') {
      // Удаляем пробелы
      const trimmed = value.trim();

      // Пустая строка = null
      if (trimmed === '') {
        return null;
      }

      // Парсинг числа
      const parsed = Number(trimmed);
      return Number.isNaN(parsed) ? null : parsed;
    }

    // Другие типы считаем null
    console.warn(`⚠️  Невозможно преобразовать значение в число:`, value);
    return null;
  }

  /**
   * Валидация кода региона (формат RU-XXX)
   * @param code - Код региона
   * @returns true если код валиден
   */
  private isValidRegionCode(code: string): boolean {
    if (!code || typeof code !== 'string') {
      return false;
    }

    // Формат: RU-XXX где XXX - буквы или цифры
    const regionCodePattern = /^RU-[A-Z0-9]{2,3}$/i;
    return regionCodePattern.test(code);
  }

  /**
   * Суммирование федеральных данных из нескольких представлений
   * Используется при агрегации данных из множественных viewIds
   * @param multiViewData - Массив извлеченных федеральных данных из разных представлений
   * @param years - Массив годов (пересечение годов из всех представлений)
   * @returns Суммированные федеральные данные
   */
  sumFederalDataMultiView(
    multiViewData: ExtractedFederalData[],
    years: number[]
  ): ExtractedFederalData {
    const dataByYear = new Map<number, CellValue>();

    console.log(`\n➕ Суммирование федеральных данных из ${multiViewData.length} представлений`);

    for (const year of years) {
      const values: number[] = [];

      // Собираем значения из всех представлений для данного года
      for (let i = 0; i < multiViewData.length; i++) {
        const viewData = multiViewData[i];
        const cellValue = viewData.dataByYear.get(year);

        if (cellValue && !cellValue.isNull && cellValue.value !== null) {
          values.push(cellValue.value);
          console.log(`  ${year} - представление ${i + 1}: ${cellValue.value}`);
        } else {
          console.log(`  ${year} - представление ${i + 1}: null (пропускаем)`);
        }
      }

      // Если нет ни одного значения, возвращаем null
      if (values.length === 0) {
        console.warn(`⚠️  Нет данных для суммирования за ${year} год`);
        dataByYear.set(year, { value: null, isNull: true });
        continue;
      }

      // Суммируем все значения
      const sum = values.reduce((acc, val) => acc + val, 0);
      console.log(`✅ Сумма за ${year}: ${sum} (из ${values.length} представлений)`);

      dataByYear.set(year, { value: sum, isNull: false });
    }

    return { years, dataByYear };
  }

  /**
   * Суммирование региональных данных из нескольких представлений
   * Используется при агрегации данных из множественных viewIds
   * @param multiViewData - Массив извлеченных региональных данных из разных представлений
   * @param years - Массив годов (пересечение годов из всех представлений)
   * @returns Суммированные региональные данные
   */
  sumRegionalDataMultiView(
    multiViewData: ExtractedRegionalData[],
    years: number[]
  ): ExtractedRegionalData {
    const regionsByYear = new Map<number, RegionValue[]>();
    const allRegionCodes = new Set<string>();

    console.log(`\n➕ Суммирование региональных данных из ${multiViewData.length} представлений`);

    // Собираем все уникальные коды регионов из всех представлений
    for (const viewData of multiViewData) {
      viewData.allRegionCodes.forEach(code => allRegionCodes.add(code));
    }

    console.log(`📍 Всего уникальных регионов: ${allRegionCodes.size}`);

    // Для каждого года
    for (const year of years) {
      const aggregatedRegions: RegionValue[] = [];

      // Для каждого региона
      for (const regionCode of allRegionCodes) {
        const values: number[] = [];
        let regionName: string | undefined;

        // Собираем значения из всех представлений для данного региона и года
        for (const viewData of multiViewData) {
          const regionDataForYear = viewData.regionsByYear.get(year);
          if (!regionDataForYear) continue;

          const regionEntry = regionDataForYear.find(r => r.regionCode === regionCode);
          if (regionEntry) {
            // Сохраняем название региона (берем из первого найденного)
            if (!regionName && regionEntry.regionName) {
              regionName = regionEntry.regionName;
            }

            if (regionEntry.value !== null) {
              values.push(regionEntry.value);
            }
          }
        }

        // Если нет ни одного значения, используем null
        const value = values.length === 0
          ? null
          : values.reduce((acc, val) => acc + val, 0);

        aggregatedRegions.push({
          regionCode,
          value,
          regionName
        });
      }

      regionsByYear.set(year, aggregatedRegions);

      const validCount = aggregatedRegions.filter(r => r.value !== null).length;
      console.log(
        `🗺️  Суммированные региональные данные за ${year}: ${validCount}/${aggregatedRegions.length} регионов имеют значения`
      );
    }

    return { years, regionsByYear, allRegionCodes };
  }
}
