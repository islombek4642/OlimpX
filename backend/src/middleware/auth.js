import jwt from 'jsonwebtoken';
import prisma from '../config/database.js';

/**
 * Middleware to verify JWT token
 */
export const auth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ error: 'Avtorizatsiyadan o\'ting (Token topilmadi)' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, role: true, fullName: true }
    });

    if (!user) {
      return res.status(401).json({ error: 'Foydalanuvchi topilmadi yoki token yaroqsiz' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth Middleware Error:', error);
    res.status(401).json({ error: 'Token yaroqsiz yoki muddati o\'tgan' });
  }
};
