import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { useOrders } from '../context/OrdersContext';
import { useSettings } from '../context/SettingsContext';
import { Plus, Trash2, TrendingUp, TrendingDown, DollarSign, Calendar, Wallet, FileText, Calculator, AlertTriangle, Check, X, Eye, Smartphone, CreditCard, Search, Printer, EyeOff, Clock, Package } from 'lucide-react';
import { cn, formatCurrency, formatDate } from '../lib/utils';
import { Ticket } from './Ticket';

export function Finance() {
    const { expenses, addExpense, deleteExpense, lastClosureDate, closeDay, closures } = useFinance();
    const { orders } = useOrders();
    const { exchangeRate, business } = useSettings();
    
    // View state: 'summary' | 'sales' | 'closures'
    const [activeView, setActiveView] = useState('summary');
    const [isAdding, setIsAdding] = useState(false);
    const [showCloseModal, setShowCloseModal] = useState(false);

    // Sales filters
    const [salesDateFilter, setSalesDateFilter] = useState(new Date().toISOString().split('T')[0]);
    const [salesTypeFilter, setSalesTypeFilter] = useState('all');
    const [salesSearchId, setSalesSearchId] = useState('');

    // Reprint modal
    const [reprintOrder, setReprintOrder] = useState(null);

    // Close detail modal
    const [selectedClosure, setSelectedClosure] = useState(null);

    const [formData, setFormData] = useState({
        description: '',
        amount: '',
        category: '',
    });

    // Close day state
    const [countedCash, setCountedCash] = useState('');
    const [countedUsd, setCountedUsd] = useState('');
    const [countedNequi, setCountedNequi] = useState('');
    const [countedDebit, setCountedDebit] = useState('');
    const [observations, setObservations] = useState('');

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

    // Calculations
    const totalSalesCOP = currentOrders.reduce((sum, o) => sum + o.totalCop, 0);
    const totalSalesUSD = currentOrders.reduce((sum, o) => sum + o.totalUsd, 0);
    const totalExpenses = currentExpenses.reduce((sum, e) => sum + e.amount, 0);
    const netBalance = totalSalesCOP - totalExpenses;

    const salesByMethod = currentOrders.reduce((acc, order) => {
        const method = order.payment?.method || order.paymentMethod || 'cash_cop';
        if (method === 'cash_cop') acc.cash_cop += order.totalCop || 0;
        else if (method === 'cash_usd') acc.cash_usd += order.totalUsd || 0;
        else if (method === 'nequi') acc.nequi += order.totalCop || 0;
        else acc.debit += order.totalCop || 0;
        return acc;
    }, { cash_cop: 0, cash_usd: 0, nequi: 0, debit: 0 });

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Contabilidad & Finanzas</h2>
                    <p className="text-gray-500 text-sm">Control de ventas, gastos y cierre de caja</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-gray-200 pb-2">
                <button
                    onClick={() => setActiveView('summary')}
                    className={cn(
                        "px-4 py-2 rounded-t-lg font-medium transition-colors",
                        activeView === 'summary' 
                            ? "bg-primary text-white" 
                            : "text-gray-600 hover:bg-gray-100"
                    )}
                >
                    <TrendingUp className="w-4 h-4 inline mr-2" />
                    Resumen
                </button>
                <button
                    onClick={() => setActiveView('sales')}
                    className={cn(
                        "px-4 py-2 rounded-t-lg font-medium transition-colors",
                        activeView === 'sales' 
                            ? "bg-primary text-white" 
                            : "text-gray-600 hover:bg-gray-100"
                    )}
                >
                    <Search className="w-4 h-4 inline mr-2" />
                    Consultar Ventas
                </button>
                <button
                    onClick={() => setActiveView('closures')}
                    className={cn(
                        "px-4 py-2 rounded-t-lg font-medium transition-colors",
                        activeView === 'closures' 
                            ? "bg-primary text-white" 
                            : "text-gray-600 hover:bg-gray-100"
                    )}
                >
                    <FileText className="w-4 h-4 inline mr-2" />
                    Cierres Anteriores
                </button>
            </div>

            {/* SUMMARY VIEW */}
            {activeView === 'summary' && (
                <>
                    <div className="flex gap-3">
                        <button
                            onClick={() => setShowCloseModal(true)}
                            className="btn-primary bg-red-600 hover:bg-red-700 flex items-center gap-2"
                        >
                            <Calculator className="w-5 h-5" />
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

                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="card p-6 border-l-4 border-l-green-500">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-gray-500 text-xs font-bold uppercase">Ventas del Turno</p>
                                    <h3 className="text-2xl font-bold text-gray-800 mt-2">{formatCurrency(totalSalesCOP)}</h3>
                                    <p className="text-xs text-gray-400 mt-1">{currentOrders.length} pedidos</p>
                                </div>
                                <div className="p-3 bg-green-50 rounded-xl text-green-600">
                                    <TrendingUp className="w-6 h-6" />
                                </div>
                            </div>
                        </div>

                        <div className="card p-6 border-l-4 border-l-red-500">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-gray-500 text-xs font-bold uppercase">Gastos del Turno</p>
                                    <h3 className="text-2xl font-bold text-gray-800 mt-2">{formatCurrency(totalExpenses)}</h3>
                                    <p className="text-xs text-gray-400 mt-1">{currentExpenses.length} registros</p>
                                </div>
                                <div className="p-3 bg-red-50 rounded-xl text-red-500">
                                    <TrendingDown className="w-6 h-6" />
                                </div>
                            </div>
                        </div>

                        <div className="card p-6 border-l-4 border-l-primary">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-gray-500 text-xs font-bold uppercase">Balance Neto</p>
                                    <h3 className={cn("text-2xl font-bold mt-2", netBalance >= 0 ? "text-primary" : "text-red-600")}>
                                        {formatCurrency(netBalance)}
                                    </h3>
                                    <p className="text-xs text-gray-400 mt-1">Desde: {formatDate(lastClosureDate)}</p>
                                </div>
                                <div className="p-3 bg-primary/10 rounded-xl text-primary">
                                    <Wallet className="w-6 h-6" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Sales by Payment Method */}
                    <div className="card p-6">
                        <h3 className="font-bold text-gray-700 mb-4">Ventas por Método de Pago</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-green-50 p-4 rounded-xl text-center">
                                <DollarSign className="w-6 h-6 text-green-600 mx-auto mb-2" />
                                <p className="text-xs text-gray-500 uppercase font-bold">Efectivo COP</p>
                                <p className="text-lg font-bold text-green-700">{formatCurrency(salesByMethod.cash_cop)}</p>
                            </div>
                            <div className="bg-blue-50 p-4 rounded-xl text-center">
                                <DollarSign className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                                <p className="text-xs text-gray-500 uppercase font-bold">Efectivo USD</p>
                                <p className="text-lg font-bold text-blue-700">${salesByMethod.cash_usd.toFixed(2)}</p>
                            </div>
                            <div className="bg-purple-50 p-4 rounded-xl text-center">
                                <Smartphone className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                                <p className="text-xs text-gray-500 uppercase font-bold">Nequi</p>
                                <p className="text-lg font-bold text-purple-700">{formatCurrency(salesByMethod.nequi)}</p>
                            </div>
                            <div className="bg-gray-100 p-4 rounded-xl text-center">
                                <CreditCard className="w-6 h-6 text-gray-600 mx-auto mb-2" />
                                <p className="text-xs text-gray-500 uppercase font-bold">Débito</p>
                                <p className="text-lg font-bold text-gray-700">{formatCurrency(salesByMethod.debit)}</p>
                            </div>
                        </div>
                    </div>

                    {/* Add Expense Form */}
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

                    {/* Expenses Table */}
                    <div className="card overflow-hidden">
                        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                            <h3 className="font-bold text-gray-700">Gastos del Turno Actual</h3>
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
                                                    - {formatCurrency(expense.amount)}
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
                </>
            )}

            {/* SALES VIEW */}
            {activeView === 'sales' && (
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
                        <div className="overflow-x-auto">
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
                                                    {new Date(order.date).toLocaleTimeString()}
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
                                                        className="text-primary hover:bg-primary/10 p-2 rounded-lg transition-colors"
                                                        title="Reimprimir"
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
            )}

            {/* CLOSURES VIEW */}
            {activeView === 'closures' && (
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
            )}

            {/* Close Day Modal */}
            {showCloseModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6 bg-red-600 text-white flex justify-between items-center sticky top-0">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <Calculator className="w-6 h-6" />
                                Arqueo de Caja - Cierre de Turno
                            </h2>
                            <button onClick={() => setShowCloseModal(false)} className="hover:bg-white/20 p-2 rounded-full transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            <div className="bg-gray-50 p-4 rounded-xl">
                                <p className="text-sm text-gray-600">
                                    <span className="font-bold">Período:</span> desde {formatDate(lastClosureDate)} hasta ahora
                                </p>
                                <p className="text-sm text-gray-600">
                                    <span className="font-bold">Pedidos:</span> {currentOrders.length} | 
                                    <span className="font-bold ml-2">Gastos:</span> {currentExpenses.length}
                                </p>
                            </div>

                            <div>
                                <h3 className="font-bold text-gray-700 mb-3">Ventas Registradas (Sistema)</h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    <div className="bg-green-50 p-3 rounded-lg text-center">
                                        <p className="text-xs text-gray-500 uppercase">Efectivo COP</p>
                                        <p className="font-bold text-green-700">{formatCurrency(salesByMethod.cash_cop)}</p>
                                    </div>
                                    <div className="bg-blue-50 p-3 rounded-lg text-center">
                                        <p className="text-xs text-gray-500 uppercase">Efectivo USD</p>
                                        <p className="font-bold text-blue-700">${salesByMethod.cash_usd.toFixed(2)}</p>
                                    </div>
                                    <div className="bg-purple-50 p-3 rounded-lg text-center">
                                        <p className="text-xs text-gray-500 uppercase">Nequi</p>
                                        <p className="font-bold text-purple-700">{formatCurrency(salesByMethod.nequi)}</p>
                                    </div>
                                    <div className="bg-gray-100 p-3 rounded-lg text-center">
                                        <p className="text-xs text-gray-500 uppercase">Débito</p>
                                        <p className="font-bold text-gray-700">{formatCurrency(salesByMethod.debit)}</p>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h3 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
                                    <Eye className="w-5 h-5" />
                                    Arqueo Físico (Ingrese lo contado)
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Efectivo COP Contado</label>
                                        <input
                                            type="number"
                                            value={countedCash}
                                            onChange={e => setCountedCash(e.target.value)}
                                            className="input-field"
                                            placeholder="0"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Efectivo USD Contado</label>
                                        <input
                                            type="number"
                                            value={countedUsd}
                                            onChange={e => setCountedUsd(e.target.value)}
                                            className="input-field"
                                            placeholder="0"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Nequi Contado</label>
                                        <input
                                            type="number"
                                            value={countedNequi}
                                            onChange={e => setCountedNequi(e.target.value)}
                                            className="input-field"
                                            placeholder="0"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Débito Contado</label>
                                        <input
                                            type="number"
                                            value={countedDebit}
                                            onChange={e => setCountedDebit(e.target.value)}
                                            className="input-field"
                                            placeholder="0"
                                        />
                                    </div>
                                </div>
                            </div>

                            {hasDifference && (
                                <div className={cn("p-4 rounded-xl border-2", totalDifference >= 0 ? "bg-green-50 border-green-300" : "bg-red-50 border-red-300")}>
                                    <h4 className="font-bold mb-3 flex items-center gap-2">
                                        <AlertTriangle className="w-5 h-5" />
                                        Diferencias Detectadas
                                    </h4>
                                    <div className="space-y-2">
                                        {Object.entries(differences).map(([method, diff]) => (
                                            diff !== 0 && (
                                                <div key={method} className="flex justify-between">
                                                    <span className="text-gray-600 capitalize">{method.replace('_', ' ')}:</span>
                                                    <span className={cn("font-bold", diff >= 0 ? "text-green-600" : "text-red-600")}>
                                                        {diff >= 0 ? '+' : ''}{method === 'cash_usd' ? `$${diff.toFixed(2)}` : formatCurrency(diff)}
                                                    </span>
                                                </div>
                                            )
                                        ))}
                                        <div className="border-t pt-2 mt-2 flex justify-between font-bold">
                                            <span>Total Diferencia:</span>
                                            <span className={totalDifference >= 0 ? "text-green-600" : "text-red-600"}>
                                                {totalDifference >= 0 ? '+' : ''}{formatCurrency(totalDifference)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Observaciones</label>
                                <textarea
                                    value={observations}
                                    onChange={e => setObservations(e.target.value)}
                                    className="input-field"
                                    rows={3}
                                    placeholder="Notas adicionales del cierre..."
                                />
                            </div>

                            <div className="flex gap-3 pt-4 border-t">
                                <button
                                    onClick={() => { setShowCloseModal(false); resetCloseForm(); }}
                                    className="flex-1 btn-secondary py-3"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleConfirmClose}
                                    className="flex-1 btn-primary bg-red-600 hover:bg-red-700 py-3 flex items-center justify-center gap-2"
                                >
                                    <Check className="w-5 h-5" />
                                    Confirmar Cierre
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Reprint Modal */}
            {reprintOrder && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md">
                        <div className="p-4 bg-primary text-white flex justify-between items-center">
                            <h2 className="text-lg font-bold">Reimprimir Factura</h2>
                            <button onClick={() => setReprintOrder(null)} className="hover:bg-white/20 p-1 rounded-full">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-4 flex justify-center">
                            <Ticket 
                                order={reprintOrder} 
                                business={business} 
                                orderType={reprintOrder.orderType || reprintOrder.tableId} 
                            />
                        </div>

                        <div className="p-4 border-t flex gap-3">
                            <button
                                onClick={() => setReprintOrder(null)}
                                className="flex-1 btn-secondary py-2"
                            >
                                Cerrar
                            </button>
                            <button
                                onClick={() => window.print()}
                                className="flex-1 btn-primary py-2 flex items-center justify-center gap-2"
                            >
                                <Printer className="w-4 h-4" />
                                Imprimir
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Closure Detail Modal */}
            {selectedClosure && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="p-4 bg-primary text-white flex justify-between items-center sticky top-0">
                            <h2 className="text-lg font-bold">Detalle del Cierre</h2>
                            <button onClick={() => setSelectedClosure(null)} className="hover:bg-white/20 p-1 rounded-full">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="bg-gray-50 p-4 rounded-xl">
                                <p className="text-sm font-bold text-gray-700">
                                    {new Date(selectedClosure.date).toLocaleString()}
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-green-50 p-4 rounded-xl text-center">
                                    <p className="text-xs text-gray-500 uppercase">Ventas</p>
                                    <p className="text-xl font-bold text-green-700">{formatCurrency(selectedClosure.totalSalesCOP || 0)}</p>
                                </div>
                                <div className="bg-red-50 p-4 rounded-xl text-center">
                                    <p className="text-xs text-gray-500 uppercase">Gastos</p>
                                    <p className="text-xl font-bold text-red-700">{formatCurrency(selectedClosure.totalExpenses || 0)}</p>
                                </div>
                            </div>

                            <div className="border-t pt-4">
                                <p className="text-xs text-gray-500 uppercase mb-2">Ventas por Método</p>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span>Efectivo COP:</span>
                                        <span className="font-bold">{formatCurrency(selectedClosure.salesByMethod?.cash_cop || 0)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Efectivo USD:</span>
                                        <span className="font-bold">${(selectedClosure.salesByMethod?.cash_usd || 0).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Nequi:</span>
                                        <span className="font-bold">{formatCurrency(selectedClosure.salesByMethod?.nequi || 0)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Débito:</span>
                                        <span className="font-bold">{formatCurrency(selectedClosure.salesByMethod?.debit || 0)}</span>
                                    </div>
                                </div>
                            </div>

                            {selectedClosure.differences && (
                                <div className="border-t pt-4">
                                    <p className="text-xs text-gray-500 uppercase mb-2">Arqueo</p>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span>Contado COP:</span>
                                            <span className="font-bold">{formatCurrency(selectedClosure.countedCash || 0)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Contado USD:</span>
                                            <span className="font-bold">${(selectedClosure.countedUsd || 0).toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between font-bold border-t pt-2">
                                            <span>Diferencia:</span>
                                            <span className={selectedClosure.totalDifference >= 0 ? "text-green-600" : "text-red-600"}>
                                                {formatCurrency(selectedClosure.totalDifference || 0)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {selectedClosure.observations && (
                                <div className="border-t pt-4">
                                    <p className="text-xs text-gray-500 uppercase mb-1">Observaciones</p>
                                    <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">{selectedClosure.observations}</p>
                                </div>
                            )}

                            <button
                                onClick={() => setSelectedClosure(null)}
                                className="w-full btn-secondary py-2"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
