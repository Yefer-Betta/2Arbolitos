import React from 'react';
import { Trash2, Plus, CreditCard, X, Printer, Check, Percent } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Ticket } from '../Ticket';
import { Modal } from '../Modal';

export function CheckoutModal({ isCheckoutOpen, closeCheckout, showRecipe, totals, discountData, setShowDiscountModal, paymentSplits, getSplitChange, cleanAmount, formatAmount, updatePaymentSplit, addPaymentSplit, removePaymentSplit, isFullyPaid, totalPaidCop, remaining, handleFinalizeSale, lastOrder, business, tableId }) {
    return (
            <Modal isOpen={isCheckoutOpen} onClose={closeCheckout} label={showRecipe ? 'Venta exitosa' : 'Finalizar compra'} maxWidth="max-w-md sm:max-w-lg">
                    <div className="overflow-hidden">
                        <div className="p-4 sm:p-6 bg-primary text-white flex justify-between items-center sticky top-0">
                            <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
                                {showRecipe ? <Check className="w-5 h-5 sm:w-6 sm:h-6" /> : <CreditCard className="w-5 h-5 sm:w-6 sm:h-6" />}
                                {showRecipe ? '¡Venta Exitosa!' : 'Finalizar Compra'}
                            </h2>
                            <button onClick={closeCheckout} className="min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-white/20 rounded-full transition-colors" aria-label="Cerrar">
                                <X className="w-5 h-5 sm:w-6 sm:h-6" />
                            </button>
                        </div>

                        {!showRecipe ? (
                            <div className="p-4 sm:p-8 space-y-4 sm:space-y-6">
                                {/* Totals Display */}
                                <div className="flex gap-2 sm:gap-4 p-3 sm:p-4 bg-surface rounded-xl sm:rounded-2xl border border-primary/10">
                                    <div className="flex-1 text-center border-r border-gray-200 py-2">
                                        <p className="text-gray-500 text-xs font-bold uppercase">Total a Pagar</p>
                                        <p className="text-xl sm:text-3xl font-bold text-primary">${totals.cop.toLocaleString()}</p>
                                        <p className="text-xs sm:text-sm text-gray-400">COP</p>
                                        {discountData.discountValue > 0 && (
                                            <p className="text-xs text-red-500 font-bold mt-1">
                                                -{discountData.discountPercent.toFixed(1)}% (${discountData.discountValue.toLocaleString()})
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex-1 text-center border-r border-gray-200 py-2">
                                        <p className="text-gray-500 text-xs font-bold uppercase">Equivalente</p>
                                        <p className="text-xl sm:text-3xl font-bold text-secondary">${totals.usd.toFixed(2)}</p>
                                        <p className="text-xs sm:text-sm text-gray-400">USD</p>
                                    </div>
                                    <div className="flex-1 text-center py-2">
                                        <p className="text-gray-500 text-xs font-bold uppercase">Equivalente</p>
                                        <p className="text-xl sm:text-3xl font-bold text-yellow-600">{totals.bs.toFixed(2)} Bs.</p>
                                        <p className="text-xs sm:text-sm text-gray-400">Bs.</p>
                                    </div>
                                </div>

                                {/* Discount Button */}
                                <button
                                    onClick={() => setShowDiscountModal(true)}
                                    className="w-full flex items-center justify-center gap-2 py-2 px-3 sm:px-4 rounded-lg sm:rounded-xl border-2 border-dashed border-orange-300 text-orange-600 hover:bg-orange-50 transition-colors text-sm"
                                >
                                    <Percent className="w-4 h-4 sm:w-5 sm:h-5" />
                                    <span className="font-bold">{discountData.discountValue > 0 ? 'Modificar Descuento' : 'Aplicar Descuento'}</span>
                                </button>

                                {/* Mixed Payments Section */}
                                <div>
                                    <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-2">Métodos de Pago</label>

                                    {paymentSplits.length === 0 && (
                                        <p className="text-sm text-gray-400 mb-3 text-center">Agrega uno o más métodos de pago</p>
                                    )}

                                    <div className="space-y-3">
                                        {paymentSplits.map((split, idx) => {
                                            const sc = getSplitChange(split);
                                            return (
                                                <div key={split.id} className="border border-gray-200 rounded-xl p-3 space-y-2 bg-gray-50">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className="text-xs font-bold text-gray-500 uppercase">Pago #{idx + 1}</span>
                                                        <button
                                                            onClick={() => removePaymentSplit(split.id)}
                                                            className="text-red-400 hover:text-red-600 p-1"
                                                            disabled={paymentSplits.length === 1}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>

                                                    <div className="grid grid-cols-3 gap-2">
                                                        <select
                                                            value={split.method}
                                                            onChange={e => updatePaymentSplit(split.id, 'method', e.target.value)}
                                                            className="input-field text-sm col-span-2"
                                                        >
                                                            <option value="cash_cop">Efectivo COP</option>
                                                            <option value="cash_usd">Efectivo USD</option>
                                                            <option value="cash_bs">Efectivo Bs.</option>
                                                            <option value="nequi">Nequi / Digital</option>
                                                            <option value="card">Tarjeta Débito</option>
                                                        </select>

                                                        <div className="relative">
                                                            <span className="absolute inset-y-0 left-2 flex items-center text-gray-500 text-xs font-bold">{split.currency === 'USD' ? '$' : split.currency === 'Bs.' ? 'Bs.' : '$'}</span>
                                                            <input
                                                                type="text"
                                                                inputMode="numeric"
                                                                value={split.amount}
                                                                onChange={e => {
                                                                    const raw = cleanAmount(e.target.value, split.currency);
                                                                    updatePaymentSplit(split.id, 'amount', raw);
                                                                }}
                                                                onBlur={e => {
                                                                    const formatted = formatAmount(split.amount, split.currency);
                                                                    if (formatted && formatted !== e.target.value) {
                                                                        e.target.value = formatted;
                                                                    }
                                                                }}
                                                                onFocus={e => {
                                                                    e.target.value = split.amount;
                                                                }}
                                                                className="input-field pl-6 text-sm font-bold text-right"
                                                                placeholder="0"
                                                            />
                                                        </div>
                                                    </div>

                                                    {split.method !== 'nequi' && split.method !== 'card' && (
                                                        <div className={cn(
                                                            "text-xs font-bold px-2 py-1 rounded flex justify-between",
                                                            sc.changeCop >= 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                                                        )}>
                                                            {split.method === 'cash_usd' ? (
                                                                <span>Cambio USD: ${Math.abs(sc.changeUsd).toFixed(2)}</span>
                                                            ) : split.method === 'cash_bs' ? (
                                                                <span>Cambio Bs.: {Math.abs(sc.changeBs).toFixed(2)} Bs.</span>
                                                            ) : (
                                                                <span>Cambio COP: ${Math.abs(sc.changeCop).toLocaleString()}</span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>

                                    <button
                                        onClick={addPaymentSplit}
                                        className="w-full mt-2 py-2 px-3 rounded-xl border-2 border-dashed border-primary/30 text-primary font-bold text-sm hover:bg-primary/5 transition-colors flex items-center justify-center gap-2"
                                    >
                                        + Agregar método de pago
                                    </button>
                                </div>

                                {/* Balance Summary */}
                                <div aria-live="polite" className={cn(
                                    "p-3 sm:p-4 rounded-xl border",
                                    isFullyPaid
                                        ? "bg-green-50 border-green-300 text-green-700"
                                        : "bg-yellow-50 border-yellow-300 text-yellow-700"
                                )}>
                                    <div className="flex justify-between items-center text-sm font-bold">
                                        <span>Total</span>
                                        <span>${totals.cop.toLocaleString()} COP</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm mt-1">
                                        <span>Pagado</span>
                                        <span>${totalPaidCop.toLocaleString()} COP</span>
                                    </div>
                                    <div className="flex justify-between items-center text-base font-bold mt-1 pt-1 border-t border-white/50">
                                        <span>{isFullyPaid ? 'Completado' : 'Faltante'}</span>
                                        <span>${isFullyPaid ? '0' : remaining.toLocaleString()} COP</span>
                                    </div>
                                </div>

                                <button
                                    onClick={handleFinalizeSale}
                                    disabled={!isFullyPaid}
                                    className="w-full btn-primary py-3 sm:py-4 text-base sm:text-lg shadow-xl disabled:opacity-50 disabled:shadow-none"
                                >
                                    {isFullyPaid ? 'Confirmar y Facturar' : `Faltan $${remaining.toLocaleString()} COP`}
                                </button>
                            </div>
                        ) : (
                            <div className="p-4 sm:p-8 flex flex-col items-center">
                                <div className="max-h-[50vh] overflow-y-auto">
                                    <Ticket order={lastOrder} business={business} orderType={tableId} />
                                </div>

                                <div className="flex gap-2 sm:gap-4 w-full mt-3 sm:mt-4">
                                    <button
                                        onClick={() => window.print()}
                                        className="flex-1 btn-secondary flex items-center justify-center gap-1 sm:gap-2 py-2 sm:py-3 text-sm"
                                    >
                                        <Printer className="w-4 h-4 sm:w-5 sm:h-5" /> <span className="hidden sm:inline">Imprimir</span>
                                    </button>
                                    <button
                                        onClick={closeCheckout}
                                        className="flex-1 btn-primary flex items-center justify-center gap-1 sm:gap-2 py-2 sm:py-3 text-sm"
                                    >
                                        <Plus className="w-4 h-4 sm:w-5 sm:h-5" /> Nueva Orden
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </Modal>
    );
}
