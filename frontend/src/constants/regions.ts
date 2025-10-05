/**
 * Константы регионов Российской Федерации
 * Коды регионов соответствуют стандарту ISO 3166-2:RU
 */

export type RegionCode = 
  | 'RU-MOW' | 'RU-SPE' | 'RU-NEN' | 'RU-YAR' | 'RU-CHE' | 'RU-ULY' | 'RU-TYU' | 'RU-TUL'
  | 'RU-SVE' | 'RU-RYA' | 'RU-ORL' | 'RU-OMS' | 'RU-NGR' | 'RU-LIP' | 'RU-KRS' | 'RU-KGN'
  | 'RU-KGD' | 'RU-IVA' | 'RU-BRY' | 'RU-AST' | 'RU-KHA' | 'RU-CE' | 'RU-UD' | 'RU-SE'
  | 'RU-MO' | 'RU-KR' | 'RU-KL' | 'RU-IN' | 'RU-AL' | 'RU-BA' | 'RU-AD' | 'RU-CR'
  | 'RU-SEV' | 'RU-KO' | 'RU-KIR' | 'RU-PNZ' | 'RU-TAM' | 'RU-MUR' | 'RU-LEN' | 'RU-VLG'
  | 'RU-KOS' | 'RU-PSK' | 'RU-ARK' | 'RU-YAN' | 'RU-CHU' | 'RU-YEV' | 'RU-TY' | 'RU-SAK'
  | 'RU-AMU' | 'RU-BU' | 'RU-KK' | 'RU-KEM' | 'RU-NVS' | 'RU-ALT' | 'RU-DA' | 'RU-STA'
  | 'RU-KB' | 'RU-KC' | 'RU-KDA' | 'RU-ROS' | 'RU-SAM' | 'RU-TA' | 'RU-ME' | 'RU-CU'
  | 'RU-NIZ' | 'RU-VLA' | 'RU-MOS' | 'RU-KLU' | 'RU-BEL' | 'RU-ZAB' | 'RU-PRI' | 'RU-KAM'
  | 'RU-MAG' | 'RU-SA' | 'RU-KYA' | 'RU-ORE' | 'RU-SAR' | 'RU-VGG' | 'RU-VOR' | 'RU-SMO'
  | 'RU-TVE' | 'RU-PER' | 'RU-KHM' | 'RU-TOM' | 'RU-IRK' | 'RU-HR' | 'RU-ZP' | 'RU-DON'
  | 'RU-LUG';

export interface RegionInfo {
  code: RegionCode;
  title: string;
  type: 'город' | 'область' | 'край' | 'республика' | 'автономный округ' | 'автономная область';
  federalDistrict: 'ЦФО' | 'СЗФО' | 'ЮФО' | 'СКФО' | 'ПФО' | 'УФО' | 'СФО' | 'ДФО';
}

/**
 * Полный справочник регионов Российской Федерации
 */
export const RUSSIA_REGIONS: Record<RegionCode, RegionInfo> = {
  // Центральный федеральный округ (ЦФО)
  'RU-MOW': {
    code: 'RU-MOW',
    title: 'Москва',
    type: 'город',
    federalDistrict: 'ЦФО'
  },
  'RU-MOS': {
    code: 'RU-MOS',
    title: 'Московская область',
    type: 'область',
    federalDistrict: 'ЦФО'
  },
  'RU-BEL': {
    code: 'RU-BEL',
    title: 'Белгородская область',
    type: 'область',
    federalDistrict: 'ЦФО'
  },
  'RU-BRY': {
    code: 'RU-BRY',
    title: 'Брянская область',
    type: 'область',
    federalDistrict: 'ЦФО'
  },
  'RU-VLA': {
    code: 'RU-VLA',
    title: 'Владимирская область',
    type: 'область',
    federalDistrict: 'ЦФО'
  },
  'RU-VOR': {
    code: 'RU-VOR',
    title: 'Воронежская область',
    type: 'область',
    federalDistrict: 'ЦФО'
  },
  'RU-IVA': {
    code: 'RU-IVA',
    title: 'Ивановская область',
    type: 'область',
    federalDistrict: 'ЦФО'
  },
  'RU-KLU': {
    code: 'RU-KLU',
    title: 'Калужская область',
    type: 'область',
    federalDistrict: 'ЦФО'
  },
  'RU-KOS': {
    code: 'RU-KOS',
    title: 'Костромская область',
    type: 'область',
    federalDistrict: 'ЦФО'
  },
  'RU-KRS': {
    code: 'RU-KRS',
    title: 'Курская область',
    type: 'область',
    federalDistrict: 'ЦФО'
  },
  'RU-LIP': {
    code: 'RU-LIP',
    title: 'Липецкая область',
    type: 'область',
    federalDistrict: 'ЦФО'
  },
  'RU-ORL': {
    code: 'RU-ORL',
    title: 'Орловская область',
    type: 'область',
    federalDistrict: 'ЦФО'
  },
  'RU-RYA': {
    code: 'RU-RYA',
    title: 'Рязанская область',
    type: 'область',
    federalDistrict: 'ЦФО'
  },
  'RU-SMO': {
    code: 'RU-SMO',
    title: 'Смоленская область',
    type: 'область',
    federalDistrict: 'ЦФО'
  },
  'RU-TAM': {
    code: 'RU-TAM',
    title: 'Тамбовская область',
    type: 'область',
    federalDistrict: 'ЦФО'
  },
  'RU-TVE': {
    code: 'RU-TVE',
    title: 'Тверская область',
    type: 'область',
    federalDistrict: 'ЦФО'
  },
  'RU-TUL': {
    code: 'RU-TUL',
    title: 'Тульская область',
    type: 'область',
    federalDistrict: 'ЦФО'
  },
  'RU-YAR': {
    code: 'RU-YAR',
    title: 'Ярославская область',
    type: 'область',
    federalDistrict: 'ЦФО'
  },

  // Северо-Западный федеральный округ (СЗФО)
  'RU-SPE': {
    code: 'RU-SPE',
    title: 'Санкт-Петербург',
    type: 'город',
    federalDistrict: 'СЗФО'
  },
  'RU-LEN': {
    code: 'RU-LEN',
    title: 'Ленинградская область',
    type: 'область',
    federalDistrict: 'СЗФО'
  },
  'RU-ARK': {
    code: 'RU-ARK',
    title: 'Архангельская область',
    type: 'область',
    federalDistrict: 'СЗФО'
  },
  'RU-VLG': {
    code: 'RU-VLG',
    title: 'Вологодская область',
    type: 'область',
    federalDistrict: 'СЗФО'
  },
  'RU-KGD': {
    code: 'RU-KGD',
    title: 'Калининградская область',
    type: 'область',
    federalDistrict: 'СЗФО'
  },
  'RU-MUR': {
    code: 'RU-MUR',
    title: 'Мурманская область',
    type: 'область',
    federalDistrict: 'СЗФО'
  },
  'RU-NGR': {
    code: 'RU-NGR',
    title: 'Новгородская область',
    type: 'область',
    federalDistrict: 'СЗФО'
  },
  'RU-PSK': {
    code: 'RU-PSK',
    title: 'Псковская область',
    type: 'область',
    federalDistrict: 'СЗФО'
  },
  'RU-KR': {
    code: 'RU-KR',
    title: 'Республика Карелия',
    type: 'республика',
    federalDistrict: 'СЗФО'
  },
  'RU-KO': {
    code: 'RU-KO',
    title: 'Республика Коми',
    type: 'республика',
    federalDistrict: 'СЗФО'
  },
  'RU-NEN': {
    code: 'RU-NEN',
    title: 'Ненецкий автономный округ',
    type: 'автономный округ',
    federalDistrict: 'СЗФО'
  },

  // Южный федеральный округ (ЮФО)
  'RU-AST': {
    code: 'RU-AST',
    title: 'Астраханская область',
    type: 'область',
    federalDistrict: 'ЮФО'
  },
  'RU-VGG': {
    code: 'RU-VGG',
    title: 'Волгоградская область',
    type: 'область',
    federalDistrict: 'ЮФО'
  },
  'RU-ROS': {
    code: 'RU-ROS',
    title: 'Ростовская область',
    type: 'область',
    federalDistrict: 'ЮФО'
  },
  'RU-AD': {
    code: 'RU-AD',
    title: 'Республика Адыгея',
    type: 'республика',
    federalDistrict: 'ЮФО'
  },
  'RU-KL': {
    code: 'RU-KL',
    title: 'Республика Калмыкия',
    type: 'республика',
    federalDistrict: 'ЮФО'
  },
  'RU-CR': {
    code: 'RU-CR',
    title: 'Республика Крым',
    type: 'республика',
    federalDistrict: 'ЮФО'
  },
  'RU-KDA': {
    code: 'RU-KDA',
    title: 'Краснодарский край',
    type: 'край',
    federalDistrict: 'ЮФО'
  },
  'RU-SEV': {
    code: 'RU-SEV',
    title: 'Севастополь',
    type: 'город',
    federalDistrict: 'ЮФО'
  },

  // Северо-Кавказский федеральный округ (СКФО)
  'RU-DA': {
    code: 'RU-DA',
    title: 'Республика Дагестан',
    type: 'республика',
    federalDistrict: 'СКФО'
  },
  'RU-IN': {
    code: 'RU-IN',
    title: 'Республика Ингушетия',
    type: 'республика',
    federalDistrict: 'СКФО'
  },
  'RU-KB': {
    code: 'RU-KB',
    title: 'Кабардино-Балкарская Республика',
    type: 'республика',
    federalDistrict: 'СКФО'
  },
  'RU-KC': {
    code: 'RU-KC',
    title: 'Карачаево-Черкесская Республика',
    type: 'республика',
    federalDistrict: 'СКФО'
  },
  'RU-SE': {
    code: 'RU-SE',
    title: 'Республика Северная Осетия — Алания',
    type: 'республика',
    federalDistrict: 'СКФО'
  },
  'RU-CE': {
    code: 'RU-CE',
    title: 'Чеченская Республика',
    type: 'республика',
    federalDistrict: 'СКФО'
  },
  'RU-STA': {
    code: 'RU-STA',
    title: 'Ставропольский край',
    type: 'край',
    federalDistrict: 'СКФО'
  },

  // Приволжский федеральный округ (ПФО)
  'RU-KIR': {
    code: 'RU-KIR',
    title: 'Кировская область',
    type: 'область',
    federalDistrict: 'ПФО'
  },
  'RU-NIZ': {
    code: 'RU-NIZ',
    title: 'Нижегородская область',
    type: 'область',
    federalDistrict: 'ПФО'
  },
  'RU-ORE': {
    code: 'RU-ORE',
    title: 'Оренбургская область',
    type: 'область',
    federalDistrict: 'ПФО'
  },
  'RU-PNZ': {
    code: 'RU-PNZ',
    title: 'Пензенская область',
    type: 'область',
    federalDistrict: 'ПФО'
  },
  'RU-SAM': {
    code: 'RU-SAM',
    title: 'Самарская область',
    type: 'область',
    federalDistrict: 'ПФО'
  },
  'RU-SAR': {
    code: 'RU-SAR',
    title: 'Саратовская область',
    type: 'область',
    federalDistrict: 'ПФО'
  },
  'RU-ULY': {
    code: 'RU-ULY',
    title: 'Ульяновская область',
    type: 'область',
    federalDistrict: 'ПФО'
  },
  'RU-BA': {
    code: 'RU-BA',
    title: 'Республика Башкортостан',
    type: 'республика',
    federalDistrict: 'ПФО'
  },
  'RU-ME': {
    code: 'RU-ME',
    title: 'Республика Марий Эл',
    type: 'республика',
    federalDistrict: 'ПФО'
  },
  'RU-MO': {
    code: 'RU-MO',
    title: 'Республика Мордовия',
    type: 'республика',
    federalDistrict: 'ПФО'
  },
  'RU-TA': {
    code: 'RU-TA',
    title: 'Республика Татарстан',
    type: 'республика',
    federalDistrict: 'ПФО'
  },
  'RU-UD': {
    code: 'RU-UD',
    title: 'Удмуртская Республика',
    type: 'республика',
    federalDistrict: 'ПФО'
  },
  'RU-CU': {
    code: 'RU-CU',
    title: 'Чувашская Республика',
    type: 'республика',
    federalDistrict: 'ПФО'
  },
  'RU-PER': {
    code: 'RU-PER',
    title: 'Пермский край',
    type: 'край',
    federalDistrict: 'ПФО'
  },

  // Уральский федеральный округ (УФО)
  'RU-KGN': {
    code: 'RU-KGN',
    title: 'Курганская область',
    type: 'область',
    federalDistrict: 'УФО'
  },
  'RU-SVE': {
    code: 'RU-SVE',
    title: 'Свердловская область',
    type: 'область',
    federalDistrict: 'УФО'
  },
  'RU-TYU': {
    code: 'RU-TYU',
    title: 'Тюменская область',
    type: 'область',
    federalDistrict: 'УФО'
  },
  'RU-CHE': {
    code: 'RU-CHE',
    title: 'Челябинская область',
    type: 'область',
    federalDistrict: 'УФО'
  },
  'RU-KHM': {
    code: 'RU-KHM',
    title: 'Ханты-Мансийский автономный округ — Югра',
    type: 'автономный округ',
    federalDistrict: 'УФО'
  },
  'RU-YAN': {
    code: 'RU-YAN',
    title: 'Ямало-Ненецкий автономный округ',
    type: 'автономный округ',
    federalDistrict: 'УФО'
  },

  // Сибирский федеральный округ (СФО)
  'RU-IRK': {
    code: 'RU-IRK',
    title: 'Иркутская область',
    type: 'область',
    federalDistrict: 'СФО'
  },
  'RU-KEM': {
    code: 'RU-KEM',
    title: 'Кемеровская область',
    type: 'область',
    federalDistrict: 'СФО'
  },
  'RU-NVS': {
    code: 'RU-NVS',
    title: 'Новосибирская область',
    type: 'область',
    federalDistrict: 'СФО'
  },
  'RU-OMS': {
    code: 'RU-OMS',
    title: 'Омская область',
    type: 'область',
    federalDistrict: 'СФО'
  },
  'RU-TOM': {
    code: 'RU-TOM',
    title: 'Томская область',
    type: 'область',
    federalDistrict: 'СФО'
  },
  'RU-AL': {
    code: 'RU-AL',
    title: 'Республика Алтай',
    type: 'республика',
    federalDistrict: 'СФО'
  },
  'RU-BU': {
    code: 'RU-BU',
    title: 'Республика Бурятия',
    type: 'республика',
    federalDistrict: 'СФО'
  },
  'RU-KK': {
    code: 'RU-KK',
    title: 'Республика Хакасия',
    type: 'республика',
    federalDistrict: 'СФО'
  },
  'RU-TY': {
    code: 'RU-TY',
    title: 'Республика Тыва',
    type: 'республика',
    federalDistrict: 'СФО'
  },
  'RU-ALT': {
    code: 'RU-ALT',
    title: 'Алтайский край',
    type: 'край',
    federalDistrict: 'СФО'
  },
  'RU-ZAB': {
    code: 'RU-ZAB',
    title: 'Забайкальский край',
    type: 'край',
    federalDistrict: 'СФО'
  },
  'RU-KYA': {
    code: 'RU-KYA',
    title: 'Красноярский край',
    type: 'край',
    federalDistrict: 'СФО'
  },

  // Дальневосточный федеральный округ (ДФО)
  'RU-AMU': {
    code: 'RU-AMU',
    title: 'Амурская область',
    type: 'область',
    federalDistrict: 'ДФО'
  },
  'RU-MAG': {
    code: 'RU-MAG',
    title: 'Магаданская область',
    type: 'область',
    federalDistrict: 'ДФО'
  },
  'RU-SAK': {
    code: 'RU-SAK',
    title: 'Сахалинская область',
    type: 'область',
    federalDistrict: 'ДФО'
  },
  'RU-YEV': {
    code: 'RU-YEV',
    title: 'Еврейская автономная область',
    type: 'автономная область',
    federalDistrict: 'ДФО'
  },
  'RU-SA': {
    code: 'RU-SA',
    title: 'Республика Саха (Якутия)',
    type: 'республика',
    federalDistrict: 'ДФО'
  },
  'RU-KAM': {
    code: 'RU-KAM',
    title: 'Камчатский край',
    type: 'край',
    federalDistrict: 'ДФО'
  },
  'RU-PRI': {
    code: 'RU-PRI',
    title: 'Приморский край',
    type: 'край',
    federalDistrict: 'ДФО'
  },
  'RU-KHA': {
    code: 'RU-KHA',
    title: 'Хабаровский край',
    type: 'край',
    federalDistrict: 'ДФО'
  },
  'RU-CHU': {
    code: 'RU-CHU',
    title: 'Чукотский автономный округ',
    type: 'автономный округ',
    federalDistrict: 'ДФО'
  },

  // Новые регионы (2022)
  'RU-DON': {
    code: 'RU-DON',
    title: 'Донецкая Народная Республика',
    type: 'республика',
    federalDistrict: 'ЮФО'
  },
  'RU-LUG': {
    code: 'RU-LUG',
    title: 'Луганская Народная Республика',
    type: 'республика',
    federalDistrict: 'ЮФО'
  },
  'RU-ZP': {
    code: 'RU-ZP',
    title: 'Запорожская область',
    type: 'область',
    federalDistrict: 'ЮФО'
  },
  'RU-HR': {
    code: 'RU-HR',
    title: 'Херсонская область',
    type: 'область',
    federalDistrict: 'ЮФО'
  }
};

/**
 * Массив всех кодов регионов
 */
export const REGION_CODES: RegionCode[] = Object.keys(RUSSIA_REGIONS) as RegionCode[];

/**
 * Получить информацию о регионе по коду
 */
export const getRegionInfo = (code: RegionCode): RegionInfo | undefined => {
  return RUSSIA_REGIONS[code];
};

/**
 * Получить название региона по коду
 */
export const getRegionTitle = (code: RegionCode): string => {
  return RUSSIA_REGIONS[code]?.title || code;
};

/**
 * Получить регионы по федеральному округу
 */
export const getRegionsByFederalDistrict = (district: RegionInfo['federalDistrict']): RegionInfo[] => {
  return Object.values(RUSSIA_REGIONS).filter(region => region.federalDistrict === district);
};

/**
 * Получить регионы по типу
 */
export const getRegionsByType = (type: RegionInfo['type']): RegionInfo[] => {
  return Object.values(RUSSIA_REGIONS).filter(region => region.type === type);
};

/**
 * Поиск регионов по названию
 */
export const searchRegions = (query: string): RegionInfo[] => {
  const lowerQuery = query.toLowerCase();
  return Object.values(RUSSIA_REGIONS).filter(region => 
    region.title.toLowerCase().includes(lowerQuery) ||
    region.code.toLowerCase().includes(lowerQuery)
  );
};

/**
 * Проверить, является ли код валидным кодом региона
 */
export const isValidRegionCode = (code: string): code is RegionCode => {
  return code in RUSSIA_REGIONS;
};

/**
 * Простая функция для генерации псевдослучайных чисел с seed
 */
const seededRandom = (seed: number): number => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

/**
 * Генерирует стабильные температурные данные для всех регионов
 * @param seed - Начальное значение для генерации (по умолчанию 12345)
 * @returns Объект с температурами для каждого региона
 */
export const generateStableTemperatureData = (seed: number = 12345): Record<RegionCode, number> => {
  const data: Record<RegionCode, number> = {} as Record<RegionCode, number>;
  let currentSeed = seed;
  
  REGION_CODES.forEach(regionCode => {
    currentSeed++;
    // Генерируем температуру в диапазоне от -30 до +30
    const temperature = Math.round((seededRandom(currentSeed) - 0.5) * 60);
    data[regionCode] = temperature;
  });
  
  return data;
};
