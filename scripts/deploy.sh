#!/bin/bash
# OlimpX Docker Deployment Script
# Bu script serverda loyihani Docker orqali avtomatik yangilash va ishga tushirish uchun.

# Ranglar
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}==========================================${NC}"
echo -e "${BLUE}🐳 OlimpX Docker Deployment boshlandi...${NC}"
echo -e "${BLUE}==========================================${NC}"

# Docker Compose buyrug'ini aniqlash
DOCKER_COMPOSE_CMD="docker-compose"
if ! command -v docker-compose &> /dev/null; then
    if docker compose version &> /dev/null; then
        DOCKER_COMPOSE_CMD="docker compose"
    else
        echo -e "${RED}❌ Docker Compose topilmadi (docker-compose ham, docker compose ham)!${NC}"
        echo -e "${YELLOW}Iltimos, Docker Compose'ni o'rnating.${NC}"
        exit 1
    fi
fi

# 1. Kodni yangilash (Git pull)
# Script o'zini o'zi yangilasa, qayta ishga tushishi kerak
if [[ "$INTERNAL_RESTART" != "true" ]]; then
    echo -e "\n${BLUE}Step 1: Kodni yangilash (Git pull)...${NC}"
    git pull origin main
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Kod muvaffaqiyatli yangilandi.${NC}"
        echo -e "${YELLOW}🔄 Script yangilandi, qayta ishga tushirilmoqda...${NC}"
        export INTERNAL_RESTART="true"
        exec bash "$0" "$@"
    else
        echo -e "${YELLOW}⚠️ Git pull muvaffaqiyatsiz (kodni qo'lda tekshiring).${NC}"
    fi
fi

# Tozalash rejimi (agar --clean flagi bo'lsa)
if [[ "$1" == "--clean" ]]; then
    echo -e "${YELLOW}🧹 Tozalash (Cleanup) boshlandi...${NC}"
    rm -rf node_modules backend/node_modules
    $DOCKER_COMPOSE_CMD down -v --remove-orphans &> /dev/null
    echo -e "${GREEN}✅ Tozalash yakunlandi.${NC}"
fi

# 2. .env faylni tekshirish
echo -e "\n${BLUE}Step 2: Environment (.env) tekshirish...${NC}"
if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        echo -e "${YELLOW}⚠️ .env fayli topilmadi. .env.example dan nusxa olinmoqda...${NC}"
        cp .env.example .env
        echo -e "${RED}❌ Iltimos, yangi yaratilgan .env faylini tahrirlang va qaytadan ishga tushiring!${NC}"
        exit 1
    else
        echo -e "${RED}❌ .env fayli topilmadi!${NC}"
        exit 1
    fi
fi

# .env dan o'zgaruvchilarni olish
DOMAIN=$(grep "^DOMAIN[[:space:]]*=" .env | cut -d'=' -f2- | sed 's/^[[:space:]]*//;s/[[:space:]]*$//' | tr -d '"' | tr -d "'")
SSL_EMAIL=$(grep "^SSL_EMAIL[[:space:]]*=" .env | cut -d'=' -f2- | tr -d '"' | tr -d "'" | xargs)
PG_USER=$(grep "^POSTGRES_USER[[:space:]]*=" .env | cut -d'=' -f2- | tr -d '"' | tr -d "'" | tr -d '[:space:]')
PG_USER="${PG_USER:-postgres}"

# 3. Docker konteynerlarni yangilash
echo -e "\n${BLUE}Step 3: Docker konteynerlarni qurish va ishga tushirish...${NC}"

if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker topilmadi! Iltimos, avval Dockerni o'rnating.${NC}"
    exit 1
fi

echo -e "� Global nginx-proxy orqali ishga tushirilmoqda. Domain: ${YELLOW}$DOMAIN${NC}"
DOCKER_FILE="docker-compose.yml"

echo "🏗️  Konteynerlar qurilmoqda..."
$DOCKER_COMPOSE_CMD -f $DOCKER_FILE down
$DOCKER_COMPOSE_CMD -f $DOCKER_FILE up -d --build

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Docker Compose ishga tushirishda xatolik!${NC}"
    exit 1
fi

# 4. Database Setup (Konteyner ichida)
echo -e "\n${BLUE}Step 4: Database sozlash...${NC}"
echo "⏳ Konteynerlar o'z-o'zini sozlashini (Prisma/Seed) kutilmoqda..."
echo "ℹ️  Barcha jarayonlar entrypoint.sh orqali konteyner ichida bajarilmoqda."
sleep 10 # Konteynerlar o'zini sozlab olishi uchun biroz kutamiz

echo -e "\n${GREEN}==========================================${NC}"
echo -e "${GREEN}✅ Docker Deployment muvaffaqiyatli yakunlandi!${NC}"
echo -e "${GREEN}🌐 Sayt: https://${DOMAIN}${NC}"
echo -e "${YELLOW}ℹ️  Eslatma: SSL va yo'naltirish global nginx-proxy orqali boshqariladi.${NC}"
echo -e "${GREEN}==========================================${NC}"

docker ps | grep olimpx

