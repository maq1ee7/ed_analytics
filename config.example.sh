#!/bin/bash

# =================================
# ED Analytics - Пример конфигурации
# =================================
# 
# Скопируйте этот файл в config.sh и измените значения под ваш сервер:
# cp config.example.sh config.sh
#
# Затем в скриптах deploy.sh и update.sh замените секцию конфигурации на:
# source ./config.sh

# Данные вашего сервера
SERVER_IP="your-server-ip"              # Замените на IP вашего сервера
SERVER_USER="your-username"             # Замените на имя пользователя
SSH_KEY="~/.ssh/your-key"              # Путь к SSH ключу (~ автоматически раскроется)
PROJECT_DIR="ed_analytics"              # Название папки проекта на сервере
LOCAL_DIR="$(pwd)"                      # Текущая папка (оставьте как есть)

# Примеры правильных путей к SSH ключам:
# SSH_KEY="~/.ssh/id_rsa"                    # Стандартный RSA ключ
# SSH_KEY="~/.ssh/id_ed25519"                # ED25519 ключ
# SSH_KEY="~/.ssh/my-server-key"             # Кастомное имя
# SSH_KEY="/Users/username/.ssh/my-key"      # Полный путь (без ~)

# Проверка обязательных переменных
if [[ "$SERVER_IP" == "your-server-ip" ]]; then
    echo "❌ Ошибка: Настройте конфигурацию в config.sh"
    echo "📝 Скопируйте config.example.sh в config.sh и измените значения"
    exit 1
fi

echo "✅ Конфигурация загружена:"
echo "   Сервер: ${SERVER_USER}@${SERVER_IP}"
echo "   SSH ключ: ${SSH_KEY}"
echo ""
