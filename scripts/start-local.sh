#!/bin/bash

echo "🚀 Запуск ED Analytics локально..."
echo "📋 Проверяем Docker..."

# Проверяем что Docker запущен
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker не запущен. Пожалуйста, запустите Docker Desktop и попробуйте снова."
    exit 1
fi

echo "✅ Docker запущен"
echo "📦 Собираем и запускаем контейнеры..."

# Останавливаем существующие контейнеры
docker-compose down

# Собираем и запускаем
docker-compose up --build

echo "🎉 Приложение запущено!"
echo "🌐 Frontend: http://localhost:3000"
echo "🔗 Backend API: http://localhost:5000"


