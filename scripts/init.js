import fs from 'fs';
import { execSync } from 'child_process';
import path from 'path';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));


async function initialize() {
  console.log('\n🚀 OlimpX Initialization starting...');

  // 1. Check for .env
  if (!fs.existsSync('.env')) {
    console.log('📝 .env file not found, creating from .env.example...');
    fs.copyFileSync('.env.example', '.env');
  }

  let envContent = fs.readFileSync('.env', 'utf8');
  const defaultUrl = 'postgresql://user:password@localhost:5432/database_name?schema=public';
  
  // 2. Check DATABASE_URL
  if (envContent.includes('user:password') || envContent.includes('YOUR_PASSWORD')) {
    console.log('\n❌ XATOLIK: DATABASE_URL hali sozlanmagan!');
    console.log('👉 Iltimos, .env faylini oching va PostgreSQL parolingizni kiriting.');
    console.log('🛠️  Keyin "npm run dev" buyrug\'ini qayta ishga tushiring.\n');
    process.exit(1);
  }

  // 3. Check for root node_modules
  if (!fs.existsSync('node_modules')) {
    console.log('\n📦 Root node_modules not found, installing...');
    execSync('npm install', { stdio: 'inherit' });
  }

  // 4. Check for backend node_modules
  if (!fs.existsSync(path.join('backend', 'node_modules'))) {
    console.log('\n📦 Backend node_modules not found, installing...');
    execSync('npm install --prefix backend', { stdio: 'inherit' });
  }

  // 5. Run database setup (Prisma generate & push)
  console.log('\n🗄️ Setting up database...');
  try {
    execSync('npm run db:setup', { stdio: 'inherit' });
  } catch (error) {
    console.log('\n❌ Database ulanishda xatolik yuz berdi!');
    console.log('👉 Iltimos, .env faylidagi DATABASE_URL ma\'lumotlari to\'g\'riligini tekshiring.');
    console.log('🛠️  Sozlab bo\'lgach, dasturni qayta ishga tushiring.\n');
    process.exit(1);
  }

  console.log('\n✅ Initialization complete! Starting dev server...\n');
  rl.close();
}

initialize();

