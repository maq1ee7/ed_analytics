# ed_analytics (монорепозиторий)

В корне два независимых контура:

| Каталог | Назначение |
|--------|------------|
| **[analytics/](analytics/README.md)** | Основной стек ED Analytics: PostgreSQL, Redis, Neo4j, backend, Brama, frontend, Telegram-бот, Docker Compose, скрипты деплоя. |
| **[mcp_dashboard/](mcp_dashboard/README.md)** | Отдельный MCP-сервер для дашбордов и инструментов (например, карта регионов). |

## Быстрый ориентир

- Поднять веб-стек и бота локально: перейти в `analytics/`, скопировать `analytics/.env.example` в `analytics/.env`, затем `docker compose up` из каталога `analytics/` (см. подробности в [analytics/README.md](analytics/README.md)).
- Работать с MCP: см. [mcp_dashboard/README.md](mcp_dashboard/README.md).

Корневой [CLAUDE.md](CLAUDE.md) — краткая отсылка к документации Brama внутри `analytics/`.
