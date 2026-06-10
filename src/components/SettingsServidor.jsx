import React, { useState } from 'react';
import { useSettings } from '../context/SettingsContext';
import { syncManager } from '../lib/api.js';
import { Wifi, WifiOff, RefreshCw, Power, Clock, Download, Loader } from 'lucide-react';

export function SettingsServidor() {
    const { autoStart, toggleAutoStart, backupHour, updateBackupHour } = useSettings();
    const [isSyncing, setIsSyncing] = useState(false);
    const [isBackingUp, setIsBackingUp] = useState(false);

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

    const handleDownloadBackup = async () => {
        setIsBackingUp(true);
        try {
            const response = await fetch('/api/backup/download', {
                method: 'POST',
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
            });
            if (!response.ok) { const err = await response.json(); throw new Error(err.error); }
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `backup-2arbolitos-${new Date().toISOString().slice(0, 10)}.sql`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (err) {
            alert('Error al generar backup: ' + err.message);
        } finally {
            setIsBackingUp(false);
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
                        </p>
                        <div className="flex items-center justify-between bg-gray-50 rounded-xl p-4">
                            <div>
                                <p className="font-medium text-gray-700 text-sm">{autoStart ? 'Activado' : 'Desactivado'}</p>
                                <p className="text-xs text-gray-400 mt-0.5">{autoStart ? 'Arranque automático activo' : 'Inicio manual requerido'}</p>
                            </div>
                            <button onClick={toggleAutoStart} className={`relative w-14 h-7 rounded-full transition-colors ${autoStart ? 'bg-green-500' : 'bg-gray-300'}`}>
                                <span className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${autoStart ? 'translate-x-7' : 'translate-x-0'}`} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Backup */}
            <div className="card p-6 sm:p-8 bg-gradient-to-br from-amber-50 to-yellow-50 border-2 border-amber-200">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-amber-100 rounded-xl text-amber-600">
                        <Clock className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">Backup</h2>
                        <p className="text-sm text-amber-600">Copia de seguridad de la base de datos</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
                    <div className="bg-white rounded-xl p-4 sm:p-6 border border-amber-100">
                        <div className="flex items-center gap-2 mb-4">
                            <Clock className="w-5 h-5 text-amber-600" />
                            <h3 className="font-bold text-gray-700">Programación diaria</h3>
                        </div>
                        <p className="text-sm text-gray-500 mb-4">El backup se ejecuta automáticamente todos los días a la hora indicada.</p>
                        <div className="flex items-center gap-3">
                            <input type="number" min="0" max="23" value={backupHour} onChange={e => updateBackupHour(parseInt(e.target.value) || 2)} className="input-field w-24 text-center text-lg font-bold" />
                            <span className="text-gray-500 font-medium">:00 hs</span>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl p-4 sm:p-6 border border-amber-100 flex flex-col justify-between">
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <Download className="w-5 h-5 text-amber-600" />
                                <h3 className="font-bold text-gray-700">Descargar ahora</h3>
                            </div>
                            <p className="text-sm text-gray-500 mb-4">Genera un dump de la base de datos y lo descarga como archivo .sql</p>
                        </div>
                        <button onClick={handleDownloadBackup} disabled={isBackingUp} className="btn-primary bg-amber-600 hover:bg-amber-700 flex items-center justify-center gap-2 disabled:opacity-50 text-sm py-2.5">
                            {isBackingUp ? <Loader className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                            {isBackingUp ? 'Generando...' : 'Descargar Backup'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
