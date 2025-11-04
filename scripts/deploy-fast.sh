#!/bin/bash

# =================================
# ED Analytics - ULTRA FAST Deploy Script
# Использует rsync для копирования только изменённых файлов
# =================================

set -e  # Прекращаем выполнение при ошибке

# =================================
# КОНФИГУРАЦИЯ - ИЗМЕНИТЕ ПОД ВАШ СЕРВЕР
# =================================
SERVER_IP="130.193.46.4"
SERVER_USER="appuser"
SSH_KEY="~/.ssh/llm-cpu/appuser-ed25519"
PROJECT_DIR="ed_analytics"
LOCAL_DIR="$(pwd)"

# Флаг для полной пересборки
FULL_REBUILD="${FULL_REBUILD:-false}"

echo "⚡⚡⚡ ULTRA-FAST деплой ED Analytics ⚡⚡⚡"
echo "📍 Сервер: ${SERVER_USER}@${SERVER_IP}"
echo "🗂️  Локальная папка: ${LOCAL_DIR}"
if [ "$FULL_REBUILD" = "true" ]; then
    echo "⚠️  Режим: ПОЛНАЯ ПЕРЕСБОРКА"
else
    echo "🚀 Режим: ИНКРЕМЕНТАЛЬНАЯ СИНХРОНИЗАЦИЯ"
fi
echo ""

# Раскрываем тильду в пути к SSH ключу
SSH_KEY="${SSH_KEY/#\~/$HOME}"

# Проверки
if [ ! -f "$SSH_KEY" ]; then
    echo "❌ SSH ключ не найден: $SSH_KEY"
    exit 1
fi

if [ ! -d "$LOCAL_DIR" ]; then
    echo "❌ Локальная папка проекта не найдена: $LOCAL_DIR"
    exit 1
fi

# Проверяем rsync
if ! command -v rsync &> /dev/null; then
    echo "❌ rsync не установлен. Установите: brew install rsync"
    exit 1
fi

echo "1️⃣ Создаём структуру папок на сервере (если нужно)..."
ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_IP" "
    mkdir -p $PROJECT_DIR/{backend,brama,frontend,scripts}
    echo '✅ Структура папок готова'
"

echo ""
echo "2️⃣ Синхронизируем Backend (только изменённые файлы)..."
rsync -avz --delete \
    -e "ssh -i $SSH_KEY" \
    --exclude='node_modules' \
    --exclude='dist' \
    --exclude='.env' \
    "$LOCAL_DIR/backend/" \
    "$SERVER_USER@$SERVER_IP:~/$PROJECT_DIR/backend/"
echo "✅ Backend синхронизирован"

echo ""
echo "3️⃣ Синхронизируем Frontend (только изменённые файлы)..."
rsync -avz --delete \
    -e "ssh -i $SSH_KEY" \
    --exclude='node_modules' \
    --exclude='dist' \
    --exclude='.env' \
    "$LOCAL_DIR/frontend/" \
    "$SERVER_USER@$SERVER_IP:~/$PROJECT_DIR/frontend/"
echo "✅ Frontend синхронизирован"

echo ""
echo "4️⃣ Синхронизируем Brama (только изменённые файлы)..."
rsync -avz --delete \
    -e "ssh -i $SSH_KEY" \
    --exclude='node_modules' \
    --exclude='dist' \
    --exclude='.env' \
    "$LOCAL_DIR/brama/" \
    "$SERVER_USER@$SERVER_IP:~/$PROJECT_DIR/brama/"
echo "✅ Brama синхронизирован"

echo ""
echo "5️⃣ Копируем Docker конфигурацию и скрипты..."
rsync -avz \
    -e "ssh -i $SSH_KEY" \
    "$LOCAL_DIR/docker-compose.prod.yml" \
    "$LOCAL_DIR/README.md" \
    "$LOCAL_DIR/.gitignore" \
    "$SERVER_USER@$SERVER_IP:~/$PROJECT_DIR/"

rsync -avz \
    -e "ssh -i $SSH_KEY" \
    "$LOCAL_DIR/scripts/" \
    "$SERVER_USER@$SERVER_IP:~/$PROJECT_DIR/scripts/"
echo "✅ Конфигурация синхронизирована"

echo ""
echo "6️⃣ Настраиваем права на сервере..."
ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_IP" "
    cd $PROJECT_DIR
    chmod +x scripts/*.sh
    echo '✅ Права на выполнение установлены'
"

echo ""
echo "7️⃣ Проверяем Docker на сервере..."
ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_IP" "
    if ! command -v docker &> /dev/null; then
        echo '❌ Docker не установлен!'
        echo '💡 Установите Docker и запустите скрипт заново'
        exit 1
    fi
    
    if docker compose version &> /dev/null; then
        echo '✅ Docker Compose (новый формат) доступен'
    elif command -v docker-compose &> /dev/null; then
        echo '✅ Docker Compose (старый формат) доступен'
    else
        echo '❌ Docker Compose не установлен!'
        exit 1
    fi
"

echo ""
echo "8️⃣ Запускаем приложение..."
ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_IP" "
    cd $PROJECT_DIR
    
    # Определяем команду для docker compose
    if docker compose version &> /dev/null; then
        DOCKER_COMPOSE='docker compose'
    else
        DOCKER_COMPOSE='docker-compose'
    fi
    
    # Останавливаем существующие контейнеры
    if [ -f docker-compose.prod.yml ]; then
        echo '🛑 Останавливаем старые контейнеры...'
        \$DOCKER_COMPOSE -f docker-compose.prod.yml down 2>/dev/null || true
    fi
    
    # Если требуется полная пересборка
    if [ '$FULL_REBUILD' = 'true' ]; then
        echo '🗑️  Удаляем старые образы для полной пересборки...'
        docker images | grep 'ed_analytics' | awk '{print \$3}' | xargs -r docker rmi -f 2>/dev/null || true
        
        echo '🔨 Собираем контейнеры БЕЗ КЭША (медленно)...'
        \$DOCKER_COMPOSE -f docker-compose.prod.yml build --no-cache
    else
        echo '⚡ Собираем контейнеры С ИСПОЛЬЗОВАНИЕМ КЭША (быстро)...'
        \$DOCKER_COMPOSE -f docker-compose.prod.yml build
    fi
    
    # Запускаем контейнеры
    echo '🚀 Запускаем контейнеры...'
    \$DOCKER_COMPOSE -f docker-compose.prod.yml up -d
    
    echo ''
    echo '📊 Статус контейнеров:'
    \$DOCKER_COMPOSE -f docker-compose.prod.yml ps
"

echo ""
echo "🎉🎉🎉 ULTRA-FAST деплой завершён успешно! 🎉🎉🎉"
echo ""
echo "🌐 Приложение доступно по адресам:"
echo "   Frontend: http://$SERVER_IP"
echo "   Backend:  http://$SERVER_IP:5000"
echo "   Brama:    http://$SERVER_IP:5001"
echo ""
echo "🔍 Полезные команды для проверки:"
echo "   ssh -i $SSH_KEY $SERVER_USER@$SERVER_IP"
echo "   cd $PROJECT_DIR && docker compose -f docker-compose.prod.yml logs -f"
echo "   cd $PROJECT_DIR && docker compose -f docker-compose.prod.yml ps"
echo ""
echo "⚡ Преимущества этого скрипта:"
echo "   • Копирует только изменённые файлы (rsync)"
echo "   • Использует кэш Docker для ускорения сборки"
echo "   • Не удаляет существующие файлы без необходимости"
echo ""
if [ "$FULL_REBUILD" != "true" ]; then
    echo "💡 Для полной очистки используйте: FULL_REBUILD=true ./scripts/deploy-fast.sh"
    echo ""
fi

