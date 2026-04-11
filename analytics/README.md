# ED Analytics

Этот каталог — **основной стек** в монорепозитории `ed_analytics` (backend, frontend, Brama, бот, Docker). Команды ниже выполняйте из **`analytics/`** (после клона: `cd ed_analytics/analytics`), если не указано иное. Отдельный проект **mcp_dashboard** лежит в корне репозитория рядом с `analytics/`.

### Тестовая учетная запись:
- **Логин:** testuser
- **Пароль:** password123

### Проверка версий

```bash
# Проверьте версии
docker --version          # Docker version 20.10+
docker compose version    # Docker Compose version v2.0+
node --version            # v18.0+ (для локальной разработки)
```

## 🚀 Быстрый старт

### Создание тестового пользователя

Для быстрого начала работы создайте тестового пользователя с демо-данными:

```bash
# Локально (после docker-compose up -d)
./scripts/create-test-user.sh

# На удаленном сервере
./scripts/create-test-user-remote.sh
```

**Созданный пользователь:**
- **Логин:** `testuser`
- **Пароль:** `password123`
- **Данные:** 3 готовых дашборда с графиками

### Локальная разработка фронтенда

```bash
# Клонируем проект
git clone <repository-url>
cd ed_analytics/analytics
./scripts/start-front-local.sh


# Приложение будет доступно по адресу:
# Frontend: http://localhost:3000
```

### Продакшн на сервере

```bash
# 1. Скопируйте .env файл на сервер
scp -i ~/.ssh/llm-cpu/appuser-ed25519 .env appuser@130.193.46.4:~/ed_analytics/.env

# Проверьте что файл скопировался:
ssh -i ~/.ssh/llm-cpu/appuser-ed25519 appuser@130.193.46.4 "ls -lh ~/ed_analytics/.env"

# 2. Запустите деплой
./scripts/deploy-fast.sh

# Приложение будет доступно по адресам:
# Frontend: http://130.193.46.4
# Backend API: http://130.193.46.4:5000
```

**⚠️ ВАЖНО:** Файл `.env` **не копируется автоматически** скриптами деплоя (для безопасности).
Его нужно копировать вручную командой выше.

## 🔐 Настройка переменных окружения (.env)

### Создание .env файла

```bash
# 1. Скопируйте шаблон
cp .env.example .env

# 2. Отредактируйте значения
nano .env
```

### Копирование .env на сервер

```bash
# Команда для копирования .env на продакшн сервер:
scp -i ~/.ssh/llm-cpu/appuser-ed25519 .env appuser@130.193.46.4:~/ed_analytics/.env

# Проверка:
ssh -i ~/.ssh/llm-cpu/appuser-ed25519 appuser@130.193.46.4 "ls -lh ~/ed_analytics/.env && head -5 ~/ed_analytics/.env"
```

### Что хранится в .env

- **Пароли БД** (PostgreSQL, Neo4j)
- **JWT секреты** для аутентификации
- **API ключи** для межсервисного взаимодействия
- **Telegram Bot Token**
- **URLs** и настройки сервисов

**📖 Подробная документация:** 
- [SECRETS_SUMMARY.txt](./SECRETS_SUMMARY.txt) - Краткая сводка
- [ENV_SETUP_RU.md](./ENV_SETUP_RU.md) - Полная инструкция
- [SECRETS_QUICK_START.md](./SECRETS_QUICK_START.md) - Быстрый старт

## 🏗️ Архитектура

### Диаграмма системы

```
┌─────────────┐         ┌──────────────────┐         ┌─────────────────┐
│   Frontend  │         │   Backend (API)  │         │     Brama       │
│ (порт 3000) │────────>│   (порт 5000)    │────────>│  (порт 5001)    │
└─────────────┘         └────────┬─────────┘         └────────┬────────┘
                                 │                            │
                        ┌────────▼────────┐         ┌────────▼────────┐
                        │   PostgreSQL    │         │   Redis/Bull    │
                        │   (порт 5432)   │         │  (порт 6379)    │
                        └─────────────────┘         └────────┬────────┘
                                                              │
                        ┌─────────────────────────────────────▼────────┐
                        │              Telegram Bot                     │
                        │  (получает уведомления через Bull Queue)     │
                        └───────────────────┬───────────────────────────┘
                                           │
                                    ┌──────▼──────┐
                                    │   Telegram  │
                                    │    Users    │
                                    └─────────────┘
```

### Технологический стек

**Frontend:**
- React 18 + TypeScript
- Vite 5.x
- TailwindCSS 3.x (utility-first CSS)
- React Router (маршрутизация)
- Axios (HTTP клиент с авто-обновлением токенов)
- Chart.js + React-ChartJS-2 (графики и диаграммы)

**Backend (API):**
- Node.js 18+ + Express.js
- TypeScript 5.x
- PostgreSQL 15 (база данных)
- JWT авторизация (access + refresh токены)
- bcrypt (хеширование паролей)
- CORS + Helmet (безопасность)
- Axios (HTTP клиент для Brama)

**Brama (LLM Processing):**
- Node.js 18+ + Express.js
- TypeScript 5.x
- Bull (очередь задач)
- Redis 7 (хранилище очереди)
- Bull Board (мониторинг очереди)

**Telegram Bot:**
- Node.js 18+ + Telegraf
- TypeScript 5.x
- Bull (получение уведомлений из очереди)
- Redis 7 (подписка на уведомления)
- Axios (HTTP клиент для Backend API)

**DevOps:**
- Docker + Docker Compose v2
- Nginx Alpine (продакшн reverse proxy)
- Health checks для мониторинга

### Асинхронная обработка запросов

Система использует асинхронную архитектуру для обработки пользовательских запросов:

1. **Frontend** отправляет запрос → **Backend (API)**
2. **Backend** создает задачу в БД (status: pending) → отправляет в **Brama**
3. **Brama** добавляет задачу в **Redis Queue** → возвращает control
4. **Frontend** начинает **polling** статуса через Backend API
5. **Brama Worker** обрабатывает задачу (LLM генерация) → отправляет результат в Backend
6. **Backend** сохраняет результат → Frontend получает через polling

**Преимущества:**
- ✅ Не блокирует HTTP соединения
- ✅ Масштабируемая обработка (несколько workers)
- ✅ Отказоустойчивость (задачи в Redis)
- ✅ Мониторинг через Bull Board UI

### Структура проекта

```
ed_analytics/
├── frontend/                   # React приложение
│   ├── src/
│   │   ├── components/
│   │   │   ├── charts/              # Компоненты графиков
│   │   │   │   ├── LinearChart.tsx           # Линейный график
│   │   │   │   ├── FederalSharesChart.tsx    # График долей по округам
│   │   │   │   ├── RadarChart.tsx            # Радарная диаграмма
│   │   │   │   └── RussiaInteractiveMap.tsx  # Интерактивная карта России
│   │   │   ├── Dashboard/
│   │   │   │   └── ChartsGrid.tsx            # Сетка графиков
│   │   │   ├── ProtectedRoute.tsx            # Защищенные роуты
│   │   │   └── QueriesHistory.tsx            # История запросов
│   │   ├── contexts/
│   │   │   └── AuthContext.tsx               # Контекст авторизации
│   │   ├── pages/
│   │   │   ├── DashboardPage.tsx             # Главная страница с графиками
│   │   │   ├── LoginPage.tsx                 # Страница входа
│   │   │   └── QueryPage.tsx                 # Страница запросов
│   │   ├── types/
│   │   │   ├── auth.ts                       # Типы авторизации
│   │   │   └── charts.ts                     # Типы для графиков
│   │   ├── utils/
│   │   │   ├── api.ts                        # API клиент
│   │   │   └── mockDataGenerators.ts         # Генераторы тестовых данных
│   │   ├── App.tsx                           # Главный компонент
│   │   ├── main.tsx                          # Точка входа
│   │   ├── index.css                         # Глобальные стили
│   │   └── vite-env.d.ts                     # Vite типы
│   ├── public/
│   │   └── vite.svg                          # Статические файлы
│   ├── Dockerfile                            # Docker образ для frontend
│   ├── nginx.conf                            # Конфигурация Nginx
│   ├── package.json                          # Зависимости frontend
│   ├── tailwind.config.js                    # Конфигурация TailwindCSS
│   ├── vite.config.ts                        # Конфигурация Vite
│   └── .env                                  # Переменные окружения (API URL)
│
├── backend/                    # Express API
│   ├── src/
│   │   ├── middleware/
│   │   │   └── auth.ts                       # Middleware авторизации
│   │   ├── models/
│   │   │   ├── User.ts                       # Модель пользователя
│   │   │   └── Query.ts                      # Модель запросов (с async статусами)
│   │   ├── routes/
│   │   │   ├── auth.ts                       # Роуты авторизации
│   │   │   └── queries.ts                    # Роуты запросов + callbacks
│   │   ├── types/
│   │   │   └── auth.ts                       # TypeScript типы
│   │   ├── utils/
│   │   │   ├── database.ts                   # Подключение к БД
│   │   │   ├── jwt.ts                        # JWT утилиты
│   │   │   ├── migrations.ts                 # Система миграций
│   │   │   ├── responseGenerator.ts          # Генератор ответов
│   │   │   └── dashboardGenerator.ts         # Mock генератор дашбордов
│   │   └── server.ts                         # Express сервер
│   ├── migrations/
│   │   ├── 01_init_database.sql              # Инициализация БД
│   │   └── 02_add_query_status.sql           # Добавление полей статуса
│   ├── data/
│   │   └── dashboardExample.json             # Mock данные для дашбордов
│   ├── Dockerfile                            # Docker образ для backend
│   ├── package.json                          # Зависимости backend
│   └── tsconfig.json                         # Конфигурация TypeScript
│
├── brama/                      # LLM Processing Backend
│   ├── src/
│   │   ├── server.ts                         # Express сервер + Bull Board
│   │   ├── routes/
│   │   │   └── process.ts                    # POST /api/process
│   │   ├── middleware/
│   │   │   └── apiKeyAuth.ts                 # Проверка API ключа
│   │   ├── services/
│   │   │   └── queueService.ts               # Bull Queue управление
│   │   ├── workers/
│   │   │   └── taskProcessor.ts              # Worker обработки задач
│   │   ├── utils/
│   │   │   ├── dashboardGenerator.ts         # Mock LLM генератор
│   │   │   └── callbackSender.ts             # Отправка результатов
│   │   └── types/
│   │       └── index.ts                      # TypeScript типы
│   ├── data/
│   │   └── dashboardExample.json             # Mock данные
│   ├── Dockerfile                            # Docker образ для brama
│   ├── package.json                          # Зависимости brama
│   ├── tsconfig.json                         # Конфигурация TypeScript
│   └── README.md                             # Документация Brama
│
├── telegram-bot/              # Telegram Bot
│   ├── src/
│   │   ├── bot.ts                            # Главный файл бота (Telegraf)
│   │   ├── config.ts                         # Конфигурация (токен, whitelist)
│   │   ├── services/
│   │   │   ├── apiService.ts                 # Вызовы Backend API
│   │   │   └── redisService.ts               # Bull Queue подписка
│   │   └── types/
│   │       └── index.ts                      # TypeScript типы
│   ├── Dockerfile                            # Docker образ для telegram-bot
│   ├── package.json                          # Зависимости telegram-bot
│   ├── tsconfig.json                         # Конфигурация TypeScript
│   └── README.md                             # Документация бота
│
├── scripts/                    # Скрипты автоматизации
│   ├── deploy.sh                             # Полный деплой на сервер
│   ├── deploy-fast.sh                        # Быстрый деплой (rsync)
│   ├── start-local.sh                        # Локальный запуск всего стека
│   ├── start-front-local.sh                  # Запуск только фронтенда
│   ├── create-test-user.sh                   # Создание тестового пользователя (локально)
│   ├── create-test-user.ts                   # TypeScript скрипт для создания данных
│   └── create-test-user-remote.sh            # Создание тестового пользователя (на сервере)
│
├── docker-compose.yml          # Локальная разработка
├── docker-compose.prod.yml     # Продакшн конфигурация
├── config.example.sh           # Пример конфигурации
└── README.md                   # Документация
```

### Конфигурация API

Для настройки подключения к бэкенду создайте файл `frontend/.env`:

```bash
# Для подключения к реальному бэкенду (продакшн)
VITE_API_URL=http://130.193.46.4:5000

# Для локальной разработки
# VITE_API_URL=http://localhost:5000

# Дополнительные настройки
VITE_APP_TITLE=ED Analytics
VITE_APP_VERSION=1.0.0
```

## 📡 API Endpoints

### Backend (Express - порт 5000)

**Публичные endpoints:**
- `POST /api/auth/login` - Авторизация пользователя
- `POST /api/auth/refresh` - Обновление access токена
- `GET /health` - Проверка здоровья сервиса
- `GET /api/queries/:uid` - Получение дашборда по UID (публичная ссылка)

**Защищенные endpoints (требуют авторизации):**
- `GET /api/hello` - Тестовый endpoint
- `POST /api/auth/logout` - Выход из системы
- `GET /api/auth/me` - Информация о текущем пользователе
- `POST /api/queries` - Создание нового запроса (асинхронный)
- `GET /api/queries` - История запросов пользователя
- `GET /api/queries/status/:uid` - Проверка статуса запроса (polling)

**Защищенные endpoints (только для Brama, требуют API ключ):**
- `POST /api/callbacks/:uid` - Получение результатов от Brama

**Защищенные endpoints (только для Telegram Bot, требуют API ключ):**
- `POST /api/queries/telegram` - Создание запроса от Telegram бота

### Brama (LLM Processing - порт 5001)

**Защищенные endpoints (требуют API ключ):**
- `POST /api/process` - Добавление задачи в очередь обработки
- `GET /health` - Проверка здоровья + статистика очереди

**Dev режим (без авторизации):**
- `GET /admin/queues` - Bull Board UI (мониторинг очереди)

### Фронтенд маршруты

- `/login` - Страница авторизации (публичная)
- `/dashboard` - Главная страница с дашбордами (защищенная)
- `/query` - Страница создания запроса (защищенная)

### Проверка логов

```bash
# Локально
docker-compose logs backend
docker-compose logs brama
docker-compose logs telegram-bot
docker-compose logs frontend
docker-compose logs redis

# На сервере
docker-compose -f docker-compose.prod.yml logs backend
docker-compose -f docker-compose.prod.yml logs brama
docker-compose -f docker-compose.prod.yml logs telegram-bot
docker-compose -f docker-compose.prod.yml logs frontend
```

## 🔧 Дополнительные инструменты

### Создание тестовых данных

Скрипт `create-test-user.sh` автоматически создает:
- ✅ Тестового пользователя с безопасным паролем (bcrypt)
- ✅ 3 готовых запроса со статусом `completed`
- ✅ Полные дашборды с реальными данными
- ✅ Уникальные UUID для каждого дашборда

**Использование:**

```bash
# Локально
./scripts/create-test-user.sh

# На удаленном сервере
./scripts/create-test-user-remote.sh
```

**Учетные данные:**
```
Логин:  testuser
Пароль: password123
```

**Что создается:**
- Dashboard #1: "Покажи статистику по образованию в регионах России"
- Dashboard #2: "Какие тренды наблюдаются в системе образования?"
- Dashboard #3: "Анализ динамики показателей по годам"

Каждый дашборд содержит:
- 📊 Линейный график (динамика по годам)
- 🗺️ Интерактивную карту России (все регионы)
- 📈 Радарную диаграмму (6 показателей)
- 📉 График долей по федеральным округам

### Bull Board UI (мониторинг очереди)

В **development** режиме доступен веб-интерфейс для мониторинга очереди задач:

**URL:** `http://localhost:5001/admin/queues`

**Возможности:**
- Просмотр активных задач
- Просмотр завершенных задач
- Просмотр failed задач
- Retry failed задач
- Очистка очереди

### Environment Variables

#### Backend (API)
```bash
NODE_ENV=development
PORT=5000
DB_HOST=postgres
DB_PORT=5432
DB_NAME=ed_analytics
DB_USER=ed_user
DB_PASSWORD=ed_password
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-key
BACKEND_CORE_URL=http://brama:5001
BACKEND_CORE_API_KEY=your-api-key
```

#### Brama
```bash
NODE_ENV=development
PORT=5001
REDIS_HOST=redis
REDIS_PORT=6379
ALLOWED_API_KEY=your-api-key
BACKEND_URL=http://backend:5000
MOCK_PROCESSING_TIME=15000
WORKER_CONCURRENCY=2
```

#### Telegram Bot
```bash
NODE_ENV=development
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
TELEGRAM_BOT_API_KEY=your-bot-api-key
BACKEND_URL=http://backend:5000
REDIS_HOST=redis
REDIS_PORT=6379
DASHBOARD_BASE_URL=http://130.193.46.4
```

## 🔄 Workflow обработки запроса

### Web интерфейс (Frontend)

1. **Пользователь отправляет вопрос** через QueryPage
2. **Frontend** → POST `/api/queries` → **Backend**
3. **Backend** создает запись в БД (status: pending) → отправляет в **Brama**
4. **Brama** добавляет задачу в **Redis Queue** → возвращает контроль
5. **Frontend** начинает **polling** → GET `/api/queries/status/:uid`
6. **Brama Worker** обрабатывает задачу (15 сек mock, будет заменено на LLM)
7. **Brama** отправляет результат → POST `/api/callbacks/:uid` → **Backend**
8. **Backend** сохраняет результат в БД (status: completed)
9. **Frontend** получает результат через polling → перенаправляет на дашборд

### Telegram Bot

1. **Пользователь отправляет сообщение** → **Telegram Bot**
2. **Bot** проверяет whitelist → отправляет "⏳ Обрабатываю запрос..."
3. **Bot** → POST `/api/queries/telegram` → **Backend**
4. **Backend** создает запись в БД (status: pending, telegram_chat_id) → отправляет в **Brama**
5. **Brama** обрабатывает задачу (15 сек mock)
6. **Brama** → POST `/api/callbacks/:uid` → **Backend**
7. **Backend** сохраняет результат + публикует уведомление в **Bull Queue**
8. **Telegram Bot** получает уведомление из очереди
9. **Bot** отправляет пользователю ссылку: "✅ Дашборд готов! 🔗 [ссылка]"

## 📚 Дополнительная документация

- [Brama README](./brama/README.md) - Подробная документация по Brama (LLM Processing Backend)
- [Telegram Bot README](./telegram-bot/README.md) - Документация по Telegram боту
- [Frontend документация](./frontend/README.md) - Структура и компоненты фронтенда
- [Backend документация](./backend/README.md) - API и модели бэкенда

## 🐛 Troubleshooting

### Brama недоступен

Если Backend не может подключиться к Brama:

```bash
# Проверка статуса
docker-compose ps brama

# Проверка логов
docker-compose logs brama

# Проверка health
curl http://localhost:5001/health
```

### Redis проблемы

Если очередь не работает:

```bash
# Проверка Redis
docker-compose ps redis

# Тест подключения
docker-compose exec redis redis-cli ping
# Должен вернуть: PONG
```

### Задачи застряли в очереди

1. Откройте Bull Board: `http://localhost:5001/admin/queues`
2. Проверьте failed задачи
3. Retry или очистите очередь

## 🚀 Roadmap

- [x] Базовая архитектура Frontend + Backend
- [x] JWT авторизация
- [x] Интерактивные графики (Chart.js)
- [x] Карта России (SVG)
- [x] Асинхронная обработка с Brama + Redis
- [x] Bull Board UI для мониторинга
- [ ] Интеграция с реальным LLM (OpenAI/Claude)
- [ ] WebSocket для real-time обновлений
- [ ] Кэширование результатов
- [ ] Rate limiting
- [ ] Метрики Prometheus + Grafana
- [ ] CI/CD pipeline

## 📄 License

ISC