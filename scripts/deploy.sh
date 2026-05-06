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

# Tozalash rejimi (agar --clean flagi bo'lsa)
if [[ "$1" == "--clean" ]]; then
    echo -e "${YELLOW}🧹 Tozalash (Cleanup) boshlandi...${NC}"
    # Local node_modules larni o'chirish
    rm -rf node_modules backend/node_modules
    # Docker konteyner va volumelarni tozalash
    docker-compose down -v --remove-orphans &> /dev/null
    echo -e "${GREEN}✅ Tozalash yakunlandi.${NC}"
fi

# 1. Kodni yangilash
echo -e "\n${BLUE}Step 1: Kodni yangilash (Git pull)...${NC}"
git pull origin main
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Kod muvaffaqiyatli yangilandi.${NC}"
else
    echo -e "${YELLOW}⚠️ Git pull muvaffaqiyatsiz (lekin davom etamiz).${NC}"
fi

# 2. .env faylni tekshirish
echo -e "\n${BLUE}Step 2: Environment (.env) tekshirish...${NC}"
if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        echo -e "${YELLOW}⚠️ .env fayli topilmadi. .env.example dan nusxa olinmoqda...${NC}"
        cp .env.example .env
        echo -e "${RED}❌ Iltimos, yangi yaratilgan .env faylini tahrirlang!${NC}"
        exit 1
    else
        echo -e "${RED}❌ .env fayli topilmadi!${NC}"
        exit 1
    fi
fi

# DOMAIN va SSL holatini aniqlash
DOMAIN=$(grep "^DOMAIN[[:space:]]*=" .env | cut -d'=' -f2- | sed 's/^[[:space:]]*//;s/[[:space:]]*$//' | tr -d '"' | tr -d "'")

# 3. Docker konteynerlarni yangilash
echo -e "\n${BLUE}Step 3: Docker konteynerlarni qurish va ishga tushirish...${NC}"

# Docker va Docker Compose mavjudligini tekshirish
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker topilmadi! Iltimos, avval Dockerni o'rnating.${NC}"
    exit 1
fi

# SSL rejimini tanlash
if [ -n "$DOMAIN" ] && [ "$DOMAIN" != "your-domain.com" ] && [ -f "docker-compose.ssl.yml" ]; then
    echo -e "🔐 SSL (Nginx + Certbot) rejimi tanlandi."
    DOCKER_FILE="docker-compose.ssl.yml"
else
    echo -e "🚀 Standart rejim (SSL'siz) tanlandi."
    DOCKER_FILE="docker-compose.yml"
fi

# Konteynerlarni yangilash
echo "🏗️  Konteynerlar qurilmoqda..."
docker-compose -f $DOCKER_FILE down
docker-compose -f $DOCKER_FILE up -d --build

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Docker Compose ishga tushirishda xatolik!${NC}"
    exit 1
fi

# 4. Database Setup (Konteyner ichida)
echo -e "\n${BLUE}Step 4: Database sozlash (Migratsiya va Seed)...${NC}"
echo "⏳ Database va App tayyor bo'lishini kutilmoqda (30 soniya)..."
# Database yonishi uchun yetarli vaqt beramiz
sleep 30

# Prisma buyruqlarini konteyner ichida bajarish
echo "🔄 Prisma migratsiya va seed ishga tushmoqda..."
docker exec olimpx-app npm run db:setup

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Database muvaffaqiyatli sozlandi.${NC}"
else
    echo -e "${RED}❌ Database sozlashda xatolik!${NC}"
    echo -e "${YELLOW}Qayta urinib ko'rish: docker exec olimpx-app npm run db:setup${NC}"
fi

echo -e "\n${GREEN}==========================================${NC}"
echo -e "${GREEN}✅ Docker Deployment muvaffaqiyatli yakunlandi!${NC}"
echo -e "${GREEN}🌐 Sayt: https://${DOMAIN:-localhost}${NC}"
echo -e "${GREEN}==========================================${NC}"

# Holatni ko'rsatish
docker ps | grep olimpx
