import React from 'react';
import { useSettings } from '../context/SettingsContext';
import { useOrders } from '../context/OrdersContext';
import { useFinance } from '../context/FinanceContext';
import { useMenu } from '../context/MenuContext';
import { Database, AlertTriangle, Download, Upload } from 'lucide-react';

export function SettingsDatos() {
    const { exchangeRate, business } = useSettings();
    const { orders } = useOrders();
    const { expenses, closures } = useFinance();
    const { products } = useMenu();

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
    };

    const handleRestore = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const backup = JSON.parse(event.target.result);

                if (!backup.data) {
                    alert('Archivo de respaldo inválido');
                    return;
                }

                if (!confirm('⚠️ ADVERTENCIA: Esto reemplazará TODOS los datos actuales. ¿Estás seguro?')) {
                    return;
                }

                localStorage.setItem('exchangeRate', backup.data.exchangeRate);
                localStorage.setItem('business', JSON.stringify(backup.data.business));
                localStorage.setItem('products', JSON.stringify(backup.data.products));
                localStorage.setItem('orders', JSON.stringify(backup.data.orders));
                localStorage.setItem('expenses', JSON.stringify(backup.data.expenses));
                localStorage.setItem('closures', JSON.stringify(backup.data.closures));
                localStorage.setItem('lastClosureDate', backup.data.lastClosureDate);

                alert('✅ Respaldo restaurado exitosamente. La página se recargará.');
                window.location.reload();
            } catch (err) {
                alert('Error al restaurar el respaldo: ' + err.message);
            }
        };
        reader.readAsText(file);
    };

    return (
        <div className="card p-6 sm:p-8 bg-gradient-to-br from-red-50 to-orange-50 border-2 border-red-200">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-red-100 rounded-xl text-red-600">
                    <Database className="w-6 h-6" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-gray-800">Copia de Seguridad</h2>
                    <p className="text-sm text-red-600 font-medium">¡CRÍTICO! Protege tus datos</p>
                </div>
            </div>

            <div className="bg-white rounded-xl p-4 mb-4 border border-red-100">
                <div className="flex gap-2 items-start">
                    <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-gray-700">
                        Si borras el historial del navegador o reseteas la PC, <b>perderás todo</b>.
                        Haz copias de seguridad regularmente.
                    </p>
                </div>
            </div>

            <div className="space-y-3">
                <button
                    onClick={handleBackup}
                    className="w-full btn-primary bg-green-600 hover:bg-green-700 flex items-center justify-center gap-2"
                >
                    <Download className="w-5 h-5" />
                    Descargar Copia de Seguridad
                </button>

                <label className="w-full btn-secondary flex items-center justify-center gap-2 cursor-pointer">
                    <Upload className="w-5 h-5" />
                    Restaurar desde Archivo
                    <input
                        type="file"
                        accept=".json"
                        onChange={handleRestore}
                        className="hidden"
                    />
                </label>

                <p className="text-xs text-gray-500 text-center pt-2">
                    Recomendación: Haz una copia al final de cada día
                </p>
            </div>
        </div>
    );
}
