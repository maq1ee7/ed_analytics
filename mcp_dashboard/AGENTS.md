# Руководство для агентов: MCP Dashboard

Документ для ИИ- и человеческих ассистентов, которые меняют код в **`mcp_dashboard`**. Проект — автономный MCP-сервер: генерирует дашборды (сейчас — **интерактивная карта субъектов РФ**), отдаёт ссылку и PNG-превью. К основному приложению **ed_analytics по коду не привязан**; справочники лежат в `data/`.

---

## Назначение и границы

- **Вход MCP:** инструменты `get_russia_region_codes`, `create_russia_map`; resource `dashboard://mcp-dashboard/russia-region-codes`.
- **HTTP:** дашборд по URL `/dashboard/:id`, JSON данных — `/api/dashboard/:id`, статика карты и `data/` — через Express (`src/server.ts`).
- **Транспорт MCP:** Streamable HTTP, эндпоинт **`POST/GET /mcp`** (подключение из Cursor и др. по URL). Отдельного stdio-транспорта в коде нет.

Пользовательская документация: [`README.md`](README.md). Краткие инструкции для LLM при **вызове** MCP (не для правки репо): [`docs/MCP_AGENT_INSTRUCTIONS.md`](docs/MCP_AGENT_INSTRUCTIONS.md).

---

## Стек и требования

| Компонент | Технология |
|-----------|------------|
| Runtime | Node.js 18+ (`"type": "module"`) |
| Язык | TypeScript → `dist/` (`npm run build` / `tsc`) |
| HTTP | Express |
| MCP | `@modelcontextprotocol/sdk` |
| Валидация | Zod (схема входа `create_russia_map` в `src/index.ts`) |
| Хранение дашбордов | SQLite (`better-sqlite3`) |
| Скриншот превью | Puppeteer (Chromium; в Docker — системный `chromium`) |

В **`src/index.ts`** до импортов MCP подключается полифилл `globalThis.crypto` из `node:crypto` — нужен для SDK на Node 18.

---

## Архитектура потока данных

1. Клиент вызывает **`create_russia_map`** с полем **`data`**: `{ years: [ { year, regions: [ { regionCode, value } ] } ] }`.
2. **`createRussiaMap`** (`src/tools/createRussiaMap.ts`): валидация кодов через `russiaRegionCatalog` → `saveDashboard` в SQLite → сборка **`dashboardUrl`** из `BASE_URL` → **`renderDashboardToPng(dashboardUrl)`** (Puppeteer открывает страницу и ждёт `document.body.dataset.ready === 'true'`).
3. Браузерная страница — **`public/map.html`**: загружает данные с **`/api/dashboard/:id`**, рисует карту; выставляет `data-ready` для Puppeteer.

Новая сессия MCP создаёт **новый экземпляр `McpServer`** на соединение (`createMcpServer` в `index.ts`), транспорт и сессии — в **`src/mcpTransport.ts`** (кэш транспортов по `mcp-session-id`).

---

## Важные файлы

| Путь | Роль |
|------|------|
| `src/index.ts` | Точка входа: Express, middleware JSON на `/mcp`, регистрация tools/resources, запуск HTTP |
| `src/server.ts` | Маршруты `/dashboard/:id`, `/api/dashboard/:id`, статика `public/`, `/data` |
| `src/mcpTransport.ts` | Streamable HTTP: сессии, `initialize`, делегирование в Web Standard транспорт SDK |
| `src/mcpWebAdapter.ts` | Мост Express ↔ Web API `Request`/`Response` |
| `src/tools/createRussiaMap.ts` | Бизнес-логика карты: валидация, сохранение, URL, вызов рендера |
| `src/db.ts` | SQLite: таблица `dashboards` (`id`, `type`, `payload`, `created_at`) |
| `src/render.ts` | Puppeteer: общий браузер, `goto` (для localhost предпочитает `127.0.0.1`), скриншот |
| `src/russiaRegionCatalog.ts` | ISO 3166-2:RU, алиасы, `RussiaMapRegionValidationError`, JSON для resource/tool |
| `src/types.ts` | `RussiaMapChartData` и связанные типы (совместимость с форматом из ed_analytics) |
| `public/map.html` | UI карты; ожидается `body[data-ready="true"]` после загрузки данных |
| `data/regions.json`, `data/regionCoordinates.json` | Гео и метаданные регионов для карты |
| `examples/`, `examples/manifest.json` | JSON-фикстуры для `create_russia_map` (успех, edge cases, ожидаемые ошибки); реестр кейсов в manifest |
| `.cursor/skills/verify-mcp-dashboard/SKILL.md` | Инструкция агенту: прогон фикстур через MCP; модель задаётся в UI чата Cursor, не в skill |

---

## Тестовые фикстуры MCP

Каталог **`examples/`** содержит готовые аргументы вызова (объект с полем **`data`**) и **`manifest.json`** с описанием кейсов и ожидаемого исхода (`success` / `tool_error`). Используйте для регрессии после правок валидации регионов, карты или рендера.

Повторяемый сценарий проверки в Cursor описан в skill **`verify-mcp-dashboard`** (путь в таблице выше).

---

## Контракты данных

- **Коды регионов:** ISO **3166-2:RU** (`RU-MOW`, `RU-SPE`, …). В `russiaRegionCatalog` есть нормализация и алиасы (ХМАО, Югра и т.д.).
- **Ошибки неизвестных кодов:** класс `RussiaMapRegionValidationError` — в ответ MCP попадают `unknownRegionCodes` и `possibleMatches` (подсказки по расстоянию Левенштейна).
- **Формат `data`:** см. README и Zod-схему в `src/index.ts`; поле верхнего уровня при вызове инструмента — **`data`**, не корневой объект без обёртки.

Типы дашборда в БД сейчас: **`russia_map`** (`StoredDashboard` в `types.ts`).

---

## Переменные окружения

См. [`.env.example`](.env.example):

- **`PORT`** — HTTP (по умолчанию `3100`).
- **`BASE_URL`** — база для ссылок `dashboardUrl` (на проде должен совпадать с тем, по чему доступен сервер извне).
- **`DATABASE_PATH`** — путь к SQLite (в Docker обычно `/data/dashboards.db`).
- **`PUPPETEER_EXECUTABLE_PATH`** — при необходимости указать Chromium явно (в Docker задан в `Dockerfile`).

В **`docker-compose.yml`**: `MCP_DASHBOARD_PORT`, `MCP_DASHBOARD_BASE_URL`, том `mcp_dashboard_data` для `/data`.

---

## Деплой и правила репозитория

- Деплой выполняется скриптом из каталога проекта: `sh scripts/deploy.sh` (из корня репозитория: `sh mcp_dashboard/scripts/deploy.sh`). Полная пересборка без кэша: **`-f`**.
- Переменные для деплоя: **`SERVER_IP`**, **`SERVER_USER`**, **`SSH_KEY`**, при необходимости **`PROJECT_DIR`** (см. README и workspace rules).
- В Cursor для этого репозитория зафиксировано правило: **не подменять деплой локальным `npm run build` / запуском только «для проверки деплоя»** — ориентир на скрипт деплоя.

---

## Обновление справочников регионов из монорепозитория

Источник правды для экспорта — скрипт в каталоге **`analytics/scripts/`** (стек ED Analytics в этом монорепозитории):

```bash
cd analytics
npx tsx scripts/export-regions-for-mcp-dashboard.ts
```

После экспорта нужно закоммитить обновлённые файлы в **`mcp_dashboard/data/`** (см. README).

---

## Типичные задачи разработки

| Задача | Куда смотреть |
|--------|----------------|
| Новый MCP tool / resource | `src/index.ts` (`McpServer.registerTool` / `registerResource`), при необходимости вынести в `src/tools/` |
| Изменить формат входных данных карты | Zod в `index.ts`, `types.ts`, `createRussiaMap.ts`, валидация в `russiaRegionCatalog.ts`; обновить `examples/` и `manifest.json` |
| Правки UI карты | `public/map.html`, стили в том же файле; убедиться, что **`data-ready`** выставляется до показа ошибки/успеха (иначе зависнет `render.ts`) |
| Таймауты / скриншот | `src/render.ts` (`DEFAULT_TIMEOUT_MS`, viewport) |
| Поведение MCP по HTTP | `mcpTransport.ts`, заголовок **`mcp-session-id`**, парсинг тела для `initialize` |

---

## Расширение на новые типы дашбордов

Сейчас в БД и UI зашит сценарий **одной страницы** `map.html` и типа `russia_map`. Новый тип потребует: новое значение `type` в `saveDashboard`, маршрут или параметр для другой HTML-страницы, согласованность с `renderDashboardToPng` и при необходимости отдельный tool в MCP.

---

## Отладка

- Логи сервера идут в **stderr** (`console.error`) с префиксами вроде `[mcp-dashboard]`.
- Ошибки MCP POST при неверной сессии: ответ **400** с текстом про session / initialize (см. `mcpTransport.ts`).
- Если скриншот пустой или таймаут: проверить доступность `dashboardUrl` из процесса Node (в контейнере — `BASE_URL`), сигнал **`data-ready`** в `map.html`.

---

## Что не путать с другими проектами

- **`DashboardData` / LangGraph / Neo4j** относятся к подсистеме **Brama** в ed_analytics, не к этому пакету.
- Здесь свой контракт: **`RussiaMapChartData`** и MCP-инструменты выше.
