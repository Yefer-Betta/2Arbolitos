import React, { useMemo } from 'react';
import { useOrders } from '../context/OrdersContext';
import { useFinance } from '../context/FinanceContext';
import { Clock, DollarSign, Calendar, TrendingUp, Download, History as HistoryIcon } from 'lucide-react';
import { PARA_LLEVAR_ID } from './VistaMesas';

function orderOriginLabel(order) {
    const type = String(order.orderType || '').toLowerCase();
    if (type.includes('llevar') || order.tableId === PARA_LLEVAR_ID) return 'Para llevar';
    if (type.includes('domicilio') || order.tableId === 'domicilio' || order.tableId?.startsWith('domicilio-')) {
        return 'Domicilio';
    }
    // La API devuelve la mesa relacionada; el id suelto suele ser un UUID.
    if (order.table?.name) return order.table.name;
    if (order.table?.number) return `Mesa ${order.table.number}`;
    if (!order.tableId) return '—';
    if (order.tableId.startsWith('mesa-')) return `Mesa ${order.tableId.replace('mesa-', '')}`;
    return 'Mesa';
}

const METHOD_LABELS = {
    cash_cop: 'Efectivo COP',
    cash_usd: 'Efectivo USD',
    cash_bs: 'Efectivo Bs.',
    nequi: 'Nequi',
    card: 'Débito',
    debit: 'Débito',
    transfer: 'Transferencia',
};

function paymentLabel(order) {
    const methods = order.payments?.length
        ? order.payments.map(p => p.method)
        : order.payment
            ? [order.payment.method]
            : [];
    if (methods.length === 0) return 'N/A';
    return methods
        .map(m => METHOD_LABELS[String(m || '').toLowerCase()] || String(m || ''))
        .join(' + ');
}

function formatDay(value) {
    return new Date(value).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatTime(value) {
    return new Date(value).toLocaleTimeString('es-CO', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    });
}

export function History() {
    const { orders } = useOrders();
    const { lastClosureDate, closures } = useFinance();

    // Filter for Current Shift
    const currentShiftOrders = useMemo(() => {
        return orders.filter(o => {
            const orderDate = o.date || o.createdAt;
            return orderDate && new Date(orderDate) > new Date(lastClosureDate);
        });
    }, [orders, lastClosureDate]);

    // Calculate Totals for Current Shift
    const totalShiftCOP = currentShiftOrders.reduce((sum, o) => sum + o.totalCop, 0);
    const totalShiftUSD = currentShiftOrders.reduce((sum, o) => sum + o.totalUsd, 0);

    // Export to CSV (opens in Excel)
    const exportToExcel = () => {
        const headers = ['Fecha', 'Hora', 'Origen', 'Items', 'Total COP', 'Total USD', 'Método Pago', 'Tasa Cambio'];
        const rows = currentShiftOrders.map(order => {
            const orderDate = order.date || order.createdAt;
            return [
                new Date(orderDate).toLocaleDateString(),
                new Date(orderDate).toLocaleTimeString(),
                orderOriginLabel(order),
                (order.items || []).map(i => `${i.quantity}x ${i.product?.name || 'Producto'}`).join(', '),
                order.totalCop,
                order.totalUsd,
                order.payments?.map(p => p.method).join(', ') || order.payment?.method || 'N/A',
                order.exchangeRateSnapshot ?? ''
            ];
        });

        const BOM = '\uFEFF';
        const csv = BOM + [headers.join(','), ...rows.map(r => r.map(v => JSON.stringify(v ?? '')).join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Ventas_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const closureDate = new Date(lastClosureDate);
    const hasClosure = !Number.isNaN(closureDate.getTime()) && closureDate.getFullYear() > 2000;

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
                <div>
                    <h2 className="text-2xl font-semibold tracking-tight text-ink">Historial de Turno Actual</h2>
                    <p className="text-sm text-ink-muted">
                        {hasClosure ? (
                            <>
                                Ventas desde el último cierre:{' '}
                                <span className="font-semibold text-ink-brand">
                                    {closureDate.toLocaleString('es-CO')}
                                </span>
                            </>
                        ) : (
                            'Ventas del turno actual · sin cierres previos'
                        )}
                    </p>
                </div>

                <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row md:items-center">
                    <button
                        onClick={exportToExcel}
                        disabled={currentShiftOrders.length === 0}
                        className="btn-secondary order-2 h-9 justify-center px-3 text-[13px] md:order-1"
                    >
                        <Download className="h-4 w-4" aria-hidden="true" /> Exportar Excel
                    </button>
                    <div className="card order-1 grid grid-cols-2 gap-4 bg-gradient-to-r from-primary to-primary-dark px-4 py-3 text-white shadow-xl shadow-primary/20 md:order-2 md:flex md:gap-8 md:px-6 md:py-4">
                        <div>
                            <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-primary-light/80 md:text-xs">
                                <TrendingUp className="h-3 w-3" aria-hidden="true" /> Ventas turno (COP)
                            </span>
                            <div className="num mt-1 text-xl font-bold md:text-2xl">${totalShiftCOP.toLocaleString()}</div>
                        </div>
                        <div className="border-l border-white/10 pl-4 md:pl-8">
                            <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-primary-light/80 md:text-xs">
                                <DollarSign className="h-3 w-3" aria-hidden="true" /> Ventas turno (USD)
                            </span>
                            <div className="num mt-1 text-xl font-bold text-secondary md:text-2xl">${totalShiftUSD.toFixed(2)}</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="card overflow-hidden border border-black/5 hidden md:block">
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
                                                <span className="font-bold text-gray-900 group-hover:text-primary transition-colors">{formatDay(order.date || order.createdAt)}</span>
                                                <span className="num text-xs text-gray-400">{formatTime(order.date || order.createdAt)}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            <span className="inline-block bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-medium">
                                                {orderOriginLabel(order)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            <div className="max-w-md">
                                                {(order.items || []).map((item, itemIdx) => (
                                                    <span key={`${order.id}-${itemIdx}`} className="inline-block bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs mr-1 mb-1 border border-gray-200">
                                                        <b>{item.quantity}</b>x {item.product?.name || 'Producto'}
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
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-xs font-bold uppercase text-gray-500">
                                            {paymentLabel(order)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Tarjetas de ventas (solo móvil) */}
            <div className="md:hidden space-y-3">
                {currentShiftOrders.length === 0 ? (
                    <div className="card p-8 text-center text-gray-400">
                        <Calendar className="w-8 h-8 mx-auto mb-2 opacity-20" />
                        No hay ventas en este turno.
                    </div>
                ) : (
                    currentShiftOrders.map((order) => (
                        <div key={order.id} className="card p-4 space-y-3">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="font-bold text-gray-900">{formatDay(order.date || order.createdAt)}</p>
                                    <p className="num text-xs text-gray-400">{formatTime(order.date || order.createdAt)}</p>
                                </div>
                                <span className="inline-block bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-medium shrink-0">
                                    {orderOriginLabel(order)}
                                </span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                                {(order.items || []).map((item, itemIdx) => (
                                    <span key={`${order.id}-m-${itemIdx}`} className="inline-block bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs border border-gray-200">
                                        <b>{item.quantity}</b>x {item.product?.name || 'Producto'}
                                    </span>
                                ))}
                            </div>
                            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                                <span className="text-[11px] font-bold uppercase text-gray-500">
                                    {paymentLabel(order)}
                                </span>
                                <div className="text-right">
                                    <p className="font-bold text-green-700">${order.totalCop.toLocaleString()}</p>
                                    <p className="text-xs text-gray-500">${order.totalUsd.toFixed(2)} USD</p>
                                </div>
                            </div>
                        </div>
                    ))
                )}
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
                                        {formatDay(closure.date)}
                                    </span>
                                    <span className="num text-xs text-gray-400">
                                        {formatTime(closure.date)}
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
