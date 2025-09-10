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

### Локальная разработка

```bash
# Клонируем проект
git clone <repository-url>
cd ed_analytics

# Способ 1: Используем готовый скрипт
./scripts/start-local.sh

# Способ 2: Запускаем вручную
docker-compose up --build

# Приложение будет доступно по адресам:
# Frontend: http://localhost:3000
# Backend API: http://localhost:5000
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
# Frontend: http://your-server-ip
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
│   │   │   └── ProtectedRoute.tsx    # Защищенные роуты
│   │   ├── contexts/
│   │   │   └── AuthContext.tsx       # Контекст авторизации
│   │   ├── pages/
│   │   │   ├── DashboardPage.tsx     # Главная страница
│   │   │   ├── LoginPage.tsx         # Страница входа
│   │   │   └── QueryPage.tsx         # Страница запросов
│   │   ├── types/
│   │   │   └── auth.ts               # TypeScript типы
│   │   ├── utils/
│   │   │   └── api.ts                # API клиент
│   │   ├── App.tsx                   # Главный компонент
│   │   ├── main.tsx                  # Точка входа
│   │   ├── index.css                 # Стили
│   │   └── vite-env.d.ts             # Vite типы
│   ├── Dockerfile                    # Docker образ для frontend
│   ├── nginx.conf                    # Конфигурация Nginx
│   └── package.json                  # Зависимости frontend
│
├── backend/                    # Express API
│   ├── src/
│   │   ├── middleware/
│   │   │   └── auth.ts               # Middleware авторизации
│   │   ├── models/
│   │   │   ├── User.ts               # Модель пользователя
│   │   │   └── Query.ts              # Модель запросов
│   │   ├── routes/
│   │   │   ├── auth.ts               # Роуты авторизации
│   │   │   └── queries.ts            # Роуты запросов
│   │   ├── types/
│   │   │   └── auth.ts               # TypeScript типы
│   │   ├── utils/
│   │   │   ├── database.ts           # Подключение к БД
│   │   │   ├── jwt.ts                # JWT утилиты
│   │   │   ├── migrations.ts         # Система миграций
│   │   │   └── responseGenerator.ts  # Генератор ответов
│   │   └── server.ts                 # Express сервер
│   ├── migrations/
│   │   ├── 01_create_users_table.sql # Таблица пользователей
│   │   └── 02_create_queries_table.sql # Таблица запросов
│   ├── Dockerfile                    # Docker образ для backend
│   └── package.json                  # Зависимости backend
│
├── scripts/                    # Скрипты автоматизации
│   ├── deploy.sh                     # Полный деплой
│   ├── update.sh                     # Обновление кода
│   └── start-local.sh                # Локальный запуск
│
├── docker-compose.yml          # Локальная разработка
├── docker-compose.prod.yml     # Продакшн
└── README.md                   # Документация
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