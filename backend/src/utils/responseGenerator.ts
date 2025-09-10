// Утилита для генерации случайных ответов

const RESPONSE_TEMPLATES = [
  'По данным анализа, показатель составляет',
  'Согласно статистике, результат равен',
  'Исследование показывает значение',
  'Анализ данных указывает на цифру',
  'По результатам обработки получено',
  'Статистический анализ дает результат',
  'Вычисления показывают значение',
  'Обработка данных выявила показатель'
];

const NUMBERS = [
  '12,345', '67,890', '234,567', '89,123', '456,789',
  '23,456', '78,901', '345,678', '91,234', '567,890'
];

const UNITS = [
  'человек', 'учеников', 'студентов', 'участников', 'респондентов',
  'единиц', 'случаев', 'записей', 'объектов', 'пунктов'
];

// Генерация случайного ответа длиной ровно 50 символов
export const generateRandomResponse = (): string => {
  const template = RESPONSE_TEMPLATES[Math.floor(Math.random() * RESPONSE_TEMPLATES.length)];
  const number = NUMBERS[Math.floor(Math.random() * NUMBERS.length)];
  const unit = UNITS[Math.floor(Math.random() * UNITS.length)];
  
  let response = `${template} ${number} ${unit}`;
  
  // Подгоняем длину до 50 символов
  if (response.length < 50) {
    // Добавляем точки или пробелы
    response = response.padEnd(50, '.');
  } else if (response.length > 50) {
    // Обрезаем и добавляем троеточие
    response = response.substring(0, 47) + '...';
  }
  
  return response;
};
