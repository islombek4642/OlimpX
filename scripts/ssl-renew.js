#!/usr/bin/env node
/**
 * OlimpX - SSL Certificate Manual Renewal
 * Run: npm run ssl:renew
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('🔐 OlimpX SSL Sertifikat Yangilash\n');

// Load domain from .env
const envPath = path.join(__dirname, '..', '.env');
if (!fs.existsSync(envPath)) {
    console.error('❌ .env fayli topilmadi!');
    process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const domainMatch = envContent.match(/DOMAIN=["']?([^"'\n]+)["']?/);
const DOMAIN = domainMatch ? domainMatch[1].trim() : null;

if (!DOMAIN) {
    console.error('❌ DOMAIN .env da topilmadi!');
    process.exit(1);
}

const certPath = `/etc/letsencrypt/live/${DOMAIN}/fullchain.pem`;

if (!fs.existsSync(certPath)) {
    console.error(`❌ Sertifikat topilmadi: ${certPath}`);
    console.log('💡 Sertifikat olish uchun: npm run ssl:setup');
    process.exit(1);
}

// Show current status
try {
    const output = execSync(`openssl x509 -enddate -noout -in ${certPath}`, { encoding: 'utf8' });
    const expiryDate = output.replace('notAfter=', '').trim();
    const expiry = new Date(expiryDate);
    const now = new Date();
    const daysRemaining = Math.floor((expiry - now) / (1000 * 60 * 60 * 24));
    
    console.log(`📅 Joriy sertifikat: ${daysRemaining} kun qoldi`);
    console.log(`🌐 Domain: ${DOMAIN}\n`);
} catch (error) {
    console.error('❌ Joriy sertifikatni tekshirishda xato');
}

// Perform renewal
console.log('🔄 Sertifikat yangilanmoqda...\n');

try {
    // Renew with certbot
    execSync('sudo certbot renew --force-renewal --non-interactive', { stdio: 'inherit' });
    
    console.log('\n✅ Sertifikat muvaffaqiyatli yangilandi!');
    
    // Reload nginx
    console.log('\n🌐 Nginx qayta yuklanmoqda...');
    try {
        execSync('sudo nginx -t', { stdio: 'pipe' });
        execSync('sudo systemctl reload nginx', { stdio: 'pipe' });
        console.log('✅ Nginx qayta yuklandi');
    } catch (error) {
        console.error('❌ Nginx qayta yuklashda xato:', error.message);
        process.exit(1);
    }
    
    // Show new expiration
    const newOutput = execSync(`openssl x509 -enddate -noout -in ${certPath}`, { encoding: 'utf8' });
    console.log(`\n📅 Yangi tugash sanasi: ${newOutput.replace('notAfter=', '').trim()}`);
    
} catch (error) {
    console.error('\n❌ Yangilashda xato:', error.message);
    console.log('\n💡 Tekshiring:');
    console.log('   1. Internet ulanishi');
    console.log('   2. Domain DNS sozlamalari');
    console.log('   3. 80-port ochiqmi?');
    process.exit(1);
}
