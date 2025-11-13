#!/bin/bash

# =================================
# ED Analytics - Deploy Script (FAST)
# =================================

set -e  # Прекращаем выполнение при ошибке

# =================================
# КОНФИГУРАЦИЯ - ИЗМЕНИТЕ ПОД ВАШ СЕРВЕР
# =================================
SERVER_IP="130.193.46.4"                    # IP адрес вашего сервера
SERVER_USER="appuser"                       # Имя пользователя на сервере
SSH_KEY="~/.ssh/llm-cpu/appuser-ed25519"   # Путь к SSH ключу (используйте ~ вместо полного пути)
PROJECT_DIR="ed_analytics"                  # Название папки проекта на сервере
LOCAL_DIR="$(pwd)"                          # Текущая папка (автоматически)

# Флаг для полной пересборки (по умолчанию выключен для скорости)
FULL_REBUILD="false"

# Обработка аргументов командной строки
while getopts "fh" opt; do
    case $opt in
        f)
            FULL_REBUILD="true"
            ;;
        h)
            echo "Использование: $0 [-f] [-h]"
            echo ""
            echo "Опции:"
            echo "  -f    Полная пересборка (без использования кэша Docker)"
            echo "  -h    Показать эту справку"
            echo ""
            echo "Примеры:"
            echo "  sh scripts/deploy.sh       # Быстрый деплой с кэшем"
            echo "  sh scripts/deploy.sh -f    # Полная пересборка без кэша"
            exit 0
            ;;
        \?)
            echo "Неверная опция: -$OPTARG" >&2
            echo "Используйте -h для справки"
            exit 1
            ;;
    esac
done

echo "🚀 Начинаем БЫСТРЫЙ деплой ED Analytics на сервер..."
echo "📍 Сервер: ${SERVER_USER}@${SERVER_IP}"
echo "🗂️  Локальная папка: ${LOCAL_DIR}"
if [ "$FULL_REBUILD" = "true" ]; then
    echo "⚠️  Режим: ПОЛНАЯ ПЕРЕСБОРКА (медленно)"
else
    echo "⚡ Режим: БЫСТРАЯ ПЕРЕСБОРКА (с использованием кэша)"
    echo "💡 Для полной пересборки: sh scripts/deploy.sh -f"
fi
echo ""

# Раскрываем тильду в пути к SSH ключу
SSH_KEY="${SSH_KEY/#\~/$HOME}"

# Проверяем наличие SSH ключа
if [ ! -f "$SSH_KEY" ]; then
    echo "❌ SSH ключ не найден: $SSH_KEY"
    echo "💡 Проверьте путь к ключу в конфигурации скрипта"
    exit 1
fi

# Проверяем наличие локальной папки
if [ ! -d "$LOCAL_DIR" ]; then
    echo "❌ Локальная папка проекта не найдена: $LOCAL_DIR"
    exit 1
fi

echo "1️⃣ Проверяем структуру папок на сервере..."
ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_IP" "
    # Создаем структуру папок если её нет (не удаляем существующую!)
    mkdir -p $PROJECT_DIR/{backend/src,backend/migrations,brama/src,brama/data,telegram-bot/src,frontend/src,scripts}
    echo '✅ Структура папок готова'
"

echo ""
echo "2️⃣ Копируем backend файлы..."
scp -i "$SSH_KEY" \
    "$LOCAL_DIR/backend/package.json" \
    "$LOCAL_DIR/backend/tsconfig.json" \
    "$LOCAL_DIR/backend/Dockerfile" \
    "$LOCAL_DIR/backend/.dockerignore" \
    "$SERVER_USER@$SERVER_IP:~/$PROJECT_DIR/backend/"

scp -i "$SSH_KEY" -r \
    "$LOCAL_DIR/backend/src/" \
    "$LOCAL_DIR/backend/migrations/" \
    "$SERVER_USER@$SERVER_IP:~/$PROJECT_DIR/backend/"

echo "✅ Backend файлы и миграции скопированы"

echo ""
echo "3️⃣ Копируем frontend файлы..."
scp -i "$SSH_KEY" \
    "$LOCAL_DIR/frontend/package.json" \
    "$LOCAL_DIR/frontend/tsconfig.json" \
    "$LOCAL_DIR/frontend/tsconfig.node.json" \
    "$LOCAL_DIR/frontend/vite.config.ts" \
    "$LOCAL_DIR/frontend/tailwind.config.js" \
    "$LOCAL_DIR/frontend/postcss.config.js" \
    "$LOCAL_DIR/frontend/index.html" \
    "$LOCAL_DIR/frontend/Dockerfile" \
    "$LOCAL_DIR/frontend/.dockerignore" \
    "$LOCAL_DIR/frontend/nginx.conf" \
    "$SERVER_USER@$SERVER_IP:~/$PROJECT_DIR/frontend/"

scp -i "$SSH_KEY" -r \
    "$LOCAL_DIR/frontend/src/" \
    "$LOCAL_DIR/frontend/public/" \
    "$SERVER_USER@$SERVER_IP:~/$PROJECT_DIR/frontend/"

echo "✅ Frontend файлы скопированы"

echo ""
echo "4️⃣ Копируем Brama файлы..."
scp -i "$SSH_KEY" \
    "$LOCAL_DIR/brama/package.json" \
    "$LOCAL_DIR/brama/tsconfig.json" \
    "$LOCAL_DIR/brama/Dockerfile" \
    "$LOCAL_DIR/brama/.dockerignore" \
    "$LOCAL_DIR/brama/README.md" \
    "$SERVER_USER@$SERVER_IP:~/$PROJECT_DIR/brama/"

scp -i "$SSH_KEY" -r \
    "$LOCAL_DIR/brama/src/" \
    "$LOCAL_DIR/brama/data/" \
    "$SERVER_USER@$SERVER_IP:~/$PROJECT_DIR/brama/"

echo "✅ Brama файлы скопированы"

echo ""
echo "5️⃣ Копируем Telegram Bot файлы..."
scp -i "$SSH_KEY" \
    "$LOCAL_DIR/telegram-bot/package.json" \
    "$LOCAL_DIR/telegram-bot/tsconfig.json" \
    "$LOCAL_DIR/telegram-bot/Dockerfile" \
    "$LOCAL_DIR/telegram-bot/.dockerignore" \
    "$LOCAL_DIR/telegram-bot/README.md" \
    "$LOCAL_DIR/telegram-bot/QUICKSTART.md" \
    "$SERVER_USER@$SERVER_IP:~/$PROJECT_DIR/telegram-bot/"

scp -i "$SSH_KEY" -r \
    "$LOCAL_DIR/telegram-bot/src/" \
    "$SERVER_USER@$SERVER_IP:~/$PROJECT_DIR/telegram-bot/"

echo "✅ Telegram Bot файлы скопированы"

echo ""
echo "6️⃣ Копируем Docker и скрипты..."
scp -i "$SSH_KEY" \
    "$LOCAL_DIR/docker-compose.prod.yml" \
    "$LOCAL_DIR/README.md" \
    "$LOCAL_DIR/.gitignore" \
    "$SERVER_USER@$SERVER_IP:~/$PROJECT_DIR/"

scp -i "$SSH_KEY" -r \
    "$LOCAL_DIR/scripts/" \
    "$SERVER_USER@$SERVER_IP:~/$PROJECT_DIR/"

echo "✅ Docker конфигурация и скрипты скопированы"

echo ""
echo "7️⃣ Настраиваем права на сервере..."
ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_IP" "
    cd $PROJECT_DIR
    chmod +x scripts/*.sh
    echo '✅ Права на выполнение установлены'
"

echo ""
echo "8️⃣ Проверяем Docker на сервере..."
ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_IP" "
    if ! command -v docker &> /dev/null; then
        echo '📦 Устанавливаем Docker...'
        curl -fsSL https://get.docker.com -o get-docker.sh
        sudo sh get-docker.sh
        sudo usermod -aG docker \$USER
        echo '⚠️  ВНИМАНИЕ: Перезайдите на сервер для применения прав Docker!'
        echo '⚠️  После перезахода выполните: cd $PROJECT_DIR && ./scripts/start-production.sh'
        exit 0
    else
        echo '✅ Docker уже установлен'
        docker --version
    fi
    
    # Проверяем docker compose (новый формат)
    if docker compose version &> /dev/null; then
        echo '✅ Docker Compose (новый формат) доступен'
    elif command -v docker-compose &> /dev/null; then
        echo '✅ Docker Compose (старый формат) доступен'
    else
        echo '📦 Устанавливаем Docker Compose...'
        sudo curl -L \"https://github.com/docker/compose/releases/latest/download/docker-compose-\$(uname -s)-\$(uname -m)\" -o /usr/local/bin/docker-compose
        sudo chmod +x /usr/local/bin/docker-compose
        echo '✅ Docker Compose установлен'
    fi
"

echo ""
echo "9️⃣ Запускаем приложение в продакшн режиме..."
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
echo "🎉 Деплой завершён успешно!"
echo ""
echo "🌐 Приложение доступно по адресам:"
echo "   Frontend:     http://$SERVER_IP"
echo "   Backend:      http://$SERVER_IP:5000"
echo "   Brama:        http://$SERVER_IP:5001"
echo "   Telegram Bot: @brama_dev_bot (работает в фоновом режиме)"
echo ""
echo "🔍 Полезные команды для проверки:"
echo "   ssh -i $SSH_KEY $SERVER_USER@$SERVER_IP"
echo "   cd $PROJECT_DIR && docker compose -f docker-compose.prod.yml logs -f"
echo "   cd $PROJECT_DIR && docker compose -f docker-compose.prod.yml logs telegram-bot"
echo "   cd $PROJECT_DIR && docker compose -f docker-compose.prod.yml ps"
echo ""
echo "📱 Telegram Bot:"
echo "   Бот: @brama_dev_bot"
echo "   Whitelist: @v_karlov, @kochemirov"
echo "   ⚠️  TODO: Не забудьте заменить TELEGRAM_BOT_TOKEN и TELEGRAM_BOT_API_KEY перед продакшеном!"
echo ""
if [ "$FULL_REBUILD" != "true" ]; then
    echo "💡 Совет: Следующий деплой будет ещё быстрее благодаря кэшу Docker!"
    echo "⚠️  Для полной очистки кэша используйте: sh scripts/deploy.sh -f"
    echo ""
fi
