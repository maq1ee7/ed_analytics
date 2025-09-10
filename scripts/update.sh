#!/bin/bash

# =================================
# ED Analytics - Update Script
# Быстрое обновление без установки Docker
# =================================

set -e

# =================================
# КОНФИГУРАЦИЯ - ДОЛЖНА СОВПАДАТЬ С deploy.sh
# =================================
SERVER_IP="130.193.46.4"                    # IP адрес вашего сервера
SERVER_USER="appuser"                       # Имя пользователя на сервере  
SSH_KEY="~/.ssh/llm-cpu/appuser-ed25519"   # Путь к SSH ключу
PROJECT_DIR="ed_analytics"                  # Название папки проекта на сервере
LOCAL_DIR="$(pwd)"                          # Текущая папка (автоматически)

echo "🔄 Обновляем ED Analytics на сервере..."
echo "📍 Сервер: ${SERVER_USER}@${SERVER_IP}"
echo ""

# Останавливаем приложение
echo "1️⃣ Останавливаем приложение..."
ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_IP" "
    cd $PROJECT_DIR
    
    # Определяем команду для docker compose
    if docker compose version &> /dev/null; then
        DOCKER_COMPOSE='docker compose'
    else
        DOCKER_COMPOSE='docker-compose'
    fi
    
    \$DOCKER_COMPOSE -f docker-compose.prod.yml down 2>/dev/null || true
"

# Копируем только изменённые файлы
echo ""
echo "2️⃣ Обновляем исходный код..."

# Backend
scp -i "$SSH_KEY" -r \
    "$LOCAL_DIR/backend/src/" \
    "$SERVER_USER@$SERVER_IP:~/$PROJECT_DIR/backend/"

# Frontend  
scp -i "$SSH_KEY" -r \
    "$LOCAL_DIR/frontend/src/" \
    "$SERVER_USER@$SERVER_IP:~/$PROJECT_DIR/frontend/"

# Docker конфигурации (если изменились)
scp -i "$SSH_KEY" \
    "$LOCAL_DIR/docker-compose.prod.yml" \
    "$SERVER_USER@$SERVER_IP:~/$PROJECT_DIR/"

echo "✅ Код обновлён"

# Запускаем приложение
echo ""
echo "3️⃣ Перезапускаем приложение..."
ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_IP" "
    cd $PROJECT_DIR
    
    # Определяем команду для docker compose
    if docker compose version &> /dev/null; then
        DOCKER_COMPOSE='docker compose'
    else
        DOCKER_COMPOSE='docker-compose'
    fi
    
    \$DOCKER_COMPOSE -f docker-compose.prod.yml up --build -d
    
    echo ''
    echo '📊 Статус контейнеров:'
    \$DOCKER_COMPOSE -f docker-compose.prod.yml ps
"

echo ""
echo "🎉 Обновление завершено!"
echo "🌐 Приложение: http://$SERVER_IP"
