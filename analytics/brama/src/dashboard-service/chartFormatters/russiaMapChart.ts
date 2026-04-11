import { ExtractedRegionalData, RussiaMapChart } from '../types.js';

/**
 * Форматирование региональных данных в Russia Map Chart
 * Преобразует данные по регионам и годам в формат для карты России
 */
export class RussiaMapChartFormatter {
  /**
   * Сформировать Russia Map Chart из извлечённых региональных данных
   * @param data - Извлечённые региональные данные
   * @param years - Массив годов (для порядка)
   * @returns Объект RussiaMapChart
   */
  format(data: ExtractedRegionalData, years: number[]): RussiaMapChart {
    const yearsData = years.map(year => {
      const regions = data.regionsByYear.get(year) || [];

      // Преобразуем в формат chart
      const regionsFormatted = regions.map(region => ({
        regionCode: region.regionCode,
        value: region.value,
      }));

      // Логирование статистики для года
      const validRegions = regionsFormatted.filter(r => r.value !== null).length;
      console.log(
        `🗺️  Russia Map Chart ${year}: ${validRegions}/${regionsFormatted.length} регионов имеют значения`
      );

      return {
        year,
        regions: regionsFormatted,
      };
    });

    return {
      type: 'russia_map',
      title: 'Данные по регионам России',
      data: {
        years: yearsData,
      },
    };
  }
}
