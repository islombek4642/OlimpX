#!/bin/sh
set -e

echo "🚀 OlimpX Entrypoint script boshlandi..."

# .env fayldan o'zgaruvchilarni yuklash (agar kerak bo'lsa)
# DATABASE_URL konteyner environmentida bo'lishi kerak

echo "🔄 Prisma Client generatsiya qilinmoqda..."
cd /app/backend && npx prisma generate

echo "⬆️  Database migratsiya qilinmoqda (db push)..."
npx prisma db push --accept-data-loss

echo "🌱 Database seed qilinmoqda..."
node prisma/seed.js

echo "✅ Tayyorgarlik yakunlandi. Loyiha ishga tushmoqda..."
cd /app && exec dumb-init -- npm start
