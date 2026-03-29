import React, { useMemo } from 'react';
import { useOrders } from '../context/OrdersContext';
import { useFinance } from '../context/FinanceContext';
import { Clock, DollarSign, Calendar, TrendingUp, Download, History as HistoryIcon } from 'lucide-react';
import { utils, writeFile } from 'xlsx';
import { PARA_LLEVAR_ID } from './VistaMesas';

function orderOriginLabel(order) {
    if (!order.tableId) return '—';
    if (order.tableId === PARA_LLEVAR_ID) return 'Para llevar';
    return order.tableId.replace('mesa-', 'Mesa ');
}

export function History() {
    const { orders } = useOrders();
    const { lastClosureDate, closures } = useFinance();

    // Filter for Current Shift
    const currentShiftOrders = useMemo(() => {
        return orders.filter(o => new Date(o.date) > new Date(lastClosureDate));
    }, [orders, lastClosureDate]);

    // Calculate Totals for Current Shift
    const totalShiftCOP = currentShiftOrders.reduce((sum, o) => sum + o.totalCop, 0);
    const totalShiftUSD = currentShiftOrders.reduce((sum, o) => sum + o.totalUsd, 0);

    // Export Functionality
    const exportToExcel = () => {
        const data = currentShiftOrders.map(order => ({
            Fecha: new Date(order.date).toLocaleDateString(),
            Hora: new Date(order.date).toLocaleTimeString(),
            Origen: orderOriginLabel(order),
            Items: order.items.map(i => `${i.quantity}x ${i.product.name}`).join(', '),
            'Total COP': order.totalCop,
            'Total USD': order.totalUsd,
            'Método Pago': order.payment?.method || 'N/A',
            'Tasa Cambio': order.exchangeRateSnapshot
        }));

        const ws = utils.json_to_sheet(data);
        const wb = utils.book_new();
        utils.book_append_sheet(wb, ws, "Ventas Turno Actual");
        writeFile(wb, `Ventas_${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Historial de Turno Actual</h2>
                    <p className="text-gray-500 text-sm">
                        Ventas desde el último cierre: <span className="font-bold text-primary">{new Date(lastClosureDate).toLocaleString()}</span>
                    </p>
                </div>

                <div className="flex gap-4">
                    <button
                        onClick={exportToExcel}
                        disabled={currentShiftOrders.length === 0}
                        className="btn-secondary flex items-center gap-2"
                    >
                        <Download className="w-4 h-4" /> Exportar Excel
                    </button>
                    <div className="card px-6 py-4 flex gap-8 bg-gradient-to-r from-primary to-primary-dark text-white shadow-xl shadow-primary/20">
                        <div>
                            <span className="text-xs text-primary-light/80 font-bold uppercase tracking-wider flex items-center gap-1">
                                <TrendingUp className="w-3 h-3" /> Ventas Turno (COP)
                            </span>
                            <div className="text-2xl font-bold mt-1">${totalShiftCOP.toLocaleString()}</div>
                        </div>
                        <div className="border-l border-white/10 pl-8">
                            <span className="text-xs text-primary-light/80 font-bold uppercase tracking-wider flex items-center gap-1">
                                <DollarSign className="w-3 h-3" /> Ventas Turno (USD)
                            </span>
                            <div className="text-2xl font-bold mt-1 text-secondary">${totalShiftUSD.toFixed(2)}</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="card overflow-hidden border border-black/5">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-surface border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Fecha / Hora</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Origen</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Detalle del Pedido</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Total COP</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Total USD</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Pago</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                            {currentShiftOrders.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-gray-400">
                                        <div className="flex flex-col items-center gap-2">
                                            <Calendar className="w-8 h-8 opacity-20" />
                                            No hay ventas en este turno.
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                currentShiftOrders.map((order) => (
                                    <tr key={order.id} className="hover:bg-gray-50 transition-colors group">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-gray-900 group-hover:text-primary transition-colors">{new Date(order.date).toLocaleDateString()}</span>
                                                <span className="text-xs text-gray-400">{new Date(order.date).toLocaleTimeString()}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            <span className="inline-block bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-medium">
                                                {orderOriginLabel(order)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            <div className="max-w-md">
                                                {order.items.map((item, itemIdx) => (
                                                    <span key={`${order.id}-${itemIdx}`} className="inline-block bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs mr-1 mb-1 border border-gray-200">
                                                        <b>{item.quantity}</b>x {item.product.name}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <span className="font-bold text-gray-900 bg-green-50 px-2 py-1 rounded text-green-700 border border-green-100">
                                                ${order.totalCop.toLocaleString()}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <span className="font-medium text-gray-600">
                                                ${order.totalUsd.toFixed(2)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500 text-right uppercase font-bold">
                                            {order.payment?.method?.replace('_', ' ') || 'N/A'}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Past Closures Section */}
            {closures.length > 0 && (
                <div className="pt-8 border-t border-gray-200">
                    <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <HistoryIcon className="w-5 h-5 text-gray-400" /> Historial de Cierres Anteriores
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {closures.map(closure => (
                            <div key={closure.id} className="card p-4 hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-sm font-bold text-gray-500">
                                        {new Date(closure.date).toLocaleDateString()}
                                    </span>
                                    <span className="text-xs text-gray-400">
                                        {new Date(closure.date).toLocaleTimeString()}
                                    </span>
                                </div>
                                <div className="space-y-1">
                                    <div className="flex justify-between">
                                        <span className="text-sm text-gray-600">Ventas:</span>
                                        <span className="font-bold text-green-600">${closure.totalSalesCOP.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-sm text-gray-600">Gastos:</span>
                                        <span className="font-bold text-red-500">${closure.totalExpensesCOP.toLocaleString()}</span>
                                    </div>
                                    <div className="pt-2 border-t border-gray-100 flex justify-between font-bold">
                                        <span>Balance:</span>
                                        <span>${(closure.totalSalesCOP - closure.totalExpensesCOP).toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
