const SYNC_INTERVAL = 10000;
const FETCH_TIMEOUT = 10000;
const MAX_PENDING = 500;

async function fetchWithTimeout(url, options = {}, timeout = FETCH_TIMEOUT) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(id);
  }
}

export function getApiBase() {
  if (typeof window === 'undefined') {
    return (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
  }
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && String(envUrl).trim()) {
    return String(envUrl).replace(/\/$/, '');
  }
  return `${window.location.origin}/api`;
}

function generateId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export function isRetryableError(error) {
  const status = error?.status;
  if (status === undefined) return true;
  return status >= 500;
}

class SyncManager {
  constructor() {
    this.isOnline = navigator.onLine;
    this.pendingChanges = [];
    this.syncInProgress = false;
    this.listeners = [];
    this.syncInterval = null;
    this.lastSyncTimestamp = null;

    this.init();
  }

  init() {
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());
    this.loadPendingChanges();
    this.startAutoSync();
  }

  handleOnline() {
    this.isOnline = true;
    this.notifyListeners('online');
    this.syncNow();
    this.lastSyncTimestamp = new Date().toISOString();
    this.notifyListeners('timestamp', this.lastSyncTimestamp);
  }

  handleOffline() {
    this.isOnline = false;
    this.notifyListeners('offline');
  }

  addListener(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  notifyListeners(event, data) {
    this.listeners.forEach(callback => callback(event, data));
  }

  startAutoSync() {
    if (this.syncInterval) clearInterval(this.syncInterval);
    this.syncInterval = setInterval(() => {
      if (!this.syncInProgress && this.isOnline && this.pendingChanges.length > 0) {
        this.syncNow();
      }
    }, SYNC_INTERVAL);
  }

  loadPendingChanges() {
    try {
      const saved = localStorage.getItem('pendingChanges');
      if (!saved) {
        this.pendingChanges = [];
        return;
      }
      let changes = JSON.parse(saved);
      if (!Array.isArray(changes)) changes = [];

      if (changes.length > MAX_PENDING) {
        changes = changes.slice(changes.length - MAX_PENDING);
      }

      localStorage.setItem('pendingChanges', JSON.stringify(changes));
      this.pendingChanges = changes;
    } catch {
      localStorage.setItem('pendingChanges', '[]');
      this.pendingChanges = [];
    }
  }

  savePendingChanges() {
    localStorage.setItem('pendingChanges', JSON.stringify(this.pendingChanges));
  }

  async addToQueue(operation) {
    const operationWithTimestamp = {
      ...operation,
      id: generateId(),
      timestamp: new Date().toISOString(),
    };

    this.pendingChanges.push(operationWithTimestamp);
    this.savePendingChanges();
    this.notifyListeners('change', this.pendingChanges.length);

    if (this.isOnline) {
      await this.syncNow();
    }
  }

  async syncNow() {
    if (!this.isOnline || this.syncInProgress || this.pendingChanges.length === 0) {
      return { success: true, synced: 0 };
    }

    this.syncInProgress = true;
    this.notifyListeners('syncing', true);

    const changesToSync = [...this.pendingChanges];
    const failedChanges = [];
    const successfulIds = [];

    for (const change of changesToSync) {
      try {
        await this.syncChange(change);
        successfulIds.push(change.id);
      } catch (error) {
        if (!isRetryableError(error)) {
          console.error('Cambio rechazado por el servidor, descartado de la cola:', change, error);
          this.notifyListeners('syncFailed', change);
        } else {
          failedChanges.push(change);
        }
      }
    }

    this.pendingChanges = failedChanges;
    this.savePendingChanges();

    this.syncInProgress = false;
    this.lastSyncTimestamp = new Date().toISOString();
    this.notifyListeners('syncing', false);
    this.notifyListeners('change', this.pendingChanges.length);
    this.notifyListeners('syncComplete', {
      success: successfulIds.length,
      failed: failedChanges.length,
      pending: this.pendingChanges.length,
      timestamp: this.lastSyncTimestamp,
    });
    this.notifyListeners('timestamp', this.lastSyncTimestamp);

    return {
      success: failedChanges.length === 0,
      synced: successfulIds.length,
      failed: failedChanges.length,
      pending: this.pendingChanges.length,
      timestamp: this.lastSyncTimestamp,
    };
  }

  async syncChange(change) {
    const { type, endpoint, data, id } = change;
    const token = localStorage.getItem('token');

    const headers = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const base = getApiBase();
    let url = `${base}${endpoint}`;
    let method = 'POST';

    switch (type) {
      case 'CREATE':
        method = 'POST';
        break;
      case 'UPDATE':
        method = 'PUT';
        if (endpoint === '/settings' || endpoint === '/tables/state') {
          url = `${base}${endpoint}`;
        } else {
          url = `${url}/${data.id || id}`;
        }
        break;
      case 'DELETE':
        method = 'DELETE';
        url = `${url}/${data.id || id}`;
        break;
      default:
        method = 'GET';
    }

    const response = await fetchWithTimeout(url, {
      method,
      headers,
      body: method !== 'GET' && method !== 'DELETE' ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      const error = new Error(`Sync failed: ${response.status}`);
      error.status = response.status;
      throw error;
    }

    return response.json();
  }

  async fetchFromAPI(endpoint, options = {}) {
    const token = localStorage.getItem('token');

    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetchWithTimeout(`${getApiBase()}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      const error = new Error(body.error || `HTTP ${response.status}`);
      error.status = response.status;
      throw error;
    }

    return response.json();
  }

  getPendingCount() {
    return this.pendingChanges.length;
  }

  clearPendingChanges() {
    this.pendingChanges = [];
    localStorage.setItem('pendingChanges', '[]');
    this.notifyListeners('change', 0);
  }

  getLastSyncTimestamp() {
    return this.lastSyncTimestamp;
  }
}

export const syncManager = new SyncManager();
export default syncManager;