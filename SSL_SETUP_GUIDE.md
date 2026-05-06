# OlimpX SSL O'rnatish Qo'llanmasi

Bu qo'llanma OlimpX loyihasida avtomatik SSL sertifikat o'rnatish jarayonini tushuntiradi.

## Avtomatlashtirilgan Funksiyalar

1. **SSL sertifikat olish** - Let's Encrypt orqali avtomatik
2. **Nginx sozlash** - Reverse proxy konfiguratsiyasi
3. **Avtomatik yangilash** - Sertifikat muddati tugashidan 30 kun oldin avtomatik yangilanadi
4. **Muddat monitoring** - Har kuni soat 3:00 da tekshiruv
5. **Email xabarnoma** - Sertifikat holati haqida loglar

## Muhit O'zgaruvchilari (.env)

```bash
# Majburiy
DOMAIN=olimpx.uz                    # Sizning domeningiz
SSL_EMAIL=admin@olimpx.uz          # Sertifikat uchun email

# Ixtiyoriy (ADMIN_EMAIL dan meros olinadi)
ADMIN_EMAIL=admin@olimpx.uz        # Agar SSL_EMAIL bo'lmasa ishlatiladi
```

## Foydali Buyruqlar

### 1. Muhitni tekshirish (avval bajaring)
```bash
npm run ssl:validate
```
Bu buyruq quyidilarni tekshiradi:
- ✅ .env fayl mavjudligi
- ✅ DOMAIN va SSL_EMAIL sozlanganmi
- ✅ Root huquqlari
- ✅ Nginx va Certbot o'rnatilganmi
- ✅ DNS sozlamalari to'g'riligi
- ✅ 80 va 443 portlar bo'shmi

### 2. SSL o'rnatish
```bash
sudo npm run ssl:setup
```
Bu buyruq barcha sozlashni avtomatik bajaradi:
- Nginx konfiguratsiyasi yaratadi
- Let's Encrypt sertifikati oladi
- Avtomatik yangilash cron job sozlaydi
- Xizmatlarni ishga tushiradi

### 3. Sertifikat holatini tekshirish
```bash
npm run ssl:check
```
- Sertifikat muddatini ko'rsatadi
- Qolgan kunlarni hisoblaydi
- Agar 7 kundan kam qolsa ogohlantiradi
- Agar 30 kundan kam qolsa, yangilashni tavsiya qiladi

### 4. Qo'lda yangilash
```bash
sudo npm run ssl:renew
```
Sertifikatni qo'lda yangilash (odatda kerak emas, avtomatik ishlaydi)

### 5. Loglarni ko'rish
```bash
npm run ssl:logs
```
Avtomatik yangilash loglarini real-time ko'rish

## Avtomatik Yangilash Mexanizmi

Har kuni soat 3:00 da tizim avtomatik ravishda:
1. Sertifikat muddatini tekshiradi
2. Agar 30 kundan kam qolsa, yangilaydi
3. Nginx'ni qayta yuklaydi
4. Natijani log faylga yozadi

Log fayl: `/var/log/olimpx-ssl-renewal.log`

## Docker bilan SSL

Agar oddiy o'rnatish ishlamasa, Docker variantidan foydalaning:

```bash
npm run docker:ssl
```

Bu buyruq:
- Nginx konteynerini ishga tushiradi
- Certbot konteynerini ishga tushiradi
- Avtomatik yangilashni sozlaydi
- Barcha xizmatlarni birgalikda boshqaradi

## Xavfsizlik Sozlamalari

SSL o'rnatilgandan so'ng quyidagi xavfsizlik sarlavhalari avtomatik qo'shiladi:

```nginx
# Nginx orqali qo'shiladi
X-Frame-Options: SAMEORIGIN
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Content-Security-Policy: default-src 'self' ...
Strict-Transport-Security (HSTS)
```

## Muammolarni Hal Qilish

### DNS xatosi
```
❌ DNS: domen.uz - topilmadi
```
**Yechim:** Domeningiz A-record sozlamalarini tekshiring. Domen server IP ga ulanishi kerak.

### Port band xatosi
```
⚠️  80-port band: apache2
```
**Yechim:** Apache yoki boshqa xizmatni to'xtating:
```bash
sudo systemctl stop apache2
sudo systemctl disable apache2
```

### Sertifikat yangilanmadi
```bash
# Qo'lda yangilash
sudo certbot renew --force-renewal
sudo systemctl reload nginx
```

### Log tekshirish
```bash
# Certbot loglari
sudo tail -f /var/log/letsencrypt/letsencrypt.log

# Nginx loglari
sudo tail -f /var/log/nginx/error.log

# OlimpX loglari
npm run ssl:logs
```

## Muhim Eslatmalar

1. **DNS sozlamalarini oldindan tekshiring** - Domen server IP ga ulanishi kerak
2. **80 va 443 portlar ochiq bo'lishi kerak** - Firewall tekshiruvi
3. **Email haqiqiy bo'lishi kerak** - Let'sEncrypt ogohlantirishlari uchun
4. **Avtomatik yangilash cron job** - Har kuni soat 3:00 da ishlaydi
5. **Backup olish** - SSL o'rnatishdan oldin nginx config backup oling

## SSL Buyruqlari Xulosa

| Buyruq | Vazifasi |
|--------|----------|
| `npm run ssl:validate` | Muhitni tekshirish |
| `npm run ssl:setup` | SSL o'rnatish |
| `npm run ssl:check` | Sertifikat holati |
| `npm run ssl:renew` | Qo'lda yangilash |
| `npm run ssl:logs` | Loglarni ko'rish |
| `npm run docker:ssl` | Docker varianti |

## Texnik Tafsilotlar

### Fayl Strukturasi
```
nginx/
├── nginx.conf.template     # Nginx shablon
└── nginx.conf              # Yaratilgan config

scripts/
├── ssl-setup.js            # Asosiy sozlash skripti
├── ssl-check.js            # Tekshirish skripti
├── ssl-renew.js            # Qo'lda yangilash
└── ssl-validate.js         # Muhit tekshiruvi

docker-compose.ssl.yml       # Docker SSL varianti
```

### Cron Job
```cron
0 3 * * * /usr/local/bin/olimpx-ssl-renewal.sh
```

### Sertifikat Papkasi
```
/etc/letsencrypt/live/olimpx.uz/
├── fullchain.pem            # Asosiy sertifikat
└── privkey.pem              # Maxfiy kalit
```

## Qo'llab-quvvatlash

Muammolar yuzaga kelsa, quyidagi ma'lumotlarni tekshiring:
1. `npm run ssl:validate` chiqishi
2. `/var/log/olimpx-ssl-renewal.log` loglari
3. `/var/log/letsencrypt/letsencrypt.log` loglari
