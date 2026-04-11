-- =====================================================
-- Миграция: Добавление полей статуса для async обработки
-- Версия: 02
-- Дата: 2025-11-04
-- =====================================================

-- Добавляем новые колонки для отслеживания статуса обработки
ALTER TABLE queries 
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS error_message TEXT,
  ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS processing_completed_at TIMESTAMP;

-- Делаем колонку answer nullable (теперь answer заполняется асинхронно)
ALTER TABLE queries ALTER COLUMN answer DROP NOT NULL;

-- Обновляем существующие записи (если есть) - ставим статус completed
UPDATE queries 
SET status = 'completed', 
    processing_completed_at = created_at
WHERE status IS NULL OR status = 'pending';

-- Делаем колонку status NOT NULL после обновления существующих записей
ALTER TABLE queries 
  ALTER COLUMN status SET NOT NULL;

-- Создаем индекс для быстрого поиска по статусу
CREATE INDEX IF NOT EXISTS idx_queries_status ON queries(status);

-- Создаем индекс для поиска по uid и статусу (для polling)
CREATE INDEX IF NOT EXISTS idx_queries_uid_status ON queries(uid, status);

-- Добавляем комментарии для документации
COMMENT ON COLUMN queries.status IS 'Статус обработки: pending, processing, completed, failed';
COMMENT ON COLUMN queries.error_message IS 'Сообщение об ошибке (если status = failed)';
COMMENT ON COLUMN queries.processing_started_at IS 'Время начала обработки в Brama';
COMMENT ON COLUMN queries.processing_completed_at IS 'Время завершения обработки';

-- Добавляем constraint для валидации статуса (только если его еще нет)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_query_status'
  ) THEN
    ALTER TABLE queries 
      ADD CONSTRAINT check_query_status 
      CHECK (status IN ('pending', 'processing', 'completed', 'failed'));
  END IF;
END $$;

-- Вывод информации
DO $$
BEGIN
  RAISE NOTICE '✅ Миграция 02: Поля статуса добавлены успешно!';
  RAISE NOTICE '📊 Добавлены колонки: status, error_message, processing_started_at, processing_completed_at';
  RAISE NOTICE '📑 Созданы индексы: idx_queries_status, idx_queries_uid_status';
  RAISE NOTICE '🔒 Добавлен constraint: check_query_status';
END $$;


