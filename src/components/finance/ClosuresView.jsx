import React from 'react';
import { Eye } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';

export function ClosuresView({ closures, setSelectedClosure }) {
    return (
                <div className="space-y-4">
                    <div className="card overflow-hidden">
                        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                            <h3 className="font-bold text-gray-700">Historial de Cierres</h3>
                        </div>
                        <div className="overflow-x-auto">
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
                                                        className="text-primary hover:bg-primary/10 p-2 rounded-lg transition-colors"
                                                        title="Ver Detalle"
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
