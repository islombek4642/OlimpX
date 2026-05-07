import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { errorHandler } from './middleware/errorHandler.js';
import { sanitizeBody, sanitizeQuery, sanitizeParams } from './middleware/sanitizer.js';
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import olympiadRoutes from './routes/olympiad.routes.js';
import questionRoutes from './routes/question.routes.js';
import resultRoutes from './routes/result.routes.js';
import reportRoutes from './routes/report.routes.js';
import backupRoutes from './routes/backup.routes.js';
import certificateRoutes from './routes/certificate.routes.js';
import attemptRoutes from './routes/attempt.routes.js';
import helmet from 'helmet';
import { setupSwagger } from './config/swagger.js';
import { initRedis } from './config/redis.js';
import { initWebSocket } from './config/websocket.js';
import { authLimiter, apiLimiter, submitLimiter } from './middleware/rateLimiter.js';
import prisma from './config/database.js';

// Initialize Redis
initRedis();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from project root
dotenv.config({ path: path.join(__dirname, '../../.env') });

// ============================================
// STARTUP VALIDATION
// ============================================
const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET'];
const missingVars = requiredEnvVars.filter(v => !process.env[v]);
if (missingVars.length > 0) {
  console.error(`❌ Muhim muhit o'zgaruvchilari topilmadi: ${missingVars.join(', ')}`);
  console.error('👉 Iltimos, .env faylini tekshiring.');
  process.exit(1);
}

// JWT Secret qat'iy tekshiruv - 32 belgidan kam bo'lsa server ishga tushmaydi
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error('❌ XATOLIK: JWT_SECRET kamida 32 belgi bo\'lishi shart!');
  console.error(`   Joriy uzunlik: ${process.env.JWT_SECRET?.length || 0} belgi`);
  console.error('   Iltimos, .env faylida JWT_SECRET ni yangilang:');
  console.error('   JWT_SECRET="your-super-secret-key-at-least-32-chars-long"');
  process.exit(1);
}

console.log('✅ JWT_SECRET tekshiruvi o\'tdi');

const app = express();
const PORT = process.env.PORT || 3000;

// Trust Proxy (Real IP detection via Nginx)
app.set('trust proxy', 1);

// ============================================
// SECURITY MIDDLEWARE
// ============================================
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net", "https://www.googletagmanager.com", "https://www.google-analytics.com", "blob:"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:", "https://www.google-analytics.com"],
      connectSrc: ["'self'", "wss:", "ws:", "https://www.google-analytics.com", "https://cdn.jsdelivr.net"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false
}));

// ============================================
// RATE LIMITING (Redis-based distributed)
// ============================================

app.use('/api/auth', authLimiter);
app.use('/api/results/submit', submitLimiter);
app.use('/api/', apiLimiter);

// ============================================
// CORS & BODY PARSING
// ============================================
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(s => s.trim())
  : ['http://localhost:3000'];

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

app.use(express.json({ limit: '1mb' }));

// Input Sanitization Middleware
app.use(sanitizeBody);
app.use(sanitizeQuery);
app.use(sanitizeParams);

// Restricted Static File Serving (Only frontend assets)
app.use('/admin', express.static(path.join(__dirname, '../../admin')));
app.use('/pages', express.static(path.join(__dirname, '../../pages')));
app.use('/scripts', express.static(path.join(__dirname, '../../scripts')));
app.use('/styles', express.static(path.join(__dirname, '../../styles')));
app.use('/components', express.static(path.join(__dirname, '../../components')));
app.use('/assets', express.static(path.join(__dirname, '../../assets')));

// Serve main landing page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../../index.html'));
});

// Health Check with Database Status
app.get('/health', async (req, res) => {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;
    res.json({ 
      status: 'ok', 
      timestamp: new Date(),
      database: 'connected',
      uptime: process.uptime()
    });
  } catch (error) {
    res.status(503).json({ 
      status: 'error', 
      timestamp: new Date(),
      database: 'disconnected',
      error: 'Database connection failed'
    });
  }
});

// ============================================
// ROUTES
// ============================================
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/olympiads', olympiadRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/results', resultRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/backups', backupRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/attempts', attemptRoutes);

// Swagger API Documentation
setupSwagger(app);

// Error Handling Middleware
app.use(errorHandler);

// ============================================
// SERVER START + GRACEFUL SHUTDOWN
// ============================================
const server = app.listen(PORT, () => {
  const host = process.env.DOMAIN || process.env.SERVER_IP || 'localhost';
  const isPublic = process.env.DOMAIN || process.env.SERVER_IP;
  const protocol = process.env.DOMAIN ? 'https' : 'http';
  const wsProtocol = process.env.DOMAIN ? 'wss' : 'ws';
  const portSuffix = process.env.DOMAIN ? '' : `:${PORT}`;

  console.log(`🚀 Server is running on ${protocol}://${host}${portSuffix}`);
  console.log(`📚 API Documentation: ${protocol}://${host}${portSuffix}/api-docs`);
  console.log(`🔌 WebSocket: ${wsProtocol}://${host}${portSuffix}/ws`);
});

// Initialize WebSocket
initWebSocket(server);

// Graceful shutdown — Prisma ulanishini to'g'ri yopish
const gracefulShutdown = async (signal) => {
  console.log(`\n📴 ${signal} signal qabul qilindi. Server to'xtatilmoqda...`);
  server.close(async () => {
    await prisma.$disconnect();
    console.log('✅ Server va DB ulanishi yopildi.');
    process.exit(0);
  });

  // Agar 10 sekundda yopilmasa, majburiy to'xtatish
  setTimeout(() => {
    console.error('⚠️  Majburiy to\'xtatish (timeout)');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Export app for testing
export default app;
