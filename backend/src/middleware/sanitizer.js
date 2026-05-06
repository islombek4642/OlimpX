/**
 * Input Sanitization Middleware
 * Prevents XSS and sanitizes user input
 */

import { escapeHtml } from '../utils/helpers.js';

/**
 * Sanitize string value
 */
const sanitizeString = (value) => {
  if (typeof value !== 'string') return value;
  
  // Remove null bytes
  value = value.replace(/\x00/g, '');
  
  // Trim whitespace
  value = value.trim();
  
  // Escape HTML entities
  value = escapeHtml(value);
  
  return value;
};

/**
 * Recursively sanitize object
 */
const sanitizeObject = (obj) => {
  if (typeof obj !== 'object' || obj === null) {
    return sanitizeString(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    // Sanitize key as well
    const sanitizedKey = sanitizeString(key);
    sanitized[sanitizedKey] = sanitizeObject(value);
  }

  return sanitized;
};

/**
 * Middleware to sanitize request body
 */
export const sanitizeBody = (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    // Don't sanitize passwords - they should be hashed anyway
    const { password, newPassword, confirmPassword, currentPassword, ...rest } = req.body;
    
    const sanitized = sanitizeObject(rest);
    
    req.body = {
      ...sanitized,
      ...(password && { password }),
      ...(newPassword && { newPassword }),
      ...(confirmPassword && { confirmPassword }),
      ...(currentPassword && { currentPassword }),
    };
  }
  next();
};

/**
 * Middleware to sanitize request query parameters
 */
export const sanitizeQuery = (req, res, next) => {
  if (req.query && typeof req.query === 'object') {
    // Express 5: req.query is read-only, create sanitized copy
    const sanitizedQuery = sanitizeObject(req.query);
    // Store sanitized query in a custom property
    req.sanitizedQuery = sanitizedQuery;
    // Update original query using Object.defineProperty to bypass read-only
    Object.defineProperty(req, 'query', {
      value: sanitizedQuery,
      writable: true,
      configurable: true
    });
  }
  next();
};

/**
 * Middleware to sanitize request params
 */
export const sanitizeParams = (req, res, next) => {
  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeObject(req.params);
  }
  next();
};

/**
 * Combined sanitization middleware
 */
export const sanitizeAll = [sanitizeBody, sanitizeQuery, sanitizeParams];

export default {
  sanitizeBody,
  sanitizeQuery,
  sanitizeParams,
  sanitizeAll,
};
