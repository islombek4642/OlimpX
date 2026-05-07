import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/database.js';
import { generateRandomString } from '../utils/helpers.js';

// Constants for security
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 15;
const ACCESS_TOKEN_EXPIRY = '15m'; // Short-lived access token
const REFRESH_TOKEN_EXPIRY_DAYS = 7; // Long-lived refresh token

/**
 * Generate access token (short-lived)
 */
const generateAccessToken = (userId, role) => {
  return jwt.sign(
    { userId, role, type: 'access' },
    process.env.JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
};

/**
 * Generate refresh token (long-lived, stored in DB)
 */
const generateRefreshToken = async (userId) => {
  const token = generateRandomString(64);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

  // Store in database
  await prisma.refreshToken.create({
    data: {
      token,
      userId,
      expiresAt
    }
  });

  return token;
};

/**
 * Check if account is locked
 */
const isAccountLocked = (user) => {
  if (user.lockedUntil && Date.now() < user.lockedUntil.getTime()) {
    const remainingMinutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / (1000 * 60));
    return {
      locked: true,
      remainingMinutes,
      message: `Hisobingiz ${remainingMinutes} daqiqa davomida bloklangan. Iltimos kuting.`
    };
  }
  return { locked: false };
};

/**
 * Increment login attempts and lock account if necessary
 */
const incrementLoginAttempts = async (user) => {
  const attempts = user.loginAttempts + 1;
  const updates = { loginAttempts: attempts };

  // Lock account if max attempts reached
  if (attempts >= MAX_LOGIN_ATTEMPTS) {
    const lockUntil = new Date();
    lockUntil.setMinutes(lockUntil.getMinutes() + LOCKOUT_DURATION_MINUTES);
    updates.lockedUntil = lockUntil;
    updates.loginAttempts = 0; // Reset after locking
  }

  await prisma.user.update({
    where: { id: user.id },
    data: updates
  });

  return attempts;
};

/**
 * Reset login attempts on successful login
 */
const resetLoginAttempts = async (userId) => {
  await prisma.user.update({
    where: { id: userId },
    data: {
      loginAttempts: 0,
      lockedUntil: null
    }
  });
};

/**
 * Register a new user
 */
export const register = async (req, res, next) => {
  try {
    const { fullName, email, password } = req.body;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'Ushbu email bilan foydalanuvchi allaqachon mavjud'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user
    const user = await prisma.user.create({
      data: {
        fullName,
        email,
        passwordHash,
        role: 'user'
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        createdAt: true
      }
    });

    // Generate tokens
    const accessToken = generateAccessToken(user.id, user.role);
    const refreshToken = await generateRefreshToken(user.id);

    // Broadcast to admins via WebSocket
    try {
      const { broadcast } = await import('../config/websocket.js');
      broadcast('admin:stats', { type: 'NEW_USER', user: { fullName: user.fullName } });
    } catch (wsError) {
      console.warn('WS Broadcast failed:', wsError.message);
    }

    res.status(201).json({
      success: true,
      message: 'Foydalanuvchi muvaffaqiyatli ro\'yxatdan o\'tdi',
      data: {
        accessToken,
        refreshToken,
        expiresIn: 900, // 15 minutes in seconds
        user
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Login user with account lockout protection
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Email yoki parol noto\'g\'ri'
      });
    }

    // Check if account is locked
    const lockStatus = isAccountLocked(user);
    if (lockStatus.locked) {
      return res.status(423).json({
        success: false,
        error: lockStatus.message,
        locked: true,
        remainingMinutes: lockStatus.remainingMinutes
      });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      // Increment failed attempts
      const attempts = await incrementLoginAttempts(user);
      const remainingAttempts = MAX_LOGIN_ATTEMPTS - attempts;

      return res.status(401).json({
        success: false,
        error: 'Email yoki parol noto\'g\'ri',
        remainingAttempts: Math.max(0, remainingAttempts),
        warning: remainingAttempts <= 2 && remainingAttempts > 0
          ? `Diqqat! ${remainingAttempts} ta noto'g'ri urinishdan so'ng hisobingiz bloklanadi.`
          : undefined
      });
    }

    // Reset login attempts on successful login
    await resetLoginAttempts(user.id);

    // Generate tokens
    const accessToken = generateAccessToken(user.id, user.role);
    const refreshToken = await generateRefreshToken(user.id);

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() }
    });

    res.json({
      success: true,
      data: {
        accessToken,
        refreshToken,
        expiresIn: 900, // 15 minutes in seconds
        user: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          role: user.role
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Refresh access token using refresh token
 */
export const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'Refresh token talab qilinadi'
      });
    }

    // Find valid refresh token in database
    const tokenRecord = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true }
    });

    if (!tokenRecord) {
      return res.status(401).json({
        success: false,
        error: 'Noto\'g\'ri refresh token'
      });
    }

    // Check if token is expired or revoked
    if (tokenRecord.revokedAt || new Date() > tokenRecord.expiresAt) {
      // Revoke the token if not already revoked
      if (!tokenRecord.revokedAt) {
        await prisma.refreshToken.update({
          where: { id: tokenRecord.id },
          data: { revokedAt: new Date() }
        });
      }
      return res.status(401).json({
        success: false,
        error: 'Refresh token eskirgan yoki bekor qilingan'
      });
    }

    // Generate new access token
    const accessToken = generateAccessToken(
      tokenRecord.user.id,
      tokenRecord.user.role
    );

    res.json({
      success: true,
      data: {
        accessToken,
        expiresIn: 900,
        user: {
          id: tokenRecord.user.id,
          fullName: tokenRecord.user.fullName,
          email: tokenRecord.user.email,
          role: tokenRecord.user.role
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Logout - revoke refresh token
 */
export const logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      // Revoke the refresh token
      await prisma.refreshToken.updateMany({
        where: { token: refreshToken },
        data: { revokedAt: new Date() }
      });
    }

    res.json({
      success: true,
      message: 'Tizimdan muvaffaqiyatli chiqildi'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Request password reset
 */
export const requestPasswordReset = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email manzili talab qilinadi' });
    }

    // In a real implementation, you would:
    // 1. Generate a reset token
    // 2. Send email with reset link
    // 3. Store token in database with expiry
    
    // For now, just return success
    res.json({
      success: true,
      message: 'Parolni tiklash bo\'yicha yo\'llanma yuborildi. Emailingizni tekshiring.'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update user profile
 */
export const updateProfile = async (req, res, next) => {
  try {
    const { fullName, email, currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    // Get current user
    const currentUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!currentUser) {
      return res.status(404).json({ success: false, error: 'Foydalanuvchi topilmadi' });
    }

    // Prepare update data
    const updateData = {};

    // Update full name
    if (fullName && fullName.trim()) {
      updateData.fullName = fullName.trim();
    }

    // Update email (check if it's already taken by another user)
    if (email && email.trim() && email.trim() !== currentUser.email) {
      const existingUser = await prisma.user.findUnique({ where: { email: email.trim() } });
      if (existingUser) {
        return res.status(400).json({ success: false, error: 'Bu email allaqachon mavjud' });
      }
      updateData.email = email.trim();
    }

    // Update password
    if (newPassword && newPassword.trim()) {
      if (!currentPassword) {
        return res.status(400).json({ success: false, error: 'Joriy parol talab qilinadi' });
      }

      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, currentUser.passwordHash);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({ success: false, error: 'Joriy parol noto\'g\'ri' });
      }

      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(newPassword, salt);
      updateData.passwordHash = passwordHash;
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        createdAt: true
      }
    });

    res.json({
      success: true,
      message: 'Profil muvaffaqiyatli yangilandi',
      data: { user: updatedUser }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current user profile
 */
export const getMe = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        results: {
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Foydalanuvchi topilmadi'
      });
    }

    const { passwordHash, loginAttempts, lockedUntil, ...userWithoutSensitive } = user;

    // Calculate basic stats
    const results = user.results || [];
    const stats = {
      totalOlympiads: results.length,
      completedOlympiads: results.length,
      totalScore: results.reduce((sum, r) => sum + r.score, 0),
      averageScore: results.length > 0
        ? Math.round(results.reduce((sum, r) => sum + r.score, 0) / results.length)
        : 0
    };

    res.json({
      success: true,
      data: {
        user: { ...userWithoutSensitive, stats }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Clean up expired refresh tokens (can be called periodically)
 */
export const cleanupExpiredTokens = async () => {
  try {
    const deleted = await prisma.refreshToken.deleteMany({
      where: {
        OR: [
          { revokedAt: { not: null } },
          { expiresAt: { lt: new Date() } }
        ]
      }
    });
    console.log(`🧹 Cleaned up ${deleted.count} expired refresh tokens`);
    return deleted.count;
  } catch (error) {
    console.error('Failed to cleanup expired tokens:', error);
    return 0;
  }
};
