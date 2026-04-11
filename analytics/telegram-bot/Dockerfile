# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Копируем package.json
COPY package.json ./

# Устанавливаем зависимости
RUN npm install

# Копируем исходный код
COPY . .

# Компилируем TypeScript
RUN npm run build

# Stage 2: Production
FROM node:20-alpine

WORKDIR /app

# Копируем package.json
COPY package.json ./

# Устанавливаем только production зависимости
RUN npm install --omit=dev

# Копируем скомпилированный код из builder
COPY --from=builder /app/dist ./dist

# Запускаем бота
CMD ["npm", "start"]

