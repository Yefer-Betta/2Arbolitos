import React from 'react';
import { useSettings } from '../context/SettingsContext';
import { useOrders } from '../context/OrdersContext';
import { useFinance } from '../context/FinanceContext';
import { useMenu } from '../context/MenuContext';
import { AlertTriangle, Download, Upload } from 'lucide-react';
import { useConfirm, useToast } from './ui/feedback-context';
import { Panel, PanelHeader } from './ui/Panel';

export function SettingsDatos() {
    const { exchangeRate, business } = useSettings();
    const { orders } = useOrders();
    const { expenses, closures } = useFinance();
    const { products } = useMenu();
    const toast = useToast();
    const confirm = useConfirm();

    const handleBackup = () => {
        const backupData = {
            version: '1.0',
            timestamp: new Date().toISOString(),
            data: {
                exchangeRate,
                business,
                products,
                orders,
                expenses,
                closures,
                lastClosureDate: localStorage.getItem('lastClosureDate')
            }
        };

        const dataStr = JSON.stringify(backupData, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `2Arbolitos_Backup_${new Date().toISOString().slice(0, 10)}.json`;
        link.click();
        URL.revokeObjectURL(url);
        toast.success('Respaldo descargado');
    };

    const handleRestore = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const backup = JSON.parse(event.target.result);

                if (!backup.data) {
                    toast.error('Archivo de respaldo inválido');
                    return;
                }

                const ok = await confirm({
                    title: 'Restaurar respaldo',
                    message: 'Esto reemplazará TODOS los datos actuales. Esta acción no se puede deshacer.',
                    confirmLabel: 'Restaurar',
                    danger: true,
                });
                if (!ok) return;

                localStorage.setItem('exchangeRate', backup.data.exchangeRate);
                localStorage.setItem('business', JSON.stringify(backup.data.business));
                localStorage.setItem('products', JSON.stringify(backup.data.products));
                localStorage.setItem('orders', JSON.stringify(backup.data.orders));
                localStorage.setItem('expenses', JSON.stringify(backup.data.expenses));
                localStorage.setItem('closures', JSON.stringify(backup.data.closures));
                localStorage.setItem('lastClosureDate', backup.data.lastClosureDate);

                toast.success('Respaldo restaurado. Recargando…');
                setTimeout(() => window.location.reload(), 900);
            } catch (err) {
                toast.error('Error al restaurar el respaldo: ' + err.message);
            }
        };
        reader.readAsText(file);
    };

    return (
        <Panel>
            <PanelHeader title="Copia de seguridad" subtitle="Respaldo local en JSON del catálogo y las ventas." />

            <div className="space-y-4 p-4">
                <div className="flex items-start gap-2.5 rounded-xl border border-warn/30 bg-warn-soft px-3 py-2.5">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warn" aria-hidden="true" />
                    <p className="text-2xs leading-relaxed text-warn">
                        Si borras los datos del navegador o reseteas el equipo, perderás el historial.
                        Descarga una copia al final de cada día.
                    </p>
                </div>

                <div className="flex flex-wrap gap-2">
                    <button onClick={handleBackup} className="btn-primary h-9 px-3.5 text-[13px]">
                        <Download className="h-4 w-4" aria-hidden="true" />
                        Descargar copia
                    </button>

                    <label className="btn-secondary h-9 cursor-pointer px-3 text-[13px]">
                        <Upload className="h-4 w-4" aria-hidden="true" />
                        Restaurar desde archivo
                        <input type="file" accept=".json" onChange={handleRestore} className="hidden" />
                    </label>
                </div>

                <p className="text-2xs text-ink-soft">
                    El respaldo incluye productos, pedidos, gastos, cierres y los datos del negocio de
                    este navegador.
                </p>
            </div>
        </Panel>
    );
}
