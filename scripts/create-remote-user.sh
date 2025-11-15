#!/bin/bash

# =================================
# Скрипт для создания пользователя на УДАЛЕННОМ сервере
# =================================

set -e

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# =================================
# Конфигурация удаленного сервера
# =================================

# Загружаем переменные из .env если он существует
if [ -f "$(pwd)/.env" ]; then
    # Экспортируем переменные из .env (игнорируем комментарии и пустые строки)
    export $(grep -v '^#' "$(pwd)/.env" | grep -v '^$' | xargs)
fi

# Значения по умолчанию (из deploy.sh)
DEFAULT_SERVER_IP="${SERVER_IP:-130.193.46.4}"
DEFAULT_SERVER_USER="${SERVER_USER:-appuser}"
DEFAULT_SSH_KEY="${SSH_KEY:-~/.ssh/llm-cpu/appuser-ed25519}"
DEFAULT_PROJECT_DIR="${PROJECT_DIR:-ed_analytics}"

# Если передан аргумент, используем его как хост
if [ -n "$1" ]; then
    REMOTE_HOST="$1"
else
    # Или читаем из переменной окружения
    if [ -z "$REMOTE_HOST" ]; then
        # Используем значения по умолчанию
        REMOTE_HOST="${DEFAULT_SERVER_USER}@${DEFAULT_SERVER_IP}"
        echo -e "${YELLOW}💡 Используются креды по умолчанию из deploy.sh${NC}"
    fi
fi

# SSH ключ
SSH_KEY="${SSH_KEY:-$DEFAULT_SSH_KEY}"
SSH_KEY="${SSH_KEY/#\~/$HOME}"

# Путь к проекту на удаленном сервере
REMOTE_PROJECT_PATH="${REMOTE_PROJECT_PATH:-$DEFAULT_PROJECT_DIR}"

echo -e "${BLUE}🌐 Создание пользователя на удаленном сервере${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${YELLOW}🖥️  Удаленный хост:${NC} $REMOTE_HOST"
echo -e "${YELLOW}🔑 SSH ключ:${NC} $SSH_KEY"
echo -e "${YELLOW}📁 Путь к проекту:${NC} $REMOTE_PROJECT_PATH"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Проверка доступности сервера
echo -e "${BLUE}🔍 Проверяю доступность сервера...${NC}"
if ! ssh -i "$SSH_KEY" -o ConnectTimeout=5 -o BatchMode=yes "$REMOTE_HOST" "echo 'OK'" &>/dev/null; then
    echo -e "${RED}❌ Не могу подключиться к серверу!${NC}"
    echo ""
    echo "Проверьте:"
    echo "  1. Правильность адреса сервера: $REMOTE_HOST"
    echo "  2. SSH ключ существует: $SSH_KEY"
    echo "  3. Сервер доступен по сети"
    exit 1
fi
echo -e "${GREEN}✅ Сервер доступен${NC}"
echo ""

# Проверка, что проект существует на сервере
echo -e "${BLUE}🔍 Проверяю наличие проекта на сервере...${NC}"
if ! ssh -i "$SSH_KEY" "$REMOTE_HOST" "[ -d $REMOTE_PROJECT_PATH ]"; then
    echo -e "${RED}❌ Проект не найден по пути: $REMOTE_PROJECT_PATH${NC}"
    echo ""
    echo "Укажите правильный путь через переменную окружения:"
    echo "  export REMOTE_PROJECT_PATH=/path/to/project"
    exit 1
fi
echo -e "${GREEN}✅ Проект найден${NC}"
echo ""

# Проверка, что контейнеры запущены
echo -e "${BLUE}🔍 Проверяю запущенные контейнеры...${NC}"
BACKEND_CONTAINER=$(ssh -i "$SSH_KEY" "$REMOTE_HOST" "docker ps --filter 'name=ed_analytics_backend' --format '{{.Names}}' | head -n 1")

if [ -z "$BACKEND_CONTAINER" ]; then
    echo -e "${RED}❌ Backend контейнер не запущен на удаленном сервере!${NC}"
    echo ""
    echo "Запустите контейнеры на сервере:"
    echo "  ssh $REMOTE_HOST 'cd $REMOTE_PROJECT_PATH && docker-compose -f docker-compose.prod.yml up -d'"
    exit 1
fi

echo -e "${GREEN}✅ Backend контейнер найден:${NC} $BACKEND_CONTAINER"
echo ""

# Создаем пользователя на удаленном сервере
echo -e "${BLUE}🚀 Создаю пользователя в базе данных...${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Тестовые данные пользователя
TEST_USERNAME="testuser"
TEST_PASSWORD="password123"
TEST_ROLE="user"

# Генерируем bcrypt хеш для пароля (через Node.js в backend контейнере)
echo -e "${BLUE}🔐 Генерирую хеш пароля...${NC}"
PASSWORD_HASH=$(ssh -i "$SSH_KEY" "$REMOTE_HOST" "docker exec $BACKEND_CONTAINER node -e \"const bcrypt = require('bcrypt'); console.log(bcrypt.hashSync('$TEST_PASSWORD', 10));\"")

if [ -z "$PASSWORD_HASH" ]; then
    echo -e "${RED}❌ Не удалось сгенерировать хеш пароля${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Хеш пароля сгенерирован${NC}"
echo -e "${YELLOW}🔍 Хеш:${NC} ${PASSWORD_HASH:0:20}..." 
echo ""

# Находим PostgreSQL контейнер
POSTGRES_CONTAINER=$(ssh -i "$SSH_KEY" "$REMOTE_HOST" "docker ps --filter 'name=ed_analytics_postgres' --format '{{.Names}}' | head -n 1")

if [ -z "$POSTGRES_CONTAINER" ]; then
    echo -e "${RED}❌ PostgreSQL контейнер не найден!${NC}"
    exit 1
fi

echo -e "${BLUE}📊 PostgreSQL контейнер:${NC} $POSTGRES_CONTAINER"
echo ""

# Создаем пользователя через SQL
echo -e "${BLUE}👤 Создаю пользователя...${NC}"

# Экранируем $ в хеше для правильной передачи через SSH и SQL
ESCAPED_HASH=$(echo "$PASSWORD_HASH" | sed 's/\$/\\$/g')

ssh -i "$SSH_KEY" "$REMOTE_HOST" "docker exec $POSTGRES_CONTAINER psql -U ed_user -d ed_analytics -c \"
DO \\\$\\\$
DECLARE
    user_id INTEGER;
BEGIN
    -- Проверяем существует ли пользователь
    SELECT id INTO user_id FROM users WHERE username = '$TEST_USERNAME';
    
    IF user_id IS NOT NULL THEN
        RAISE NOTICE 'Пользователь \\\"$TEST_USERNAME\\\" уже существует с ID: %', user_id;
    ELSE
        -- Создаем нового пользователя
        INSERT INTO users (username, password_hash, role, created_at)
        VALUES ('$TEST_USERNAME', E'$ESCAPED_HASH', '$TEST_ROLE', NOW())
        RETURNING id INTO user_id;
        
        RAISE NOTICE 'Пользователь создан с ID: %', user_id;
    END IF;
END \\\$\\\$;
\""

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}🎉 Пользователь успешно создан на удаленном сервере!${NC}"
echo ""
echo "📋 Учетные данные для входа:"
echo -e "   ${YELLOW}Логин:${NC}    $TEST_USERNAME"
echo -e "   ${YELLOW}Пароль:${NC}   $TEST_PASSWORD"
echo ""
echo "🔗 Адрес для входа:"
# Получаем IP из REMOTE_HOST
SERVER_IP=$(echo "$REMOTE_HOST" | sed 's/.*@//')
echo "   http://$SERVER_IP/login"
echo ""

