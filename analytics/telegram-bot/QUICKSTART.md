# Быстрый старт Telegram Bot

## Первый запуск

### 1. Проверьте переменные окружения

Убедитесь, что в `docker-compose.yml` установлены правильные значения:

```yaml
telegram-bot:
  environment:
    - TELEGRAM_BOT_TOKEN=8576902445:AAFs5BEGoC44Lexn7VuLRAO6qFtFG4hp1Fs
    - TELEGRAM_BOT_API_KEY=dev-telegram-bot-api-key-temp
    - BACKEND_URL=http://backend:5000
    - REDIS_HOST=redis
    - REDIS_PORT=6379
    - DASHBOARD_BASE_URL=http://130.193.46.4
```

### 2. Запустите весь стек

```bash
cd /Users/vlad-karlov/work/ed_analytics
docker-compose up -d
```

### 3. Проверьте статус

```bash
docker-compose ps telegram-bot
```

### 4. Проверьте логи

```bash
docker-compose logs -f telegram-bot
```

Вы должны увидеть:
```
[TelegramBot] Initializing bot...
[RedisService] Connecting to Redis at redis:6379
[RedisService] Subscribed to telegram-notifications queue
[TelegramBot] Bot initialized successfully
[TelegramBot] Starting bot...
[TelegramBot] Bot is running! Press Ctrl+C to stop.
```

### 5. Тестирование

1. Откройте Telegram
2. Найдите [@brama_dev_bot](https://t.me/brama_dev_bot)
3. Отправьте любой текстовый вопрос
4. Получите ответ "⏳ Обрабатываю запрос..."
5. Через ~15 секунд получите ссылку на дашборд

## Только миграция БД

Если вам нужно только применить миграцию без запуска всего стека:

```bash
# Запустите только PostgreSQL
docker-compose up -d postgres

# Подождите, пока БД запустится (10-15 сек)
sleep 15

# Миграция применится автоматически при запуске backend
docker-compose up -d backend
```

## Локальная разработка (без Docker)

### 1. Установите зависимости

```bash
cd telegram-bot
npm install
```

### 2. Создайте .env файл

```bash
TELEGRAM_BOT_TOKEN=8576902445:AAFs5BEGoC44Lexn7VuLRAO6qFtFG4hp1Fs
TELEGRAM_BOT_API_KEY=dev-telegram-bot-api-key-temp
BACKEND_URL=http://localhost:5000
REDIS_HOST=localhost
REDIS_PORT=6379
DASHBOARD_BASE_URL=http://130.193.46.4
```

### 3. Убедитесь, что Redis и Backend запущены

```bash
docker-compose up -d redis backend
```

### 4. Запустите бота в dev режиме

```bash
npm run dev
```

## Troubleshooting

### Бот не отвечает

1. Проверьте, что бот запущен:
```bash
docker-compose ps telegram-bot
```

2. Проверьте логи на ошибки:
```bash
docker-compose logs telegram-bot
```

### Не приходят уведомления

1. Проверьте Redis:
```bash
docker-compose ps redis
docker-compose exec redis redis-cli ping
```

2. Проверьте Bull Board: http://localhost:5001/admin/queues
   - Убедитесь, что очередь `telegram-notifications` существует
   - Проверьте, есть ли failed jobs

3. Проверьте логи backend:
```bash
docker-compose logs backend | grep "Telegram notification"
```

### Ошибка "User not allowed"

Пользователь не в whitelist. Добавьте username в `telegram-bot/src/config.ts`:

```typescript
export const ALLOWED_USERNAMES = ['v_karlov', 'kochemirov', 'your_username'];
```

Пересоберите контейнер:
```bash
docker-compose up -d --build telegram-bot
```

## Production checklist

Перед деплоем на продакшн:

- [ ] Изменить `TELEGRAM_BOT_TOKEN` на продакшен токен
- [ ] Изменить `TELEGRAM_BOT_API_KEY` на надежный ключ
- [ ] Перенести whitelist из кода в БД/конфиг
- [ ] Обновить `DASHBOARD_BASE_URL` на продакшен URL
- [ ] Настроить мониторинг и алерты

