/**
 * Redis Configuration
 * Caching layer for improved performance
 */

import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const isRedisEnabled = process.env.REDIS_ENABLED === 'true' || process.env.NODE_ENV === 'production';

let redis = null;

/**
 * Initialize Redis connection
 */
export const initRedis = () => {
  if (!isRedisEnabled) {
    console.log('ℹ️  Redis disabled (set REDIS_ENABLED=true to enable)');
    return null;
  }

  try {
    redis = new Redis(REDIS_URL, {
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
    });

    redis.on('connect', () => {
      console.log('✅ Redis connected');
    });

    redis.on('error', (err) => {
      console.error('❌ Redis error:', err.message);
    });

    return redis;
  } catch (error) {
    console.error('❌ Failed to connect to Redis:', error.message);
    return null;
  }
};

/**
 * Get Redis instance
 */
export const getRedis = () => redis;

/**
 * Cache data with TTL
 */
export const setCache = async (key, data, ttlSeconds = 300) => {
  if (!redis) return false;
  
  try {
    await redis.setex(key, ttlSeconds, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error('Redis set error:', error.message);
    return false;
  }
};

/**
 * Get cached data
 */
export const getCache = async (key) => {
  if (!redis) return null;
  
  try {
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Redis get error:', error.message);
    return null;
  }
};

/**
 * Delete cached data
 */
export const deleteCache = async (key) => {
  if (!redis) return false;
  
  try {
    await redis.del(key);
    return true;
  } catch (error) {
    console.error('Redis delete error:', error.message);
    return false;
  }
};

/**
 * Clear cache by pattern
 */
export const clearCachePattern = async (pattern) => {
  if (!redis) return 0;
  
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
    return keys.length;
  } catch (error) {
    console.error('Redis clear pattern error:', error.message);
    return 0;
  }
};

/**
 * Cache middleware for Express
 */
export const cacheMiddleware = (ttlSeconds = 300, keyGenerator = null) => {
  return async (req, res, next) => {
    if (!redis) return next();
    
    const cacheKey = keyGenerator 
      ? keyGenerator(req) 
      : `cache:${req.method}:${req.originalUrl}`;
    
    try {
      const cached = await getCache(cacheKey);
      if (cached) {
        return res.json(cached);
      }
      
      // Override res.json to cache the response
      const originalJson = res.json.bind(res);
      res.json = (data) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          setCache(cacheKey, data, ttlSeconds).catch(() => {});
        }
        return originalJson(data);
      };
      
      next();
    } catch (error) {
      // Continue without caching on Redis error
      console.warn('Cache middleware error:', error.message);
      next();
    }
  };
};

export default {
  initRedis,
  getRedis,
  setCache,
  getCache,
  deleteCache,
  clearCachePattern,
  cacheMiddleware,
};
