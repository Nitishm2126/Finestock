const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export type RealtimeStatus = 'connected' | 'connecting' | 'reconnecting' | 'disconnected';

export interface RealtimeEvent {
  event: string;
  timestamp?: string;
  organization_id?: string;
  product_id?: string;
  warehouse_id?: string;
  location_id?: string;
  physical?: number;
  reserved?: number;
  available?: number;
  incoming?: number;
  outgoing?: number;
  source?: {
    type: string;
    id: string;
  };
  [key: string]: any;
}

export interface LiveOperation {
  type: 'RECEIPT' | 'DELIVERY' | 'TRANSFER' | 'ADJUSTMENT';
  document_number: string;
  operator: string;
  warehouse_name: string;
  status: string;
  progress: number;
  started_at: string;
  updated_at: string;
}

export async function fetchLiveOperations(token: string): Promise<LiveOperation[]> {
  if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
    return [
      {
        type: 'RECEIPT',
        document_number: 'REC-2026-0001',
        operator: 'Warehouse Inbound',
        warehouse_name: 'Main Distribution Hub',
        status: 'WAITING',
        progress: 0,
        started_at: new Date(Date.now() - 1800000).toISOString(),
        updated_at: new Date(Date.now() - 600000).toISOString(),
      },
      {
        type: 'DELIVERY',
        document_number: 'DEL-2026-0001',
        operator: 'TechCorp Industries',
        warehouse_name: 'Main Distribution Hub',
        status: 'PICKING',
        progress: 60,
        started_at: new Date(Date.now() - 3600000).toISOString(),
        updated_at: new Date(Date.now() - 300000).toISOString(),
      },
      {
        type: 'TRANSFER',
        document_number: 'TRF-2026-0001',
        operator: 'Internal Logistics',
        warehouse_name: 'Main Hub → North Fulfillment',
        status: 'APPROVED',
        progress: 50,
        started_at: new Date(Date.now() - 5400000).toISOString(),
        updated_at: new Date(Date.now() - 1200000).toISOString(),
      }
    ];
  }

  const res = await fetch(`${API_BASE_URL}/realtime/operations/live`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to fetch live operations');
  const data = await res.json();
  return data.operations || [];
}

export class RealtimeClient {
  private ws: WebSocket | null = null;
  private token: string | null = null;
  private statusListeners: ((status: RealtimeStatus) => void)[] = [];
  private eventListeners: ((event: RealtimeEvent) => void)[] = [];
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectTimeout: any = null;
  private pingInterval: any = null;
  private isIntentionalClose = false;
  private status: RealtimeStatus = 'disconnected';

  constructor(token?: string) {
    if (token) this.token = token;
  }

  setToken(token: string) {
    this.token = token;
  }

  onStatusChange(cb: (status: RealtimeStatus) => void) {
    this.statusListeners.push(cb);
    cb(this.status);
    return () => {
      this.statusListeners = this.statusListeners.filter(l => l !== cb);
    };
  }

  onEvent(cb: (event: RealtimeEvent) => void) {
    this.eventListeners.push(cb);
    return () => {
      this.eventListeners = this.eventListeners.filter(l => l !== cb);
    };
  }

  private updateStatus(newStatus: RealtimeStatus) {
    this.status = newStatus;
    this.statusListeners.forEach(cb => cb(newStatus));
  }

  connect() {
    if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
      this.updateStatus('connected');
      return;
    }

    if (!this.token) {
      this.updateStatus('disconnected');
      return;
    }

    this.isIntentionalClose = false;
    this.updateStatus(this.reconnectAttempts === 0 ? 'connecting' : 'reconnecting');

    try {
      const wsUrl = (API_BASE_URL.replace(/^http/, 'ws')) + `/realtime/inventory?token=${encodeURIComponent(this.token)}`;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.updateStatus('connected');
        // Start ping heartbeat
        if (this.pingInterval) clearInterval(this.pingInterval);
        this.pingInterval = setInterval(() => {
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: 'PING' }));
          }
        }, 15000);
      };

      this.ws.onmessage = (messageEvent) => {
        try {
          const data = JSON.parse(messageEvent.data);
          this.eventListeners.forEach(cb => cb(data));
        } catch (e) {
          console.warn('Failed to parse realtime message:', e);
        }
      };

      this.ws.onclose = () => {
        if (this.pingInterval) clearInterval(this.pingInterval);
        if (!this.isIntentionalClose) {
          this.scheduleReconnect();
        } else {
          this.updateStatus('disconnected');
        }
      };

      this.ws.onerror = () => {
        // error will trigger onclose
      };
    } catch (e) {
      console.warn('WebSocket connection error:', e);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.updateStatus('disconnected');
      return;
    }

    this.updateStatus('reconnecting');
    const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 15000);
    this.reconnectAttempts++;

    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, delay);
  }

  disconnect() {
    this.isIntentionalClose = true;
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    if (this.pingInterval) clearInterval(this.pingInterval);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.updateStatus('disconnected');
  }
}
