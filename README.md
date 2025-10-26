# ED Analytics

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

### Локальная разработка фронтенда

```bash
# Клонируем проект
git clone <repository-url>
cd ed_analytics
./scripts/start-front-local.sh


# Приложение будет доступно по адресу:
# Frontend: http://localhost:3000
```

### Продакшн на сервере

```bash
# Подключаемся к серверу
ssh -i ~/.ssh/your-key -l username your-server-ip

# Клонируем проект (если первый раз)
git clone <repository-url>
cd ed_analytics

# Способ 1: Полный деплой (рекомендуется)
# Перед запуском отредактируйте deploy.sh - укажите ваши данные доступа
./scripts/deploy.sh

# Приложение будет доступно по адресам:
# Frontend: http://130.193.46.4
# Backend API: http://your-server-ip:5000
```

## 🏗️ Архитектура

### Технологический стек

**Frontend:**
- React 18 + TypeScript
- Vite 5.x
- TailwindCSS 3.x (utility-first CSS)
- React Router (маршрутизация)
- Axios (HTTP клиент с авто-обновлением токенов)
- Chart.js + React-ChartJS-2 (графики и диаграммы)

**Backend:**
- Node.js 18+ + Express.js
- TypeScript 5.x
- PostgreSQL 15 (база данных пользователей)
- JWT авторизация (access + refresh токены)
- bcrypt (хеширование паролей)
- CORS + Helmet (безопасность)

**DevOps:**
- Docker + Docker Compose v2
- Nginx Alpine (продакшн reverse proxy)
- Health checks для мониторинга

### Структура проекта

```
ed_analytics/
├── frontend/                   # React приложение
│   ├── src/
│   │   ├── components/
│   │   │   ├── charts/              # Компоненты графиков
│   │   │   │   ├── ExponentialChart.tsx      # Экспоненциальный график
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
│   │   │   └── Query.ts                      # Модель запросов
│   │   ├── routes/
│   │   │   ├── auth.ts                       # Роуты авторизации
│   │   │   └── queries.ts                    # Роуты запросов
│   │   ├── types/
│   │   │   └── auth.ts                       # TypeScript типы
│   │   ├── utils/
│   │   │   ├── database.ts                   # Подключение к БД
│   │   │   ├── jwt.ts                        # JWT утилиты
│   │   │   ├── migrations.ts                 # Система миграций
│   │   │   └── responseGenerator.ts          # Генератор ответов
│   │   └── server.ts                         # Express сервер
│   ├── migrations/
│   │   ├── 01_create_users_table.sql         # Таблица пользователей
│   │   └── 02_create_queries_table.sql       # Таблица запросов
│   ├── Dockerfile                            # Docker образ для backend
│   ├── package.json                          # Зависимости backend
│   └── tsconfig.json                         # Конфигурация TypeScript
│
├── scripts/                    # Скрипты автоматизации
│   ├── deploy.sh                             # Полный деплой на сервер
│   ├── start-local.sh                        # Локальный запуск всего стека
│   ├── start-front-local.sh                  # Запуск только фронтенда
│   └── update.sh                             # Обновление кода на сервере
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

### Backend (Express)

**Публичные endpoints:**
- `POST /api/auth/login` - Авторизация пользователя
- `POST /api/auth/refresh` - Обновление access токена
- `GET /health` - Проверка здоровья сервиса

**Защищенные endpoints (требуют авторизации):**
- `GET /api/hello` - Тестовый endpoint, возвращает приветствие
- `POST /api/auth/logout` - Выход из системы
- `GET /api/auth/me` - Информация о текущем пользователе
- `GET /api/auth/verify` - Проверка валидности токена

### Фронтенд маршруты

- `/login` - Страница авторизации (публичная)
- `/dashboard` - Главная страница (защищенная)

### Проверка логов

```bash
# Локально
docker-compose logs backend
docker-compose logs frontend

# На сервере
docker-compose -f docker-compose.prod.yml logs backend
docker-compose -f docker-compose.prod.yml logs frontend
```