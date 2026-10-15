import React from 'react';
import { Calculator, AlertTriangle, Check, X, Eye } from 'lucide-react';
import { formatCurrency, formatDate, cn } from '../../lib/utils';

export function CloseDayModal({ setShowCloseModal, resetCloseForm, lastClosureDate, currentOrders, currentExpenses, salesByMethod, countedCash, setCountedCash, countedUsd, setCountedUsd, countedBs, setCountedBs, countedNequi, setCountedNequi, countedDebit, setCountedDebit, differences, hasDifference, totalDifference, observations, setObservations, handleConfirmClose }) {
    return (
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
                                    <div className="bg-yellow-50 p-3 rounded-lg text-center">
                                        <p className="text-xs text-gray-500 uppercase">Efectivo Bs.</p>
                                        <p className="font-bold text-yellow-700">Bs. {salesByMethod.cash_bs.toFixed(2)}</p>
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
                                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
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
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Efectivo Bs. Contado</label>
                                        <input
                                            type="number"
                                            value={countedBs}
                                            onChange={e => setCountedBs(e.target.value)}
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
                                        {Object.entries(differences)
    .filter(([, diff]) => diff !== 0)
    .map(([method, diff]) => (
        <div key={method} className="flex justify-between">
            <span className="text-gray-600 capitalize">{method.replace('_', ' ')}:</span>
            <span className={cn("font-bold", diff >= 0 ? "text-green-600" : "text-red-600")}>
                {diff >= 0 ? '+' : ''}{method === 'cash_usd' ? `$${diff.toFixed(2)}` : method === 'cash_bs' ? `Bs. ${diff.toFixed(2)}` : formatCurrency(diff)}
            </span>
        </div>
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
    );
}
