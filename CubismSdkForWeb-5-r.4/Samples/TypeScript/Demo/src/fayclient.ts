/**
 * Fay WebSocket client for Live2D.
 * Connects to the Fay human endpoint on port 10002.
 */

export interface LipData {
  Lip: string;
  Time: number;
}

export interface FayAction {
  code: string;
  behavior?: string;
  affect?: string;
  intensity?: number;
  priority?: number;
  matchedKeywords?: string[];
  sentimentHint?: number;
}

export interface FayMessage {
  Topic: string;
  Data: {
    Key: string;
    Value?: string;
    HttpValue?: string;
    Text: string;
    Time?: number;
    Type?: string;
    IsFirst: number;
    IsEnd: number;
    Lips?: LipData[];
    Sentiment?: number;
    MotionNo?: number;
    MotionGroup?: string;
    Action?: FayAction;
    [key: string]: any;
  };
  Username: string;
  robot?: string;
}

export class FayClient {
  private ws: WebSocket | null = null;
  private url: string;
  private username: string;
  private onMessageCallback?: (message: FayMessage) => void;
  private onConnectedCallback?: () => void;
  private onDisconnectedCallback?: () => void;
  private reconnectTimer: number | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  constructor(url: string, username: string = 'User') {
    this.url = url;
    this.username = username;
  }

  connect(): void {
    if (
      this.ws &&
      (this.ws.readyState === WebSocket.CONNECTING ||
        this.ws.readyState === WebSocket.OPEN)
    ) {
      console.log('[FayClient] Already connected or connecting');
      return;
    }

    console.log(`[FayClient] Connecting to ${this.url}`);

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        console.log('[FayClient] Connected to Fay server');
        this.reconnectAttempts = 0;

        this.send({
          Username: this.username,
          Output: true
        });

        this.onConnectedCallback?.();
      };

      this.ws.onmessage = event => {
        try {
          const message: FayMessage = JSON.parse(event.data);
          console.log(
            '[FayClient] Received message with Lips data:',
            message.Data.Lips?.length || 0
          );
          this.onMessageCallback?.(message);
        } catch (error) {
          console.error('[FayClient] Failed to parse message:', error);
        }
      };

      this.ws.onclose = () => {
        console.log('[FayClient] Disconnected from Fay server');
        this.onDisconnectedCallback?.();
        this.scheduleReconnect();
      };

      this.ws.onerror = error => {
        console.error('[FayClient] WebSocket error:', error);
      };
    } catch (error) {
      console.error('[FayClient] Failed to create WebSocket:', error);
      this.scheduleReconnect();
    }
  }

  private send(data: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
      return;
    }

    console.warn('[FayClient] WebSocket is not connected, cannot send message');
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[FayClient] Max reconnect attempts reached');
      return;
    }

    if (this.reconnectTimer !== null) {
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    console.log(
      `[FayClient] Scheduling reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`
    );

    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  disconnect(): void {
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  onMessage(callback: (message: FayMessage) => void): void {
    this.onMessageCallback = callback;
  }

  onConnected(callback: () => void): void {
    this.onConnectedCallback = callback;
  }

  onDisconnected(callback: () => void): void {
    this.onDisconnectedCallback = callback;
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}
