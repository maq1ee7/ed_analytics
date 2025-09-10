# Multi-stage build для оптимизации размера образа

# Стадия сборки
FROM node:18-alpine AS builder

WORKDIR /app

# Копируем package files
COPY package*.json ./

# Устанавливаем зависимости (включая dev для сборки)
RUN npm install

# Копируем только необходимые файлы для сборки
COPY src/ ./src/
COPY migrations/ ./migrations/
COPY tsconfig.json ./

# Собираем проект
RUN npm run build

# Продакшн стадия
FROM node:18-alpine AS production

# Создаем пользователя для безопасности
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodeuser -u 1001

WORKDIR /app

# Копируем package files
COPY package*.json ./

# Устанавливаем только production зависимости
RUN npm install --omit=dev && npm cache clean --force

# Копируем собранный код из стадии builder
COPY --from=builder /app/dist ./dist

# Копируем миграции
COPY --from=builder /app/migrations ./migrations

# Устанавливаем права пользователю
RUN chown -R nodeuser:nodejs /app
USER nodeuser

# Открываем порт
EXPOSE 5000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "const http = require('http'); const options = { hostname: 'localhost', port: 5000, path: '/health', timeout: 2000 }; const req = http.request(options, (res) => { process.exit(res.statusCode === 200 ? 0 : 1); }); req.on('error', () => process.exit(1)); req.end();"

# Запускаем приложение
CMD ["npm", "start"]
