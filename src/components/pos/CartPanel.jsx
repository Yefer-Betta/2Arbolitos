import React from 'react';
import { ShoppingCart, Trash2, Plus, Minus, CreditCard, X, MessageSquare, User, ChevronDown, ArrowRight, Users } from 'lucide-react';
import { cn } from '../../lib/utils';

export function CartPanel({ cart, tableId, mobileView, updateQuantity, editingNote, setEditingNote, itemNotes, setItemNotes, removeFromCart, selectedCustomer, setSelectedCustomer, setDeliveryAddressInput, setDeliveryPhoneInput, deliveryAddressInput, deliveryPhoneInput, deliveryCostInput, setDeliveryCostInput, cleanAmount, formatAmount, showCustomerSearch, setShowCustomerSearch, customerSearch, searchCustomers, customerResults, selectCustomer, deliveryCostNum, totals, exchangeRate, clearCart, handleInitiateCheckout, setShowTransferModal, setShowSplitModal }) {
    return (
            <div className={cn("w-full md:w-[350px] lg:w-[400px] bg-white rounded-2xl lg:rounded-3xl shadow-xl flex flex-col md:h-full overflow-hidden border border-black/5 mt-4 md:mt-0", mobileView !== 'cart' && "hidden md:flex")}>
                <div className="p-4 lg:p-6 bg-primary text-white">
                    <h2 className="text-lg lg:text-xl font-bold flex items-center gap-2 lg:gap-3">
                        <ShoppingCart className="w-5 h-5 lg:w-6 lg:h-6" />
                        <span>Orden Actual</span>
                    </h2>
                    {tableId ? (
                        tableId.startsWith('mesa-') ? (
                            <p className="text-white/80 text-xs lg:text-sm mt-1">Mesa {tableId.replace('mesa-', '')}</p>
                        ) : tableId === 'para-llevar' ? (
                            <p className="text-white/80 text-xs lg:text-sm mt-1">Para Llevar</p>
                        ) : tableId?.startsWith('domicilio') ? (
                            <p className="text-white/80 text-xs lg:text-sm mt-1">Domicilio</p>
                        ) : null
                    ) : (
                        <p className="text-white/80 text-xs lg:text-sm mt-1">{cart.length} ítems</p>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto p-3 lg:p-4 space-y-3 lg:space-y-4">
                    {cart.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-300 gap-3 lg:gap-4">
                            <div className="w-14 lg:w-20 h-14 lg:h-20 bg-gray-50 rounded-full flex items-center justify-center">
                                <ShoppingCart className="w-7 lg:w-10 h-7 lg:h-10 opacity-50" />
                            </div>
                            <p className="font-medium text-sm text-gray-500">El carrito está vacío</p>
                        </div>
                    ) : (
                        cart.map(item => {
                            const pid = item.product?.id || item.id;
                            return (
                            <div key={pid} className="flex flex-col gap-1 p-2 lg:p-3 hover:bg-gray-50 rounded-xl lg:rounded-2xl transition-colors group border border-transparent hover:border-gray-100">
                                <div className="flex gap-2 lg:gap-4 items-center">
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-bold text-gray-800 text-xs lg:text-sm truncate">{item.product?.name || 'Producto'}</h4>
                                        <p className="text-xs text-secondary font-bold">
                                            {item.product?.isUsd
                                                ? `$${(item.product?.price || 0).toFixed(2)} USD`
                                                : `$${(item.product?.price || 0).toLocaleString()} COP`
                                            }
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-1 lg:gap-2 bg-surface rounded-lg lg:rounded-xl px-1 lg:px-2 py-1">
                                        <button
                                            onClick={() => updateQuantity(pid, -1)}
                                            className="min-w-[44px] min-h-[44px] w-5 lg:w-6 h-5 lg:h-6 flex items-center justify-center bg-white rounded-lg shadow-sm text-gray-600 hover:text-red-500 hover:scale-110 transition-all"
                                            aria-label={`Disminuir cantidad de ${item.product?.name || 'producto'}`}
                                        >
                                            <Minus className="w-2 lg:w-3 h-2 lg:h-3" />
                                        </button>
                                        <span className="text-xs lg:text-sm font-bold w-4 text-center">{item.quantity}</span>
                                        <button
                                            onClick={() => updateQuantity(pid, 1)}
                                            className="min-w-[44px] min-h-[44px] w-5 lg:w-6 h-5 lg:h-6 flex items-center justify-center bg-white rounded-lg shadow-sm text-gray-600 hover:text-green-600 hover:scale-110 transition-all"
                                            aria-label={`Aumentar cantidad de ${item.product?.name || 'producto'}`}
                                        >
                                            <Plus className="w-2 lg:w-3 h-2 lg:h-3" />
                                        </button>
                                    </div>

                                    <button
                                        onClick={() => setEditingNote(editingNote === pid ? null : pid)}
                                        className={`p-2 rounded-xl transition-all ${itemNotes[pid] ? 'text-yellow-600 bg-yellow-50' : 'text-gray-300 hover:text-yellow-500 hover:bg-yellow-50'} opacity-100 md:opacity-0 md:group-hover:opacity-100`}
                                        title="Agregar nota"
                                        aria-label={itemNotes[pid] ? `Editar nota de ${item.product?.name || 'producto'}` : `Agregar nota a ${item.product?.name || 'producto'}`}
                                    >
                                        <MessageSquare className="w-4 h-4" />
                                    </button>

                                    <button
                                        onClick={() => removeFromCart(pid)}
                                        className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100"
                                        aria-label={`Eliminar ${item.product?.name || 'producto'} del pedido`}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                                {editingNote === pid && (
                                    <div className="pl-2">
                                        <input
                                            type="text"
                                            value={itemNotes[pid] || ''}
                                            onChange={e => setItemNotes(prev => ({ ...prev, [pid]: e.target.value }))}
                                            className="input-field text-xs py-1.5"
                                            placeholder="Ej. Sin cebolla, bien cocido..."
                                            autoFocus
                                        />
                                    </div>
                                )}
                                {itemNotes[pid] && editingNote !== pid && (
                                    <div className="pl-2 flex items-center gap-1">
                                        <span className="text-xs text-yellow-600 italic bg-yellow-50 px-2 py-0.5 rounded">{itemNotes[pid]}</span>
                                    </div>
                                )}
                            </div>
                            );
                        })
                    )}
                </div>

                <div className="p-4 lg:p-6 bg-surface space-y-3 lg:space-y-5">
                    {/* Customer selector */}
                    <div className="relative">
                        {selectedCustomer ? (
                            <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                                <div className="flex items-center gap-2">
                                    <User className="w-4 h-4 text-amber-600" />
                                    <span className="text-sm font-medium text-amber-800">{selectedCustomer.name}</span>
                                </div>
                                <button onClick={() => { setSelectedCustomer(null); if (tableId?.startsWith('domicilio')) { setDeliveryAddressInput(''); setDeliveryPhoneInput(''); } }} className="text-amber-500 hover:text-amber-700 p-1"><X className="w-3 h-3" /></button>
                            </div>
                        ) : (
                            <div className="relative">
                                <button onClick={() => setShowCustomerSearch(!showCustomerSearch)} className="w-full flex items-center gap-2 text-xs text-gray-500 border border-dashed border-gray-300 rounded-xl px-3 py-2 hover:border-amber-300 hover:text-amber-600 transition-colors">
                                    <User className="w-4 h-4" />
                                    <span>Asignar cliente</span>
                                    <ChevronDown className="w-3 h-3 ml-auto" />
                                </button>
                                {showCustomerSearch && (
                                    <div className="absolute bottom-full mb-2 left-0 right-0 bg-white rounded-xl shadow-xl border z-50">
                                        <div className="p-3">
                                            <input
                                                type="text" placeholder="Buscar cliente..."
                                                value={customerSearch}
                                                onChange={e => searchCustomers(e.target.value)}
                                                className="input-field w-full text-sm"
                                                autoFocus
                                            />
                                            {customerResults.length > 0 && (
                                                <div className="mt-2 max-h-40 overflow-auto divide-y">
                                                    {customerResults.map(c => (
                                                        <button key={c.id} onClick={() => selectCustomer(c)} className="w-full text-left px-2 py-2 hover:bg-amber-50 text-sm flex items-center gap-2">
                                                            <User className="w-3 h-3 text-gray-400" />
                                                            <div>
                                                                <p className="font-medium">{c.name}</p>
                                                                {c.phone && <p className="text-xs text-gray-400">{c.phone}</p>}
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {tableId?.startsWith('domicilio') && (
                        <div className="space-y-2 p-3 bg-purple-50 rounded-xl border border-purple-100">
                            <h4 className="text-xs font-bold text-purple-700 uppercase tracking-wide">Datos de entrega</h4>
                            <input
                                type="text" placeholder="Dirección de entrega *"
                                value={deliveryAddressInput}
                                onChange={e => setDeliveryAddressInput(e.target.value)}
                                className="input-field text-sm"
                            />
                            <input
                                type="text" placeholder="Teléfono de contacto *"
                                value={deliveryPhoneInput}
                                onChange={e => setDeliveryPhoneInput(e.target.value)}
                                className="input-field text-sm"
                            />
                            <div>
                                <label className="text-xs text-purple-600 font-medium">Costo de envío (COP)</label>
                                <input
                                    type="text" inputMode="numeric"
                                    placeholder="0"
                                    value={deliveryCostInput}
                                    onChange={e => setDeliveryCostInput(cleanAmount(e.target.value, 'COP'))}
                                    onBlur={e => setDeliveryCostInput(formatAmount(e.target.value, 'COP'))}
                                    onFocus={e => setDeliveryCostInput(cleanAmount(e.target.value, 'COP'))}
                                    className="input-field text-sm"
                                />
                            </div>
                        </div>
                    )}

                    <div className="space-y-2 lg:space-y-3">
                        <div className="flex justify-between text-xs lg:text-sm text-gray-600">
                            <span>Subtotal COP</span>
                            <span className="font-medium">${(totals.cop - deliveryCostNum).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-xs lg:text-sm text-gray-600">
                            <span>Subtotal USD</span>
                            <span className="font-medium">${(totals.usd - (deliveryCostNum / (exchangeRate || 4000))).toFixed(2)}</span>
                        </div>

                        {deliveryCostNum > 0 && (
                            <div className="flex justify-between text-xs lg:text-sm text-purple-600 font-medium">
                                <span>Envío</span>
                                <span>+${deliveryCostNum.toLocaleString()}</span>
                            </div>
                        )}

                        <div className="h-px bg-gray-200 my-1 lg:my-2"></div>

                        <div className="flex justify-between items-end">
                            <span className="font-bold text-gray-800 text-sm">Total</span>
                            <div className="text-right">
                                <div className="text-2xl lg:text-3xl font-bold text-primary">${totals.cop.toLocaleString()}</div>
                                <div className="text-xs lg:text-sm text-secondary font-bold">${totals.usd.toFixed(2)} USD</div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-3">
                        {tableId && tableId.startsWith('mesa-') && (
                            <>
                                <button onClick={() => setShowTransferModal(true)} disabled={cart.length === 0} className="col-span-1 px-1 lg:px-2 py-3 lg:py-3 text-blue-600 bg-white border border-blue-200 rounded-xl hover:bg-blue-50 font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs lg:text-sm flex flex-col items-center justify-center gap-1 min-h-11">
                                    <ArrowRight className="w-4 h-4" />
                                    <span>Transferir</span>
                                </button>
                                <button onClick={() => setShowSplitModal(true)} disabled={cart.length === 0} className="col-span-1 px-1 lg:px-2 py-3 lg:py-3 text-purple-600 bg-white border border-purple-200 rounded-xl hover:bg-purple-50 font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs lg:text-sm flex flex-col items-center justify-center gap-1 min-h-11">
                                    <Users className="w-4 h-4" />
                                    <span>Dividir</span>
                                </button>
                            </>
                        )}
                        <button
                            onClick={clearCart}
                            disabled={cart.length === 0}
                            className={`${tableId && tableId.startsWith('mesa-') ? 'col-span-1' : 'col-span-1'} px-2 lg:px-4 py-3 lg:py-3 text-red-500 bg-white border border-red-100 rounded-xl hover:bg-red-50 font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm min-h-11`}
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleInitiateCheckout}
                            disabled={cart.length === 0}
                            className={`${tableId && tableId.startsWith('mesa-') ? 'col-span-1' : 'col-span-1 lg:col-span-3'} px-2 lg:px-4 py-3 lg:py-3 bg-primary text-white rounded-xl hover:bg-primary-light font-bold shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-1 lg:gap-2 text-base lg:text-sm transform active:scale-95 min-h-11`}
                        >
                            <CreditCard className="w-4 lg:w-5 h-4 lg:h-5" />
                            <span>Pagar</span>
                        </button>
                    </div>
                </div>
                    </div>
    );
}
