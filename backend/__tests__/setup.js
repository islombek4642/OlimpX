import { jest } from '@jest/globals';
import { execSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Test database setup
beforeAll(async () => {
  // Ensure test database is set up
  try {
    execSync('npx prisma db push --accept-data-loss', {
      cwd: process.cwd(),
      env: { ...process.env, NODE_ENV: 'test' },
    });
  } catch (error) {
    console.warn('Database push failed, may already exist:', error.message);
  }
});

// Clean up database before each test
beforeEach(async () => {
  const tables = ['AuditLog', 'Result', 'Question', 'Olympiad', 'User'];
  for (const table of tables) {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE;`);
  }
});

// Disconnect after all tests
afterAll(async () => {
  await prisma.$disconnect();
});

// Global test timeout
jest.setTimeout(30000);

export { prisma };
