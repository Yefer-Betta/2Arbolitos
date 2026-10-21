import React, { useState } from 'react';
import { useSettings } from '../context/SettingsContext';
import { syncManager } from '../lib/api.js';
import { Wifi, WifiOff, RefreshCw, Power, Clock, Download, Loader } from 'lucide-react';
import { useToast } from './ui/feedback-context';
import { Panel, PanelHeader } from './ui/Panel';
import { Badge } from './ui/Badge';
import { cn } from '../lib/utils';

export function SettingsServidor() {
    const { autoStart, toggleAutoStart, backupHour, updateBackupHour } = useSettings();
    const toast = useToast();
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
                credentials: 'include',
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
            toast.success('Backup descargado');
        } catch (err) {
            toast.error('Error al generar backup: ' + err.message);
        } finally {
            setIsBackingUp(false);
        }
    };

    return (
        <div className="space-y-4">
            <Panel>
                <PanelHeader
                    title="Sincronización"
                    subtitle="Estado de la conexión con el servidor."
                    actions={
                        <Badge tone={syncManager.isOnline ? 'ok' : 'danger'}>
                            {syncManager.isOnline ? 'En línea' : 'Sin conexión'}
                        </Badge>
                    }
                />
                <div className="space-y-3 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface px-3 py-2.5">
                        <span className="flex items-center gap-2 text-xs font-medium text-ink">
                            {syncManager.isOnline ? (
                                <Wifi className="h-4 w-4 text-ok" aria-hidden="true" />
                            ) : (
                                <WifiOff className="h-4 w-4 text-danger" aria-hidden="true" />
                            )}
                            {syncManager.isOnline ? 'Conectado al servidor' : 'Trabajando sin conexión'}
                        </span>
                        <span className="text-2xs text-ink-muted">
                            Cambios pendientes: <b className="num text-ink">{syncManager.getPendingCount()}</b>
                        </span>
                    </div>
                    <p className="text-2xs text-ink-muted">
                        La sincronización automática ocurre cada 5 segundos cuando hay conexión.
                    </p>
                    <button
                        onClick={handleManualSync}
                        disabled={!syncManager.isOnline || isSyncing}
                        className="btn-primary h-9 w-full px-3.5 text-[13px] sm:w-auto"
                    >
                        <RefreshCw className={cn('h-4 w-4', isSyncing && 'animate-spin')} aria-hidden="true" />
                        {isSyncing ? 'Sincronizando...' : 'Forzar sincronización'}
                    </button>
                </div>
            </Panel>

            <Panel>
                <PanelHeader title="Sistema" subtitle="Configuración del equipo donde corre el POS." />
                <div className="flex items-center justify-between gap-4 p-4">
                    <div className="flex items-start gap-2.5">
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-surface text-ink-muted">
                            <Power className="h-4 w-4" aria-hidden="true" />
                        </span>
                        <div>
                            <p className="text-[13px] font-medium text-ink">Inicio automático</p>
                            <p className="mt-0.5 text-2xs text-ink-muted">
                                {autoStart ? 'El servidor arranca al encender el PC.' : 'Hay que iniciarlo a mano.'}
                            </p>
                        </div>
                    </div>
                    <button
                        role="switch"
                        aria-checked={autoStart}
                        aria-label="Inicio automático"
                        onClick={toggleAutoStart}
                        className={cn(
                            'relative h-6 w-11 shrink-0 rounded-full transition-colors',
                            autoStart ? 'bg-primary' : 'bg-line'
                        )}
                    >
                        <span
                            className={cn(
                                'absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
                                autoStart && 'translate-x-5'
                            )}
                        />
                    </button>
                </div>
            </Panel>

            <Panel>
                <PanelHeader title="Copias de seguridad" subtitle="Dump de la base de datos en MySQL." />
                <div className="grid gap-4 p-4 sm:grid-cols-2">
                    <div>
                        <div className="mb-1 flex items-center gap-1.5 text-2xs font-semibold text-ink-muted">
                            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                            Programación diaria
                        </div>
                        <p className="mb-2 text-2xs text-ink-muted">
                            Se ejecuta todos los días a la hora indicada.
                        </p>
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                min="0"
                                max="23"
                                value={backupHour}
                                onChange={e => updateBackupHour(parseInt(e.target.value) || 2)}
                                className="input-field num h-9 w-20 text-center text-sm font-semibold"
                                aria-label="Hora del backup automático"
                            />
                            <span className="text-xs text-ink-muted">:00 hs</span>
                        </div>
                    </div>

                    <div>
                        <div className="mb-1 flex items-center gap-1.5 text-2xs font-semibold text-ink-muted">
                            <Download className="h-3.5 w-3.5" aria-hidden="true" />
                            Descargar ahora
                        </div>
                        <p className="mb-2 text-2xs text-ink-muted">
                            Genera el dump y lo descarga como archivo .sql.
                        </p>
                        <button
                            onClick={handleDownloadBackup}
                            disabled={isBackingUp}
                            className="btn-secondary h-9 px-3 text-[13px]"
                        >
                            {isBackingUp ? (
                                <Loader className="h-4 w-4 animate-spin" aria-hidden="true" />
                            ) : (
                                <Download className="h-4 w-4" aria-hidden="true" />
                            )}
                            {isBackingUp ? 'Generando...' : 'Descargar backup'}
                        </button>
                    </div>
                </div>
            </Panel>
        </div>
    );
}
