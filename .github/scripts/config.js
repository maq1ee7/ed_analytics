/**
 * Configuration for Google Sheets integration
 */

module.exports = {
  // Индексы колонок в Google Sheets (0-based)
  COLUMNS: {
    ID: 0,           // Колонка A - Task ID (IT-48)
    PR_LINK: 7,      // Колонка H - ссылка на PR
  },

  // Имя листа в Google Sheets
  SHEET_NAME: 'Задачи',

  // Паттерн для извлечения Task ID формата "IT-48"
  TASK_ID_PATTERN: /IT-(\d+)/i,

  // Google Sheets ID
  SHEETS_ID: '1QHfh9U-FVuP0OYUh-0RuYDL7DN8BorKVQAgrWklokuA',

  // Максимальное количество попыток обновления
  MAX_RETRIES: 3,

  // Таймаут для API запросов (ms)
  API_TIMEOUT: 10000,

  // Логирование
  DEBUG: process.env.DEBUG === 'true',
};
