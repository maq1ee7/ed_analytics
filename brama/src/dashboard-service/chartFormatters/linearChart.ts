import { ExtractedFederalData, LinearChart } from '../types.js';

/**
 * Форматирование федеральных данных в Linear Chart
 * Преобразует данные по годам в массив точек для линейного графика
 */
export class LinearChartFormatter {
  /**
   * Сформировать Linear Chart из извлечённых федеральных данных
   * @param data - Извлечённые федеральные данные
   * @param years - Массив годов (для порядка)
   * @returns Объект LinearChart
   */
  format(data: ExtractedFederalData, years: number[]): LinearChart {
    // Создаём массив точек для каждого года
    const points = years.map(year => {
      const cellValue = data.dataByYear.get(year);

      return {
        x: year,
        y: cellValue?.value ?? null,
      };
    });

    // Логирование статистики
    const validPoints = points.filter(p => p.y !== null).length;
    console.log(
      `📈 Linear Chart: ${validPoints}/${points.length} точек имеют значения`
    );

    return {
      type: 'linear',
      title: 'Федеральные данные по годам',
      data: {
        years: [
          {
            points,
          },
        ],
      },
    };
  }
}
