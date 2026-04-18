import React, { useState } from 'react';
import { useSettings } from '../context/SettingsContext';
import { useOrders } from '../context/OrdersContext';
import { useFinance } from '../context/FinanceContext';
import { useMenu } from '../context/MenuContext';
import { syncManager } from '../lib/api.js';
import { DollarSign, RefreshCw, Building, Save, Download, Upload, Database, AlertTriangle, Wifi, WifiOff, RefreshCw as SyncIcon } from 'lucide-react';

export function CurrencySettings() {
    const { exchangeRate, setExchangeRate, business, setBusiness } = useSettings();
    const { orders, syncNow, loadData } = useOrders();
    const { expenses, closures } = useFinance();
    const { products } = useMenu();

    const [localBusiness, setLocalBusiness] = useState(business);
    const [isSaved, setIsSaved] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);

    const handleRateChange = (e) => {
        const value = parseFloat(e.target.value);
        if (!isNaN(value) && value > 0) {
            setExchangeRate(value);
        }
    };

    const handleBusinessChange = (e) => {
        const { name, value } = e.target;
        setLocalBusiness(prev => ({ ...prev, [name]: value }));
        setIsSaved(false);
    };

    const saveBusinessSettings = (e) => {
        e.preventDefault();
        setBusiness(localBusiness);
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 3000);
    };

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
            await loadData();
        } catch (e) {
            console.error('Sync error:', e);
        } finally {
            setIsSyncing(false);
        }
    };

    // Backup System
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

                // Restore to localStorage
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

    const handleImageUpload = (e, field) => {
        const file = e.target.files[0];
        if (file && file.size > 1024 * 1024) { // Límite de 1MB
            alert('La imagen es muy grande. Por favor, elige una imagen de menos de 1MB.');
            e.target.value = null; // Limpiar el input
            return;
        }

        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setLocalBusiness(prev => ({ ...prev, [field]: reader.result }));
                setIsSaved(false);
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="space-y-8">
            {/* Sincronización - Ahora al inicio */}
            <div className="card p-6 sm:p-8 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200">
                <div className="flex items-center gap-3 mb-4 sm:mb-6">
                    <div className="p-3 bg-blue-100 rounded-xl text-blue-600">
                        <SyncIcon className="w-5 h-5 sm:w-6 sm:h-6" />
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
                        <div className="text-[10px] sm:text-xs text-gray-500">
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 w-full max-w-6xl">
                {/* Left Column */}
                <div className="space-y-6 sm:space-y-8">
                {/* Exchange Rate */}
                <div className="card p-8">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 bg-green-50 rounded-xl text-green-600">
                            <DollarSign className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-800">Tasa de Cambio</h2>
                            <p className="text-sm text-gray-500">Valor del Dólar hoy</p>
                        </div>
                    </div>

                    <div className="flex flex-col gap-4">
                        <label htmlFor="rate" className="text-sm font-bold text-gray-700">
                            1 USD = COP
                        </label>

                        <div className="relative group">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-green-600 font-bold text-lg">
                                $
                            </span>
                            <input
                                id="rate"
                                type="number"
                                value={exchangeRate}
                                onChange={handleRateChange}
                                className="w-full pl-10 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-xl text-2xl font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
                                step="50"
                            />
                            <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                <div className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded-lg">
                                    <RefreshCw className="w-3 h-3" />
                                    <span>Auto</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Backup System */}
                <div className="card p-8 bg-gradient-to-br from-red-50 to-orange-50 border-2 border-red-200">
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
            </div>

            {/* Right: Business Info */}
            <div className="card p-6 sm:p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full pointer-events-none"></div>
                <div className="flex items-center gap-3 mb-6 relative">
                    <div className="p-3 bg-primary/10 rounded-xl text-primary">
                        <Building className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">Datos del Negocio</h2>
                        <p className="text-sm text-gray-500">Información para facturación</p>
                    </div>
                </div>

                <form onSubmit={saveBusinessSettings} className="space-y-4 relative">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Nombre del Negocio</label>
                        <input
                            type="text"
                            name="name"
                            value={localBusiness.name}
                            onChange={handleBusinessChange}
                            className="input-field"
                            placeholder="Ej. Restaurante 2Arbolitos"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">NIT / RUT</label>
                            <input
                                type="text"
                                name="nit"
                                value={localBusiness.nit}
                                onChange={handleBusinessChange}
                                className="input-field"
                                placeholder="Ej. 123456789-0"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Teléfono</label>
                            <input
                                type="text"
                                name="phone"
                                value={localBusiness.phone}
                                onChange={handleBusinessChange}
                                className="input-field"
                                placeholder="Ej. 300 123 4567"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Dirección</label>
                        <input
                            type="text"
                            name="address"
                            value={localBusiness.address}
                            onChange={handleBusinessChange}
                            className="input-field"
                            placeholder="Ej. Calle 123 # 45-67"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Mensaje Ticket</label>
                        <input
                            type="text"
                            name="message"
                            value={localBusiness.message}
                            onChange={handleBusinessChange}
                            className="input-field"
                            placeholder="Ej. ¡Gracias por su visita!"
                        />
                    </div>

                    {/* System Logo */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Logo del Sistema</label>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleImageUpload(e, 'logo')}
                            className="input-field"
                        />
                        {localBusiness.logo && <img src={localBusiness.logo} alt="Logo Preview" className="mt-2 h-16" />}
                    </div>

                    {/* Invoice Logo */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Logo para Factura</label>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleImageUpload(e, 'invoiceLogo')}
                            className="input-field"
                        />
                        {localBusiness.invoiceLogo && <img src={localBusiness.invoiceLogo} alt="Invoice Logo Preview" className="mt-2 h-16" />}
                    </div>

                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={isSaved}
                            className={`w-full btn-primary flex items-center justify-center gap-2 ${isSaved ? 'bg-green-600 hover:bg-green-700' : ''}`}
                        >
                            {isSaved ? (
                                <>¡Guardado!</>
                            ) : (
                                <><Save className="w-5 h-5" /> Guardar Cambios</>
                            )}
                        </button>
                    </div>
                </form>
            </div>
            </div>
        </div>
    );
}
