# Brama - LLM Processing Backend

**Brama** - это асинхронный сервис обработки запросов с помощью LLM для ED Analytics. Он отвечает за обработку запросов пользователей в фоновом режиме с использованием очереди задач Bull/Redis.

## 🏗️ Архитектура

```
┌─────────────┐         ┌──────────────────┐         ┌─────────────────┐
│   Backend   │         │      Redis       │         │     Brama       │
│  (порт 5000)│────────>│   (порт 6379)    │<────────│  (порт 5001)    │
└─────────────┘         └──────────────────┘         └─────────────────┘
      │                                                       │
      │                                                       │
      │  1. POST /api/process                                │
      │  { taskId, question, callbackUrl }                   │
      ├──────────────────────────────────────────────────────>│
      │                                                       │
      │                                            ┌──────────▼────────┐
      │                                            │  Bull Queue       │
      │                                            │  (task added)     │
      │                                            └──────────┬────────┘
      │                                                       │
      │                                            ┌──────────▼────────┐
      │                                            │  Worker Process   │
      │                                            │  (processing...)  │
      │                                            └──────────┬────────┘
      │                                                       │
      │  2. POST /api/callbacks/:taskId                      │
      │  { status: 'completed', result: {...} }              │
      │<──────────────────────────────────────────────────────┤
      │                                                       │
```

## 📦 Компоненты

### 1. **Express Server** (`src/server.ts`)
- HTTP сервер на порту 5001
- Обработка входящих запросов от Backend
- Интеграция с Bull Board UI (dev режим)

### 2. **Queue Service** (`src/services/queueService.ts`)
- Управление очередью задач Bull
- Подключение к Redis
- Мониторинг статистики очереди

### 3. **Task Processor** (`src/workers/taskProcessor.ts`)
- Worker для обработки задач из очереди
- Параллельная обработка (по умолчанию 2 задачи)
- Mock задержка 15 секунд (имитация LLM)
- Отправка результатов через callback

### 4. **API Routes** (`src/routes/process.ts`)
- `POST /api/process` - добавление задачи в очередь
- Защита API ключом

### 5. **Middleware** (`src/middleware/apiKeyAuth.ts`)
- Проверка API ключа для всех защищенных endpoints

### 6. **Utilities**
- `src/utils/dashboardGenerator.ts` - Mock генератор дашбордов
- `src/utils/callbackSender.ts` - Отправка результатов в Backend

## 🚀 Запуск

### Development режим

```bash
# Установка зависимостей
cd brama
npm install

# Запуск в dev режиме (с hot reload)
npm run dev
```

### Production режим

```bash
# Сборка TypeScript
npm run build

# Запуск production
npm start
```

### Docker

```bash
# Из корневой директории проекта
docker-compose up brama
```

## 🔧 Environment Variables

```bash
# Server
NODE_ENV=development          # development | production
PORT=5001                     # Порт сервера

# Redis
REDIS_HOST=redis              # Хост Redis
REDIS_PORT=6379               # Порт Redis

# Security
ALLOWED_API_KEY=your-secret-key  # API ключ для аутентификации

# Backend
BACKEND_URL=http://backend:5000  # URL основного backend для callbacks

# Processing
MOCK_PROCESSING_TIME=15000    # Время mock обработки (мс)
WORKER_CONCURRENCY=2          # Количество параллельных задач
```

## 📊 Bull Board UI

В **development** режиме доступен веб-интерфейс для мониторинга очереди:

**URL:** `http://localhost:5001/admin/queues`

### Возможности:
- ✅ Просмотр активных задач
- ✅ Просмотр завершенных задач
- ✅ Просмотр failed задач
- ✅ Retry failed задач
- ✅ Очистка очереди
- ✅ Статистика обработки

## 🔐 API Endpoints

### POST `/api/process`

Добавление задачи в очередь обработки.

**Требования:** API ключ в заголовке `X-API-Key`

**Request:**
```json
{
  "taskId": "uuid-task-id",
  "question": "Вопрос пользователя",
  "callbackUrl": "http://backend:5000/api/callbacks/:taskId"
}
```

**Response:**
```json
{
  "success": true,
  "taskId": "uuid-task-id",
  "message": "Task added to queue"
}
```

### GET `/health`

Проверка здоровья сервиса.

**Response:**
```json
{
  "status": "OK",
  "timestamp": "2025-11-04T12:00:00.000Z",
  "environment": "development",
  "queue": {
    "waiting": 0,
    "active": 1,
    "completed": 15,
    "failed": 0
  }
}
```

## 🔄 Workflow обработки задачи

1. **Backend отправляет задачу** → `POST /api/process`
2. **Brama добавляет в очередь** → Bull Queue
3. **Worker берет задачу** → Начинает обработку
4. **Mock LLM обработка** → 15 секунд задержка
5. **Генерация дашборда** → DashboardGenerator
6. **Отправка результата** → `POST {callbackUrl}`
7. **Backend сохраняет результат** → БД обновляется

## 🛠️ Разработка

### Структура проекта

```
brama/
├── src/
│   ├── server.ts              # Основной сервер
│   ├── routes/
│   │   └── process.ts         # POST /api/process
│   ├── middleware/
│   │   └── apiKeyAuth.ts      # Проверка API ключа
│   ├── services/
│   │   └── queueService.ts    # Bull Queue setup
│   ├── workers/
│   │   └── taskProcessor.ts   # Worker обработки
│   ├── utils/
│   │   ├── dashboardGenerator.ts  # Mock LLM генератор
│   │   └── callbackSender.ts      # Отправка callbacks
│   └── types/
│       └── index.ts           # TypeScript типы
├── data/
│   └── dashboardExample.json  # Mock данные
├── package.json
├── tsconfig.json
├── Dockerfile
└── README.md
```

### Добавление реального LLM

Для интеграции с реальным LLM (например, OpenAI GPT):

1. Установить зависимость:
```bash
npm install openai
```

2. Обновить `src/utils/dashboardGenerator.ts`:
```typescript
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

static async generateDashboard(question: string): Promise<DashboardData> {
  const completion = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      { role: "system", content: "Generate dashboard JSON..." },
      { role: "user", content: question }
    ]
  });
  
  // Парсинг ответа и формирование DashboardData
  return JSON.parse(completion.choices[0].message.content);
}
```

3. Добавить env переменную:
```bash
OPENAI_API_KEY=sk-...
```

## 📈 Мониторинг

### Логи

Brama выводит подробные логи для отладки:

```
[Queue] Adding task abc-123 to queue
[Worker] Processing task abc-123
[Worker] Question: Какая динамика...
[Worker] Simulating LLM processing for 15000ms
[Worker] Generating dashboard for task abc-123
[Worker] Sending success result for task abc-123
[Callback] Success: 200 OK
[Worker] Task abc-123 completed successfully
```

### Статистика очереди

Через `/health` endpoint или Bull Board UI:
- Количество задач в ожидании
- Активные задачи
- Завершенные задачи
- Failed задачи

## 🔧 Troubleshooting

### Проблема: Задачи не обрабатываются

**Решение:**
1. Проверьте подключение к Redis: `redis-cli ping`
2. Проверьте логи Brama: `docker-compose logs brama`
3. Откройте Bull Board: `http://localhost:5001/admin/queues`

### Проблема: Callback не доходит до Backend

**Решение:**
1. Проверьте `BACKEND_URL` в env
2. Проверьте API ключ (`ALLOWED_API_KEY`)
3. Проверьте сетевое подключение между контейнерами

### Проблема: Очередь переполнена

**Решение:**
1. Увеличьте `WORKER_CONCURRENCY`
2. Уменьшите `MOCK_PROCESSING_TIME`
3. Очистите failed задачи через Bull Board

## 📝 TODO

- [ ] Интеграция с реальным LLM (OpenAI/Claude)
- [ ] Добавить rate limiting
- [ ] Добавить приоритеты задач
- [ ] Кэширование результатов
- [ ] Метрики Prometheus
- [ ] Graceful shutdown для worker'ов
- [ ] Retry механизм для failed callbacks

## 📄 License

ISC


