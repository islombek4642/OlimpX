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

  const safeExec = (cmd) => {
    try {
      return execSync(cmd, { stdio: 'pipe' }).toString();
    } catch (e) {
      return null;
    }
  };

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

  // 6. Git checks (non-blocking)
  if (fs.existsSync('.git')) {
    console.log('\n🔎 Git repository check...');

    const status = safeExec('git status --porcelain');
    if (status === null) {
      console.log('⚠️ Git status tekshirilmadi (git mavjud emas yoki xatolik).');
    } else if (status.trim().length > 0) {
      console.log('⚠️ Git: uncommitted changes bor.');
    } else {
      console.log('✅ Git: working tree clean.');
    }

    const remote = safeExec('git remote -v');
    if (remote && remote.trim().length > 0) {
      console.log('✅ Git remote mavjud.');
    } else {
      console.log('⚠️ Git remote yo\'q (origin sozlanmagan bo\'lishi mumkin).');
    }
  } else {
    console.log('\nℹ️ Git repo topilmadi (.git yo\'q) — Git tekshiruv o\'tkazilmadi.');
  }

  // 7. SSL env validation (non-blocking)
  // Only run when SSL config is present in .env to avoid failing local dev setups.
  const domainConfigured = /\n?DOMAIN\s*=\s*"?.+"?/i.test(envContent);
  const sslEmailConfigured = /\n?SSL_EMAIL\s*=\s*"?.+"?/i.test(envContent);
  if (domainConfigured && sslEmailConfigured) {
    console.log('\n🔐 SSL environment validation...');
    try {
      execSync('npm run ssl:validate', { stdio: 'inherit' });
      console.log('✅ SSL validation: OK');
    } catch (e) {
      console.log('⚠️ SSL validation failed (dev davom etadi).');
      console.log('👉 Agar production SSL sozlayotgan bo\'lsangiz, ssl:validate loglarini tekshiring.');
    }
  } else {
    console.log('\nℹ️ SSL tekshiruv o\'tkazilmadi (DOMAIN/SSL_EMAIL sozlanmagan).');
  }

  console.log('\n✅ Initialization complete! Starting dev server...\n');
  rl.close();
}

initialize();

