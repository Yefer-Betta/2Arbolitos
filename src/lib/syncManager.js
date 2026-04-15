const API_URL = import.meta.env.VITE_API_URL || 'http://192.168.88.33:3001/api';
const SYNC_INTERVAL = 5000;

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
      if (this.isOnline && this.pendingChanges.length > 0) {
        this.syncNow();
      }
    }, SYNC_INTERVAL);
  }

  loadPendingChanges() {
    try {
      const saved = localStorage.getItem('pendingChanges');
      this.pendingChanges = saved ? JSON.parse(saved) : [];
    } catch (e) {
      this.pendingChanges = [];
    }
  }

  savePendingChanges() {
    localStorage.setItem('pendingChanges', JSON.stringify(this.pendingChanges));
  }

  async addToQueue(operation) {
    const operationWithTimestamp = {
      ...operation,
      id: crypto.randomUUID(),
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
        console.error('Error syncing change:', change, error);
        failedChanges.push(change);
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
      timestamp: this.lastSyncTimestamp
    });
    this.notifyListeners('timestamp', this.lastSyncTimestamp);

    return { 
      success: failedChanges.length === 0, 
      synced: successfulIds.length,
      failed: failedChanges.length,
      timestamp: this.lastSyncTimestamp
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

    let url = `${API_URL}${endpoint}`;
    let method = 'POST';

    switch (type) {
      case 'CREATE':
        method = 'POST';
        break;
      case 'UPDATE':
        method = 'PUT';
        url = `${url}/${data.id || id}`;
        break;
      case 'DELETE':
        method = 'DELETE';
        url = `${url}/${data.id || id}`;
        break;
      default:
        method = 'GET';
    }

    const response = await fetch(url, {
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

    const response = await fetch(`${API_URL}${endpoint}`, {
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
    this.savePendingChanges();
    this.notifyListeners('change', 0);
  }

  getLastSyncTimestamp() {
    return this.lastSyncTimestamp;
  }
}

export const syncManager = new SyncManager();
export default syncManager;
