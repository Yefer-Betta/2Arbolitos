import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { syncManager } from '../lib/syncManager';

export function SyncStatus() {
  const [isOnline, setIsOnline] = useState(syncManager.isOnline);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSync, setLastSync] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const unsubscribe = syncManager.addListener((event, data) => {
      switch (event) {
        case 'online':
          setIsOnline(true);
          break;
        case 'offline':
          setIsOnline(false);
          break;
        case 'syncing':
          setIsSyncing(data);
          break;
        case 'change':
          setPendingCount(data);
          break;
        case 'timestamp':
          setLastSync(new Date(data));
          break;
        case 'syncComplete':
          setLastSync(new Date());
          break;
      }
    });

    setPendingCount(syncManager.getPendingCount());
    return unsubscribe;
  }, []);

  const formatTime = (date) => {
    if (!date) return 'Nunca';
    return date.toLocaleTimeString();
  };

  const getStatusColor = () => {
    if (isSyncing) return 'bg-yellow-500';
    if (isOnline) return 'bg-green-500';
    return 'bg-red-500';
  };

  const getIcon = () => {
    if (isSyncing) return <RefreshCw className="w-4 h-4 animate-spin" />;
    if (isOnline) return <Wifi className="w-4 h-4" />;
    return <WifiOff className="w-4 h-4" />;
  };

  const getStatusText = () => {
    if (isSyncing) return 'Sincronizando...';
    if (isOnline) return 'En línea';
    return 'Sin conexión';
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={() => setShowDetails(!showDetails)}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg text-white transition-all ${
          isSyncing ? 'bg-yellow-500' : isOnline ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
        }`}
      >
        {getIcon()}
        <span className="text-sm font-medium">{getStatusText()}</span>
        {pendingCount > 0 && (
          <span className="bg-white text-xs font-bold px-2 py-0.5 rounded-full">
            {pendingCount}
          </span>
        )}
      </button>

      {showDetails && (
        <div className="absolute bottom-full right-0 mb-2 bg-white rounded-lg shadow-xl border border-gray-200 p-4 min-w-64">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Estado:</span>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${getStatusColor()}`}></div>
                <span className="text-sm font-medium">{getStatusText()}</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Última sync:</span>
              <span className="text-sm font-medium text-gray-800">
                {formatTime(lastSync)}
              </span>
            </div>

            {pendingCount > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Pendientes:</span>
                <span className="text-sm font-medium text-orange-600">
                  {pendingCount} cambios por sincronizar
                </span>
              </div>
            )}

            {!isOnline && (
              <div className="flex items-center gap-2 text-orange-600 bg-orange-50 p-2 rounded">
                <AlertCircle className="w-4 h-4" />
                <span className="text-xs">
                  Los cambios se guardarán localmente hasta recuperar conexión
                </span>
              </div>
            )}

            {isOnline && (
              <div className="flex items-center gap-2 text-green-600 bg-green-50 p-2 rounded">
                <CheckCircle className="w-4 h-4" />
                <span className="text-xs">
                  Sincronización automática cada 3 segundos
                </span>
              </div>
            )}

            <div className="pt-2 border-t">
              <p className="text-xs text-gray-500">
                Servidor: {import.meta.env.VITE_API_URL || 'http://192.168.88.33:3001'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
