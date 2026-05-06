/**
 * Redis-based Rate Limiting Middleware
 * Distributed rate limiting with Redis backend
 */

import { getRedis } from '../config/redis.js';

// Rate limit configurations
const RATE_LIMITS = {
  // Authentication endpoints - strict
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
    keyPrefix: 'ratelimit:auth',
  },
  
  // API endpoints - moderate
  api: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 1000,
    keyPrefix: 'ratelimit:api',
  },
  
  // Quiz submission - strict
  submit: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 5,
    keyPrefix: 'ratelimit:submit',
  },
  
  // WebSocket connections
  websocket: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60, // 1 per second average
    keyPrefix: 'ratelimit:ws',
  },
};

/**
 * Create rate limiter middleware
 */
export const createRateLimiter = (type = 'api', options = {}) => {
  const config = RATE_LIMITS[type] || RATE_LIMITS.api;
  const { windowMs, maxRequests, keyPrefix } = { ...config, ...options };
  
  return async (req, res, next) => {
    const redis = getRedis();
    
    // Fallback to memory-based limiting if Redis unavailable
    if (!redis) {
      return memoryRateLimit(req, res, next, { windowMs, maxRequests });
    }
    
    try {
      // Get client identifier
      const identifier = getClientIdentifier(req);
      const key = `${keyPrefix}:${identifier}`;
      
      // Use Redis for atomic increment and expiry
      const current = await redis.incr(key);
      
      // Set expiry on first request
      if (current === 1) {
        await redis.pexpire(key, windowMs);
      }
      
      // Get TTL for headers
      const ttl = await redis.pttl(key);
      const resetTime = Date.now() + ttl;
      
      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - current));
      res.setHeader('X-RateLimit-Reset', resetTime);
      
      // Check if limit exceeded
      if (current > maxRequests) {
        const retryAfter = Math.ceil(ttl / 1000);
        
        res.setHeader('Retry-After', retryAfter);
        return res.status(429).json({
          success: false,
          error: 'Too many requests, please try again later',
          retryAfter,
          limit: maxRequests,
          window: `${windowMs / 1000} seconds`,
        });
      }
      
      next();
    } catch (error) {
      // Log error but allow request (fail open)
      console.error('Rate limiter error:', error.message);
      next();
    }
  };
};

/**
 * Memory-based rate limiter (fallback)
 */
const memoryStore = new Map();

const memoryRateLimit = (req, res, next, { windowMs, maxRequests }) => {
  const identifier = getClientIdentifier(req);
  const now = Date.now();
  
  // Clean old entries
  const windowStart = now - windowMs;
  
  if (!memoryStore.has(identifier)) {
    memoryStore.set(identifier, []);
  }
  
  const requests = memoryStore.get(identifier);
  
  // Remove old requests outside window
  const validRequests = requests.filter(timestamp => timestamp > windowStart);
  
  // Check limit
  if (validRequests.length >= maxRequests) {
    const oldestRequest = validRequests[0];
    const retryAfter = Math.ceil((oldestRequest + windowMs - now) / 1000);
    
    res.setHeader('Retry-After', retryAfter);
    return res.status(429).json({
      success: false,
      error: 'Too many requests, please try again later',
      retryAfter,
      limit: maxRequests,
      window: `${windowMs / 1000} seconds`,
      note: 'Using memory-based rate limiting (Redis unavailable)',
    });
  }
  
  // Add current request
  validRequests.push(now);
  memoryStore.set(identifier, validRequests);
  
  // Set headers
  res.setHeader('X-RateLimit-Limit', maxRequests);
  res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - validRequests.length));
  
  next();
};

/**
 * Get client identifier for rate limiting
 */
const getClientIdentifier = (req) => {
  // Use user ID if authenticated
  if (req.user?.id) {
    return `user:${req.user.id}`;
  }
  
  // Fall back to IP address
  const ip = req.ip || 
    req.connection.remoteAddress || 
    req.socket.remoteAddress ||
    (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
    'unknown';
  
  return `ip:${ip}`;
};

/**
 * WebSocket rate limiter
 */
export const wsRateLimiter = async (clientId, type = 'websocket') => {
  const redis = getRedis();
  
  if (!redis) {
    // Allow if Redis unavailable
    return { allowed: true };
  }
  
  const config = RATE_LIMITS[type];
  const key = `ratelimit:ws:${clientId}`;
  
  try {
    const current = await redis.incr(key);
    
    if (current === 1) {
      await redis.pexpire(key, config.windowMs);
    }
    
    const allowed = current <= config.maxRequests;
    const remaining = Math.max(0, config.maxRequests - current);
    
    return { allowed, remaining };
  } catch (error) {
    console.error('WebSocket rate limiter error:', error.message);
    return { allowed: true }; // Fail open
  }
};

/**
 * Reset rate limit for specific identifier
 */
export const resetRateLimit = async (identifier, type = 'api') => {
  const redis = getRedis();
  
  if (!redis) {
    memoryStore.delete(identifier);
    return true;
  }
  
  const config = RATE_LIMITS[type];
  const key = `${config.keyPrefix}:${identifier}`;
  
  try {
    await redis.del(key);
    return true;
  } catch (error) {
    console.error('Reset rate limit error:', error.message);
    return false;
  }
};

/**
 * Get rate limit status for identifier
 */
export const getRateLimitStatus = async (identifier, type = 'api') => {
  const redis = getRedis();
  const config = RATE_LIMITS[type];
  const key = `${config.keyPrefix}:${identifier}`;
  
  if (!redis) {
    const requests = memoryStore.get(identifier) || [];
    const windowStart = Date.now() - config.windowMs;
    const validRequests = requests.filter(ts => ts > windowStart);
    
    return {
      limit: config.maxRequests,
      remaining: Math.max(0, config.maxRequests - validRequests.length),
      reset: validRequests.length > 0 ? validRequests[0] + config.windowMs : Date.now(),
    };
  }
  
  try {
    const current = await redis.get(key);
    const ttl = await redis.pttl(key);
    
    const count = parseInt(current) || 0;
    
    return {
      limit: config.maxRequests,
      remaining: Math.max(0, config.maxRequests - count),
      reset: Date.now() + ttl,
    };
  } catch (error) {
    console.error('Get rate limit status error:', error.message);
    return null;
  }
};

// Pre-configured rate limiters
export const authLimiter = createRateLimiter('auth');
export const apiLimiter = createRateLimiter('api');
export const submitLimiter = createRateLimiter('submit');

export default {
  createRateLimiter,
  authLimiter,
  apiLimiter,
  submitLimiter,
  wsRateLimiter,
  resetRateLimit,
  getRateLimitStatus,
  RATE_LIMITS,
};
