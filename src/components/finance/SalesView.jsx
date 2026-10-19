import React from 'react';
import { Printer } from 'lucide-react';
import { getOrderTypeLabel as getTypeLabel } from '../../lib/sales';
import { formatCurrency, cn } from '../../lib/utils';

export function SalesView({ salesDateFilter, setSalesDateFilter, salesTypeFilter, setSalesTypeFilter, salesSearchId, setSalesSearchId, filteredSales, filteredSalesTotal, handlePrint }) {
    return (
                <div className="space-y-4">
                    {/* Filters */}
                    <div className="card p-4">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Fecha</label>
                                <input
                                    type="date"
                                    value={salesDateFilter}
                                    onChange={e => setSalesDateFilter(e.target.value)}
                                    className="input-field"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Tipo de Pedido</label>
                                <select
                                    value={salesTypeFilter}
                                    onChange={e => setSalesTypeFilter(e.target.value)}
                                    className="input-field"
                                >
                                    <option value="all">Todos</option>
                                    <option value="mesa">Mesa</option>
                                    <option value="para-llevar">Para Llevar</option>
                                    <option value="domicilio">Domicilio</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Buscar ID</label>
                                <input
                                    type="text"
                                    placeholder="ID de orden..."
                                    value={salesSearchId}
                                    onChange={e => setSalesSearchId(e.target.value)}
                                    className="input-field"
                                />
                            </div>
                            <div className="flex items-end">
                                <div className="bg-primary/10 px-4 py-2 rounded-lg">
                                    <p className="text-xs text-gray-500">Total del día</p>
                                    <p className="text-xl font-bold text-primary">{formatCurrency(filteredSalesTotal)}</p>
                                    <p className="text-xs text-gray-400">{filteredSales.length} pedidos</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Sales Table */}
                    <div className="card overflow-hidden">
                        {/* Móvil: tarjetas */}
                        <div className="md:hidden divide-y divide-gray-100">
                            {filteredSales.length === 0 ? (
                                <p className="px-4 py-10 text-center text-gray-400 text-sm">No hay ventas para los filtros seleccionados.</p>
                            ) : (
                                filteredSales.map((order) => (
                                    <div key={order.id} className="p-4 space-y-3">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="font-mono text-xs text-gray-500">{order.id?.slice(0, 8).toUpperCase()}</p>
                                                <p className="text-xs text-gray-400">{new Date(order.date || order.createdAt).toLocaleTimeString()}</p>
                                            </div>
                                            <span className={cn(
                                                "px-2 py-1 rounded text-xs font-bold shrink-0",
                                                order.orderType?.startsWith('mesa-') ? "bg-orange-100 text-orange-700" :
                                                order.orderType === 'para-llevar' ? "bg-blue-100 text-blue-700" :
                                                order.orderType === 'domicilio' ? "bg-purple-100 text-purple-700" :
                                                "bg-gray-100 text-gray-700"
                                            )}>
                                                {getTypeLabel(order.orderType)}
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap gap-1">
                                            {order.items?.slice(0, 3).map((item, i) => (
                                                <span key={i} className="bg-gray-100 px-2 py-0.5 rounded text-xs">
                                                    {item.quantity}x {item.product?.name?.slice(0, 10)}
                                                </span>
                                            ))}
                                            {order.items?.length > 3 && (
                                                <span className="text-xs text-gray-400">+{order.items.length - 3}</span>
                                            )}
                                        </div>
                                        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                                            <span className="font-bold text-green-700">{formatCurrency(order.totalCop)}</span>
                                            <button
                                                onClick={() => handlePrint(order)}
                                                className="min-w-[44px] min-h-[44px] flex items-center justify-center text-primary hover:bg-primary/10 rounded-lg transition-colors -mr-2 -my-1"
                                                aria-label="Reimprimir factura"
                                            >
                                                <Printer className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Desktop: tabla */}
                        <div className="overflow-x-auto hidden md:block">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">ID</th>
                                        <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">Hora</th>
                                        <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">Tipo</th>
                                        <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">Items</th>
                                        <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase text-right">Total</th>
                                        <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase text-center">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredSales.length === 0 ? (
                                        <tr>
                                            <td colSpan="6" className="px-6 py-12 text-center text-gray-400">
                                                No hay ventas para los filtros seleccionados.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredSales.map((order) => (
                                            <tr key={order.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 text-sm font-mono text-gray-500">
                                                    {order.id?.slice(0, 8).toUpperCase()}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-600">
                                                    {new Date(order.date || order.createdAt).toLocaleTimeString()}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={cn(
                                                        "px-2 py-1 rounded text-xs font-bold",
                                                        order.orderType?.startsWith('mesa-') ? "bg-orange-100 text-orange-700" :
                                                        order.orderType === 'para-llevar' ? "bg-blue-100 text-blue-700" :
                                                        order.orderType === 'domicilio' ? "bg-purple-100 text-purple-700" :
                                                        "bg-gray-100 text-gray-700"
                                                    )}>
                                                        {getTypeLabel(order.orderType)}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-600">
                                                    <div className="flex flex-wrap gap-1">
                                                        {order.items?.slice(0, 3).map((item, i) => (
                                                            <span key={i} className="bg-gray-100 px-2 py-0.5 rounded text-xs">
                                                                {item.quantity}x {item.product?.name?.slice(0, 10)}
                                                            </span>
                                                        ))}
                                                        {order.items?.length > 3 && (
                                                            <span className="text-xs text-gray-400">+{order.items.length - 3}</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right font-bold text-green-700">
                                                    {formatCurrency(order.totalCop)}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <button
                                                        onClick={() => handlePrint(order)}
                                                        className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                                        title="Reimprimir"
                                                        aria-label="Reimprimir factura"
                                                    >
                                                        <Printer className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
    );
}
