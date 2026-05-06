# Hetzner Serverga Deploy Qo'llanmasi

## 1. Serverga kirish

```bash
ssh root@159.69.204.79
```

## 2. Loyihani yuklash

```bash
cd /opt
git clone https://github.com/islombek4642/OlimpX.git
cd OlimpX
```

## 3. Node.js o'rnatish (agar yo'q bo'lsa)

```bash
# Node.js 20 LTS o'rnatish
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Tekshirish
node -v  # v20.x.x
npm -v   # 10.x.x
```

## 4. PostgreSQL o'rnatish

```bash
apt-get update
apt-get install -y postgresql postgresql-contrib

# PostgreSQLni ishga tushirish
systemctl start postgresql
systemctl enable postgresql

# Database va user yaratish
sudo -u postgres psql -c "CREATE USER olimpx WITH PASSWORD 'your_secure_password';"
sudo -u postgres psql -c "CREATE DATABASE olimpx OWNER olimpx;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE olimpx TO olimpx;"
```

## 5. Redis o'rnatish

```bash
apt-get install -y redis-server
systemctl start redis
systemctl enable redis
```

## 6. Backend sozlash

```bash
cd backend

# .env fayl yaratish
cp .env.example .env

# .env ni tahrirlash (nano yoki vim bilan)
nano .env
```

**.env fayl namunasi:**
```env
# Database
DATABASE_URL="postgresql://olimpx:your_secure_password@localhost:5432/olimpx"

# JWT
JWT_SECRET="your_very_long_secret_key_min_32_chars_here"
JWT_REFRESH_SECRET="your_refresh_secret_key_here"

# Server
PORT=3000
NODE_ENV=production

# Redis (agar kerak bo'lsa)
REDIS_URL="redis://localhost:6379"

# Domain (SSL uchun)
DOMAIN="your-domain.com"
SSL_EMAIL="admin@your-domain.com"
```

## 7. Prisma migratsiya

```bash
# Backend papkasida
npx prisma migrate deploy
npx prisma generate
```

## 8. PM2 bilan ishga tushirish

```bash
# PM2 o'rnatish
global install pm2

# Backend ishga tushirish
cd /opt/OlimpX/backend
pm2 start src/server.js --name "olimpx-api"

# PM2 avtomatik ishga tushirish
pm2 startup
pm2 save
```

## 9. Nginx sozlash (Reverse Proxy)

```bash
apt-get install -y nginx
```

**/etc/nginx/sites-available/olimpx** fayl:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        root /opt/OlimpX;
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
ln -s /etc/nginx/sites-available/olimpx /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

## 10. SSL sertifikat (Certbot)

```bash
apt-get install -y certbot python3-certbot-nginx
certbot --nginx -d your-domain.com
```

## 11. Tekshirish

```bash
# Backend ishlayotganini tekshirish
curl http://localhost:3000/api/health

# PM2 status
pm2 status

# Loglar
pm2 logs olimpx-api
```

## 12. Avtomatik yangilanish (CI/CD)

Yangilanish uchun:
```bash
cd /opt/OlimpX
git pull origin main
cd backend
npm install
npx prisma migrate deploy
pm2 restart olimpx-api
```

## Foydali buyruqlar

| Buyruq | Tavsif |
|--------|--------|
| `pm2 status` | Ishlayotgan protsesslarni ko'rish |
| `pm2 logs olimpx-api` | Loglarni ko'rish |
| `pm2 restart olimpx-api` | Restart qilish |
| `pm2 stop olimpx-api` | To'xtatish |
| `pm2 delete olimpx-api` | O'chirish |

## Muammolar va yechimlar

**Port 3000 band bo'lsa:**
```bash
lsof -i :3000
kill -9 <PID>
```

**PostgreSQL ulanish xatosi:**
```bash
sudo -u postgres psql -c "ALTER USER olimpx WITH PASSWORD 'new_password';"
```

**Ruxsat muammolari:**
```bash
chmod -R 755 /opt/OlimpX
chown -R www-data:www-data /opt/OlimpX
```
