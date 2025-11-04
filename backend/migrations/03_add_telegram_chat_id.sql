-- Migration: Add telegram_chat_id field and create technical telegram user
-- This migration adds support for Telegram bot queries

-- Add telegram_chat_id column to queries table (nullable, as not all queries come from Telegram)
ALTER TABLE queries 
ADD COLUMN telegram_chat_id BIGINT NULL;

-- Add index for faster lookups by telegram_chat_id
CREATE INDEX idx_queries_telegram_chat_id ON queries(telegram_chat_id);

-- Create technical user for Telegram bot queries
-- This user will be used for all anonymous Telegram requests
INSERT INTO users (id, username, password_hash, role)
VALUES (
    -1,
    'telegram_bot',
    'NO_PASSWORD_TELEGRAM_BOT_USER',
    'system'
)
ON CONFLICT (id) DO NOTHING;

-- Add comment to the column
COMMENT ON COLUMN queries.telegram_chat_id IS 'Telegram chat ID for bot notifications (NULL for web queries)';

