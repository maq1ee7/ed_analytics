# 🤖 Руководство для Claude: Работа с подсистемой Brama

> **Для:** Claude AI / LLM-ассистентов
> **Цель:** Быстрая ориентация в архитектуре Brama для внесения изменений
> **Последнее обновление:** 2025-11-20

---

## 📚 Структура документации

### Основные документы

1. **[README.md](./README.md)** - Практическое руководство разработчика
   - Компоненты и их роли
   - Инструкции по запуску и настройке
   - Примеры использования
   - Troubleshooting
   - **Читать:** Для понимания как запустить и настроить

2. **[MODULE_REPLACEMENT_REQUIREMENTS.md](./MODULE_REPLACEMENT_REQUIREMENTS.md)** - Техническая архитектура
   - 4 детальные диаграммы (Sequence, State Flow, Структура, ER)
   - Описание LangGraph workflow (4 этапа)
   - Контракты API и форматы данных
   - История изменений (v2.0 → v3.0)
   - **Читать:** Для понимания архитектуры и внесения изменений

3. **[CLAUDE.md](./CLAUDE.md)** (этот файл) - Быстрый старт для AI

---

## 🎯 Когда читать какой документ

| Задача | Документ | Время чтения |
|--------|----------|--------------|
| Понять общую архитектуру | MODULE_REPLACEMENT_REQUIREMENTS.md → "Обзор системы" | 3-5 мин |
| Найти конкретный файл | MODULE_REPLACEMENT_REQUIREMENTS.md → "Структура модулей" | 1-2 мин |
| Понять LangGraph workflow | MODULE_REPLACEMENT_REQUIREMENTS.md → "LangGraph Workflow" | 5-7 мин |
| Посмотреть граф LangGraph | MODULE_REPLACEMENT_REQUIREMENTS.md → "Диаграмма 5" | 2-3 мин |
| Изменить промпты LLM | query-agent/prompts/*.ts | 2-3 мин |
| Изменить формат данных | MODULE_REPLACEMENT_REQUIREMENTS.md → "Формат данных" | 3-5 мин |
| Обновить граф LangGraph | Запустить: `npm run build && node scripts/export-graph.js` | 1-2 мин |
| Добавить новый этап в workflow | MODULE_REPLACEMENT_REQUIREMENTS.md → "LangGraph Workflow" + "Диаграмма 3" | 10-15 мин |
| Настроить переменные окружения | README.md → "Переменные окружения" | 2-3 мин |
| Решить проблему | README.md → "Troubleshooting" | 3-5 мин |
| Понять схему Neo4j | MODULE_REPLACEMENT_REQUIREMENTS.md → "ER диаграмма" | 5-7 мин |

---

## 🏗️ Архитектура: Краткая шпаргалка

### Основной поток обработки запроса

```
User Query (string)
    ↓
DashboardGenerator.generateDashboard(question)
    ↓
QueryAgent.processQuery(question)
    ↓
[LangGraph Workflow - 4 этапа]
    ├─ Этап 1: selectStatformNode    → statformIds[]
    ├─ Этап 2: selectSectionNode     → sectionId
    ├─ Этап 3: selectViewCellsNode   → viewId, colIndex, rowIndex
    └─ Этап 4: generateDashboardNode → DashboardData
    ↓
Return DashboardData (2 графика: linear + russia_map)
```

### Ключевые директории

```
brama/src/
├── query-agent/          # Анализ запроса (LangGraph, 4 этапа)
│   ├── graph/nodes/      # Узлы LangGraph
│   ├── prompts/          # Промпты для LLM
│   └── modules/          # Вспомогательные функции
├── dashboard-service/    # Генерация графиков
│   └── chartFormatters/  # Форматирование linear/russia_map
├── shared/               # Общие клиенты
│   ├── llmClient.ts      # DeepSeek через AITunnel
│   ├── neo4jClient.ts    # Neo4j (Singleton)
│   └── logger.ts         # Логирование
└── utils/
    └── dashboardGenerator.ts  # Точка входа (обертка)
```

### Неизменяемые контракты (НЕ ТРОГАТЬ!)

```typescript
// Вход
DashboardGenerator.generateDashboard(question: string): Promise<DashboardData>

// Выход
interface DashboardData {
  dashboard: {
    title: string;
    description: string;
    charts: [LinearChart, RussiaMapChart]; // ВСЕГДА 2 элемента!
  };
}
```

---

## ⚡ Типичные задачи и решения

### 1️⃣ Изменить промпт для этапа выбора

**Файлы:**
- `brama/src/query-agent/prompts/statformSelection.ts`
- `brama/src/query-agent/prompts/sectionSelection.ts`
- `brama/src/query-agent/prompts/viewCellSelection.ts`

**Действия:**
1. Открыть нужный файл промпта
2. Изменить `systemPrompt` или `userMessage`
3. Тестировать через LangSmith (если включен)

**Пример:**
```typescript
// brama/src/query-agent/prompts/statformSelection.ts
export function buildStatformPrompt(query: string, statforms: Statform[]) {
  return {
    systemPrompt: "Ты — эксперт по образовательной статистике...",
    userMessage: `Запрос: "${query}"\n\nВыбери 1-2 статформы...`
  };
}
```

---

### 2️⃣ Добавить логирование в узел

**Файлы:**
- `brama/src/query-agent/graph/nodes/*.ts`

**Действия:**
1. Импортировать Logger: `import { logger } from '../../../shared/logger';`
2. Добавить логи: `logger.info('[SelectStatform] Starting...');`
3. Уровни: DEBUG, INFO, WARN, ERROR

**Пример:**
```typescript
import { logger } from '../../../shared/logger';

export const selectStatformNode = async (state: QueryState) => {
  logger.info('[SelectStatform] Processing query:', state.query);

  // ... логика узла ...

  logger.debug('[SelectStatform] Selected statforms:', statformIds);
  return { statformSelection: { statformIds } };
};
```

---

### 3️⃣ Изменить формат графика

**Файлы:**
- `brama/src/dashboard-service/chartFormatters/linearChart.ts`
- `brama/src/dashboard-service/chartFormatters/russiaMapChart.ts`

**⚠️ ВНИМАНИЕ:** Изменения должны быть обратно совместимы с Frontend!

**Действия:**
1. Открыть нужный форматтер
2. Изменить функцию `format()`
3. Убедиться что структура соответствует `DashboardData`

---

### 4️⃣ Добавить новый этап в LangGraph

**Сложность:** Высокая
**Требуется:** Понимание LangGraph

**Шаги:**
1. Создать новый узел в `brama/src/query-agent/graph/nodes/myNewNode.ts`
2. Обновить `QueryState` в `brama/src/query-agent/graph/state.ts`
3. Добавить узел в граф в `brama/src/query-agent/graph/graph.ts`
4. Создать промпт в `brama/src/query-agent/prompts/myNewPrompt.ts`
5. Обновить документацию

**Рекомендация:** Читать MODULE_REPLACEMENT_REQUIREMENTS.md → "LangGraph Workflow"

---

### 5️⃣ Изменить запрос к Neo4j

**Файлы:**
- `brama/src/shared/neo4jClient.ts`
- `brama/src/query-agent/modules/*.ts`

**Действия:**
1. Найти нужный метод в `neo4jClient.ts`
2. Изменить Cypher запрос
3. Обновить TypeScript интерфейсы при необходимости

**Важно:** Смотреть ER диаграмму в MODULE_REPLACEMENT_REQUIREMENTS.md!

**Критическая особенность Neo4j:**
- ⚠️ Региональные данные хранятся в СВЯЗИ (relationship), а не в узле!
- Запрос: `MATCH (view)-[r]->(region) RETURN r.data_2021`

---

## 🔍 Поиск по кодовой базе

### Поиск по ключевым словам

| Ищу | Где искать |
|-----|-----------|
| Промпты для LLM | `brama/src/query-agent/prompts/` |
| Узлы LangGraph | `brama/src/query-agent/graph/nodes/` |
| Cypher запросы | `brama/src/shared/neo4jClient.ts` |
| Форматирование графиков | `brama/src/dashboard-service/chartFormatters/` |
| Логика обработки ячеек | `brama/src/dashboard-service/cellExtractor.ts` |
| Конфигурация LangGraph | `brama/src/query-agent/graph/graph.ts` |
| Интерфейсы State | `brama/src/query-agent/graph/state.ts` |
| Скрипт экспорта графа | `brama/scripts/export-graph.js` |

---

## 🚨 Частые ошибки и как их избежать

### ❌ Ошибка: "QueryAgent не инициализирован"

**Причина:** `DashboardGenerator.initialize()` не вызван
**Решение:** Проверить `brama/src/server.ts` → должен быть вызов `await DashboardGenerator.initialize()`

---

### ❌ Ошибка: "Cannot read property 'data_2021' of undefined"

**Причина:** Пытаетесь прочитать `region.data_2021`, но данные в связи!
**Решение:** Использовать `r.data_2021` где `r` - связь
**Где смотреть:** MODULE_REPLACEMENT_REQUIREMENTS.md → "ER диаграмма Neo4j"

---

### ❌ Ошибка: "Expected 2 charts, got 1"

**Причина:** DashboardData должен содержать РОВНО 2 графика
**Решение:** Проверить `dashboard-service/dashboardGenerator.ts` → всегда возвращать массив из 2 элементов

---

### ❌ Ошибка: "LLM returned invalid JSON"

**Причина:** Промпт не указывает формат ответа четко
**Решение:** Использовать `llmClient.chatJSON()` с Zod схемой вместо `chat()`
**Пример:** `brama/src/query-agent/graph/nodes/selectStatformNode.ts`

---

## 📝 Checklist перед изменениями

- [ ] Прочитал соответствующую секцию в MODULE_REPLACEMENT_REQUIREMENTS.md
- [ ] Понял как изменение влияет на LangGraph workflow
- [ ] Проверил что не нарушаю контракт DashboardData
- [ ] Добавил логирование в измененный код
- [ ] Протестировал локально
- [ ] Проверил что ошибки на русском языке
- [ ] Обновил документацию (если нужно)

---

## 🆘 Когда задавать вопросы пользователю

### Обязательно спросить, если:

1. **Неясен формат входных/выходных данных**
   - "Какой формат ответа ожидается от нового узла?"

2. **Изменение может сломать существующую логику**
   - "Изменение промпта может повлиять на выбор статформы. Протестировать на примерах?"

3. **Требуется изменить контракт API**
   - "Это потребует изменений в DashboardData. Согласовать с Frontend?"

4. **Неясна бизнес-логика**
   - "Как должна обрабатываться ситуация, когда LLM не может выбрать раздел?"

5. **Множество вариантов реализации**
   - "Добавить новый этап в LangGraph или изменить существующий?"

---

## 🎯 Итоговые рекомендации

1. **Всегда начинай с документации** - 90% ответов уже есть
2. **Смотри диаграммы** - они показывают полную картину
3. **Используй логирование** - Logger доступен везде
4. **Тестируй через LangSmith** - включи трассировку для отладки
5. **Не ломай контракты** - DashboardData должен быть неизменным
6. **Ошибки на русском** - пользователь увидит их в Telegram
7. **Спрашивай при неясности** - лучше уточнить, чем сломать

---

## 📞 Куда обращаться за уточнениями

- **Архитектура:** MODULE_REPLACEMENT_REQUIREMENTS.md
- **Практика:** README.md
- **Код:** Директории `brama/src/query-agent/` и `brama/src/dashboard-service/`
- **Не понятно:** Задать вопрос пользователю с контекстом

**Ожидаемое время на уточнение:** 2-5 минут (обычно пользователь отвечает быстро)

---

**Версия документа:** 1.0
**Создан:** 2025-11-20
**Для:** Claude 3.5 Sonnet и будущих LLM-ассистентов

---

## 📝 Важная заметка: Автогенерация LangGraph диаграммы

**Диаграмма 5** в MODULE_REPLACEMENT_REQUIREMENTS.md генерируется автоматически из кода!

**Как обновить:**
```bash
cd brama
npm run build
node scripts/export-graph.js
```

**Когда обновлять:**
- После изменения структуры графа в `src/query-agent/graph/graph.ts`
- После добавления/удаления узлов
- После изменения условных переходов

**Что делать с результатом:**
1. Скопировать Mermaid код из консоли
2. Вставить в MODULE_REPLACEMENT_REQUIREMENTS.md → "Диаграмма 5"
3. Проверить что диаграмма отображается корректно

**⚠️ Не редактируй диаграмму вручную** - она всегда должна соответствовать реальному коду!
