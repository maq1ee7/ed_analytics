/**
 * Модуль для маппинга регионов из Neo4j в коды регионов (RU-XXX)
 * Использует нечеткое соответствие с нормализацией строк
 */

import * as fs from 'fs';
import * as path from 'path';

interface RegionsData {
  typoFixes: Record<string, string>;
  regions: Record<string, string>;
}

// Кэш для загруженных регионов
let regionsCache: RegionsData | null = null;

/**
 * Загружает справочник регионов из JSON файла
 */
function loadRegionsData(): RegionsData {
  if (regionsCache) {
    return regionsCache;
  }

  const regionsPath = path.join(__dirname, '../../data/regions.json');
  const fileContent = fs.readFileSync(regionsPath, 'utf-8');
  regionsCache = JSON.parse(fileContent);

  console.log(`[RegionMapper] Загружено ${Object.keys(regionsCache!.regions).length} регионов`);
  return regionsCache!;
}

/**
 * Нормализует название региона для сравнения
 * 
 * Преобразования:
 * - lowercase
 * - исправление известных опечаток (до замены подчеркиваний!)
 * - замена подчеркиваний на пробелы
 * - удаление лишних пробелов
 */
export function normalizeRegionName(name: string): string {
  let normalized = name.toLowerCase();

  // Исправить известные опечатки ПЕРЕД заменой подчеркиваний
  const regionsData = loadRegionsData();
  if (regionsData.typoFixes[normalized]) {
    const original = normalized;
    normalized = regionsData.typoFixes[normalized];
    console.log(`[RegionMapper] Исправлена опечатка: '${original}' -> '${normalized}'`);
  }

  // Нормализация
  normalized = normalized.replace(/_/g, ' ');
  normalized = normalized.replace(/\s+/g, ' ');
  normalized = normalized.trim();

  return normalized;
}

/**
 * Извлекает ключевое слово из названия региона (обычно первое слово)
 */
function extractKeyWord(name: string): string {
  const words = name.split(' ');
  return words.length > 0 ? words[0] : name;
}

/**
 * Нечеткий поиск regionCode по названию региона
 * 
 * Алгоритм:
 * 1. Точное совпадение нормализованных строк
 * 2. Частичное совпадение по ключевому слову (началу)
 * 3. Частичное совпадение по вхождению строки
 */
function findRegionCodeFuzzy(
  regionName: string,
  regionsMap: Record<string, string>
): { code: string | null; method: string } {
  const normalizedName = normalizeRegionName(regionName);

  // 1. Точное совпадение
  if (regionsMap[normalizedName]) {
    console.log(`[RegionMapper] Точное совпадение: ${regionName} -> ${regionsMap[normalizedName]}`);
    return { code: regionsMap[normalizedName], method: 'exact' };
  }

  // 2. Частичное совпадение по ключевому слову (начало)
  const keyWord = extractKeyWord(normalizedName);
  for (const [title, code] of Object.entries(regionsMap)) {
    if (title.startsWith(keyWord)) {
      console.log(`[RegionMapper] Частичное совпадение (начало): ${regionName} -> ${code} (через '${keyWord}')`);
      return { code, method: 'partial_start' };
    }
  }

  // 3. Частичное совпадение по вхождению (более гибкий поиск)
  if (keyWord.length >= 5) {
    const keyPrefix = keyWord.substring(0, 5);
    for (const [title, code] of Object.entries(regionsMap)) {
      if (title.includes(keyPrefix)) {
        console.log(`[RegionMapper] Частичное совпадение (вхождение): ${regionName} -> ${code} (через '${keyPrefix}')`);
        return { code, method: 'partial_contains' };
      }
    }
  }

  // 4. Не найдено
  console.warn(`[RegionMapper] Регион не найден: ${regionName}`);
  return { code: null, method: 'not_found' };
}

/**
 * Преобразует region_name из Neo4j в regionCode
 * 
 * @param regionName - Название региона из Neo4j (например, "волгоградская_область")
 * @returns regionCode (например, "RU-VGG")
 * @throws Error если регион не найден в справочнике
 */
export function mapRegionToCode(regionName: string): string {
  const regionsData = loadRegionsData();
  const { code, method } = findRegionCodeFuzzy(regionName, regionsData.regions);

  if (!code) {
    throw new Error(
      `Unknown region: '${regionName}'. Region not found in reference. Please update regions.json`
    );
  }

  return code;
}

/**
 * Очищает кэш (полезно для тестирования)
 */
export function clearCache(): void {
  regionsCache = null;
}






