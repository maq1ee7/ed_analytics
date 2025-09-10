# ED Analytics

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
- Axios (HTTP клиент)

**Backend:**
- Node.js 18+ + Express.js
- TypeScript 5.x
- CORS + Helmet (безопасность)
- Автоопределение окружения

**DevOps:**
- Docker + Docker Compose v2
- Nginx Alpine (продакшн reverse proxy)
- Health checks для мониторинга

### Структура проекта

```
ed_analytics/
├── frontend/                 # React приложение
│   ├── src/
│   │   ├── App.tsx          # Главный компонент
│   │   ├── main.tsx         # Точка входа
│   │   ├── index.css        # Стили
│   │   └── vite-env.d.ts    # TypeScript типы
│   ├── Dockerfile           # Docker образ для frontend
│   ├── nginx.conf           # Конфигурация Nginx
│   └── package.json         # Зависимости frontend
│
├── backend/                  # Express API
│   ├── src/
│   │   └── server.ts        # Express сервер
│   ├── Dockerfile           # Docker образ для backend
│   └── package.json         # Зависимости backend
│
├── scripts/                  # Скрипты автоматизации
│   ├── deploy.sh            # Полный деплой
│   ├── update.sh            # Обновление кода
│   └── start-local.sh       # Локальный запуск
│
├── docker-compose.yml       # Локальная разработка
├── docker-compose.prod.yml  # Продакшн
└── README.md                # Документация
```

## 📡 API Endpoints

### Backend (Express)

- `GET /api/hello` - Тестовый endpoint, возвращает приветствие
- `GET /health` - Проверка здоровья сервиса

### Проверка логов

```bash
# Локально
docker-compose logs backend
docker-compose logs frontend

# На сервере
docker-compose -f docker-compose.prod.yml logs backend
docker-compose -f docker-compose.prod.yml logs frontend
```