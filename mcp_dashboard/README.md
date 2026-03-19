# MCP Dashboard

Независимый MCP-сервер для генерации дашбордов. Сейчас поддерживается один тип: **интерактивная карта регионов России**.

- Принимает JSON-данные в формате карты (годы и регионы со значениями).
- Возвращает **URL дашборда** (работает пока запущен сервер) и **картинку карты** (PNG, base64).
- Данные сохраняются в SQLite; ссылка на дашборд действует бесконечно при работающем сервере.
- Проект **не ссылается** на ed_analytics; все данные регионов лежат в `data/` (JSON).

## Требования

- Node.js 18+
- Chromium (для Puppeteer; ставится автоматически при `npm install`)

## Установка и запуск

```bash
cd mcp_dashboard
npm install
cp .env.example .env   # при необходимости отредактировать PORT, BASE_URL
npm run build
npm start
```

Или в режиме разработки:

```bash
npm run dev
```

После запуска:

- **HTTP**: дашборды и API — `http://localhost:3100` (или `PORT` из `.env`).
- **MCP**: эндпоинт Streamable HTTP — `http://localhost:3100/mcp` (для подключения из Cursor и др. клиентов по URL).

## Обновление данных регионов

Данные регионов (коды, названия, координаты для карты) лежат в `data/regions.json` и `data/regionCoordinates.json`.  
Чтобы обновить их из основного проекта ed_analytics, из **корня репозитория** выполните:

```bash
npx tsx scripts/export-regions-for-mcp-dashboard.ts
```

После этого закоммитьте обновлённые файлы в `mcp_dashboard/data/`.

## Подключение в Cursor

Если MCP Dashboard развёрнут на сервере (например `http://130.193.46.4:3100`), добавьте сервер в Cursor по URL.

**Вариант 1: через настройки Cursor**  
Settings (Cmd/Ctrl + ,) → **Tools & MCP** → Add new MCP server:
- **Name**: `mcp-dashboard` (или любое)
- **URL**: `http://130.193.46.4:3100/mcp`
- При необходимости укажите **Headers** (если позже добавите авторизацию).

**Вариант 2: через конфиг проекта**  
Создайте в корне проекта (например в `ed_analytics`) файл `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "mcp-dashboard": {
      "url": "http://130.193.46.4:3100/mcp"
    }
  }
}
```

Если MCP Dashboard на другом хосте или порту — замените URL (порт по умолчанию `3100`). После сохранения полностью перезапустите Cursor, чтобы подхватить новый MCP сервер.

## MCP Tool

- **Имя**: `create_russia_map`
- **Вход**: JSON `data` в формате:
  ```json
  {
    "years": [
      {
        "year": 2023,
        "regions": [
          { "regionCode": "RU-MOW", "value": 100 },
          { "regionCode": "RU-SPE", "value": 200 }
        ]
      }
    ]
  }
  ```
- **Выход**: текст (JSON с `dashboardUrl`, `dashboardId`) и изображение (PNG, base64).

Коды регионов — стандарт ISO 3166-2:RU (например, `RU-MOW`, `RU-SPE`). Список есть в `data/regions.json`.

## Деплой на сервер

Проект разворачивается **отдельно** от ed_analytics, в свою папку на сервере (например `~/mcp_dashboard`). Используется Docker, по аналогии с основным проектом.

Из папки `mcp_dashboard`:

```bash
sh scripts/deploy.sh
```

Или из корня репозитория:

```bash
sh mcp_dashboard/scripts/deploy.sh
```

Опция `-f` — полная пересборка образа без кэша: `sh scripts/deploy.sh -f`.

В `.env` (или в корне репо) задаются: `SERVER_IP`, `SERVER_USER`, `SSH_KEY`, при необходимости `PROJECT_DIR` (папка на сервере, по умолчанию `mcp_dashboard`). Для docker-compose на сервере: `MCP_DASHBOARD_PORT`, `MCP_DASHBOARD_BASE_URL`.

После деплоя контейнер запускается через `docker compose -f docker-compose.yml up -d`. Логи: `docker compose -f docker-compose.yml logs -f`.

## Переменные окружения

| Переменная       | Описание                          | По умолчанию           |
|------------------|-----------------------------------|------------------------|
| `PORT`           | Порт HTTP-сервера                 | `3100`                 |
| `BASE_URL`       | Базовый URL для ссылок на дашборды| `http://localhost:3100`|
| `DATABASE_PATH`  | Путь к SQLite-файлу               | `./data/dashboards.db` |

## Структура проекта

```
mcp_dashboard/
├── data/                 # regions.json, regionCoordinates.json (БД — в volume в Docker)
├── public/               # map.html — страница карты
├── scripts/
│   └── deploy.sh        # деплой на сервер (Docker, отдельно от ed_analytics)
├── docker-compose.yml    # один сервис, для standalone-деплоя
├── Dockerfile
├── src/
│   ├── db.ts            # SQLite
│   ├── index.ts         # точка входа (HTTP + MCP stdio)
│   ├── render.ts        # Puppeteer, скриншот дашборда
│   ├── server.ts        # Express (API + раздача дашбордов и data/)
│   ├── tools/
│   │   └── createRussiaMap.ts
│   └── types.ts
├── .env.example
├── package.json
├── README.md
└── tsconfig.json
```

В будущем можно добавить другие типы графиков и инструменты MCP.
