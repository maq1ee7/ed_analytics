import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import type { RussiaMapChartData } from './types.js';

/** URI MCP resource со справочником кодов (ISO 3166-2:RU + алиасы). */
export const RUSSIA_REGION_CODES_URI = 'dashboard://mcp-dashboard/russia-region-codes';

type RegionMeta = {
  title: string;
  type: string;
  federalDistrict: string;
};

/** Нормализация ключа для поиска по алиасу (кириллица, без лишних пробелов). */
const normalizeAliasKey = (s: string): string =>
  s
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/[\s—–-]+/g, '')
    .replace(/ё/g, 'е');

const levenshtein = (a: string, b: string): number => {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const row = new Uint32Array(n + 1);
  for (let j = 0; j <= n; j++) row[j] = j;
  for (let i = 1; i <= m; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = row[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + cost);
      prev = tmp;
    }
  }
  return row[n];
};

const regionsPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'data',
  'regions.json'
);

const rawRegions: Record<string, RegionMeta> = JSON.parse(
  readFileSync(regionsPath, 'utf8')
) as Record<string, RegionMeta>;

const VALID_CODES = new Set(Object.keys(rawRegions));

/**
 * Дополнительные алиасы (подпись для справочника и нормализованный ключ для поиска).
 */
const ALIAS_ENTRIES: { display: string; code: string }[] = [
  { display: 'Москва', code: 'RU-MOW' },
  { display: 'МСК', code: 'RU-MOW' },
  { display: 'Санкт-Петербург', code: 'RU-SPE' },
  { display: 'Петербург', code: 'RU-SPE' },
  { display: 'Питер', code: 'RU-SPE' },
  { display: 'СПб', code: 'RU-SPE' },
  { display: 'Севастополь', code: 'RU-SEV' },
  { display: 'Крым', code: 'RU-CR' },
  { display: 'ХМАО', code: 'RU-KHM' },
  { display: 'Югра', code: 'RU-KHM' },
  { display: 'Ханты-Мансийский АО', code: 'RU-KHM' },
  { display: 'ЯНАО', code: 'RU-YAN' },
  { display: 'Ямал', code: 'RU-YAN' },
  { display: 'Татарстан', code: 'RU-TA' },
  { display: 'Башкортостан', code: 'RU-BA' },
  { display: 'Башкирия', code: 'RU-BA' },
  { display: 'Чувашия', code: 'RU-CU' },
  { display: 'Удмуртия', code: 'RU-UD' },
  { display: 'Марий Эл', code: 'RU-ME' },
  { display: 'Мордовия', code: 'RU-MO' },
  { display: 'Карелия', code: 'RU-KR' },
  { display: 'Коми', code: 'RU-KO' },
  { display: 'Якутия', code: 'RU-SA' },
  { display: 'Саха', code: 'RU-SA' },
  { display: 'Тыва', code: 'RU-TY' },
  { display: 'Тува', code: 'RU-TY' },
  { display: 'Бурятия', code: 'RU-BU' },
  { display: 'Алтай (республика)', code: 'RU-AL' },
  { display: 'Хакасия', code: 'RU-KK' },
  { display: 'Дагестан', code: 'RU-DA' },
  { display: 'Ингушетия', code: 'RU-IN' },
  { display: 'Чечня', code: 'RU-CE' },
  { display: 'Северная Осетия', code: 'RU-SE' },
  { display: 'Алания', code: 'RU-SE' },
  { display: 'Кабардино-Балкария', code: 'RU-KB' },
  { display: 'КБР', code: 'RU-KB' },
  { display: 'Карачаево-Черкесия', code: 'RU-KC' },
  { display: 'КЧР', code: 'RU-KC' },
  { display: 'Адыгея', code: 'RU-AD' },
  { display: 'Калмыкия', code: 'RU-KL' },
  { display: 'Ненецкий АО', code: 'RU-NEN' },
  { display: 'Чукотка', code: 'RU-CHU' },
  { display: 'Еврейская АО', code: 'RU-YEV' },
  { display: 'Московская область', code: 'RU-MOS' },
  { display: 'Подмосковье', code: 'RU-MOS' },
  { display: 'Ленинградская область', code: 'RU-LEN' },
  { display: 'Запорожская область', code: 'RU-ZP' },
  { display: 'Херсонская область', code: 'RU-HR' },
  { display: 'ДНР', code: 'RU-DON' },
  { display: 'Донецкая НР', code: 'RU-DON' },
  { display: 'ЛНР', code: 'RU-LUG' },
  { display: 'Луганская НР', code: 'RU-LUG' },
];

const ALIAS_TO_CODE: Record<string, string> = (() => {
  const out: Record<string, string> = {};
  for (const { display, code } of ALIAS_ENTRIES) {
    out[normalizeAliasKey(display)] = code;
  }
  return out;
})();

/** Алиасы по коду (для JSON resource). */
const CODE_ALIASES: Record<string, string[]> = (() => {
  const byCode: Record<string, Set<string>> = {};
  for (const { display, code } of ALIAS_ENTRIES) {
    if (!byCode[code]) byCode[code] = new Set();
    byCode[code].add(display);
  }
  const result: Record<string, string[]> = {};
  for (const [code, set] of Object.entries(byCode)) {
    result[code] = [...set].sort((a, b) => a.localeCompare(b, 'ru'));
  }
  return result;
})();

export class RussiaMapRegionValidationError extends Error {
  constructor(
    message: string,
    public readonly unknownRegionCodes: string[],
    public readonly suggestions: Record<string, string[]>
  ) {
    super(message);
    this.name = 'RussiaMapRegionValidationError';
  }
}

const suggestCodes = (invalid: string, limit = 5): string[] => {
  const upper = invalid.toUpperCase();
  const scored = [...VALID_CODES].map((code) => ({
    code,
    d: levenshtein(upper, code),
  }));
  scored.sort((a, b) => a.d - b.d || a.code.localeCompare(b.code));
  const maxDist = Math.min(4, Math.max(2, Math.ceil(upper.length / 3)));
  return scored.filter((x) => x.d <= maxDist).slice(0, limit).map((x) => x.code);
};

/**
 * Разрешает regionCode: ISO после нормализации или известный алиас.
 * @returns канонический код или null
 */
export const resolveRegionCode = (raw: string): string | null => {
  const trimmed = raw.normalize('NFKC').trim();
  if (!trimmed) return null;

  const upperLatin = trimmed.toUpperCase().replace(/\s+/g, '');
  if (VALID_CODES.has(upperLatin)) return upperLatin;

  if (!upperLatin.startsWith('RU-')) {
    const withPrefix = `RU-${upperLatin}`;
    if (VALID_CODES.has(withPrefix)) return withPrefix;
  }

  const alias = ALIAS_TO_CODE[normalizeAliasKey(trimmed)];
  if (alias && VALID_CODES.has(alias)) return alias;

  return null;
};

/**
 * Проверяет все regionCode в данных карты; при ошибке бросает RussiaMapRegionValidationError.
 */
export const assertRussiaMapRegionCodes = (data: RussiaMapChartData): void => {
  const unknown = new Set<string>();
  const suggestions: Record<string, string[]> = {};

  for (const y of data.years) {
    for (const r of y.regions) {
      const resolved = resolveRegionCode(r.regionCode);
      if (resolved === null) {
        const key = r.regionCode.trim() || '(пустой код)';
        unknown.add(key);
        if (!suggestions[key]) {
          suggestions[key] = suggestCodes(key);
        }
      }
    }
  }

  if (unknown.size === 0) return;

  const list = [...unknown].sort();
  throw new RussiaMapRegionValidationError(
    `Неизвестные коды регионов: ${list.join(', ')}. Используйте ISO 3166-2:RU (например RU-MOW) или читайте resource ${RUSSIA_REGION_CODES_URI} / инструмент get_russia_region_codes.`,
    list,
    suggestions
  );
};

/** Приводит regionCode к каноническому виду после успешной проверки assertRussiaMapRegionCodes. */
export const normalizeRussiaMapChartData = (data: RussiaMapChartData): RussiaMapChartData => ({
  title: data.title.trim(),
  years: data.years.map((year) => ({
    ...year,
    regions: year.regions.map((r) => {
      const code = resolveRegionCode(r.regionCode);
      if (!code) {
        throw new Error('Внутренняя ошибка: код региона не разрешён после валидации.');
      }
      return { regionCode: code, value: r.value };
    }),
  })),
});

export type RussiaRegionCodesPayload = {
  schema: 'mcp-dashboard.russia-regions.v1';
  description: string;
  resourceUri: string;
  regions: Array<{
    regionCode: string;
    title: string;
    type: string;
    federalDistrict: string;
    aliases: string[];
  }>;
};

export const buildRussiaRegionCodesPayload = (): RussiaRegionCodesPayload => {
  const regions = [...VALID_CODES]
    .sort()
    .map((regionCode) => {
      const meta = rawRegions[regionCode];
      return {
        regionCode,
        title: meta.title,
        type: meta.type,
        federalDistrict: meta.federalDistrict,
        aliases: CODE_ALIASES[regionCode] ?? [],
      };
    });
  return {
    schema: 'mcp-dashboard.russia-regions.v1',
    description:
      'Субъекты РФ для инструмента create_russia_map: код ISO 3166-2:RU, официальное название, алиасы для сопоставления с текстом.',
    resourceUri: RUSSIA_REGION_CODES_URI,
    regions,
  };
};

export const getRussiaRegionCodesJson = (): string =>
  JSON.stringify(buildRussiaRegionCodesPayload(), null, 2);
