#!/bin/bash

# =================================
# MCP Dashboard - Deploy Script (Docker)
# =================================
# Независимый проект: разворачивается в отдельную папку на сервере (соседнюю с ed_analytics).
# Запуск из папки mcp_dashboard: sh scripts/deploy.sh
# Или из корня репозитория: sh mcp_dashboard/scripts/deploy.sh

set -e

# =================================
# КОНФИГУРАЦИЯ
# =================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MCP_DASHBOARD_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# .env из папки mcp_dashboard или из корня репо (если деплоим из ed_analytics)
if [ -f "$MCP_DASHBOARD_DIR/.env" ]; then
    export $(grep -v '^#' "$MCP_DASHBOARD_DIR/.env" | grep -v '^$' | xargs)
fi
REPO_ROOT="$(cd "$MCP_DASHBOARD_DIR/../.." 2>/dev/null && pwd || true)"
if [ -n "$REPO_ROOT" ] && [ -f "$REPO_ROOT/.env" ]; then
    export $(grep -v '^#' "$REPO_ROOT/.env" | grep -v '^$' | xargs)
fi

SERVER_IP="${SERVER_IP:-130.193.46.4}"
SERVER_USER="${SERVER_USER:-appuser}"
SSH_KEY="${SSH_KEY:-~/.ssh/llm-cpu/appuser-ed25519}"
PROJECT_DIR="${PROJECT_DIR:-mcp_dashboard}"
LOCAL_DIR="$MCP_DASHBOARD_DIR"

FULL_REBUILD="false"

while getopts "fh" opt; do
    case $opt in
        f) FULL_REBUILD="true" ;;
        h)
            echo "Использование: $0 [-f] [-h]"
            echo "  -f    Полная пересборка (без кэша Docker)"
            echo "  -h    Справка"
            exit 0
            ;;
        \?) echo "Неверная опция: -$OPTARG" >&2; exit 1 ;;
    esac
done

echo "🚀 Деплой MCP Dashboard на сервер..."
echo "📍 Сервер: ${SERVER_USER}@${SERVER_IP}"
echo "🗂️  Локально: ${LOCAL_DIR}"
echo "📁 На сервере: ~/${PROJECT_DIR}"
if [ "$FULL_REBUILD" = "true" ]; then
    echo "⚠️  Режим: ПОЛНАЯ ПЕРЕСБОРКА"
else
    echo "⚡ Режим: быстрая пересборка (кэш Docker)"
fi
echo ""

SSH_KEY="${SSH_KEY/#\~/$HOME}"

if [ ! -f "$SSH_KEY" ]; then
    echo "❌ SSH ключ не найден: $SSH_KEY"
    exit 1
fi

if [ ! -f "$LOCAL_DIR/package.json" ]; then
    echo "❌ Не найдена папка mcp_dashboard (package.json)"
    exit 1
fi

echo "1️⃣ Структура папок на сервере..."
ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_IP" "
    mkdir -p $PROJECT_DIR/{src,public,data,scripts}
    echo '✅ Готово'
"

echo ""
echo "2️⃣ Копируем конфиги и Docker..."
ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_IP" "
    rm -rf $PROJECT_DIR/src $PROJECT_DIR/public $PROJECT_DIR/data $PROJECT_DIR/scripts
    echo '🗑️  Старые файлы удалены'
"

scp -i "$SSH_KEY" \
    "$LOCAL_DIR/package.json" \
    "$LOCAL_DIR/tsconfig.json" \
    "$LOCAL_DIR/Dockerfile" \
    "$LOCAL_DIR/.dockerignore" \
    "$LOCAL_DIR/docker-compose.yml" \
    "$LOCAL_DIR/.env.example" \
    "$SERVER_USER@$SERVER_IP:~/$PROJECT_DIR/"

echo ""
echo "3️⃣ Копируем исходники и данные..."
scp -i "$SSH_KEY" -r \
    "$LOCAL_DIR/src/" \
    "$LOCAL_DIR/public/" \
    "$LOCAL_DIR/data/" \
    "$LOCAL_DIR/scripts/" \
    "$SERVER_USER@$SERVER_IP:~/$PROJECT_DIR/"

echo "✅ Файлы скопированы"

echo ""
echo "4️⃣ Права на скрипты..."
ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_IP" "
    chmod +x $PROJECT_DIR/scripts/*.sh 2>/dev/null || true
    echo '✅ Готово'
"

echo ""
echo "5️⃣ Проверяем Docker на сервере..."
ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_IP" "
    if ! command -v docker &> /dev/null; then
        echo '❌ Docker не установлен. Установите Docker на сервере.'
        exit 1
    fi
    if docker compose version &> /dev/null; then
        DOCKER_COMPOSE='docker compose'
    else
        DOCKER_COMPOSE='docker-compose'
    fi
    echo '✅ Docker доступен'
"

echo ""
echo "5.5️⃣ Настраиваем .env на сервере (SERVER_IP для ссылок на дашборды)..."
# SERVER_IP подставляется с локальной машины (из .env деплоя)
ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_IP" "
    cd $PROJECT_DIR
    if [ ! -f .env ]; then
        cp .env.example .env 2>/dev/null || true
    fi
    if ! grep -q '^SERVER_IP=' .env 2>/dev/null; then
        echo \"SERVER_IP=$SERVER_IP\" >> .env
        echo '  Добавлен SERVER_IP в .env'
    else
        sed -i.bak \"s/^SERVER_IP=.*/SERVER_IP=$SERVER_IP/\" .env 2>/dev/null || true
    fi
"
echo "✅ Готово"

echo ""
echo "6️⃣ Собираем образ на сервере..."
if ! ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_IP" "
    set -e
    cd $PROJECT_DIR
    if docker compose version &> /dev/null; then
        DC='docker compose'
    else
        DC='docker-compose'
    fi
    if [ '$FULL_REBUILD' = 'true' ]; then
        \$DC -f docker-compose.yml build --no-cache
    else
        \$DC -f docker-compose.yml build
    fi
"; then
    echo ""
    echo "❌ ОШИБКА ДЕПЛОЯ: сборка Docker-образа завершилась с ошибкой."
    echo "   Проверьте вывод выше (шаг 6). Исправьте ошибки и запустите деплой снова."
    echo "   Полная пересборка: sh scripts/deploy.sh -f"
    exit 1
fi

echo ""
echo "7️⃣ Запускаем контейнер..."
ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_IP" "
    set -e
    cd $PROJECT_DIR
    if docker compose version &> /dev/null; then
        DC='docker compose'
    else
        DC='docker-compose'
    fi
    # down не трогает контейнеры с тем же container_name, созданные другим compose-проектом
    \$DC -f docker-compose.yml down --remove-orphans 2>/dev/null || true
    docker rm -f mcp_dashboard_prod mcp_dashboard_dozzle 2>/dev/null || true
    \$DC -f docker-compose.yml up -d
    echo ''
    echo '📊 Статус:'
    \$DC -f docker-compose.yml ps
"

echo ""
echo "🎉 Деплой MCP Dashboard завершён."
echo ""
echo "🌐 Сервис: http://${SERVER_IP}:3100 (порт задаётся MCP_DASHBOARD_PORT в .env)"
echo "   Дашборды: http://${SERVER_IP}:3100/dashboard/<id>"
echo "   Логи (Dozzle): http://${SERVER_IP}:${DOZZLE_PORT:-9999}"
echo ""
echo "🔍 На сервере: cd $PROJECT_DIR && docker compose -f docker-compose.yml logs -f"
echo "   Остановка: cd $PROJECT_DIR && docker compose -f docker-compose.yml down"
echo ""
