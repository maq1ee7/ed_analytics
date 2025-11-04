FROM node:18-alpine

WORKDIR /app

# Копируем package files
COPY package*.json ./

# Устанавливаем зависимости
RUN npm install

# Копируем остальные файлы
COPY . .

# Компилируем TypeScript
RUN npm run build

# Экспонируем порт
EXPOSE 5001

# Запускаем приложение
CMD ["npm", "start"]


