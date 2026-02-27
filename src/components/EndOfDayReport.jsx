import React, { useMemo } from 'react';
import { useOrders } from '../context/OrdersContext';
import { useFinance } from '../context/FinanceContext';
import { useSettings } from '../context/SettingsContext';
import { Printer, Calendar, DollarSign, TrendingUp, TrendingDown, Wallet, Smartphone, Banknote, Save } from 'lucide-react';

export function EndOfDayReport() {
    const { orders } = useOrders();
    const { expenses, lastClosureDate, closeDay, closures } = useFinance();
    const { business } = useSettings();

    // Filter data since last closure
    const currentOrders = orders.filter(o => new Date(o.date) > new Date(lastClosureDate));
    const currentExpenses = expenses.filter(e => new Date(e.date) > new Date(lastClosureDate));

    // Calculate totals
    const totalSalesCOP = currentOrders.reduce((sum, o) => sum + o.totalCop, 0);
    const totalSalesUSD = currentOrders.reduce((sum, o) => sum + o.totalUsd, 0);
    const totalExpensesCOP = currentExpenses.reduce((sum, e) => sum + e.amount, 0);

    // Payment Breakdown
    const payments = currentOrders.reduce((acc, order) => {
        const payment = order.payment || { currency: 'COP', received: order.totalCop, change: 0, method: 'cash_cop' };

        const netAmount = payment.received - payment.change;

        switch (payment.method) {
            case 'cash_usd':
                acc.cash_usd += netAmount;
                break;
            case 'nequi':
                acc.nequi += order.totalCop; // Nequi is always in COP value
                break;
            case 'cash_cop':
            default:
                acc.cash_cop += netAmount;
                break;
        }
        return acc;
    }, { cash_cop: 0, cash_usd: 0, nequi: 0 });

    const handleCloseDay = () => {
        if (!confirm('¿Estás seguro de cerrar el turno? Esto reseteará los valores a cero para el nuevo periodo.')) return;

        const summary = {
            totalSalesCOP,
            totalSalesUSD,
            totalExpensesCOP,
            payments,
            startDate: lastClosureDate,
            endDate: new Date().toISOString()
        };

        closeDay(summary);
    };

    return (
        <div className="card p-8 bg-white max-w-2xl mx-auto border-t-8 border-t-primary shadow-2xl print:shadow-none print:border-none print:w-full print:max-w-none">
            <div className="flex justify-between items-start mb-8 border-b border-gray-100 pb-6">
                <div>
                    <h2 className="text-3xl font-bold text-primary">Cierre de Caja</h2>
                    <p className="text-gray-500 font-medium">Turno Actual</p>
                    <p className="text-xs text-gray-400 mt-1">
                        Desde: {new Date(lastClosureDate).toLocaleString()}
                    </p>
                </div>
                <div className="text-right hidden print:block">
                    <h3 className="font-bold text-xl">{business.name}</h3>
                    <p className="text-sm">{business.address}</p>
                </div>
                <div className="flex gap-2 print:hidden">
                    <button
                        onClick={handleCloseDay}
                        className="btn-primary bg-red-600 hover:bg-red-700 flex items-center gap-2"
                        disabled={currentOrders.length === 0 && currentExpenses.length === 0}
                    >
                        <Save className="w-4 h-4" /> Cerrar Turno
                    </button>
                    <button
                        onClick={() => window.print()}
                        className="btn-secondary flex items-center gap-2"
                    >
                        <Printer className="w-4 h-4" /> Imprimir
                    </button>
                </div>
            </div>

            <div className="space-y-8">
                {/* Summary Grid */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-green-50 rounded-xl border border-green-100">
                        <div className="flex items-center gap-2 text-green-700 mb-1">
                            <TrendingUp className="w-4 h-4" />
                            <span className="text-xs font-bold uppercase">Ventas Totales</span>
                        </div>
                        <p className="text-2xl font-bold text-gray-800">${totalSalesCOP.toLocaleString()}</p>
                        <p className="text-sm text-secondary font-bold">${totalSalesUSD.toFixed(2)} USD</p>
                    </div>

                    <div className="p-4 bg-red-50 rounded-xl border border-red-100">
                        <div className="flex items-center gap-2 text-red-700 mb-1">
                            <TrendingDown className="w-4 h-4" />
                            <span className="text-xs font-bold uppercase">Gastos del Turno</span>
                        </div>
                        <p className="text-2xl font-bold text-gray-800">${totalExpensesCOP.toLocaleString()}</p>
                    </div>
                </div>

                {/* Payment Breakdown */}
                <div>
                    <h3 className="font-bold text-gray-800 mb-4 pb-2 border-b border-gray-100">Desglose de Ingresos</h3>
                    <div className="grid grid-cols-3 gap-3 text-center">
                        <div className="p-3 bg-gray-50 rounded-xl">
                            <Banknote className="w-5 h-5 mx-auto mb-1 text-gray-400" />
                            <p className="text-xs font-bold text-gray-500">Efec. COP</p>
                            <p className="font-bold">${payments.cash_cop.toLocaleString()}</p>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-xl">
                            <DollarSign className="w-5 h-5 mx-auto mb-1 text-secondary" />
                            <p className="text-xs font-bold text-gray-500">Efec. USD</p>
                            <p className="font-bold">${payments.cash_usd.toFixed(2)}</p>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-xl">
                            <Smartphone className="w-5 h-5 mx-auto mb-1 text-purple-500" />
                            <p className="text-xs font-bold text-gray-500">Nequi</p>
                            <p className="font-bold">${payments.nequi.toLocaleString()}</p>
                        </div>
                    </div>
                </div>

                {/* Cash Counts (Arqueo) */}
                <div>
                    <h3 className="font-bold text-gray-800 mb-4 pb-2 border-b border-gray-100 flex items-center gap-2">
                        <Wallet className="w-5 h-5 text-gray-400" />
                        Dinero Esperado en Caja (Efectivo)
                    </h3>
                    <div className="bg-gray-50 rounded-xl p-6 space-y-4 shadow-inner">
                        <div className="flex justify-between items-center">
                            <span className="text-gray-600 font-medium">Entradas Efectivo (COP)</span>
                            <span className="font-bold">${payments.cash_cop.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-600 font-medium">Entradas Efectivo (USD)</span>
                            <span className="font-bold text-secondary">${payments.cash_usd.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm text-red-500 pt-2 border-t border-gray-200 mt-2">
                            <span className="font-medium">- Salidas por Gastos (COP)</span>
                            <span>(${totalExpensesCOP.toLocaleString()})</span>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t-2 border-gray-300">
                            <span className="font-bold text-lg text-primary">Total Arqueo (COP)</span>
                            <div className="text-right">
                                <div className="font-bold text-xl">
                                    ${(payments.cash_cop - totalExpensesCOP).toLocaleString()}
                                </div>
                                {/* Only show USD balance if there is any */}
                                {payments.cash_usd > 0 && (
                                    <div className="text-sm text-secondary font-bold">+ ${payments.cash_usd.toFixed(2)} USD</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-8 pt-6 border-t border-dashed border-gray-300 text-center text-xs text-gray-400">
                <p>Generado por Sistema 2Arbolitos</p>
                <p>{new Date().toLocaleString()}</p>
            </div>

            {/* Past Closures History (Optional simple list) */}
            {closures.length > 0 && (
                <div className="mt-12 print:hidden border-t border-gray-200 pt-8">
                    <h3 className="font-bold text-gray-500 mb-4">Historial de Cierres Recientes</h3>
                    <div className="space-y-2">
                        {closures.slice(0, 5).map(c => (
                            <div key={c.id} className="text-sm text-gray-600 flex justify-between bg-gray-50 p-2 rounded-lg">
                                <span>{new Date(c.date).toLocaleString()}</span>
                                <span className="font-bold">${c.totalSalesCOP.toLocaleString()} COP</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
