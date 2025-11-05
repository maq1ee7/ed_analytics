#!/bin/bash

# Скрипт для загрузки и восстановления Neo4j дампа на удаленном сервере
# Использование: ./scripts/restore-neo4j.sh [server_ip] [dump_file]

set -e  # Остановить выполнение при ошибке

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Параметры
SERVER_IP=${1:-"130.193.46.4"}
DUMP_FILE=${2:-"neo4j.dump"}
SSH_USER=${SSH_USER:-"appuser"}
SSH_KEY=${SSH_KEY:-"~/.ssh/llm-cpu/appuser-ed25519"}
DOCKER_COMPOSE_FILE="docker-compose.prod.yml"
NEO4J_CONTAINER="ed_analytics_neo4j_prod"
DATABASE_NAME="neo4j"
PROJECT_DIR="ed_analytics"

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Neo4j Database Restore Script         ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Раскрываем тильду в пути к SSH ключу
SSH_KEY="${SSH_KEY/#\~/$HOME}"

# Проверка SSH ключа
if [ ! -f "$SSH_KEY" ]; then
    echo -e "${RED}✗ SSH ключ не найден: $SSH_KEY${NC}"
    exit 1
fi

echo -e "${GREEN}✓ SSH ключ найден: $SSH_KEY${NC}"

# Проверка наличия файла дампа локально
if [ ! -f "$DUMP_FILE" ]; then
    echo -e "${RED}✗ Ошибка: Файл дампа '$DUMP_FILE' не найден!${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Файл дампа найден: $DUMP_FILE${NC}"
DUMP_SIZE=$(du -h "$DUMP_FILE" | cut -f1)
echo -e "${BLUE}  Размер: $DUMP_SIZE${NC}"
echo ""

# Подтверждение
echo -e "${YELLOW}⚠ ВНИМАНИЕ: Эта операция заменит все данные в Neo4j на сервере $SERVER_IP${NC}"
echo -e "${YELLOW}  Контейнер: $NEO4J_CONTAINER${NC}"
echo -e "${YELLOW}  База данных: $DATABASE_NAME${NC}"
echo ""
read -p "Продолжить? (yes/no): " -r
echo ""
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo -e "${RED}Отменено пользователем${NC}"
    exit 1
fi

# Шаг 1: Копирование дампа на сервер
echo -e "${BLUE}[1/6] Копирование дампа на сервер...${NC}"
echo "scp -i $SSH_KEY $DUMP_FILE ${SSH_USER}@${SERVER_IP}:~/${PROJECT_DIR}/neo4j.dump"
scp -i "$SSH_KEY" "$DUMP_FILE" "${SSH_USER}@${SERVER_IP}:~/${PROJECT_DIR}/neo4j.dump"
echo -e "${GREEN}✓ Дамп скопирован на сервер${NC}"
echo ""

# Шаг 2: Проверка что контейнер существует
echo -e "${BLUE}[2/6] Проверка контейнера Neo4j...${NC}"
ssh -i "$SSH_KEY" "${SSH_USER}@${SERVER_IP}" "cd ~/${PROJECT_DIR} && docker compose -f $DOCKER_COMPOSE_FILE ps neo4j"
echo -e "${GREEN}✓ Контейнер найден${NC}"
echo ""

# Шаг 3: Остановка Neo4j
echo -e "${BLUE}[3/6] Остановка Neo4j...${NC}"
ssh -i "$SSH_KEY" "${SSH_USER}@${SERVER_IP}" "cd ~/${PROJECT_DIR} && docker compose -f $DOCKER_COMPOSE_FILE stop neo4j"
echo -e "${GREEN}✓ Neo4j остановлен${NC}"
echo ""

# Шаг 4: Копирование дампа в контейнер и загрузка
echo -e "${BLUE}[4/6] Загрузка дампа в Neo4j...${NC}"
ssh -i "$SSH_KEY" "${SSH_USER}@${SERVER_IP}" << ENDSSH
cd ~/${PROJECT_DIR}

# Копируем дамп в volume контейнера
echo "Копирование дампа в контейнер..."
docker cp ~/ed_analytics/neo4j.dump ed_analytics_neo4j_prod:/var/lib/neo4j/neo4j.dump

# Запускаем контейнер временно для загрузки
echo "Временный запуск контейнера..."
docker compose -f docker-compose.prod.yml start neo4j
sleep 5

# Останавливаем базу данных внутри контейнера
echo "Остановка базы данных..."
docker exec ed_analytics_neo4j_prod neo4j stop || true
sleep 3

# Удаляем старую базу данных
echo "Удаление старой базы данных..."
docker exec ed_analytics_neo4j_prod rm -rf /data/databases/neo4j
docker exec ed_analytics_neo4j_prod rm -rf /data/transactions/neo4j

# Загружаем дамп
echo "Загрузка дампа..."
docker exec ed_analytics_neo4j_prod neo4j-admin database load neo4j --from-path=/var/lib/neo4j --overwrite-destination=true

# Устанавливаем правильные права
echo "Установка прав доступа..."
docker exec ed_analytics_neo4j_prod chown -R neo4j:neo4j /data

# Удаляем временный файл дампа
docker exec ed_analytics_neo4j_prod rm -f /var/lib/neo4j/neo4j.dump
rm -f ~/ed_analytics/neo4j.dump

echo "Загрузка завершена!"
ENDSSH

echo -e "${GREEN}✓ Дамп загружен${NC}"
echo ""

# Шаг 5: Запуск Neo4j
echo -e "${BLUE}[5/6] Запуск Neo4j...${NC}"
ssh -i "$SSH_KEY" "${SSH_USER}@${SERVER_IP}" "cd ~/${PROJECT_DIR} && docker compose -f $DOCKER_COMPOSE_FILE restart neo4j"
echo -e "${GREEN}✓ Neo4j запущен${NC}"
echo ""

# Шаг 6: Ожидание и проверка
echo -e "${BLUE}[6/6] Ожидание запуска Neo4j (30 секунд)...${NC}"
sleep 30

echo -e "${BLUE}Проверка статуса...${NC}"
ssh -i "$SSH_KEY" "${SSH_USER}@${SERVER_IP}" "cd ~/${PROJECT_DIR} && docker compose -f $DOCKER_COMPOSE_FILE ps neo4j"
echo ""

# Проверка здоровья
echo -e "${BLUE}Проверка доступности Neo4j...${NC}"
ssh -i "$SSH_KEY" "${SSH_USER}@${SERVER_IP}" "curl -s http://localhost:7474 > /dev/null && echo 'Neo4j доступен' || echo 'Neo4j недоступен'"
echo ""

echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  ✓ Восстановление завершено!           ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Доступ к Neo4j Browser:${NC}"
echo -e "  http://${SERVER_IP}:7474"
echo ""
echo -e "${BLUE}Для проверки данных выполните:${NC}"
echo -e "  ssh -i $SSH_KEY ${SSH_USER}@${SERVER_IP}"
echo -e "  cd ${PROJECT_DIR}"
echo -e "  docker exec -it $NEO4J_CONTAINER cypher-shell -u neo4j -p <password>"
echo -e "  Затем: MATCH (n) RETURN count(n)"
echo ""

