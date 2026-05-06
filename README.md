# OlimpX - Fullstack Online Olimpiada Platformasi

Modern, production-quality fullstack web application for online olympiads and competitions. Built with vanilla HTML/CSS/JS frontend and Node.js/Express/Prisma/PostgreSQL backend.

## 🚀 Gamified Features

- **Individual Question Timing**: Each question has its own dedicated timer, making the quiz dynamic and fast-paced.
- **Instant Visual Feedback**: Users get immediate green/red light feedback upon selecting an answer.
- **Auto-Progress**: The quiz automatically moves to the next question after feedback (1.5s delay).
- **Skip Logic**: Skipped questions are intelligently moved to the end of the pool.
- **Detailed Analytics**: Performance metrics including average time per question, correct/incorrect/skipped counts.
- **Certificates**: Automatic PDF certificate generation for participants.

## 📁 Project Structure

```
├── admin/              # Admin Panel (Protected)
│   ├── pages/          # Admin HTML pages (Results, Questions, Olympiads)
│   └── scripts/        # Admin logic
├── backend/            # Node.js + Express Backend
│   ├── prisma/         # Database schema & migrations
│   └── src/            # Backend source code (Controllers, Routes, Middleware)
├── pages/              # User Frontend pages
├── scripts/            # Frontend logic & API modules
├── styles/             # Design system & CSS modules
├── components/         # Reusable UI components
├── .env.example        # Environment variables template
└── README.md           # Documentation
```

## 🛠️ Tech Stack

### Frontend
- **Vanilla JS (ES6+)**: Modular architecture with no heavy frameworks.
- **Modern CSS**: Custom design system with variables, utility-first approach.
- **jsPDF**: Client-side certificate generation.
- **Aesthetics**: Premium dark mode, glassmorphism, and smooth animations.

### Backend
- **Node.js & Express**: Fast and scalable API server.
- **Prisma ORM**: Type-safe database access.
- **PostgreSQL**: Robust relational database.
- **Multer & Mammoth**: For importing quiz questions from Word documents (.docx).
- **JWT**: Secure token-based authentication.

## ⚙️ Setup & Installation

### Prerequisites
- Node.js (v18+)
- PostgreSQL database

### 1. Clone & Install
```bash
# Install root and backend dependencies
npm run install:all
```

### 2. Environment Variables
Create a `.env` file in the root based on `.env.example`:
```bash
cp .env.example .env
```
Update `DATABASE_URL` with your PostgreSQL credentials.

### 3. Database Setup
```bash
# Generate Prisma client and push schema to DB
npm run db:setup
```

### 4. Run Development Server
```bash
npm run dev
```
The app will be available at `http://localhost:3000`.

## 🛡️ Admin Panel
Accessible at `/admin/pages/dashboard.html`.
- **User Management**: Monitor registered participants.
- **Olympiad Management**: Create, edit, and delete competitions.
- **Word Import**: Bulk import questions from Word files using standard formatting.
- **Live Reports**: Detailed audit logs and real-time test results.

## 🔐 Security
- **Secure Verfication**: Correct answers are kept on the server and verified via API.
- **Password Hashing**: Bcrypt for secure user credentials.
- **RBAC**: Role-Based Access Control (Admin vs User).
- **Audit Logs**: Every admin action is tracked in the database.
- **Input Sanitization**: XSS protection with automatic input sanitization.
- **Rate Limiting**: Protection against brute-force and spam attacks.
- **Helmet**: Security headers for common web vulnerabilities.
- **Account Lockout**: Automatic lockout after 5 failed login attempts.
- **Refresh Tokens**: Secure token rotation with database storage.

## 🧪 Testing & Code Quality
- **Jest**: Unit and integration testing framework.
- **Supertest**: HTTP endpoint testing.
- **ESLint**: JavaScript linting with recommended rules.
- **Prettier**: Code formatting for consistency.

## 🐳 Docker Support
```bash
# Development with hot-reload
docker-compose -f docker-compose.dev.yml up

# Production build
docker-compose up -d
```

## 📊 Pagination & Filtering
- **User List**: Paginated user management with search and role filtering.
- **Results**: Paginated quiz results with filtering by olympiad and user.

## 🏆 Server-Side PDF Certificates
- **PDFKit**: Server-side certificate generation for better performance.
- **API Endpoint**: `GET /api/certificates/:resultId` to download PDF.
- **Preview**: `GET /api/certificates/:resultId/preview` to check eligibility.
- **70% Threshold**: Certificates only generated for scores >= 70%.

## 📚 API Documentation
- **Swagger UI**: Interactive API documentation at `/api-docs`.
- **OpenAPI 3.0**: Full API specification with schemas and examples.
- **Authentication**: Built-in JWT authentication in Swagger UI.

## ⚡ Redis Caching & Rate Limiting (Optional)
- **IORedis**: High-performance Redis client.
- **Cache Middleware**: Automatic response caching for GET endpoints.
- **Distributed Rate Limiting**: Redis-based rate limiting across multiple server instances.
- **Disabled by default**: Set `REDIS_ENABLED=true` to enable.

## 🔌 WebSocket Real-time Updates
- **Live Dashboard**: Real-time admin statistics and monitoring.
- **Channel Subscriptions**: Subscribe to specific channels (admin:stats, admin:users).
- **JWT Authentication**: Secure WebSocket connections with token auth.
- **Ping/Pong**: Connection health monitoring.
- **Endpoint**: `ws://localhost:3000/ws`

## 🚀 Available Scripts
```bash
# Development
npm run dev          # Start development server

# Testing
npm run test         # Run tests once
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Run tests with coverage

# Code Quality
npm run lint         # Lint JavaScript files
npm run lint:fix     # Fix linting issues
npm run format       # Format code with Prettier
npm run format:check # Check code formatting

# Database
npm run db:setup     # Setup database schema
npm run db:seed      # Seed database with sample data

# Backup & Restore
npm run backup       # Create database backup
npm run backup:cleanup # Clean old backups (7 day retention)
npm run backup:stats # Show backup statistics
```

## 💾 Database Backup

### Automatic Backups
- **Retention Policy**: 7 days
- **Location**: `/backups/` directory
- **Format**: PostgreSQL custom format

### API Endpoints (Admin only)
- `GET /api/backups` - List all backups
- `POST /api/backups` - Create new backup
- `POST /api/backups/restore` - Restore from backup
- `POST /api/backups/cleanup` - Clean old backups
- `DELETE /api/backups/:filename` - Delete specific backup

### Manual Backup
```bash
npm run backup
```

### Restore from Backup
```bash
# Via API (Admin panel) or directly:
node -e "import('./backend/src/utils/backup.js').then(m => m.restoreBackup('filename.sql'))"
```

## 📄 License
MIT License - Build with ❤️ by Antigravity.

