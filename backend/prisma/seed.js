import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env from root
dotenv.config({ path: path.join(__dirname, '../../../.env') });

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // 1. Create Admin User (requires env vars, no hardcoded defaults)
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    console.log('⚠️ ADMIN_EMAIL or ADMIN_PASSWORD not set. Skipping admin creation.');
  } else {
    const salt = await bcrypt.genSalt(10);
    const adminPasswordHash = await bcrypt.hash(adminPassword, salt);

    await prisma.user.upsert({
      where: { email: adminEmail },
      update: {
        passwordHash: adminPasswordHash
      },
      create: {
        fullName: 'Admin User',
        email: adminEmail,
        passwordHash: adminPasswordHash,
        role: 'admin',
        isVerified: true
      }
    });
    console.log(`✅ Admin user ready (${adminEmail})`);
  }

  // 2. Create Test User (requires env vars, no hardcoded defaults)
  const testEmail = process.env.TEST_EMAIL;
  const testPassword = process.env.TEST_PASSWORD;

  if (!testEmail || !testPassword) {
    console.log('⚠️ TEST_EMAIL or TEST_PASSWORD not set. Skipping test user creation.');
  } else {
    const salt = await bcrypt.genSalt(10);
    const testPasswordHash = await bcrypt.hash(testPassword, salt);

    await prisma.user.upsert({
      where: { email: testEmail },
      update: {},
      create: {
        fullName: 'Test User',
        email: testEmail,
        passwordHash: testPasswordHash,
        role: 'user',
        isVerified: true
      }
    });
    console.log('✅ Test user ready');
  }

  // 3. Create Sample Olympiads (Cleaned - only real data should be added via Admin Panel)
  console.log('ℹ️ Skipping sample olympiads creation (Clean production mode)');

  console.log('🏁 Seeding finished!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
