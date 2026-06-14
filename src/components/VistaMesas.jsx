import React, { useState } from 'react';
import { Utensils, ShoppingBag, Truck, Plus, X, MapPin, Phone, DollarSign, Package } from 'lucide-react';
import { useOrders } from '../context/OrdersContext';
import { useSettings } from '../context/SettingsContext';

export const PARA_LLEVAR_ID = 'para-llevar';

export function VistaMesas({ onSelectTable }) {
    const { activeTables, crearDomicilio } = useOrders();
    const { exchangeRate } = useSettings();
    const TOTAL_TABLES = 10;

    const [showNuevoDomicilio, setShowNuevoDomicilio] = useState(false);
    const [domForm, setDomForm] = useState({ direccion: '', telefono: '', costoEnvio: '' });

    const rate = exchangeRate > 0 ? exchangeRate : 1;

    const calculateTableTotal = (tableOrder) => {
        if (!tableOrder) return { cop: 0, usd: 0 };

        let cop = 0;
        let usd = 0;

        tableOrder.forEach(item => {
            const price = item.product?.price || 0;
            const isUsd = item.product?.isUsd;
            const qty = item.quantity || 0;

            if (isUsd) {
                usd += price * qty;
                cop += (price * rate) * qty;
            } else {
                cop += price * qty;
                usd += (price / rate) * qty;
            }
        });

        return { cop, usd };
    };

    const deliveryTables = Object.entries(activeTables).filter(([id]) => id.startsWith('domicilio-'));

    const handleCrearDomicilio = () => {
        if (!domForm.direccion.trim() || !domForm.telefono.trim()) {
            alert('La dirección y el teléfono son obligatorios');
            return;
        }
        const costo = parseFloat(domForm.costoEnvio.replace(/[^0-9]/g, '')) || 0;
        const id = crearDomicilio(domForm.direccion.trim(), domForm.telefono.trim(), costo);
        setShowNuevoDomicilio(false);
        setDomForm({ direccion: '', telefono: '', costoEnvio: '' });
        onSelectTable(id);
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-3xl font-bold text-gray-800">Gestión de Pedidos</h2>
                    <p className="text-gray-500">Selecciona una mesa o inicia una venta directa.</p>
                </div>
            </div>

            {/* Acciones rápidas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <button
                    onClick={() => onSelectTable('para-llevar')}
                    className="card p-6 text-left flex items-center gap-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 hover:border-blue-400 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
                >
                    <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                        <Truck className="w-7 h-7" />
                    </div>
                    <div>
                        <h3 className="font-bold text-xl text-gray-800">Para Llevar</h3>
                        <span className="text-sm font-bold text-blue-600">Venta Directa</span>
                        <p className="text-xs text-gray-500 mt-1">Iniciar pedido sin asignar mesa</p>
                    </div>
                </button>

                <button
                    onClick={() => setShowNuevoDomicilio(true)}
                    className="card p-6 text-left flex items-center gap-4 bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 hover:border-purple-400 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
                >
                    <div className="w-14 h-14 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                        <ShoppingBag className="w-7 h-7" />
                    </div>
                    <div>
                        <h3 className="font-bold text-xl text-gray-800">Nuevo Domicilio</h3>
                        <span className="text-sm font-bold text-purple-600">Entrega a Domicilio</span>
                        <p className="text-xs text-gray-500 mt-1">Crear pedido con dirección y teléfono</p>
                    </div>
                </button>
            </div>

            {/* Domicilios activos */}
            {deliveryTables.length > 0 && (
                <div className="mb-8">
                    <h3 className="text-xl font-bold text-gray-700 mb-4 flex items-center gap-2">
                        <ShoppingBag className="w-5 h-5 text-purple-600" />
                        Domicilios Activos
                        <span className="text-sm font-normal text-gray-400">({deliveryTables.length})</span>
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {deliveryTables.map(([id, entry]) => {
                            const items = entry.items || [];
                            const totals = calculateTableTotal(items);
                            return (
                                <button
                                    key={id}
                                    onClick={() => onSelectTable(id)}
                                    className="card p-5 text-left flex flex-col gap-3 bg-gradient-to-br from-purple-50 to-white border-2 border-purple-200 hover:border-purple-400 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                                                <ShoppingBag className="w-5 h-5" />
                                            </div>
                                            <span className="font-bold text-purple-700">Domicilio</span>
                                        </div>
                                        <span className="text-xs font-bold text-purple-500 bg-purple-100 px-2 py-0.5 rounded-full">
                                            {items.length} {items.length === 1 ? 'ítem' : 'ítems'}
                                        </span>
                                    </div>
                                    <div className="space-y-1 text-xs text-gray-600">
                                        <p className="flex items-center gap-1.5">
                                            <MapPin className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                                            <span className="truncate">{entry.deliveryAddress}</span>
                                        </p>
                                        <p className="flex items-center gap-1.5">
                                            <Phone className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                                            {entry.deliveryPhone}
                                        </p>
                                        {entry.deliveryCost > 0 && (
                                            <p className="flex items-center gap-1.5">
                                                <DollarSign className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                                                Envío: ${Number(entry.deliveryCost).toLocaleString()} COP
                                            </p>
                                        )}
                                    </div>
                                    <div className="pt-2 border-t border-purple-100">
                                        <div className="text-right">
                                            <div className="text-lg font-bold text-primary">
                                                ${totals.cop.toLocaleString()}
                                            </div>
                                            <div className="text-xs text-gray-400">Total</div>
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            <div className="mb-6">
                <h3 className="text-xl font-bold text-gray-700 mb-4">Mesas del Restaurante</h3>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {Array.from({ length: TOTAL_TABLES }, (_, i) => i + 1).map(tableNumber => {
                    const tableId = `mesa-${tableNumber}`;
                    const tableOrder = activeTables[tableId]?.items || [];
                    const isOccupied = tableOrder.length > 0;
                    const totals = calculateTableTotal(tableOrder);

                    return (
                        <button
                            key={tableId}
                            onClick={() => onSelectTable(tableId)}
                            className={`card p-6 text-left flex flex-col justify-between group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 relative overflow-hidden ${
                                isOccupied
                                    ? 'bg-orange-50 border-2 border-orange-200 hover:border-orange-400'
                                    : 'bg-white hover:border-primary/30'
                            }`}
                        >
                            <div className="flex items-center gap-4 mb-4">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                                    isOccupied ? 'bg-orange-100 text-orange-600' : 'bg-surface text-primary'
                                }`}>
                                    <Utensils className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-xl text-gray-800">Mesa {tableNumber}</h3>
                                    <span className={`text-sm font-bold transition-colors ${
                                        isOccupied ? 'text-orange-600' : 'text-green-600'
                                    }`}>
                                        {isOccupied ? 'Ocupada' : 'Libre'}
                                    </span>
                                </div>
                            </div>

                            <div className="mt-auto pt-4 border-t border-gray-100">
                                {isOccupied ? (
                                    <div className="text-right">
                                        <div className="text-2xl font-bold text-primary">${totals.cop.toLocaleString()}</div>
                                        <div className="text-xs font-medium text-gray-400">Total Cuenta</div>
                                    </div>
                                ) : (
                                    <p className="text-gray-400 text-sm">Haz clic para iniciar un nuevo pedido.</p>
                                )}
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Modal Nuevo Domicilio */}
            {showNuevoDomicilio && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowNuevoDomicilio(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                <ShoppingBag className="w-5 h-5 text-purple-600" />
                                Nuevo Domicilio
                            </h3>
                            <button onClick={() => { setShowNuevoDomicilio(false); setDomForm({ direccion: '', telefono: '', costoEnvio: '' }); }} className="text-gray-400 hover:text-red-500"><X className="w-5 h-5" /></button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Dirección de entrega *</label>
                                <input
                                    type="text"
                                    placeholder="Ej. Cra 5 #10-20, Barrio Centro"
                                    value={domForm.direccion}
                                    onChange={e => setDomForm({ ...domForm, direccion: e.target.value })}
                                    className="input-field w-full"
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Teléfono de contacto *</label>
                                <input
                                    type="text"
                                    placeholder="Ej. 310 555 1234"
                                    value={domForm.telefono}
                                    onChange={e => setDomForm({ ...domForm, telefono: e.target.value })}
                                    className="input-field w-full"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Costo de envío (COP)</label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    placeholder="0"
                                    value={domForm.costoEnvio}
                                    onChange={e => setDomForm({ ...domForm, costoEnvio: e.target.value.replace(/[^0-9]/g, '') })}
                                    onBlur={e => { const v = e.target.value.replace(/[^0-9]/g, ''); setDomForm({ ...domForm, costoEnvio: v ? parseInt(v).toLocaleString('es-CO') : '' }); }}
                                    onFocus={e => setDomForm({ ...domForm, costoEnvio: e.target.value.replace(/[^0-9]/g, '') })}
                                    className="input-field w-full"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
                            <button
                                onClick={() => { setShowNuevoDomicilio(false); setDomForm({ direccion: '', telefono: '', costoEnvio: '' }); }}
                                className="btn-secondary"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleCrearDomicilio}
                                className="btn-primary bg-purple-600 hover:bg-purple-700 flex items-center gap-2"
                            >
                                <Plus className="w-4 h-4" />
                                Crear Domicilio
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
