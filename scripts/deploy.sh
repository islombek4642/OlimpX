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

# SSL rejimini aniqlash
SSL_MODE=false
if [ -n "$DOMAIN" ] && [ "$DOMAIN" != "your-domain.com" ] && [ -f "docker-compose.ssl.yml" ]; then
    echo -e "🔐 SSL (Nginx + Certbot) rejimi tanlandi. Domain: ${YELLOW}$DOMAIN${NC}"
    DOCKER_FILE="docker-compose.ssl.yml"
    SSL_MODE=true

    # nginx.conf ni templatedan yaratish
    if [ -f "nginx/nginx.conf.template" ]; then
        mkdir -p nginx
        sed "s/\${DOMAIN}/$DOMAIN/g" nginx/nginx.conf.template > nginx/nginx.conf
        echo -e "${GREEN}✅ nginx.conf yaratildi (domain: $DOMAIN)${NC}"
    else
        echo -e "${RED}❌ nginx/nginx.conf.template topilmadi!${NC}"
        exit 1
    fi

    # Agar sertifikat mavjud bo'lmasa, vaqtinchalik HTTP-only nginx.conf yaratamiz
    CERT_PATH="/etc/letsencrypt/live/$DOMAIN/fullchain.pem"
    if [ ! -d "$(pwd)/certbot-data/live/$DOMAIN" ]; then
        echo -e "${YELLOW}📜 SSL sertifikat topilmadi. Birinchi bosqich: HTTP-only nginx bilan sertifikat olinadi...${NC}"
        cat > nginx/nginx.conf << NGINX_HTTP_ONLY
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN www.$DOMAIN;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 200 'OlimpX SSL initialization in progress...';
        add_header Content-Type text/plain;
    }
}
NGINX_HTTP_ONLY
        NEED_CERT=true
    else
        echo -e "${GREEN}✅ SSL sertifikat mavjud.${NC}"
        NEED_CERT=false
    fi
else
    echo -e "🚀 Standart rejim (SSL'siz) tanlandi."
    echo -e "   ${YELLOW}💡 SSL uchun .env ga DOMAIN=sizning-domeningiz.com qo'shing${NC}"
    DOCKER_FILE="docker-compose.yml"
fi

echo "🏗️  Konteynerlar qurilmoqda..."
$DOCKER_COMPOSE_CMD -f $DOCKER_FILE down
$DOCKER_COMPOSE_CMD -f $DOCKER_FILE up -d --build

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Docker Compose ishga tushirishda xatolik!${NC}"
    exit 1
fi

# 4. Database Setup (Konteyner ichida)
echo -e "\n${BLUE}Step 4: Database sozlash (Migratsiya va Seed)...${NC}"
echo "⏳ PostgreSQL tayyor bo'lishini kutilmoqda..."

RETRIES=30
until docker exec olimpx-db pg_isready -U "$PG_USER" -q; do
    RETRIES=$((RETRIES - 1))
    if [ $RETRIES -eq 0 ]; then
        echo -e "${RED}❌ PostgreSQL 60 soniya ichida tayyor bo'lmadi!${NC}"
        exit 1
    fi
    echo "⏳ PostgreSQL hali tayyor emas, 2 soniya kutilmoqda... ($RETRIES urinish qoldi)"
    sleep 2
done
echo -e "${GREEN}✅ PostgreSQL tayyor.${NC}"
sleep 2

echo "🔄 Prisma migratsiya va seed ishga tushmoqda..."
docker exec olimpx-app npm run db:setup

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Database muvaffaqiyatli sozlandi.${NC}"
else
    echo -e "${RED}❌ Database sozlashda xatolik!${NC}"
    echo -e "${YELLOW}Qayta urinib ko'rish: docker exec olimpx-app npm run db:setup${NC}"
fi

# 5. SSL sertifikat olish (birinchi marta)
if [ "$SSL_MODE" = "true" ] && [ "${NEED_CERT:-false}" = "true" ]; then
    echo -e "\n${BLUE}Step 5: SSL sertifikat olish (Certbot)...${NC}"
    SSL_EMAIL="${SSL_EMAIL:-admin@$DOMAIN}"
    echo "📧 Email: $SSL_EMAIL"
    echo "🌐 Domain: $DOMAIN"
    sleep 5  # Nginx tayyor bo'lishini kutish

    # Avval faqat asosiy domenga sertifikat olishga urinib ko'ramiz
    docker run --rm \
        -v "$(pwd)/certbot-data:/etc/letsencrypt" \
        -v "$(pwd)/certbot-www:/var/www/certbot" \
        certbot/certbot certonly \
        --webroot \
        --webroot-path=/var/www/certbot \
        --email "$SSL_EMAIL" \
        --agree-tos \
        --no-eff-email \
        -d "$DOMAIN" \
        -d "www.$DOMAIN" 2>/dev/null || \
    docker run --rm \
        -v "$(pwd)/certbot-data:/etc/letsencrypt" \
        -v "$(pwd)/certbot-www:/var/www/certbot" \
        certbot/certbot certonly \
        --webroot \
        --webroot-path=/var/www/certbot \
        --email "$SSL_EMAIL" \
        --agree-tos \
        --no-eff-email \
        -d "$DOMAIN"

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ SSL sertifikat muvaffaqiyatli olindi!${NC}"
        # To'liq SSL nginx.conf ni tiklash
        sed "s/\${DOMAIN}/$DOMAIN/g" nginx/nginx.conf.template > nginx/nginx.conf
        docker exec olimpx-nginx nginx -s reload
        echo -e "${GREEN}✅ Nginx SSL bilan qayta ishga tushirildi.${NC}"
    else
        echo -e "${RED}❌ SSL sertifikat olishda xatolik!${NC}"
        echo -e "${YELLOW}Tekshiring:${NC}"
        echo -e "  1. DNS A-record $DOMAIN → serveringiz IP ga ko'rsatilganmi?"
        echo -e "  2. Port 80 ochiqmi? (firewall tekshiring)"
        echo -e "  3. Qayta urinish: docker run --rm -v \$(pwd)/certbot-data:/etc/letsencrypt -v \$(pwd)/certbot-www:/var/www/certbot certbot/certbot certonly --webroot --webroot-path=/var/www/certbot --email $SSL_EMAIL --agree-tos -d $DOMAIN"
    fi
fi

echo -e "\n${GREEN}==========================================${NC}"
echo -e "${GREEN}✅ Docker Deployment muvaffaqiyatli yakunlandi!${NC}"
SERVER_IP=$(curl -s https://api.ipify.org || hostname -I | awk '{print $1}')

if [ "$SSL_MODE" = "true" ]; then
    # Domen ishlayotganini tekshirish
    if host "$DOMAIN" > /dev/null 2>&1; then
        echo -e "${GREEN}🌐 Sayt: https://${DOMAIN}:8444${NC}"
    else
        echo -e "${YELLOW}⚠️ Domen hali ulanmagan ($DOMAIN)${NC}"
        echo -e "${GREEN}🌐 Sayt (IP orqali): http://${SERVER_IP}:8081${NC}"
    fi
    echo -e "${YELLOW}ℹ️  Eslatma: Port 80 band bo'lgani uchun OlimpX 8081/8444 portlarda ishga tushirildi.${NC}"
else
    echo -e "${GREEN}🌐 Sayt: http://${SERVER_IP}:3000${NC}"
fi
echo -e "${GREEN}==========================================${NC}"

docker ps | grep olimpx
