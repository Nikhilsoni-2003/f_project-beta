class WebSocketService {
  constructor() {
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectInterval = 1000;
    this.listeners = new Map();
  }

  connect(userId) {
    try {
      const wsUrl = `${import.meta.env.VITE_WEBSOCKET_URL}?userId=${userId}`;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
        this.requestOnlineUsers();
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('WebSocket message parse error:', error);
        }
      };

      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        this.attemptReconnect(userId);
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    } catch (error) {
      console.error('WebSocket connection error:', error);
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  attemptReconnect(userId) {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => {
        console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        this.connect(userId);
      }, this.reconnectInterval * this.reconnectAttempts);
    }
  }

  send(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  handleMessage(message) {
    const { type, data } = message;
    
    if (this.listeners.has(type)) {
      const callbacks = this.listeners.get(type);
      callbacks.forEach(callback => callback(data));
    }
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  requestOnlineUsers() {
    this.send({
      action: 'getOnlineUsers'
    });
  }

  broadcastLike(type, data) {
    this.send({
      action: `liked${type.charAt(0).toUpperCase() + type.slice(1)}`,
      data
    });
  }

  broadcastComment(type, data) {
    this.send({
      action: `commented${type.charAt(0).toUpperCase() + type.slice(1)}`,
      data
    });
  }

  broadcastMessage(data) {
    this.send({
      action: 'newMessage',
      data
    });
  }

  broadcastNotification(data) {
    this.send({
      action: 'newNotification',
      data
    });
  }
}

export default new WebSocketService();