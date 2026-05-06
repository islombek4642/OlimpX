/**
 * Middleware to check if user has required role(s)
 * @param {...string} roles - Allowed roles
 */
export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: `Ruxsat rad etildi. Ushbu amal faqat quyidagi rollar uchun: ${roles.join(', ')}` 
      });
    }
    next();
  };
};
