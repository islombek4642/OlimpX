import prisma from '../config/database.js';
import { auditLog } from '../utils/logger.js';
import { getPagination, formatPaginatedResponse } from '../utils/helpers.js';

/**
 * Get all users with pagination (Admin only)
 */
export const getAllUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search = '', role } = req.query;

    // Build where clause for filtering
    const where = {};
    
    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    if (role) {
      where.role = role;
    }

    // Get total count for pagination
    const total = await prisma.user.count({ where });
    const pagination = getPagination(page, limit, total);

    // Get paginated users
    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        createdAt: true,
        lastLogin: true,
        _count: {
          select: { results: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: pagination.skip,
      take: pagination.limit
    });

    res.json({ 
      success: true, 
      ...formatPaginatedResponse(users, pagination)
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete user (Admin only)
 */
export const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Prevent self-deletion
    if (id === req.user.id) {
      return res.status(400).json({ error: 'O\'zingizni o\'chira olmaysiz' });
    }

    // Fetch before delete for logging
    const targetUser = await prisma.user.findUnique({ where: { id } });

    await prisma.user.delete({ where: { id } });

    // Audit Log
    await auditLog({
      userId: req.user.id,
      action: 'DELETE_USER',
      resourceType: 'User',
      resourceId: id,
      details: { fullName: targetUser?.fullName, email: targetUser?.email },
      ip: req.ip
    });

    res.json({ success: true, message: 'Foydalanuvchi o\'chirildi' });
  } catch (error) {
    next(error);
  }
};
