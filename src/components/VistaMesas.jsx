import React from 'react';
import { Utensils } from 'lucide-react';
import { useOrders } from '../context/OrdersContext';
import { useSettings } from '../context/SettingsContext';

export function VistaMesas({ onSelectTable }) {
    const { activeTables } = useOrders();
    const { exchangeRate } = useSettings();
    const TOTAL_TABLES = 10;

    const calculateTableTotal = (tableOrder) => {
        if (!tableOrder) return { cop: 0, usd: 0 };

        let cop = 0;
        let usd = 0;

        tableOrder.forEach(item => {
            const price = item.product.price;
            const isUsd = item.product.isUsd;
            const qty = item.quantity;

            if (isUsd) {
                usd += price * qty;
                cop += (price * exchangeRate) * qty;
            } else {
                cop += price * qty;
                usd += (price / exchangeRate) * qty;
            }
        });

        return { cop, usd };
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-3xl font-bold text-gray-800">Gestión de Mesas</h2>
                    <p className="text-gray-500">Selecciona una mesa para ver o añadir a la cuenta.</p>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {Array.from({ length: TOTAL_TABLES }, (_, i) => i + 1).map(tableNumber => {
                    const tableId = `mesa-${tableNumber}`;
                    const tableOrder = activeTables[tableId];
                    const isOccupied = !!tableOrder && tableOrder.length > 0;
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
        </div>
    );
}