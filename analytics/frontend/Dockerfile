# Multi-stage build для оптимизации

# Стадия сборки
FROM node:18-alpine AS builder

WORKDIR /app

# Копируем package files
COPY package*.json ./

# Устанавливаем зависимости
RUN npm install

# Копируем исходный код
COPY . .

# Устанавливаем переменную для сборки (получаем из docker-compose build args)
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

# Собираем production build
RUN npm run build

# Продакшн стадия с nginx
FROM nginx:alpine AS production

# Копируем собранное приложение
COPY --from=builder /app/dist /usr/share/nginx/html

# Копируем конфигурацию nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Создаем пользователя для безопасности
RUN addgroup -g 1001 -S appgroup
RUN adduser -S appuser -u 1001 -G appgroup

# Устанавливаем права
RUN chown -R appuser:appgroup /usr/share/nginx/html
RUN chown -R appuser:appgroup /var/cache/nginx
RUN chown -R appuser:appgroup /var/log/nginx
RUN chown -R appuser:appgroup /etc/nginx/conf.d
RUN touch /var/run/nginx.pid
RUN chown -R appuser:appgroup /var/run/nginx.pid

USER appuser

# Открываем порт
EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

# Запускаем nginx
CMD ["nginx", "-g", "daemon off;"]
