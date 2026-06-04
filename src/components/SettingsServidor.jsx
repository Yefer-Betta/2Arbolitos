import React, { useState } from 'react';
import { useSettings } from '../context/SettingsContext';
import { syncManager } from '../lib/api.js';
import { Wifi, WifiOff, RefreshCw, Power } from 'lucide-react';

export function SettingsServidor() {
    const { autoStart, toggleAutoStart } = useSettings();
    const [isSyncing, setIsSyncing] = useState(false);

    const handleManualSync = async () => {
        setIsSyncing(true);
        try {
            await syncManager.syncNow();
            await Promise.all([
                syncManager.fetchFromAPI('/orders'),
                syncManager.fetchFromAPI('/settings'),
                syncManager.fetchFromAPI('/products?active=true'),
                syncManager.fetchFromAPI('/tables/state'),
            ]);
        } catch (e) {
            console.error('Sync error:', e);
        } finally {
            setIsSyncing(false);
        }
    };

    return (
        <div className="space-y-6 sm:space-y-8">
            {/* Sincronización */}
            <div className="card p-6 sm:p-8 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200">
                <div className="flex items-center gap-3 mb-4 sm:mb-6">
                    <div className="p-3 bg-blue-100 rounded-xl text-blue-600">
                        <RefreshCw className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <div>
                        <h2 className="text-lg sm:text-xl font-bold text-gray-800">Sincronización</h2>
                        <p className="text-sm text-blue-600 font-medium">Estado de conexión</p>
                    </div>
                </div>

                <div className="bg-white rounded-xl p-3 sm:p-4 mb-3 sm:mb-4 border border-blue-100">
                    <div className="flex items-center justify-between mb-2 sm:mb-4">
                        <div className="flex items-center gap-2">
                            {syncManager.isOnline ? (
                                <>
                                    <Wifi className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />
                                    <span className="text-xs sm:text-sm font-medium text-gray-700">Conectado</span>
                                </>
                            ) : (
                                <>
                                    <WifiOff className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" />
                                    <span className="text-xs sm:text-sm font-medium text-gray-700">Sin conexión</span>
                                </>
                            )}
                        </div>
                        <div className="text-xs text-gray-500">
                            Cambios pendientes: {syncManager.getPendingCount()}
                        </div>
                    </div>
                </div>

                <div className="space-y-2 sm:space-y-3">
                    <p className="text-xs sm:text-sm text-gray-600">
                        La sincronización automática ocurre cada 5 segundos cuando hay conexión.
                    </p>
                    <button
                        onClick={handleManualSync}
                        disabled={!syncManager.isOnline || isSyncing}
                        className="w-full btn-primary bg-blue-600 hover:bg-blue-700 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base py-2 sm:py-3"
                    >
                        <RefreshCw className={`w-4 h-4 sm:w-5 sm:h-5 ${isSyncing ? 'animate-spin' : ''}`} />
                        {isSyncing ? 'Sincronizando...' : 'Forzar Sincronización'}
                    </button>
                </div>
            </div>

            {/* Sistema / Auto-start */}
            <div className="card p-6 sm:p-8 bg-gradient-to-br from-gray-50 to-slate-50 border-2 border-gray-200">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-gray-100 rounded-xl text-gray-600">
                        <Power className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">Sistema</h2>
                        <p className="text-sm text-gray-500">Configuración del servidor</p>
                    </div>
                </div>

                <div className="max-w-md">
                    <div className="bg-white rounded-xl p-4 sm:p-6 border border-gray-100">
                        <div className="flex items-center gap-2 mb-4">
                            <Power className="w-5 h-5 text-gray-600" />
                            <h3 className="font-bold text-gray-700">Inicio automático</h3>
                        </div>
                        <p className="text-sm text-gray-500 mb-4">
                            El servidor se inicia automáticamente al encender el PC.
                            No necesitas abrir una terminal nunca.
                        </p>
                        <div className="flex items-center justify-between bg-gray-50 rounded-xl p-4">
                            <div>
                                <p className="font-medium text-gray-700 text-sm">
                                    {autoStart ? 'Activado' : 'Desactivado'}
                                </p>
                                <p className="text-xs text-gray-400 mt-0.5">
                                    {autoStart
                                        ? 'El sistema arranca solo al prender el equipo'
                                        : 'Debes iniciar el servidor manualmente'}
                                </p>
                            </div>
                            <button
                                onClick={toggleAutoStart}
                                className={`relative w-14 h-7 rounded-full transition-colors ${
                                    autoStart ? 'bg-green-500' : 'bg-gray-300'
                                }`}
                            >
                                <span
                                    className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                                        autoStart ? 'translate-x-7' : 'translate-x-0'
                                    }`}
                                />
                            </button>
                        </div>
                        <p className="text-xs text-gray-400 mt-3">
                            Solo disponible cuando el servidor corre con PM2
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
