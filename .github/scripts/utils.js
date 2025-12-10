/**
 * Utility functions for GitHub Actions + Google Sheets integration
 */

const config = require('./config');

/**
 * Извлекает Task ID из текста PR
 * Поддерживаемые форматы:
 * - "Task ID: IT-48"
 * - "IT-48"
 * - "#IT-48"
 *
 * @param {string} text - Текст PR описания
 * @returns {Object|null} - {taskId: "IT-48", rowNumber: "48"} или null
 */
function extractTaskId(text) {
  if (!text || typeof text !== 'string') {
    return null;
  }

  // Паттерны для поиска Task ID
  const patterns = [
    /(?:Task\s*ID\s*:?\s*)?IT-(\d+)/i,
    /#IT-(\d+)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const rowNumber = match[1];
      const taskId = `IT-${rowNumber}`;
      return { taskId, rowNumber };
    }
  }

  return null;
}

/**
 * Извлекает номер строки из Task ID
 * @param {string} taskId - Task ID в формате "IT-48"
 * @returns {string|null} - Номер строки ("48") или null
 */
function extractRowNumber(taskId) {
  if (!taskId || typeof taskId !== 'string') {
    return null;
  }

  const match = taskId.match(/IT-(\d+)/i);
  return match ? match[1] : null;
}

/**
 * Форматирует ссылку на PR для записи в Google Sheets
 * @param {string} prNumber - Номер PR
 * @param {string} prUrl - URL PR
 * @returns {string} - Отформатированная ссылка
 */
function formatPrLink(prNumber, prUrl) {
  // Простой формат: только URL
  return prUrl;

  // Альтернативный формат с гиперссылкой в Google Sheets:
  // return `=HYPERLINK("${prUrl}", "PR #${prNumber}")`;
}

/**
 * Создает ссылку на Google Sheets с прямым переходом к строке
 * @param {string} sheetId - ID Google Sheets
 * @param {string} rowNumber - Номер строки
 * @returns {string} - URL с range параметром
 */
function createSheetLinkWithRange(sheetId, rowNumber) {
  return `https://docs.google.com/spreadsheets/d/${sheetId}/edit#gid=0&range=${rowNumber}:${rowNumber}`;
}

/**
 * Извлекает Google Sheets ID из URL
 * @param {string} url - URL Google Sheets
 * @returns {string|null} - Sheet ID или null
 */
function extractSheetsIdFromUrl(url) {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

/**
 * Валидирует Task ID
 * @param {string} taskId - Task ID для валидации
 * @returns {boolean} - true если валидный
 */
function isValidTaskId(taskId) {
  return /^IT-\d+$/i.test(String(taskId));
}

/**
 * Валидирует номер строки
 * @param {string|number} rowNumber - Номер строки
 * @returns {boolean} - true если валидный
 */
function isValidRowNumber(rowNumber) {
  const num = parseInt(rowNumber, 10);
  // Строка должна быть >= 2 (первая строка - заголовки)
  return !isNaN(num) && num >= 2;
}

/**
 * Форматирует дату для комментариев
 * @param {Date} date - Дата для форматирования
 * @returns {string} - Отформатированная дата
 */
function formatDate(date = new Date()) {
  return new Intl.DateTimeFormat('ru-RU', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

module.exports = {
  extractTaskId,
  extractRowNumber,
  formatPrLink,
  createSheetLinkWithRange,
  extractSheetsIdFromUrl,
  isValidTaskId,
  isValidRowNumber,
  formatDate,
};
