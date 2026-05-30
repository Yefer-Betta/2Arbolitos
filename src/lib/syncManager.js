const SYNC_INTERVAL = 5000;
const FETCH_TIMEOUT = 10000;
const MAX_RETRIES = 5;
const RETRY_DELAYS = [1000, 2000, 4000, 8000, 15000];

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

class SyncManager {
  constructor() {
    this.isOnline = navigator.onLine;
    this.pendingChanges = [];
    this.syncInProgress = false;
    this.listeners = [];
    this.syncInterval = null;
    this.lastSyncTimestamp = null;
    this.retryTimeout = null;

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
      if (this.isOnline && this.pendingChanges.length > 0) {
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

      const ONE_HOUR = 60 * 60 * 1000;
      const now = Date.now();
      changes = changes.filter((c) => {
        const age = now - new Date(c.timestamp).getTime();
        if (age >= ONE_HOUR) return false;
        return true;
      });

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
    let minNextDelay = Infinity;

    for (const change of changesToSync) {
      try {
        await this.syncChange(change);
        successfulIds.push(change.id);
      } catch (error) {
        console.error('Error syncing change:', change, error);
        const retryCount = (change._retryCount || 0) + 1;
        if (retryCount < MAX_RETRIES) {
          failedChanges.push({ ...change, _retryCount: retryCount });
          const delay = RETRY_DELAYS[Math.min(retryCount, RETRY_DELAYS.length - 1)];
          if (delay < minNextDelay) minNextDelay = delay;
        } else {
          console.error('Sync failed after max retries, discarding:', change);
          this.notifyListeners('syncFailed', change);
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

    if (this.pendingChanges.length > 0 && minNextDelay < Infinity) {
      if (this.retryTimeout) clearTimeout(this.retryTimeout);
      this.retryTimeout = setTimeout(() => {
        if (this.isOnline) this.syncNow();
      }, minNextDelay);
    }

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
      throw new Error(`Sync failed: ${response.status}`);
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
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || `HTTP ${response.status}`);
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
