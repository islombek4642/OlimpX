import express from 'express';
import prisma from '../config/database.js';
import { auth } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';

const router = express.Router();

/**
 * Get system reports and statistics (Admin only)
 */
router.get('/stats', auth, requireRole('admin'), async (req, res, next) => {
  try {
    const [userCount, olympiadCount, resultCount, auditLogs] = await Promise.all([
      prisma.user.count(),
      prisma.olympiad.count(),
      prisma.result.count(),
      prisma.auditLog.findMany({
        take: 50,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { fullName: true, email: true }
          }
        }
      })
    ]);

    res.json({
      success: true,
      data: {
        stats: {
          totalUsers: userCount,
          totalOlympiads: olympiadCount,
          totalResults: resultCount
        },
        recentLogs: auditLogs
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
