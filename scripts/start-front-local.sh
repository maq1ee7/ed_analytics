#!/bin/bash

# Скрипт для запуска фронтенда локально
# Автор: ED Analytics
# Дата: $(date +%Y-%m-%d)

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Запуск фронтенда ED Analytics...${NC}"
echo ""

# Определяем корневую папку проекта (на уровень выше от scripts)
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FRONTEND_DIR="$PROJECT_ROOT/frontend"

echo -e "${BLUE}📂 Корневая папка проекта: ${PROJECT_ROOT}${NC}"
echo -e "${BLUE}📂 Папка фронтенда: ${FRONTEND_DIR}${NC}"

if [ ! -d "$FRONTEND_DIR" ]; then
    echo -e "${RED}❌ Ошибка: Папка frontend не найдена по пути: $FRONTEND_DIR${NC}"
    echo -e "${YELLOW}📁 Доступные папки в корне проекта:${NC}"
    ls -la "$PROJECT_ROOT" | grep "^d"
    exit 1
fi

cd "$FRONTEND_DIR"

# Проверяем версию Node.js
echo -e "${BLUE}🔍 Проверяем версию Node.js...${NC}"
NODE_VERSION=$(node --version 2>/dev/null | cut -d'v' -f2 | cut -d'.' -f1)

if [ -z "$NODE_VERSION" ]; then
    echo -e "${RED}❌ Node.js не установлен!${NC}"
    echo -e "${YELLOW}📥 Установите Node.js версии 18 или выше:${NC}"
    echo -e "   • Через nvm: ${GREEN}nvm install 18 && nvm use 18${NC}"
    echo -e "   • Официальный сайт: ${GREEN}https://nodejs.org/${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Node.js версия: v$NODE_VERSION${NC}"

if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${YELLOW}⚠️  Внимание: Требуется Node.js версии 18 или выше!${NC}"
    echo -e "${YELLOW}   Текущая версия: v$NODE_VERSION${NC}"
    echo ""
    echo -e "${BLUE}🔧 Варианты решения:${NC}"
    echo ""
    echo -e "${YELLOW}1. Обновить Node.js через nvm (рекомендуется):${NC}"
    echo -e "   ${GREEN}curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash${NC}"
    echo -e "   ${GREEN}source ~/.bashrc  # или ~/.zshrc${NC}"
    echo -e "   ${GREEN}nvm install 18${NC}"
    echo -e "   ${GREEN}nvm use 18${NC}"
    echo ""
    echo -e "${YELLOW}2. Использовать Docker для разработки:${NC}"
    echo -e "   ${GREEN}cd $FRONTEND_DIR${NC}"
    echo -e "   ${GREEN}docker run -it --rm -v \$(pwd):/app -w /app -p 3000:3000 node:18-alpine sh${NC}"
    echo -e "   ${GREEN}# Внутри контейнера: npm install && npm run dev${NC}"
    echo ""
    echo -e "${YELLOW}3. Скачать Node.js 18+ с официального сайта:${NC}"
    echo -e "   ${GREEN}https://nodejs.org/en/download/${NC}"
    echo ""
    
    read -p "Хотите попробовать запустить с текущей версией? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${BLUE}👋 Обновите Node.js и запустите скрипт снова${NC}"
        exit 1
    fi
    echo -e "${YELLOW}⚠️  Пытаемся запустить с Node.js v$NODE_VERSION...${NC}"
fi

# Проверяем наличие package.json
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Файл package.json не найден в папке frontend!${NC}"
    exit 1
fi

# Проверяем наличие node_modules
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Папка node_modules не найдена. Устанавливаем зависимости...${NC}"
    npm install
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Ошибка при установке зависимостей!${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ Зависимости установлены${NC}"
else
    echo -e "${GREEN}✅ Зависимости уже установлены${NC}"
fi

# Показываем доступные скрипты
echo ""
echo -e "${BLUE}📋 Доступные команды:${NC}"
echo -e "   ${GREEN}dev${NC}     - Запуск в режиме разработки"
echo -e "   ${GREEN}build${NC}   - Сборка для продакшена"  
echo -e "   ${GREEN}preview${NC} - Предпросмотр собранного приложения"
echo ""

# Проверяем переменные окружения
echo -e "${BLUE}🔧 Настраиваем подключение к реальному бэкенду...${NC}"

# Загружаем переменные из .env в корне проекта если он существует
if [ -f "$PROJECT_ROOT/.env" ]; then
    # Экспортируем переменные из .env (игнорируем комментарии и пустые строки)
    export $(grep -v '^#' "$PROJECT_ROOT/.env" | grep -v '^$' | xargs)
fi

# URL реального бэкенда (из продакшен конфигурации)
# Используем SERVER_IP из .env или значение по умолчанию
SERVER_IP="${SERVER_IP:-130.193.46.4}"
REAL_API_URL="http://${SERVER_IP}:5000"

if [ -f ".env" ]; then
    echo -e "${YELLOW}📝 Файл .env уже существует${NC}"
    
    # Проверяем текущий API URL
    if grep -q "VITE_API_URL" .env; then
        CURRENT_API_URL=$(grep "VITE_API_URL" .env | cut -d '=' -f2)
        echo -e "${BLUE}🔍 Текущий API URL: $CURRENT_API_URL${NC}"
        
        # Если не настроен на реальный бэкенд, обновляем
        if [ "$CURRENT_API_URL" != "$REAL_API_URL" ]; then
            echo -e "${BLUE}🔄 Обновляем API URL на реальный бэкенд...${NC}"
            
            # Создаем резервную копию
            cp .env .env.backup
            
            # Обновляем URL
            sed -i.tmp "s|VITE_API_URL=.*|VITE_API_URL=$REAL_API_URL|g" .env && rm .env.tmp
            echo -e "${GREEN}✅ API URL обновлен на: $REAL_API_URL${NC}"
        else
            echo -e "${GREEN}✅ API URL уже настроен на реальный бэкенд${NC}"
        fi
    else
        # Добавляем VITE_API_URL если его нет
        echo "" >> .env
        echo "VITE_API_URL=$REAL_API_URL" >> .env
        echo -e "${GREEN}✅ Добавлен API URL: $REAL_API_URL${NC}"
    fi
else
    echo -e "${BLUE}🔧 Создаем .env файл с настройками для реального бэкенда...${NC}"
    cat > .env << EOF
# API URL для подключения к реальному бэкенду
VITE_API_URL=$REAL_API_URL

# Для локальной разработки можно временно использовать:
# VITE_API_URL=http://localhost:5000

# Дополнительные настройки
VITE_APP_TITLE=ED Analytics
VITE_APP_VERSION=1.0.0
EOF
    echo -e "${GREEN}✅ Создан .env файл с реальным API: $REAL_API_URL${NC}"
fi

echo -e "${GREEN}🌐 Фронтенд настроен для работы с реальным бэкендом: $REAL_API_URL${NC}"

echo ""
echo -e "${BLUE}🚀 Запускаем фронтенд в режиме разработки...${NC}"
echo -e "${BLUE}📱 Приложение будет доступно по адресу: ${GREEN}http://localhost:3000${NC}"
echo -e "${YELLOW}💡 Для остановки нажмите Ctrl+C${NC}"
echo ""

# Запускаем фронтенд
npm run dev

# Если команда завершилась с ошибкой
if [ $? -ne 0 ]; then
    echo ""
    echo -e "${RED}❌ Ошибка при запуске фронтенда!${NC}"
    echo ""
    echo -e "${BLUE}🔍 Возможные решения:${NC}"
    echo -e "1. ${YELLOW}Обновите Node.js до версии 18+${NC}"
    echo -e "2. ${YELLOW}Удалите node_modules и package-lock.json, затем выполните npm install${NC}"
    echo -e "3. ${YELLOW}Проверьте логи выше на наличие специфических ошибок${NC}"
    echo ""
    echo -e "${BLUE}🛠️  Команды для очистки:${NC}"
    echo -e "   ${GREEN}cd $FRONTEND_DIR${NC}"
    echo -e "   ${GREEN}rm -rf node_modules package-lock.json${NC}"
    echo -e "   ${GREEN}npm install${NC}"
    echo ""
    exit 1
fi