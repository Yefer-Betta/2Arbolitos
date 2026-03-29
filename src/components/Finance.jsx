import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { useOrders } from '../context/OrdersContext';
import { Plus, Trash2, TrendingUp, TrendingDown, DollarSign, Calendar, Wallet, FileText } from 'lucide-react';
import { cn } from '../lib/utils';
import EndOfDayReport from './EndOfDayReport';

export function Finance() {
    const { expenses, addExpense, deleteExpense, lastClosureDate } = useFinance();
    const { orders } = useOrders();
    const [isAdding, setIsAdding] = useState(false);
    const [showReport, setShowReport] = useState(false);

    const [formData, setFormData] = useState({
        description: '',
        amount: '',
        category: '',
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        addExpense({
            ...formData,
            amount: parseFloat(formData.amount),
        });
        setFormData({ description: '', amount: '', category: '' });
        setIsAdding(false);
    };

    // Filter by Current Shift
    const currentExpenses = expenses.filter(e => new Date(e.date) > new Date(lastClosureDate));
    const currentOrders = orders.filter(o => new Date(o.date) > new Date(lastClosureDate));

    // Calculations (Simplified to COP for balance)
    const totalSalesCOP = currentOrders.reduce((sum, o) => sum + o.totalCop, 0);
    const totalExpenses = currentExpenses.reduce((sum, e) => sum + e.amount, 0);
    const netBalance = totalSalesCOP - totalExpenses;

    if (showReport) {
        return (
            <div className="space-y-6">
                <button
                    onClick={() => setShowReport(false)}
                    className="flex items-center gap-2 text-gray-500 hover:text-primary transition-colors mb-4"
                >
                    ← Volver a Finanzas
                </button>
                <EndOfDayReport date={new Date()} />
            </div>
        )
    }

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between gap-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Contabilidad & Finanzas</h2>
                    <p className="text-gray-500 text-sm">Control de ingresos, gastos y balance general</p>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={() => setShowReport(true)}
                        className="btn-secondary flex items-center gap-2"
                    >
                        <FileText className="w-5 h-5" />
                        Cierre de Caja
                    </button>
                    {!isAdding && (
                        <button
                            onClick={() => setIsAdding(true)}
                            className="btn-primary flex items-center gap-2"
                        >
                            <TrendingDown className="w-5 h-5" />
                            Registrar Gasto
                        </button>
                    )}
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="card p-6 border-l-4 border-l-green-500">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Ingresos Totales (Ventas)</p>
                            <h3 className="text-2xl font-bold text-gray-800 mt-2">${totalSalesCOP.toLocaleString()}</h3>
                        </div>
                        <div className="p-3 bg-green-50 rounded-xl text-green-600">
                            <TrendingUp className="w-6 h-6" />
                        </div>
                    </div>
                </div>

                <div className="card p-6 border-l-4 border-l-red-500">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Gastos Operativos</p>
                            <h3 className="text-2xl font-bold text-gray-800 mt-2">${totalExpenses.toLocaleString()}</h3>
                        </div>
                        <div className="p-3 bg-red-50 rounded-xl text-red-500">
                            <TrendingDown className="w-6 h-6" />
                        </div>
                    </div>
                </div>

                <div className="card p-6 border-l-4 border-l-primary">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Balance Neto</p>
                            <h3 className={cn("text-2xl font-bold mt-2", netBalance >= 0 ? "text-primary" : "text-red-600")}>
                                ${netBalance.toLocaleString()}
                            </h3>
                        </div>
                        <div className="p-3 bg-primary/10 rounded-xl text-primary">
                            <Wallet className="w-6 h-6" />
                        </div>
                    </div>
                </div>
            </div>

            {isAdding && (
                <div className="card p-6 bg-white border border-red-100 max-w-2xl mx-auto">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center text-red-500">
                            <TrendingDown className="w-4 h-4" />
                        </div>
                        Nuevo Gasto
                    </h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Descripción</label>
                                <input
                                    required
                                    type="text"
                                    placeholder="Ej. Compra de Salsas"
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    className="input-field"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Categoría</label>
                                <input
                                    required
                                    type="text"
                                    placeholder="Ej. Insumos"
                                    value={formData.category}
                                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                                    className="input-field"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Monto (COP)</label>
                            <input
                                required
                                type="number"
                                placeholder="0"
                                value={formData.amount}
                                onChange={e => setFormData({ ...formData, amount: e.target.value })}
                                className="input-field"
                            />
                        </div>

                        <div className="flex justify-end gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setIsAdding(false)}
                                className="btn-secondary"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                className="btn-primary"
                            >
                                Registrar Gasto
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="card overflow-hidden">
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                    <h3 className="font-bold text-gray-700">Historial de Gastos (Turno Actual)</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-white border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">Fecha</th>
                                <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">Descripción</th>
                                <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">Categoría</th>
                                <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase text-right">Monto</th>
                                <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                            {currentExpenses.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-8 text-center text-gray-400">
                                        No hay gastos registrados en este turno.
                                    </td>
                                </tr>
                            ) : (
                                currentExpenses.map((expense) => (
                                    <tr key={expense.id} className="hover:bg-red-50/30 transition-colors">
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {new Date(expense.date).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                            {expense.description}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            <span className="bg-gray-100 px-2 py-1 rounded text-xs font-medium border border-gray-200">
                                                {expense.category}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right font-bold text-red-600">
                                            - ${expense.amount.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            <button
                                                onClick={() => {
                                                    if (confirm('¿Eliminar este registro de gasto?')) deleteExpense(expense.id)
                                                }}
                                                className="text-gray-400 hover:text-red-500 transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
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
