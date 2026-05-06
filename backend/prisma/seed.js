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

  // 1. Create Admin User
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@olimpx.uz';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin123!';
  
  const salt = await bcrypt.genSalt(10);
  const adminPasswordHash = await bcrypt.hash(adminPassword, salt);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      passwordHash: adminPasswordHash // Update password if it changed in .env
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

  // 2. Create Test User
  const testEmail = 'test@olimpx.uz';
  const testPasswordHash = await bcrypt.hash('Test123!', salt);

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

  // 3. Create Sample Olympiads (check if exists to avoid duplicates)
  const olympiadCount = await prisma.olympiad.count();
  if (olympiadCount === 0) {
    await prisma.olympiad.create({
      data: {
        title: 'Matematika - Mantiqiy savollar',
        description: 'Boshlang\'ich darajadagi mantiqiy savollar to\'plami.',
        category: 'Matematika',
        icon: '📐',
        duration: 10,
        status: 'active',
        questions: {
          create: [
            {
              text: 'Agar 5 ta mushuk 5 ta sichqonni 5 minutda tutsa, 100 ta mushuk 100 ta sichqonni necha minutda tutadi?',
              options: ['100 minutda', '5 minutda', '50 minutda', '1 minutda'],
              correctAnswer: 1
            },
            {
              text: 'Ketma-ket kelgan uchta toq sonning yig\'indisi 51 ga teng. Eng kichik sonni toping.',
              options: ['13', '15', '17', '19'],
              correctAnswer: 1
            }
          ]
        }
      }
    });

    await prisma.olympiad.create({
      data: {
        title: 'Informatika - Web dasturlash asoslari',
        description: 'HTML, CSS va JavaScript asoslari bo\'yicha test savollari.',
        category: 'IT',
        icon: '💻',
        duration: 15,
        status: 'active',
        questions: {
          create: [
            {
              text: 'HTML da giperhavola yaratish uchun qaysi teg ishlatiladi?',
              options: ['<link>', '<a>', '<href>', '<url>'],
              correctAnswer: 1
            }
          ]
        }
      }
    });
    console.log('✅ Sample olympiads created');
  } else {
    console.log('ℹ️ Olympiads already exist, skipping creation');
  }

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
