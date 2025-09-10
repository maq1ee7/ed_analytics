-- Создание таблицы запросов пользователей
CREATE TABLE IF NOT EXISTS queries (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Создание индексов для оптимизации поиска
CREATE INDEX IF NOT EXISTS idx_queries_user_id ON queries(user_id);
CREATE INDEX IF NOT EXISTS idx_queries_created_at ON queries(created_at);
