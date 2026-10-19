import React from 'react';
import { X, Percent } from 'lucide-react';
import { Modal } from '../Modal';

export function DiscountModal({ showDiscountModal, setShowDiscountModal, discountData, discountFinalPrice, setDiscountFinalPrice, discountPercent, setDiscountPercent, handleApplyDiscount, handleClearDiscount }) {
    return (
            <Modal isOpen={showDiscountModal} onClose={() => setShowDiscountModal(false)} label="Aplicar descuento">
                    <div className="overflow-hidden">
                        <div className="p-4 sm:p-6 bg-orange-500 text-white flex justify-between items-center">
                            <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2">
                                <Percent className="w-5 h-5 sm:w-6 sm:h-6" />
                                Aplicar Descuento
                            </h2>
                            <button onClick={() => setShowDiscountModal(false)} className="min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-white/20 rounded-full transition-colors" aria-label="Cerrar">
                                <X className="w-5 h-5 sm:w-6 sm:h-6" />
                            </button>
                        </div>

                        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                            <div className="bg-gray-50 p-3 sm:p-4 rounded-xl">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-gray-600 text-sm">Precio Original:</span>
                                    <span className="text-lg sm:text-xl font-bold text-gray-800">${discountData.originalCop.toLocaleString()}</span>
                                </div>
                                {discountData.discountValue > 0 && (
                                    <div className="flex justify-between items-center text-red-500 text-sm">
                                        <span>Descuento actual:</span>
                                        <span className="font-bold">-{discountData.discountPercent.toFixed(1)}% (${discountData.discountValue.toLocaleString()})</span>
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-2">
                                    Nuevo Precio Final (COP)
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <span className="text-gray-500 font-bold text-lg">$</span>
                                    </div>
                                    <input
                                        type="number"
                                        autoFocus
                                        value={discountFinalPrice}
                                        onChange={e => { setDiscountFinalPrice(e.target.value); setDiscountPercent(''); }}
                                        className="input-field pl-10 text-base sm:text-xl font-bold py-2 sm:py-3"
                                        placeholder={String(discountData.originalCop)}
                                    />
                                </div>
                            </div>

                            <div className="text-center text-gray-400 text-sm font-bold">— o —</div>

                            <div>
                                <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-2">
                                    Porcentaje de Descuento
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={discountPercent}
                                        onChange={e => { setDiscountPercent(e.target.value); setDiscountFinalPrice(''); }}
                                        className="input-field text-base sm:text-xl font-bold py-2 sm:py-3"
                                        placeholder="Ej. 10"
                                    />
                                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                        <span className="text-gray-500 font-bold text-lg">%</span>
                                    </div>
                                </div>
                            </div>

                            {(discountFinalPrice && parseFloat(discountFinalPrice) > 0) || (discountPercent && parseFloat(discountPercent) > 0) ? (
                                <div className="bg-green-50 p-3 sm:p-4 rounded-xl border border-green-200">
                                    <div className="text-center">
                                        <p className="text-xs sm:text-sm text-green-600 font-bold uppercase mb-1">Nuevo Descuento</p>
                                        <p className="text-xl sm:text-2xl font-bold text-red-600">
                                            -${discountData.discountValue.toLocaleString()}
                                            <span className="text-xs sm:text-sm ml-2">
                                                ({discountData.discountPercent.toFixed(1)}%)
                                            </span>
                                        </p>
                                    </div>
                                </div>
                            ) : null}

                            <div className="flex gap-2 sm:gap-3">
                                {discountData.discountValue > 0 && (
                                    <button
                                        onClick={handleClearDiscount}
                                        className="flex-1 btn-secondary py-2 sm:py-3 text-sm"
                                    >
                                        Quitar
                                    </button>
                                )}
                                <button
                                    onClick={handleApplyDiscount}
                                    disabled={!discountFinalPrice || parseFloat(discountFinalPrice) >= discountData.originalCop || parseFloat(discountFinalPrice) <= 0}
                                    className="flex-1 btn-primary py-2 sm:py-3 text-sm disabled:opacity-50"
                                >
                                    Aplicar
                                </button>
                            </div>
                        </div>
                    </div>
                </Modal>
    );
}
