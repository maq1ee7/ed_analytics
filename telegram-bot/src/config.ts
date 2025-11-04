import * as dotenv from 'dotenv';

dotenv.config();

/**
 * Конфигурация Telegram бота
 */

// TODO: Change TELEGRAM_BOT_TOKEN before production deployment
export const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8576902445:AAFs5BEGoC44Lexn7VuLRAO6qFtFG4hp1Fs';

// TODO: Move whitelist to database or external config before production
// Временное решение: whitelist пользователей в коде
export const ALLOWED_USERNAMES = ['v_karlov', 'kochemirov'];

// Backend API configuration
export const BACKEND_URL = process.env.BACKEND_URL || 'http://backend:5000';
// TODO: Change TELEGRAM_BOT_API_KEY before production deployment
export const TELEGRAM_BOT_API_KEY = process.env.TELEGRAM_BOT_API_KEY || 'dev-telegram-bot-api-key-temp';

// Redis configuration for Bull queue
export const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
export const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10);

// Timeout for query processing (1 minute)
export const QUERY_TIMEOUT_MS = 60000;

// Dashboard base URL (production)
export const DASHBOARD_BASE_URL = process.env.DASHBOARD_BASE_URL || 'http://130.193.46.4';

