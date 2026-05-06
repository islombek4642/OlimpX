/**
 * WebSocket Configuration
 * Real-time updates for admin dashboard and live monitoring
 */

import { WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';
import { getRedis } from './redis.js';

let wss = null;

// Connected clients store
const clients = new Map();

/**
 * Initialize WebSocket server
 */
export const initWebSocket = (server) => {
  wss = new WebSocketServer({ 
    server,
    path: '/ws',
    verifyClient: (info, done) => {
      // Allow connections without token for public endpoints
      // Token verification happens after connection
      done(true);
    }
  });

  wss.on('connection', (ws, req) => {
    console.log('🔌 New WebSocket connection');
    
    // Store client info
    const clientInfo = {
      id: generateClientId(),
      ws,
      userId: null,
      role: null,
      isAlive: true,
      subscriptions: new Set(),
      connectedAt: new Date(),
    };
    
    clients.set(clientInfo.id, clientInfo);

    // Send welcome message
    ws.send(JSON.stringify({
      type: 'connection',
      status: 'connected',
      clientId: clientInfo.id,
      timestamp: new Date().toISOString(),
    }));

    // Handle messages
    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data);
        await handleMessage(clientInfo, message);
      } catch (error) {
        ws.send(JSON.stringify({
          type: 'error',
          error: 'Invalid message format',
        }));
      }
    });

    // Handle ping/pong for connection health
    ws.on('pong', () => {
      clientInfo.isAlive = true;
    });

    // Handle close
    ws.on('close', () => {
      console.log('🔌 WebSocket disconnected:', clientInfo.id);
      clients.delete(clientInfo.id);
    });

    // Handle errors
    ws.on('error', (error) => {
      console.error('WebSocket error:', error.message);
    });
  });

  // Ping clients every 30 seconds
  const pingInterval = setInterval(() => {
    clients.forEach((client) => {
      if (!client.isAlive) {
        client.ws.terminate();
        clients.delete(client.id);
        return;
      }
      
      client.isAlive = false;
      client.ws.ping();
    });
  }, 30000);

  // Clean up on server shutdown
  wss.on('close', () => {
    clearInterval(pingInterval);
  });

  console.log('✅ WebSocket server initialized at /ws');
  return wss;
};

/**
 * Generate unique client ID
 */
const generateClientId = () => {
  return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Handle incoming WebSocket messages
 */
const handleMessage = async (client, message) => {
  const { type, payload } = message;

  switch (type) {
    case 'auth':
      await handleAuth(client, payload);
      break;
      
    case 'subscribe':
      handleSubscribe(client, payload);
      break;
      
    case 'unsubscribe':
      handleUnsubscribe(client, payload);
      break;
      
    case 'ping':
      client.ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
      break;
      
    case 'getStats':
      await handleGetStats(client);
      break;
      
    default:
      client.ws.send(JSON.stringify({
        type: 'error',
        error: `Unknown message type: ${type}`,
      }));
  }
};

/**
 * Handle authentication
 */
const handleAuth = async (client, payload) => {
  try {
    const { token } = payload;
    
    if (!token) {
      return client.ws.send(JSON.stringify({
        type: 'auth',
        status: 'error',
        error: 'Token required',
      }));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    client.userId = decoded.userId;
    client.role = decoded.role;
    
    client.ws.send(JSON.stringify({
      type: 'auth',
      status: 'success',
      userId: client.userId,
      role: client.role,
    }));
    
    console.log(`🔐 WebSocket authenticated: ${client.userId} (${client.role})`);
  } catch (error) {
    client.ws.send(JSON.stringify({
      type: 'auth',
      status: 'error',
      error: 'Invalid token',
    }));
  }
};

/**
 * Handle subscription
 */
const handleSubscribe = (client, payload) => {
  const { channels } = payload;
  
  if (!Array.isArray(channels)) {
    return client.ws.send(JSON.stringify({
      type: 'error',
      error: 'Channels must be an array',
    }));
  }

  // Check permissions for admin channels
  const adminChannels = ['admin:stats', 'admin:users', 'admin:results'];
  const restrictedChannels = channels.filter(ch => adminChannels.includes(ch));
  
  if (restrictedChannels.length > 0 && client.role !== 'admin') {
    return client.ws.send(JSON.stringify({
      type: 'error',
      error: 'Admin access required for: ' + restrictedChannels.join(', '),
    }));
  }

  channels.forEach(channel => {
    client.subscriptions.add(channel);
  });

  client.ws.send(JSON.stringify({
    type: 'subscribe',
    status: 'success',
    channels: Array.from(client.subscriptions),
  }));
};

/**
 * Handle unsubscription
 */
const handleUnsubscribe = (client, payload) => {
  const { channels } = payload;
  
  if (Array.isArray(channels)) {
    channels.forEach(channel => {
      client.subscriptions.delete(channel);
    });
  }

  client.ws.send(JSON.stringify({
    type: 'unsubscribe',
    status: 'success',
    channels: Array.from(client.subscriptions),
  }));
};

/**
 * Handle get stats request
 */
const handleGetStats = async (client) => {
  if (client.role !== 'admin') {
    return client.ws.send(JSON.stringify({
      type: 'error',
      error: 'Admin access required',
    }));
  }

  try {
    const prisma = (await import('../config/database.js')).default;
    
    const [totalUsers, totalOlympiads, totalResults, recentResults] = await Promise.all([
      prisma.user.count(),
      prisma.olympiad.count(),
      prisma.result.count(),
      prisma.result.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { fullName: true } },
          olympiad: { select: { title: true } },
        },
      }),
    ]);

    client.ws.send(JSON.stringify({
      type: 'stats',
      data: {
        totalUsers,
        totalOlympiads,
        totalResults,
        recentResults,
        timestamp: new Date().toISOString(),
      },
    }));
  } catch (error) {
    client.ws.send(JSON.stringify({
      type: 'error',
      error: 'Failed to fetch stats',
    }));
  }
};

/**
 * Broadcast message to all connected clients
 */
export const broadcast = (channel, data, options = {}) => {
  const { role, exclude } = options;
  
  const message = JSON.stringify({
    type: 'broadcast',
    channel,
    data,
    timestamp: new Date().toISOString(),
  });

  clients.forEach((client) => {
    // Check if client is subscribed to channel
    if (!client.subscriptions.has(channel)) return;
    
    // Check role filter
    if (role && client.role !== role) return;
    
    // Check exclude list
    if (exclude && exclude.includes(client.id)) return;
    
    // Check connection state
    if (client.ws.readyState === 1) { // WebSocket.OPEN
      client.ws.send(message);
    }
  });
};

/**
 * Send message to specific user
 */
export const sendToUser = (userId, data) => {
  const message = JSON.stringify({
    type: 'notification',
    data,
    timestamp: new Date().toISOString(),
  });

  clients.forEach((client) => {
    if (client.userId === userId && client.ws.readyState === 1) {
      client.ws.send(message);
    }
  });
};

/**
 * Send message to specific client
 */
export const sendToClient = (clientId, data) => {
  const client = clients.get(clientId);
  
  if (client && client.ws.readyState === 1) {
    client.ws.send(JSON.stringify(data));
  }
};

/**
 * Get connected clients count
 */
export const getConnectedClientsCount = () => clients.size;

/**
 * Get connected admin count
 */
export const getConnectedAdminCount = () => {
  let count = 0;
  clients.forEach((client) => {
    if (client.role === 'admin') count++;
  });
  return count;
};

/**
 * Get subscription stats
 */
export const getSubscriptionStats = () => {
  const stats = {};
  
  clients.forEach((client) => {
    client.subscriptions.forEach(channel => {
      stats[channel] = (stats[channel] || 0) + 1;
    });
  });
  
  return stats;
};

export default {
  initWebSocket,
  broadcast,
  sendToUser,
  sendToClient,
  getConnectedClientsCount,
  getConnectedAdminCount,
  getSubscriptionStats,
};
