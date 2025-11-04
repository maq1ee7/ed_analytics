# Telegram Bot - Сводка реализации

## ✅ Что сделано

### 1. Миграция БД (`backend/migrations/03_add_telegram_chat_id.sql`)
- Добавлено поле `telegram_chat_id BIGINT NULL` в таблицу `queries`
- Создан технический пользователь `telegram_bot` (id = -1) для анонимных запросов
- Добавлен индекс для быстрого поиска по `telegram_chat_id`

### 2. Backend обновления

**Модель Query (`backend/src/models/Query.ts`)**:
- Добавлена поддержка `telegram_chat_id` во всех методах
- Обновлены интерфейсы `Query` и `CreateQueryData`

**Сервис уведомлений (`backend/src/services/notificationQueue.ts`)**:
- Создан `NotificationQueueService` для работы с Bull queue
- Очередь `telegram-notifications` для отправки уведомлений боту
- 3 попытки retry с экспоненциальной задержкой (2s, 4s, 8s)

**API Routes (`backend/src/routes/queries.ts`)**:
- Новый endpoint `POST /api/queries/telegram` для создания запросов от бота
- Middleware `telegramBotAuth` для проверки API ключа
- Обновлен callback endpoint - публикует уведомления в Bull queue
- Добавлена обработка ошибок с уведомлениями в Telegram

**Dependencies (`backend/package.json`)**:
- Добавлен `bull` для работы с очередями

### 3. Telegram Bot сервис (`telegram-bot/`)

**Структура:**
```
telegram-bot/
├── src/
│   ├── bot.ts              # Главный файл с Telegraf
│   ├── config.ts           # Конфигурация (токен, whitelist)
│   ├── services/
│   │   ├── apiService.ts   # Вызовы Backend API
│   │   └── redisService.ts # Bull Queue подписка
│   └── types/
│       └── index.ts        # TypeScript типы
├── Dockerfile
├── package.json
├── tsconfig.json
├── README.md
└── QUICKSTART.md
```

**Функционал:**
- Проверка whitelist пользователей (@v_karlov, @kochemirov)
- Отправка запросов на Backend
- Получение уведомлений из Bull queue (Redis)
- Отправка ссылок на готовые дашборды
- Обработка ошибок и таймаутов (1 минута)
- Поддержка множественных запросов от одного пользователя

### 4. Docker Compose (`docker-compose.yml` и `docker-compose.prod.yml`)

**Добавлен сервис `telegram-bot`:**
- Зависит от Redis и Backend
- Подключен к Bull queue через Redis
- Environment переменные для токена и API ключей
- Memory limits: 256M max, 128M reserved

**Обновлен сервис `backend`:**
- Добавлены переменные `TELEGRAM_BOT_API_KEY`, `REDIS_HOST`, `REDIS_PORT`

**Production конфигурация (`docker-compose.prod.yml`):**
- Отдельные переменные окружения для продакшена
- TODO комментарии для замены токенов
- Resource limits для оптимизации памяти

### 5. Deploy скрипт (`scripts/deploy.sh`)

**Обновления:**
- Добавлен шаг 5: копирование файлов telegram-bot на сервер
- Обновлена структура папок (включает `telegram-bot/`)
- Добавлена информация о Telegram Bot в финальном сообщении
- Команда для проверки логов: `docker compose logs telegram-bot`
- Напоминание о замене токенов перед продакшеном

### 6. Документация

**Обновлен корневой README.md:**
- Добавлена диаграмма архитектуры с Telegram Bot
- Добавлен Telegram Bot в технологический стек
- Обновлена структура проекта
- Добавлены API endpoints для бота
- Добавлен Workflow для Telegram Bot
- Добавлены environment variables

**Создана документация бота:**
- `telegram-bot/README.md` - полная документация
- `telegram-bot/QUICKSTART.md` - быстрый старт

## 🔑 Важные TODO (перед продакшеном)

### Секреты (нужно заменить!)

1. **TELEGRAM_BOT_TOKEN** 
   - Текущий: `8576902445:AAFs5BEGoC44Lexn7VuLRAO6qFtFG4hp1Fs`
   - Где: `docker-compose.yml`, `telegram-bot/src/config.ts`

2. **TELEGRAM_BOT_API_KEY**
   - Текущий: `dev-telegram-bot-api-key-temp`
   - Где: `docker-compose.yml`, `backend/src/routes/queries.ts`, `telegram-bot/src/config.ts`

3. **Whitelist пользователей**
   - Текущий: хардкод в `telegram-bot/src/config.ts`
   - Нужно: перенести в БД или внешний конфиг

## 🚀 Как запустить

### Локальная разработка

```bash
# Остановите текущий стек (если запущен)
docker-compose down

# Запустите с пересборкой
docker-compose up -d --build

# Проверьте статус
docker-compose ps

# Проверьте логи бота
docker-compose logs -f telegram-bot
```

### Production деплой

```bash
# Используйте deploy.sh скрипт
./scripts/deploy.sh

# Или с полной пересборкой (без кэша)
FULL_REBUILD=true ./scripts/deploy.sh

# После деплоя проверьте логи на сервере
ssh -i ~/.ssh/your-key user@server
cd ed_analytics
docker compose -f docker-compose.prod.yml logs -f telegram-bot
```

### Применение миграции

Миграция применится автоматически при запуске backend контейнера.

### Тестирование

1. Откройте Telegram
2. Найдите бота: [@brama_dev_bot](https://t.me/brama_dev_bot)
3. Отправьте текстовый вопрос (от @v_karlov или @kochemirov)
4. Получите: "⏳ Обрабатываю запрос..."
5. Через ~15 секунд: "✅ Дашборд готов! 🔗 http://130.193.46.4/dashboard/{uuid}"

## 📊 Архитектура взаимодействия

```
Telegram User
     ↓
Telegram Bot (проверка whitelist)
     ↓
POST /api/queries/telegram (с API key)
     ↓
Backend (создает query с telegram_chat_id)
     ↓
Brama (обработка в Bull queue)
     ↓
Backend callback (сохраняет результат)
     ↓
Backend публикует в Bull queue "telegram-notifications"
     ↓
Telegram Bot (получает из очереди)
     ↓
Отправка ссылки пользователю
```

## 🔍 Мониторинг

### Проверка логов

```bash
# Все логи бота
docker-compose logs -f telegram-bot

# Логи Backend (уведомления)
docker-compose logs backend | grep "Telegram"

# Логи Redis
docker-compose logs redis
```

### Bull Board UI

URL: http://localhost:5001/admin/queues

Проверьте очередь `telegram-notifications`:
- Waiting jobs
- Active jobs
- Completed jobs
- Failed jobs (если есть - retry)

## ⚠️ Важные моменты

1. **Технический пользователь**: Все запросы от Telegram используют `user_id = -1`
2. **Nullable telegram_chat_id**: Не все запросы из Telegram, поле может быть NULL
3. **Bull Queue надежность**: Retry mechanism обеспечивает доставку уведомлений
4. **Whitelist временный**: Захардкожен в коде, нужно перенести в БД
5. **Timeout 1 минута**: Если обработка дольше - пользователю придет сообщение о таймауте

## 📝 Логи при успешном запуске

**Telegram Bot:**
```
[TelegramBot] Initializing bot...
[RedisService] Connecting to Redis at redis:6379
[RedisService] Subscribed to telegram-notifications queue
[TelegramBot] Bot initialized successfully
[TelegramBot] Starting bot...
[TelegramBot] Bot is running!
```

**Backend (при получении запроса от бота):**
```
[Backend] Created Telegram query {uuid} from chat {chatId}
[Backend] Telegram task {uuid} sent to Brama successfully
```

**Backend (при завершении обработки):**
```
[Backend] Task {uuid} marked as completed
[Backend] Telegram notification queued for chat {chatId}
```

**Telegram Bot (при отправке уведомления):**
```
[RedisService] Processing notification for chat {chatId}, uid: {uuid}, status: completed
[RedisService] Success notification sent to chat {chatId}
```

## 🎯 Следующие шаги (опционально)

- [ ] WebSocket вместо Bull queue для real-time
- [ ] Rate limiting для предотвращения спама
- [ ] Команды бота (/start, /help, /status)
- [ ] История запросов в боте (/history)
- [ ] Admin панель для управления whitelist
- [ ] Метрики и мониторинг (Prometheus)
- [ ] Логирование в ELK/Loki

