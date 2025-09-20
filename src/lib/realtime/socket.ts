import { io, Socket } from 'socket.io-client';
import type { LiveEvent, ConnectionStatus } from '@/lib/api/types';

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';

class SocketManager {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private connectionStatus: ConnectionStatus = {
    connected: false,
  };

  connect(sessionId: string): void {
    if (this.socket?.connected) {
      return;
    }

    this.socket = io(SOCKET_URL, {
      autoConnect: true,
      query: { sessionId },
      transports: ['websocket', 'polling'],
    });

    this.setupEventListeners();
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.connectionStatus = { connected: false };
  }

  private setupEventListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('Socket connected');
      this.connectionStatus = {
        connected: true,
        lastConnected: new Date().toISOString(),
      };
      this.emit('status', this.connectionStatus);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      this.connectionStatus = {
        connected: false,
        error: reason,
      };
      this.emit('status', this.connectionStatus);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.connectionStatus = {
        connected: false,
        error: error.message,
      };
      this.emit('status', this.connectionStatus);
    });

    this.socket.on('live', (event: LiveEvent) => {
      console.log('Live event received:', event);
      this.emit(event.type, event.data);
    });

    this.socket.on('pong', (latency: number) => {
      this.connectionStatus.latencyMs = latency;
      this.emit('status', this.connectionStatus);
    });
  }

  // Event subscription
  on(event: string, callback: (data: any) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    // Return unsubscribe function
    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  // Emit to local listeners
  private emit(event: string, data: any): void {
    this.listeners.get(event)?.forEach((callback) => {
      try {
        callback(data);
      } catch (error) {
        console.error('Error in event listener:', error);
      }
    });
  }

  // Send events to server
  emitToServer(event: string, data: any): void {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn('Socket not connected, cannot emit event:', event);
    }
  }

  // Get current connection status
  getConnectionStatus(): ConnectionStatus {
    return { ...this.connectionStatus };
  }

  // Check if connected
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // Ping server for latency
  ping(): void {
    if (this.socket?.connected) {
      const start = Date.now();
      this.socket.emit('ping', start);
    }
  }
}

// Singleton instance
export const socketManager = new SocketManager();

// Convenience functions
export const connectSocket = (sessionId: string) =>
  socketManager.connect(sessionId);
export const disconnectSocket = () => socketManager.disconnect();
export const onSocketEvent = (event: string, callback: (data: any) => void) =>
  socketManager.on(event, callback);
export const emitSocketEvent = (event: string, data: any) =>
  socketManager.emitToServer(event, data);
export const getSocketStatus = () => socketManager.getConnectionStatus();
export const isSocketConnected = () => socketManager.isConnected();
export const pingSocket = () => socketManager.ping();

// Mock socket for demo mode
export class MockSocketManager {
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private intervalId: NodeJS.Timeout | null = null;
  private isConnected = false;

  connect(sessionId: string): void {
    console.log('Mock socket connected for session:', sessionId);
    this.isConnected = true;

    // Simulate connection status
    setTimeout(() => {
      this.emit('status', { connected: true, latencyMs: 50 });
    }, 100);

    // Start mock data stream
    this.startMockDataStream();
  }

  disconnect(): void {
    console.log('Mock socket disconnected');
    this.isConnected = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.emit('status', { connected: false });
  }

  private startMockDataStream(): void {
    // Simulate periodic transcript updates
    this.intervalId = setInterval(() => {
      if (!this.isConnected) return;

      // Mock transcript chunk
      const transcriptChunk = {
        id: `chunk_${Date.now()}`,
        ts: Date.now(),
        text: 'This is a mock transcript chunk for demonstration purposes.',
        speaker: 'Professor',
        confidence: 0.95,
      };

      this.emit('transcript', transcriptChunk);
    }, 3000);

    // Simulate snapshot capture
    setTimeout(() => {
      if (this.isConnected) {
        const snapshot = {
          id: `snapshot_${Date.now()}`,
          ts: Date.now(),
          thumbnailUrl: '/mock/whiteboard-thumb.jpg',
          fullUrl: '/mock/whiteboard-full.jpg',
          ocr: 'E=mc²',
        };
        this.emit('snapshot', snapshot);
      }
    }, 5000);
  }

  on(event: string, callback: (data: any) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  private emit(event: string, data: any): void {
    this.listeners.get(event)?.forEach((callback) => {
      try {
        callback(data);
      } catch (error) {
        console.error('Error in mock event listener:', error);
      }
    });
  }

  emitToServer(event: string, data: any): void {
    console.log('Mock socket emit:', event, data);
  }

  getConnectionStatus(): ConnectionStatus {
    return {
      connected: this.isConnected,
      latencyMs: this.isConnected ? 50 : undefined,
    };
  }

  isConnected(): boolean {
    return this.isConnected;
  }

  ping(): void {
    // Mock ping
  }
}

// Demo mode toggle
let useMockSocket = false;

export const setMockMode = (enabled: boolean) => {
  useMockSocket = enabled;
  if (enabled) {
    socketManager.disconnect();
  }
};

export const getSocketManager = () => {
  return useMockSocket ? new MockSocketManager() : socketManager;
};
