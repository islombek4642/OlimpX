#!/usr/bin/env node
/**
 * ============================================
 * OlimpX - SSL Setup Script with Certbot
 * Automatic SSL certificate generation and renewal
 * ============================================
 */

import { execSync, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, type = 'info') {
  const color = type === 'success' ? colors.green : 
                type === 'error' ? colors.red : 
                type === 'warning' ? colors.yellow : 
                type === 'info' ? colors.blue : colors.reset;
  console.log(`${color}${message}${colors.reset}`);
}

/**
 * Load environment variables from .env file
 */
function loadEnv() {
  const envPath = path.join(rootDir, '.env');
  if (!fs.existsSync(envPath)) {
    throw new Error('.env fayli topilmadi! Iltimos avval .env faylini yarating.');
  }

  const envContent = fs.readFileSync(envPath, 'utf8');
  const env = {};
  
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();
      // Remove quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) || 
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      env[key] = value;
    }
  });

  return env;
}

/**
 * Check if running as root (required for certbot)
 */
function checkRoot() {
  if (process.platform !== 'win32' && process.getuid() !== 0) {
    log('Xatolik: SSL sertifikat olish uchun root huquqlari kerak!', 'error');
    log('Iltimos: sudo node scripts/ssl-setup.js', 'info');
    process.exit(1);
  }
}

/**
 * Check if required tools are installed
 */
function checkPrerequisites() {
  const checks = [
    { cmd: 'nginx', name: 'Nginx' },
    { cmd: 'certbot', name: 'Certbot' }
  ];

  for (const { cmd, name } of checks) {
    try {
      execSync(`which ${cmd}`, { stdio: 'pipe' });
      log(`✅ ${name} o'rnatilgan`, 'success');
    } catch (error) {
      log(`❌ ${name} topilmadi!`, 'error');
      log(`O'rnatish: sudo apt install ${cmd}`, 'info');
      process.exit(1);
    }
  }
}

/**
 * Generate nginx config from template
 */
function generateNginxConfig(domain) {
  const templatePath = path.join(rootDir, 'nginx', 'nginx.conf.template');
  const configPath = path.join(rootDir, 'nginx', 'nginx.conf');
  
  if (!fs.existsSync(templatePath)) {
    throw new Error('nginx.conf.template fayli topilmadi!');
  }

  let config = fs.readFileSync(templatePath, 'utf8');
  config = config.replace(/\${DOMAIN}/g, domain);
  
  fs.writeFileSync(configPath, config);
  log(`✅ Nginx konfiguratsiyasi yaratildi: ${configPath}`, 'success');
  
  return configPath;
}

/**
 * Setup nginx configuration
 */
function setupNginx(configPath, domain) {
  log('\n🌐 Nginx sozlanmoqda...', 'info');

  // Create nginx sites-available directory if not exists
  const nginxAvailable = '/etc/nginx/sites-available';
  const nginxEnabled = '/etc/nginx/sites-enabled';
  
  if (!fs.existsSync(nginxAvailable)) {
    log('nginx sites-available papkasi topilmadi', 'error');
    return false;
  }

  // Copy config to sites-available
  const targetPath = path.join(nginxAvailable, 'olimpx');
  try {
    fs.copyFileSync(configPath, targetPath);
    execSync(`sudo chown root:root ${targetPath}`);
    execSync(`sudo chmod 644 ${targetPath}`);
    log(`✅ Nginx config: ${targetPath}`, 'success');
  } catch (error) {
    log(`❌ Nginx config nusxalashda xato: ${error.message}`, 'error');
    return false;
  }

  // Create symlink in sites-enabled
  const enabledPath = path.join(nginxEnabled, 'olimpx');
  try {
    if (fs.existsSync(enabledPath)) {
      fs.unlinkSync(enabledPath);
    }
    fs.symlinkSync(targetPath, enabledPath);
    log(`✅ Nginx config faollashtirildi`, 'success');
  } catch (error) {
    log(`❌ Symlink yaratishda xato: ${error.message}`, 'error');
    return false;
  }

  // Remove default site if exists
  const defaultSite = path.join(nginxEnabled, 'default');
  if (fs.existsSync(defaultSite)) {
    try {
      fs.unlinkSync(defaultSite);
      log(`✅ Default site o'chirildi`, 'success');
    } catch (error) {
      log(`⚠️ Default site o'chirishda xato (muhim emas)`, 'warning');
    }
  }

  // Test nginx configuration
  try {
    execSync('sudo nginx -t', { stdio: 'inherit' });
    log(`✅ Nginx konfiguratsiya testi o'tdi`, 'success');
  } catch (error) {
    log(`❌ Nginx konfiguratsiya xato!`, 'error');
    return false;
  }

  return true;
}

/**
 * Obtain SSL certificate with Certbot
 */
async function obtainCertificate(domain, email) {
  log('\n🔐 SSL sertifikat olinmoqda (Certbot)...', 'info');
  log(`Domain: ${domain}`, 'cyan');
  log(`Email: ${email}`, 'cyan');

  // Check if certificate already exists
  const certPath = `/etc/letsencrypt/live/${domain}/fullchain.pem`;
  const keyPath = `/etc/letsencrypt/live/${domain}/privkey.pem`;
  
  let certExists = fs.existsSync(certPath) && fs.existsSync(keyPath);

  if (certExists) {
    log('\n⚠️ Sertifikat allaqachon mavjud!', 'warning');
    const overwrite = await question('Yangi sertifikat olishni xohlaysizmi? (ha/yo\'q): ');
    if (overwrite.toLowerCase() !== 'ha') {
      log('Mavjud sertifikat ishlatiladi', 'info');
      return true;
    }
    // Delete existing certificate
    try {
      execSync(`sudo certbot delete --cert-name ${domain} --non-interactive`, { stdio: 'pipe' });
    } catch (error) {
      // Ignore error if cert doesn't exist
    }
  }

  // Start nginx temporarily for webroot challenge
  log('\n🚀 Nginx vaqtinchalik ishga tushirilmoqda...', 'info');
  try {
    execSync('sudo systemctl start nginx', { stdio: 'pipe' });
  } catch (error) {
    log('Nginx ishga tushirishda xato (avval ishlayotgandi?)', 'warning');
  }

  // Run certbot
  const certbotCmd = [
    'sudo', 'certbot', 'certonly',
    '--webroot',
    '-w', '/var/www/certbot',
    '-d', domain,
    '-d', `www.${domain}`,
    '--email', email,
    '--agree-tos',
    '--non-interactive',
    '--no-eff-email'
  ];

  try {
    log('\n📜 Certbot ishga tushirilmoqda...', 'info');
    execSync(certbotCmd.join(' '), { stdio: 'inherit' });
    log('✅ SSL sertifikat muvaffaqiyatli olindi!', 'success');
    return true;
  } catch (error) {
    log(`❌ Sertifikat olishda xato: ${error.message}`, 'error');
    log('\nTekshiring:', 'info');
    log(`1. Domain ${domain} server IP ga ulanganmi?`, 'info');
    log('2. 80-port ochiqmi?', 'info');
    log('3. DNS sozlamalari to\'g\'rimi?', 'info');
    return false;
  }
}

/**
 * Setup auto-renewal cron job
 */
function setupAutoRenewal() {
  log('\n🔄 Avtomatik yangilash sozlanmoqda...', 'info');

  // Create renewal script
  const renewalScript = `#!/bin/bash
# OlimpX SSL Auto-Renewal Script
# Generated: ${new Date().toISOString()}

LOG_FILE="/var/log/olimpx-ssl-renewal.log"
DOMAIN=$(grep DOMAIN /opt/olimpx/.env | cut -d'=' -f2 | tr -d '"' | head -1)

echo "[$(date)] SSL renewal check started" >> $LOG_FILE

# Check certificate expiration
days_until_expire=$(sudo openssl x509 -enddate -noout -in /etc/letsencrypt/live/$DOMAIN/fullchain.pem | cut -d= -f2 | xargs -I {} date -d "{}" +%s | xargs -I {} echo "({} - $(date +%s)) / 86400" | bc)

if [ -z "$days_until_expire" ]; then
    echo "[$(date)] ERROR: Could not check certificate expiration" >> $LOG_FILE
    exit 1
fi

echo "[$(date)] Certificate expires in $days_until_expire days" >> $LOG_FILE

# Renew if less than 30 days
if [ "$days_until_expire" -lt 30 ]; then
    echo "[$(date)] Certificate expiring soon, attempting renewal..." >> $LOG_FILE
    
    # Renew certificate
    if sudo certbot renew --quiet --deploy-hook "nginx -s reload"; then
        echo "[$(date)] ✅ Certificate renewed successfully" >> $LOG_FILE
        
        # Reload nginx
        if sudo nginx -t && sudo systemctl reload nginx; then
            echo "[$(date)] ✅ Nginx reloaded successfully" >> $LOG_FILE
        else
            echo "[$(date)] ❌ Nginx reload failed" >> $LOG_FILE
        fi
    else
        echo "[$(date)] ❌ Certificate renewal failed" >> $LOG_FILE
    fi
else
    echo "[$(date)] Certificate still valid, no action needed" >> $LOG_FILE
fi
`;

  const scriptPath = '/usr/local/bin/olimpx-ssl-renewal.sh';
  
  try {
    fs.writeFileSync(scriptPath, renewalScript);
    execSync(`sudo chmod +x ${scriptPath}`);
    log(`✅ Renewal script: ${scriptPath}`, 'success');
  } catch (error) {
    log(`❌ Renewal script yaratishda xato: ${error.message}`, 'error');
    return false;
  }

  // Setup cron job (run daily at 3 AM)
  const cronJob = '0 3 * * * /usr/local/bin/olimpx-ssl-renewal.sh >/dev/null 2>&1';
  
  try {
    // Get current crontab
    let currentCrontab = '';
    try {
      currentCrontab = execSync('sudo crontab -l', { encoding: 'utf8', stdio: 'pipe' });
    } catch (e) {
      // No crontab exists yet
    }

    // Check if our job already exists
    if (currentCrontab.includes('olimpx-ssl-renewal')) {
      log('✅ Cron job allaqachon mavjud', 'success');
    } else {
      // Add new cron job
      const newCrontab = currentCrontab + '\n# OlimpX SSL Auto-Renewal\n' + cronJob + '\n';
      fs.writeFileSync('/tmp/olimpx-crontab', newCrontab);
      execSync('sudo crontab /tmp/olimpx-crontab');
      fs.unlinkSync('/tmp/olimpx-crontab');
      log('✅ Cron job sozlandi (har kuni soat 3:00)', 'success');
    }
  } catch (error) {
    log(`❌ Cron job sozlashda xato: ${error.message}`, 'error');
    return false;
  }

  // Create npm check script
  const checkScriptPath = path.join(rootDir, 'scripts', 'ssl-check.js');
  const checkScript = `#!/usr/bin/env node
/**
 * OlimpX - SSL Certificate Check
 * Run: npm run ssl:check
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load domain from .env
const envContent = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8');
const domainMatch = envContent.match(/DOMAIN=(.+)/);
const DOMAIN = domainMatch ? domainContent[1].trim().replace(/["']/g, '') : null;

if (!DOMAIN) {
    console.error('❌ DOMAIN .env da topilmadi!');
    process.exit(1);
}

const certPath = \`/etc/letsencrypt/live/\${DOMAIN}/fullchain.pem\`;

if (!fs.existsSync(certPath)) {
    console.error(\`❌ Sertifikat topilmadi: \${certPath}\`);
    console.log('💡 Sertifikat olish uchun: npm run ssl:setup');
    process.exit(1);
}

try {
    // Check expiration
    const output = execSync(\`openssl x509 -enddate -noout -in \${certPath}\`, { encoding: 'utf8' });
    const expiryDate = output.replace('notAfter=', '').trim();
    
    // Calculate days remaining
    const expiry = new Date(expiryDate);
    const now = new Date();
    const daysRemaining = Math.floor((expiry - now) / (1000 * 60 * 60 * 24));
    
    console.log('🔐 SSL Sertifikat ma\'lumotlari:');
    console.log(\`   Domain: \${DOMAIN}\`);
    console.log(\`   Tugash sanasi: \${expiryDate}\`);
    console.log(\`   Qolgan kunlar: \${daysRemaining} kun\`);
    
    if (daysRemaining < 7) {
        console.error('⚠️  SERTIFIKAT TEZ ORADA TUGAYDI!');
        console.log('💡 Yangilash uchun: npm run ssl:renew');
        process.exit(1);
    } else if (daysRemaining < 30) {
        console.log('⚠️  Sertifikat 30 kundan kam qoldi');
        console.log('   Avtomatik yangilash ishga tushadi...');
    } else {
        console.log('✅ Sertifikat amal qilish muddati yetarli');
    }
    
} catch (error) {
    console.error('❌ Sertifikat tekshirishda xato:', error.message);
    process.exit(1);
}
`;

  fs.writeFileSync(checkScriptPath, checkScript);
  execSync(`chmod +x ${checkScriptPath}`);

  return true;
}

/**
 * Start services
 */
function startServices() {
  log('\n🚀 Xizmatlar ishga tushirilmoqda...', 'info');

  try {
    // Reload nginx
    execSync('sudo systemctl reload nginx', { stdio: 'pipe' });
    log('✅ Nginx qayta yuklandi', 'success');
  } catch (error) {
    try {
      execSync('sudo systemctl start nginx', { stdio: 'pipe' });
      log('✅ Nginx ishga tushirildi', 'success');
    } catch (e) {
      log('❌ Nginx ishga tushirishda xato', 'error');
    }
  }

  // Enable nginx on boot
  try {
    execSync('sudo systemctl enable nginx', { stdio: 'pipe' });
    log('✅ Nginx avtomatik ishga tushirish yoqildi', 'success');
  } catch (error) {
    log('⚠️ Nginx avtomatik ishga tushirish sozlanmadi', 'warning');
  }
}

/**
 * Main setup function
 */
async function main() {
  log('╔════════════════════════════════════════════════╗', 'cyan');
  log('║     OlimpX SSL Setup - Let\'s Encrypt          ║', 'cyan');
  log('╚════════════════════════════════════════════════╝', 'cyan');

  try {
    // Load environment
    const env = loadEnv();
    const domain = env.DOMAIN;
    const email = env.SSL_EMAIL || env.ADMIN_EMAIL;

    if (!domain) {
      log('❌ DOMAIN .env da sozlanmagan!', 'error');
      log('Iltimos, .env faylga DOMAIN=example.com qo\'shing', 'info');
      process.exit(1);
    }

    if (!email) {
      log('❌ SSL_EMAIL yoki ADMIN_EMAIL .env da topilmadi!', 'error');
      process.exit(1);
    }

    log(`\n📋 Sozlamalar:`, 'info');
    log(`   Domain: ${domain}`, 'cyan');
    log(`   Email: ${email}`, 'cyan');
    log(`   Environment: ${env.NODE_ENV || 'development'}`, 'cyan');

    // Check prerequisites
    if (process.platform !== 'win32') {
      checkRoot();
      checkPrerequisites();
    } else {
      log('\n⚠️ Windows tizimida Nginx/Certbot manual sozlash kerak', 'warning');
      log('Docker orqali ishlatish tavsiya etiladi: npm run docker:ssl', 'info');
      rl.close();
      return;
    }

    // Create webroot directory for certbot
    const webrootDir = '/var/www/certbot';
    try {
      execSync(`sudo mkdir -p ${webrootDir}`);
      execSync(`sudo chown -R www-data:www-data ${webrootDir}`);
    } catch (error) {
      log(`Webroot papka yaratishda xato: ${error.message}`, 'warning');
    }

    // Generate nginx config
    const configPath = generateNginxConfig(domain);

    // Setup nginx
    if (!setupNginx(configPath, domain)) {
      throw new Error('Nginx sozlanmadi');
    }

    // Obtain certificate
    if (!await obtainCertificate(domain, email)) {
      throw new Error('Sertifikat olinmadi');
    }

    // Setup auto-renewal
    setupAutoRenewal();

    // Start services
    startServices();

    // Success message
    log('\n╔════════════════════════════════════════════════╗', 'green');
    log('║     ✅ SSL Sozlash Muvaffaqiyatli!             ║', 'green');
    log('╚════════════════════════════════════════════════╝', 'green');
    
    log('\n🌐 Sizning saytingiz:', 'info');
    log(`   https://${domain}`, 'cyan');
    log(`   https://www.${domain}`, 'cyan');
    
    log('\n📚 Foydali buyruqlar:', 'info');
    log('   npm run ssl:check    - Sertifikat holatini tekshirish', 'cyan');
    log('   npm run ssl:renew    - Qo\'lda yangilash', 'cyan');
    log('   npm run ssl:logs     - Loglarni ko\'rish', 'cyan');
    
    log('\n⏰ Avtomatik yangilash:', 'info');
    log('   Har kuni soat 3:00 da tekshiriladi', 'cyan');
    log('   30 kundan kam qolganda avtomatik yangilanadi', 'cyan');
    
    log('\n⚠️  Eslatma:', 'warning');
    log('   DNS sozlamalarini tekshiring:', 'info');
    log(`   ${domain} va www.${domain} A-record → server IP`, 'cyan');

  } catch (error) {
    log(`\n❌ Xatolik: ${error.message}`, 'error');
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { loadEnv, generateNginxConfig };
