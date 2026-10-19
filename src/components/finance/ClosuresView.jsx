import React from 'react';
import { Eye } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';

export function ClosuresView({ closures, setSelectedClosure }) {
    return (
                <div className="space-y-4">
                    <div className="card overflow-hidden">
                        <div className="bg-gray-50 px-4 sm:px-6 py-4 border-b border-gray-200">
                            <h3 className="font-bold text-gray-700">Historial de Cierres</h3>
                        </div>

                        {/* Móvil: tarjetas */}
                        <div className="md:hidden divide-y divide-gray-100">
                            {closures.length === 0 ? (
                                <p className="px-4 py-10 text-center text-gray-400 text-sm">No hay cierres registrados.</p>
                            ) : (
                                closures.map((closure) => (
                                    <div key={closure.id} className="p-4 space-y-3">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <p className="font-bold text-gray-900 text-sm">{new Date(closure.date).toLocaleDateString()}</p>
                                                <p className="text-xs text-gray-400">{new Date(closure.date).toLocaleTimeString()}</p>
                                            </div>
                                            <button
                                                onClick={() => setSelectedClosure(closure)}
                                                className="min-w-[44px] min-h-[44px] flex items-center justify-center text-primary hover:bg-primary/10 rounded-lg transition-colors -mr-1 -mt-1"
                                                aria-label="Ver detalle del cierre"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2 text-center">
                                            <div className="bg-gray-50 rounded-lg py-2">
                                                <p className="text-[10px] text-gray-500 uppercase">Pedidos</p>
                                                <p className="font-bold text-gray-800 text-sm">{closure.orderCount || 0}</p>
                                            </div>
                                            <div className="bg-green-50 rounded-lg py-2">
                                                <p className="text-[10px] text-gray-500 uppercase">Ventas</p>
                                                <p className="font-bold text-green-700 text-sm">{formatCurrency(closure.totalSalesCOP || 0)}</p>
                                            </div>
                                            <div className="bg-red-50 rounded-lg py-2">
                                                <p className="text-[10px] text-gray-500 uppercase">Gastos</p>
                                                <p className="font-bold text-red-700 text-sm">- {formatCurrency(closure.totalExpenses || 0)}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                                            <span className="text-xs font-bold text-gray-500 uppercase">Balance</span>
                                            <span className="font-bold text-primary">{formatCurrency((closure.totalSalesCOP || 0) - (closure.totalExpenses || 0))}</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Desktop: tabla */}
                        <div className="overflow-x-auto hidden md:block">
                            <table className="w-full text-left">
                                <thead className="bg-white border-b border-gray-100">
                                    <tr>
                                        <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">Fecha/Hora</th>
                                        <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">Pedidos</th>
                                        <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">Ventas</th>
                                        <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">Gastos</th>
                                        <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">Balance</th>
                                        <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase text-center">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {closures.length === 0 ? (
                                        <tr>
                                            <td colSpan="6" className="px-6 py-12 text-center text-gray-400">
                                                No hay cierres registrados.
                                            </td>
                                        </tr>
                                    ) : (
                                        closures.map((closure) => (
                                            <tr key={closure.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 text-sm">
                                                    <p className="font-medium text-gray-900">{new Date(closure.date).toLocaleDateString()}</p>
                                                    <p className="text-xs text-gray-400">{new Date(closure.date).toLocaleTimeString()}</p>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-600">
                                                    {closure.orderCount || 0}
                                                </td>
                                                <td className="px-6 py-4 text-sm font-bold text-green-600">
                                                    {formatCurrency(closure.totalSalesCOP || 0)}
                                                </td>
                                                <td className="px-6 py-4 text-sm font-bold text-red-600">
                                                    - {formatCurrency(closure.totalExpenses || 0)}
                                                </td>
                                                <td className="px-6 py-4 text-sm font-bold text-primary">
                                                    {formatCurrency((closure.totalSalesCOP || 0) - (closure.totalExpenses || 0))}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <button
                                                        onClick={() => setSelectedClosure(closure)}
                                                        className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                                        title="Ver Detalle"
                                                        aria-label="Ver detalle del cierre"
                                                    >
                                                        <Eye className="w-4 h-4" />
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
