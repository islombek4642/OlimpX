#!/usr/bin/env node
/**
 * OlimpX - SSL Environment Validation
 * Check if everything is ready for SSL setup
 * Run: npm run ssl:validate
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dns from 'node:dns';
import { promisify } from 'node:util';

const dnsLookup = promisify(dns.lookup);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('🔍 SSL Muhitni Tekshirish\n');

let hasErrors = false;
let hasWarnings = false;

// Load .env
const envPath = path.join(__dirname, '..', '.env');
if (!fs.existsSync(envPath)) {
  console.error('❌ .env fayli topilmadi!');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || 
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
});

// 1. Check DOMAIN
if (!env.DOMAIN) {
  console.error('❌ DOMAIN .env da sozlanmagan');
  console.log('   Qo\'shish: DOMAIN=sizning-domen.uz');
  hasErrors = true;
} else {
  console.log(`✅ Domain: ${env.DOMAIN}`);
}

// 2. Check SSL_EMAIL
if (!env.SSL_EMAIL && !env.ADMIN_EMAIL) {
  console.error('❌ SSL_EMAIL yoki ADMIN_EMAIL .env da sozlanmagan');
  console.log('   Qo\'shish: SSL_EMAIL=email@domen.uz');
  hasErrors = true;
} else {
  console.log(`✅ Email: ${env.SSL_EMAIL || env.ADMIN_EMAIL}`);
}

// 3. Check if running as root (Linux/Mac)
if (process.platform !== 'win32') {
  if (process.getuid() !== 0) {
    console.warn('⚠️  Root huquqlari yo\'q (sudo kerak)');
    hasWarnings = true;
  } else {
    console.log('✅ Root huquqlari mavjud');
  }
}

// 4. Check required tools
const tools = ['nginx', 'certbot'];
for (const tool of tools) {
  try {
    execSync(`which ${tool}`, { stdio: 'pipe' });
    console.log(`✅ ${tool} o'rnatilgan`);
  } catch (error) {
    console.error(`❌ ${tool} topilmadi`);
    console.log(`   O'rnatish: sudo apt install ${tool}`);
    hasErrors = true;
  }
}

// 5. Check DNS resolution
if (env.DOMAIN) {
  try {
    const { address } = await dnsLookup(env.DOMAIN);
    console.log(`✅ DNS: ${env.DOMAIN} → ${address}`);
    
    // Check if it points to this server
    const interfaces = Object.values(require('node:os').networkInterfaces())
      .flat()
      .filter(iface => !iface.internal && iface.family === 'IPv4')
      .map(iface => iface.address);
    
    if (interfaces.includes(address)) {
      console.log('✅ Domain server IP ga ulanib turibdi');
    } else {
      console.warn(`⚠️  Domain IP (${address}) server IP (${interfaces.join(', ')}) ga mos emas`);
      console.log('   DNS A-record sozlamalarini tekshiring');
      hasWarnings = true;
    }
  } catch (error) {
    console.error(`❌ DNS: ${env.DOMAIN} - topilmadi`);
    console.log('   DNS sozlamalarini tekshiring');
    hasErrors = true;
  }
}

// 6. Check ports
if (process.platform !== 'win32') {
  try {
    const port80 = execSync('sudo lsof -i :80', { stdio: 'pipe', encoding: 'utf8' });
    console.log('⚠️  80-port band:', port80.split('\n')[1]?.split(' ')[0] || 'noma\'lum');
    hasWarnings = true;
  } catch (e) {
    console.log('✅ 80-port bo\'sh');
  }
  
  try {
    const port443 = execSync('sudo lsof -i :443', { stdio: 'pipe', encoding: 'utf8' });
    console.log('⚠️  443-port band:', port443.split('\n')[1]?.split(' ')[0] || 'noma\'lum');
    hasWarnings = true;
  } catch (e) {
    console.log('✅ 443-port bo\'sh');
  }
}

// Summary
console.log('\n' + '='.repeat(40));
if (hasErrors) {
  console.error('❌ XATOLAR TOPILDI! SSL o\'rnatishdan oldin ularni tuzating.');
  process.exit(1);
} else if (hasWarnings) {
  console.log('⚠️  Ogohlantirishlar mavjud, lekin davom etish mumkin.');
  console.log('   SSL o\'rnatish uchun: npm run ssl:setup');
  process.exit(0);
} else {
  console.log('✅ BARCHA TEKSHIRUVLAR O\'TD!');
  console.log('   SSL o\'rnatish uchun: npm run ssl:setup');
  process.exit(0);
}
