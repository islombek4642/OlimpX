/**
 * ============================================
 * OlimpX - WebSocket Client Module
 * ============================================
 */

export class WSClient {
  constructor(path = '/ws') {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    this.url = `${protocol}//${host}${path}`;
    this.socket = null;
    this.handlers = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.token = null;
    this.isConnected = false;
  }

  connect(token) {
    this.token = token;
    this.socket = new WebSocket(this.url);

    this.socket.onopen = () => {
      console.log('🔌 WebSocket Connected');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      
      // Auth if token provided
      if (this.token) {
        this.send('auth', { token: this.token });
      }

      this.trigger('open');
    };

    this.socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        this.trigger(message.type || 'message', message);
        
        // If it's a broadcast, trigger specific channel handler
        if (message.type === 'broadcast') {
          this.trigger(`channel:${message.channel}`, message.data);
        }
      } catch (err) {
        console.error('WS Message Error:', err);
      }
    };

    this.socket.onclose = () => {
      console.log('🔌 WebSocket Disconnected');
      this.isConnected = false;
      this.trigger('close');
      this.attemptReconnect();
    };

    this.socket.onerror = (error) => {
      console.error('WS Error:', error);
      this.trigger('error', error);
    };
  }

  send(type, payload) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type, payload }));
    } else {
      console.warn('WS not connected, cannot send message');
    }
  }

  subscribe(channels) {
    this.send('subscribe', { channels: Array.isArray(channels) ? channels : [channels] });
  }

  on(event, handler) {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, []);
    }
    this.handlers.get(event).push(handler);
  }

  trigger(event, data) {
    const handlers = this.handlers.get(event);
    if (handlers) {
      handlers.forEach(handler => handler(data));
    }
  }

  attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.pow(2, this.reconnectAttempts) * 1000;
      console.log(`🔌 Attempting reconnect in ${delay}ms...`);
      setTimeout(() => this.connect(this.token), delay);
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
    }
  }
}

export const ws = new WSClient();
