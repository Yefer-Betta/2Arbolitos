const API_URL = 'http://192.168.88.33:3001/api';
const SYNC_INTERVAL = 5000;

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

    // Limpiar cola inmediatamente al iniciar
    this.clearPendingChanges();

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
      
      // Limpiar pedidos antiguos (más de 1 hora) para evitar errores de sincronización
      const ONE_HOUR = 60 * 60 * 1000;
      const now = Date.now();
      changes = changes.filter(c => {
        const age = now - new Date(c.timestamp).getTime();
        // Limpiar si es antiguo O si los datos no tienen estructura correcta
        if (age >= ONE_HOUR) return false;
        if (c.data?.items?.length > 0) {
          // Verificar que items tenga estructura correcta (productId en lugar de product)
          const firstItem = c.data.items[0];
          return firstItem && firstItem.productId && !firstItem.product;
        }
        return false;
      });
      
      // Siempre guardar cambios limpiados
      localStorage.setItem('pendingChanges', JSON.stringify(changes));
      
      this.pendingChanges = changes;
    } catch (e) {
      // Si hay error de parseo, limpiar todo
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
        // Some endpoints like settings and table states don't expect an ID suffix
        if (endpoint === '/settings' || endpoint === '/tables/state') {
          url = `${API_URL}${endpoint}`;
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
    // Limpiar TODA la cola - start fresh
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
