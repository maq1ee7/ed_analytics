-- =====================================================
-- Инициализация базы данных ED Analytics
-- Создание всех таблиц с нуля
-- =====================================================

-- Таблица пользователей
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица запросов с дашбордами
CREATE TABLE IF NOT EXISTS queries (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    uid UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
    question TEXT NOT NULL,
    answer JSONB NOT NULL,
    dashboard_title VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Индексы для оптимизации
CREATE INDEX IF NOT EXISTS idx_queries_user_id ON queries(user_id);
CREATE INDEX IF NOT EXISTS idx_queries_created_at ON queries(created_at);
CREATE INDEX IF NOT EXISTS idx_queries_uid ON queries(uid);
CREATE INDEX IF NOT EXISTS idx_queries_answer_gin ON queries USING GIN (answer);

-- Комментарии для документации
COMMENT ON TABLE users IS 'Пользователи системы';
COMMENT ON TABLE queries IS 'Запросы пользователей с дашбордами';

COMMENT ON COLUMN queries.uid IS 'Уникальный идентификатор дашборда (UUID) для публичных ссылок';
COMMENT ON COLUMN queries.answer IS 'JSON данные дашборда в формате JSONB';
COMMENT ON COLUMN queries.dashboard_title IS 'Название дашборда (опционально)';

-- Вывод информации
DO $$
BEGIN
  RAISE NOTICE '✅ База данных ED Analytics инициализирована успешно!';
  RAISE NOTICE '📊 Созданы таблицы: users, queries';
  RAISE NOTICE '📑 Созданы индексы для оптимизации';
END $$;

