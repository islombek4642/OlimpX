#!/usr/bin/env node
/**
 * OlimpX - SSL Certificate Check
 * Run: npm run ssl:check
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
    console.log('💡 Iltimos .env faylga DOMAIN=example.com qo\'shing');
    process.exit(1);
}

const certPath = `/etc/letsencrypt/live/${DOMAIN}/fullchain.pem`;

if (!fs.existsSync(certPath)) {
    console.error(`❌ Sertifikat topilmadi: ${certPath}`);
    console.log('💡 Sertifikat olish uchun: npm run ssl:setup');
    process.exit(1);
}

try {
    // Check expiration
    const output = execSync(`openssl x509 -enddate -noout -in ${certPath}`, { encoding: 'utf8' });
    const expiryDate = output.replace('notAfter=', '').trim();
    
    // Calculate days remaining
    const expiry = new Date(expiryDate);
    const now = new Date();
    const daysRemaining = Math.floor((expiry - now) / (1000 * 60 * 60 * 24));
    
    console.log('\n🔐 SSL Sertifikat ma\'lumotlari:');
    console.log(`   Domain: ${DOMAIN}`);
    console.log(`   Tugash sanasi: ${expiryDate}`);
    console.log(`   Qolgan kunlar: ${daysRemaining} kun`);
    
    // Get certificate info
    const subject = execSync(`openssl x509 -subject -noout -in ${certPath}`, { encoding: 'utf8' }).trim();
    const issuer = execSync(`openssl x509 -issuer -noout -in ${certPath}`, { encoding: 'utf8' }).trim();
    
    console.log(`   ${subject}`);
    console.log(`   ${issuer}`);
    
    if (daysRemaining < 7) {
        console.log('\n❌ SERTIFIKAT TEZ ORADA TUGAYDI!');
        console.log('💡 Yangilash uchun: npm run ssl:renew');
        process.exit(1);
    } else if (daysRemaining < 30) {
        console.log('\n⚠️  Sertifikat 30 kundan kam qoldi');
        console.log('   Avtomatik yangilash ishga tushadi...');
    } else {
        console.log('\n✅ Sertifikat amal qilish muddati yetarli');
    }
    
    // Check auto-renewal status
    try {
        const crontab = execSync('sudo crontab -l', { encoding: 'utf8', stdio: 'pipe' });
        if (crontab.includes('olimpx-ssl-renewal')) {
            console.log('✅ Avtomatik yangilash sozlangan');
        } else {
            console.log('⚠️  Avtomatik yangilash sozlanmagan');
            console.log('   Sozlash uchun: npm run ssl:setup');
        }
    } catch (e) {
        console.log('⚠️  Cron tekshirishda xato');
    }
    
} catch (error) {
    console.error('❌ Sertifikat tekshirishda xato:', error.message);
    process.exit(1);
}
