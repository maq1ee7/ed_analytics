import { Pool } from 'pg';

// Создание подключения к базе данных
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'ed_analytics',
  user: process.env.DB_USER || 'ed_user',
  password: process.env.DB_PASSWORD || 'ed_password',
  max: 20, // максимальное количество соединений в пуле
  idleTimeoutMillis: 30000, // время ожидания неактивного соединения
  connectionTimeoutMillis: 2000, // время ожидания подключения
});

// Обработка ошибок подключения
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Функция для выполнения запросов
export const query = async (text: string, params?: any[]) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Database query executed', { text: text.substring(0, 100), duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Database query error', { text: text.substring(0, 100), error });
    throw error;
  }
};

// Функция для получения клиента для транзакций
export const getClient = () => pool.connect();

// Функция для завершения всех соединений
export const end = () => pool.end();

export default pool;
