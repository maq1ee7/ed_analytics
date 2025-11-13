/**
 * Модуль для загрузки списков таблиц из CSV файлов
 * Парсит файлы Список_таблиц_ОО_1.csv и Список_таблиц_ОО_2.csv
 */

import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';

export interface TableInfo {
  section: string;
  name: string;
}

/**
 * Загружает список таблиц для указанной статистической формы
 * 
 * @param formCode - Код формы ("OO_1" или "OO_2")
 * @returns Список таблиц с полями section и name
 * @throws Error если form_code неизвестен или файл не найден
 */
export function getTableList(formCode: string): TableInfo[] {
  // Определить путь к CSV файлу
  const dataPath = path.join(__dirname, '../../data');
  let csvFilename: string;

  if (formCode === 'OO_1') {
    csvFilename = 'Список_таблиц_ОО_1.csv';
  } else if (formCode === 'OO_2') {
    csvFilename = 'Список_таблиц_ОО_2.csv';
  } else {
    throw new Error(`Неизвестный form_code: ${formCode}. Допустимые значения: OO_1, OO_2`);
  }

  const csvPath = path.join(dataPath, csvFilename);

  if (!fs.existsSync(csvPath)) {
    throw new Error(`Файл со списком таблиц не найден: ${csvPath}`);
  }

  console.log(`[TableListLoader] Загрузка списка таблиц из ${csvPath}`);

  // Чтение и парсинг CSV
  const fileContent = fs.readFileSync(csvPath, 'utf-8');
  
  // Парсим CSV с разделителем точка с запятой
  const records = parse(fileContent, {
    delimiter: ';',
    skip_empty_lines: true,
    relax_column_count: true, // Игнорируем несоответствие количества колонок
    encoding: 'utf-8'
  });

  const tableList: TableInfo[] = [];

  for (const row of records) {
    if (!row || row.length === 0) {
      continue;
    }

    // Первая колонка содержит название раздела/таблицы
    const fullName = String(row[0]).trim();

    if (!fullName) {
      continue;
    }

    // Пропустить строки с "Название раздела" (это заголовки, не таблицы)
    if (row.length > 1 && String(row[1]).includes('Название раздела')) {
      console.log(`[TableListLoader] Пропущен заголовок раздела: ${fullName}`);
      continue;
    }

    // Извлечь номер раздела через regex
    // Поддерживаемые форматы: 1.1, 2.5.2, 1.1.1, и т.д.
    const match = fullName.match(/^(\d+(?:\.\d+)*)/);

    if (match) {
      const section = match[1];
      
      // Удалить номер и точку из названия
      // "2.5.2. Сведения об обучающихся..." → "Сведения об обучающихся..."
      const name = fullName.replace(/^\d+(?:\.\d+)*\.?\s*/, '');

      tableList.push({ section, name });
      
      console.log(`[TableListLoader] Добавлена таблица: ${section} - ${name.substring(0, 50)}...`);
    }
  }

  console.log(`[TableListLoader] Загружено ${tableList.length} таблиц для формы ${formCode}`);

  return tableList;
}

/**
 * Форматирует список таблиц в строку для промпта LLM
 */
export function formatTableListForPrompt(tableList: TableInfo[]): string {
  return tableList
    .map(item => `- ${item.section}: ${item.name}`)
    .join('\n');
}






