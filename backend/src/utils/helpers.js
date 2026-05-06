/**
 * Helper Utilities
 */

/**
 * Escape HTML entities to prevent XSS
 */
export const escapeHtml = (text) => {
  if (typeof text !== 'string') return text;
  
  const htmlEntities = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };

  return text.replaceAll(/[&<>"'/]/g, (char) => htmlEntities[char] || char);
};

/**
 * Generate pagination metadata
 */
export const getPagination = (page, limit, total) => {
  const currentPage = Math.max(1, Number.parseInt(page) || 1);
  const itemsPerPage = Math.min(100, Math.max(1, Number.parseInt(limit) || 10));
  const totalPages = Math.ceil(total / itemsPerPage);
  const skip = (currentPage - 1) * itemsPerPage;

  return {
    page: currentPage,
    limit: itemsPerPage,
    total,
    totalPages,
    skip,
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1,
  };
};

/**
 * Format pagination response
 */
export const formatPaginatedResponse = (data, pagination) => ({
  data,
  pagination: {
    page: pagination.page,
    limit: pagination.limit,
    total: pagination.total,
    totalPages: pagination.totalPages,
    hasNextPage: pagination.hasNextPage,
    hasPrevPage: pagination.hasPrevPage,
  },
});

/**
 * Sanitize filename
 */
export const sanitizeFilename = (filename) => {
  if (typeof filename !== 'string') return 'unnamed';
  
  // Remove path traversal attempts
  filename = filename.replaceAll('..', '');
  filename = filename.replaceAll('\\', '');
  
  // Remove control characters
  filename = filename.replaceAll(/[\x00-\x1f\x7f]/g, '');
  
  // Limit length
  filename = filename.substring(0, 255);
  
  return filename;
};

/**
 * Validate and sanitize email
 */
export const sanitizeEmail = (email) => {
  if (typeof email !== 'string') return '';
  
  // Basic email sanitization
  email = email.toLowerCase().trim();
  
  // Remove dangerous characters
  email = email.replaceAll(/[<>"']/g, '');
  
  return email;
};

/**
 * Generate random string
 */
export const generateRandomString = (length = 32) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * Deep clone object (safer than JSON.parse/stringify)
 */
export const deepClone = (obj) => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj);
  if (Array.isArray(obj)) return obj.map(item => deepClone(item));
  
  const cloned = {};
  for (const key in obj) {
    if (Object.hasOwn(obj, key)) {
      cloned[key] = deepClone(obj[key]);
    }
  }
  return cloned;
};

export default {
  escapeHtml,
  getPagination,
  formatPaginatedResponse,
  sanitizeFilename,
  sanitizeEmail,
  generateRandomString,
  deepClone,
};
