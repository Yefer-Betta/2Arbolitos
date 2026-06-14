import React, { useState, useMemo, useCallback, useRef } from 'react';
import { useMenu } from '../context/MenuContext';
import { useSettings } from '../context/SettingsContext';
import { useOrders } from '../context/OrdersContext';
import { apiGet, apiPost } from '../lib/api.js';
import { Search, ShoppingCart, Trash2, Plus, Minus, CreditCard, Utensils, X, Printer, Calculator, Check, Receipt, Smartphone, Banknote, DollarSign, Percent, MessageSquare, User, ChevronDown, ArrowRight, Users } from 'lucide-react';
import { PARA_LLEVAR_ID } from './VistaMesas';
import { cn } from '../lib/utils';
import { Ticket } from './Ticket';

export function POS({ tableId, onBack }) {
    const { products } = useMenu();
    const { exchangeRate, exchangeRateBs, business } = useSettings();
    const {
        addOrder,
        activeTables,
        agregarPlatilloAMesa,
        actualizarCantidad,
        limpiarMesa,
        transferTable,
    } = useOrders();

    const cart = useMemo(() => activeTables[tableId]?.items || [], [activeTables, tableId]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('Todos');

    // Checkout State - Mixed Payments
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
    const [paymentSplits, setPaymentSplits] = useState([]);
    const paymentSplitsRef = useRef([]);
    paymentSplitsRef.current = paymentSplits;
    const [showRecipe, setShowRecipe] = useState(false);
    const [lastOrder, setLastOrder] = useState(null);

    // Discount State
    const [showDiscountModal, setShowDiscountModal] = useState(false);
    const [discountFinalPrice, setDiscountFinalPrice] = useState('');
    const [discountPercent, setDiscountPercent] = useState('');

    // Item notes
    const [itemNotes, setItemNotes] = useState({});
    const [editingNote, setEditingNote] = useState(null);

    // Customer
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [customerSearch, setCustomerSearch] = useState('');
    const [customerResults, setCustomerResults] = useState([]);
    const [showCustomerSearch, setShowCustomerSearch] = useState(false);

    // Split bill
    const [showSplitModal, setShowSplitModal] = useState(false);
    const [splitPersons, setSplitPersons] = useState(2);

    // Transfer
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [targetTable, setTargetTable] = useState('');

    // Mobile view state
    const [mobileView, setMobileView] = useState('products');

    // Modifier selection
    const [showModifierModal, setShowModifierModal] = useState(false);
    const [modifierProduct, setModifierProduct] = useState(null);
    const [modifierGroups, setModifierGroups] = useState([]);
    const [selectedModifiers, setSelectedModifiers] = useState({}); // { groupId: modifierId | modifierId[] }

    // Filter products
    const categories = ['Todos', ...new Set(products.map(p => p.category))];

    const filteredProducts = products.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategory === 'Todos' || p.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    // Cart Logic
    const addToCart = async (product) => {
        try {
            const groups = await apiGet(`/products/${product.id}/modifier-groups`);
            if (Array.isArray(groups) && groups.length > 0) {
                setModifierProduct(product);
                setModifierGroups(groups);
                const defaults = {};
                groups.forEach(g => {
                    defaults[g.id] = g.type === 'SINGLE' ? (g.modifiers?.[0]?.id || '') : [];
                });
                setSelectedModifiers(defaults);
                setShowModifierModal(true);
                return;
            }
        } catch {}
        agregarPlatilloAMesa(tableId, product);
    };

    const confirmModifiers = () => {
        if (!modifierProduct) return;
        const selected = [];
        let extraPrice = 0;
        modifierGroups.forEach(g => {
            const val = selectedModifiers[g.id];
            if (g.type === 'SINGLE' && val) {
                const mod = g.modifiers?.find(m => m.id === val);
                if (mod) { selected.push({ id: mod.id, name: mod.name, price: mod.price }); extraPrice += mod.price; }
            } else if (g.type === 'MULTIPLE' && Array.isArray(val) && val.length > 0) {
                val.forEach(v => {
                    const mod = g.modifiers?.find(m => m.id === v);
                    if (mod) { selected.push({ id: mod.id, name: mod.name, price: mod.price }); extraPrice += mod.price; }
                });
            }
        });
        const productWithModifiers = {
            ...modifierProduct,
            price: modifierProduct.price + extraPrice,
            _modifiers: selected,
        };
        agregarPlatilloAMesa(tableId, productWithModifiers);
        setShowModifierModal(false);
        setModifierProduct(null);
    };

    const toggleModifier = (groupId, modifierId) => {
        const group = modifierGroups.find(g => g.id === groupId);
        if (!group) return;
        if (group.type === 'SINGLE') {
            setSelectedModifiers(prev => ({ ...prev, [groupId]: modifierId }));
        } else {
            setSelectedModifiers(prev => {
                const current = prev[groupId] || [];
                const exists = current.includes(modifierId);
                return { ...prev, [groupId]: exists ? current.filter(id => id !== modifierId) : [...current, modifierId] };
            });
        }
    };

    const removeFromCart = (productId) => {
        // Setting quantity to 0 or less will remove it, per context logic
        actualizarCantidad(tableId, productId, 0);
    };

    const updateQuantity = (productId, delta) => {
        const item = cart.find(item => item.product?.id === productId);
        if (item) {
            const newQty = item.quantity + delta;
            // The context function handles removing if quantity is <= 0
            actualizarCantidad(tableId, productId, newQty);
        }
    };

    const clearCart = () => {
        limpiarMesa(tableId);
    };

    const rate = exchangeRate > 0 ? exchangeRate : 1;

    const discountData = useMemo(() => {
        const originalCop = cart.reduce((sum, item) => {
            const price = item.product?.price || 0;
            const isUsd = item.product?.isUsd;
            const qty = item.quantity || 0;
            return sum + (isUsd ? (price * rate) * qty : price * qty);
        }, 0);

        const originalUsd = cart.reduce((sum, item) => {
            const price = item.product?.price || 0;
            const isUsd = item.product?.isUsd;
            const qty = item.quantity || 0;
            return sum + (isUsd ? price * qty : (price / rate) * qty);
        }, 0);

        let discountValue = 0;
        let discountPercentVal = 0;

        if (discountFinalPrice && parseFloat(discountFinalPrice) > 0) {
            discountValue = originalCop - parseFloat(discountFinalPrice);
            discountPercentVal = originalCop > 0 ? (discountValue / originalCop) * 100 : 0;
        } else if (discountPercent && parseFloat(discountPercent) > 0) {
            discountPercentVal = parseFloat(discountPercent);
            discountValue = originalCop * (discountPercentVal / 100);
        }

        const finalCop = Math.max(0, originalCop - discountValue);
        const finalUsd = finalCop / rate;

        return {
            originalCop,
            originalUsd,
            finalCop,
            finalUsd,
            discountValue,
            discountPercent: discountPercentVal,
            discountUsd: originalUsd - finalUsd
        };
    }, [cart, rate, discountFinalPrice, discountPercent]);

    const totals = useMemo(() => ({
        cop: discountData.finalCop > 0 ? discountData.finalCop : discountData.originalCop,
        usd: discountData.finalUsd > 0 ? discountData.finalUsd : discountData.originalUsd
    }), [discountData]);


    // Checkout Logic - Mixed Payments
    const genId = () => {
        try { return crypto.randomUUID(); } catch { return Date.now() + '-' + Math.random().toString(36).slice(2, 9); }
    };
    const addPaymentSplit = useCallback(() => {
        const newSplit = {
            id: genId(),
            method: 'cash_cop',
            currency: 'COP',
            amount: 0,
            change: 0,
        };
        setPaymentSplits(prev => [...prev, newSplit]);
    }, []);

    const removePaymentSplit = useCallback((id) => {
        setPaymentSplits(prev => prev.filter(s => s.id !== id));
    }, []);

    const updatePaymentSplit = useCallback((id, field, value) => {
        setPaymentSplits(prev => prev.map(s => {
            if (s.id !== id) return s;
            const updated = { ...s, [field]: value };
            // Auto-set currency based on method
            if (field === 'method') {
                if (value === 'cash_usd') updated.currency = 'USD';
                else if (value === 'cash_bs') updated.currency = 'Bs.';
                else updated.currency = 'COP';
            }
            return updated;
        }));
    }, []);

    const totalPaidCop = useMemo(() =>
        paymentSplits.reduce((sum, s) => {
            const amt = parseFloat(s.amount) || 0;
            if (s.method === 'cash_usd') return sum + amt * (exchangeRate || 4000);
            if (s.method === 'cash_bs') return sum + amt * (exchangeRateBs || 40);
            return sum + amt; // COP, nequi, card
        }, 0)
    , [paymentSplits, exchangeRate, exchangeRateBs]);

    const remaining = useMemo(() =>
        Math.max(0, totals.cop - totalPaidCop)
    , [totals.cop, totalPaidCop]);

    const isFullyPaid = useMemo(() =>
        totalPaidCop >= totals.cop && paymentSplits.length > 0
    , [totalPaidCop, totals.cop, paymentSplits.length]);

    const getSplitChange = useCallback((split) => {
        const amount = parseFloat(split.amount) || 0;
        if (split.method === 'nequi' || split.method === 'card') return { changeCop: 0, changeUsd: 0, changeBs: 0, isShort: false };
        const factor = 1 - (totals.cop / (totalPaidCop || 1));
        const changeCop = amount * factor;
        const rate = exchangeRate > 0 ? exchangeRate : 4000;
        const rateBs = exchangeRateBs > 0 ? exchangeRateBs : 40;
        return {
            changeCop: changeCop,
            changeUsd: split.method === 'cash_usd' ? changeCop : changeCop / rate,
            changeBs: split.method === 'cash_bs' ? changeCop : changeCop / rateBs,
            isShort: totalPaidCop < totals.cop
        };
    }, [exchangeRate, exchangeRateBs, totals.cop, totalPaidCop]);

    const handleInitiateCheckout = () => {
        if (cart.length === 0) return;
        setIsCheckoutOpen(true);
        setPaymentSplits([]);
        setShowRecipe(false);
    };

    const handleFinalizeSale = () => {
        const getOrderType = () => {
            if (!tableId || tableId.startsWith('mesa-')) return 'mesa';
            if (tableId === 'para-llevar') return 'para-llevar';
            if (tableId === 'domicilio') return 'domicilio';
            return tableId;
        };

        const currentSplits = paymentSplitsRef.current;
        console.log('[handleFinalizeSale] paymentSplits:', JSON.stringify(currentSplits));
        const rate = exchangeRate > 0 ? exchangeRate : 4000;
        const rateBs = exchangeRateBs > 0 ? exchangeRateBs : 40;
        const totalPaidCopVal = currentSplits.reduce((sum, s) => {
            const amt = parseFloat(s.amount) || 0;
            if (s.method === 'cash_usd') return sum + amt * rate;
            if (s.method === 'cash_bs') return sum + amt * rateBs;
            return sum + amt;
        }, 0);
        console.log('[handleFinalizeSale] totalPaidCop:', totalPaidCopVal);
        const factor = totalPaidCopVal > 0 ? 1 - (totals.cop / totalPaidCopVal) : 0;

        const splitsPayload = currentSplits.map(s => {
            const amount = parseFloat(s.amount) || 0;
            const change = s.method === 'nequi' || s.method === 'card' ? 0 : Math.max(0, amount * factor);
            return {
                method: s.method.toUpperCase(),
                currency: s.currency,
                amount,
                change,
            };
        });
        console.log('[handleFinalizeSale] splitsPayload:', JSON.stringify(splitsPayload));

        const orderData = {
            tableId: tableId || null,
            items: cart.map(item => ({ ...item, notes: itemNotes[item.product?.id || item.id] || null })),
            totalCop: totals.cop,
            totalUsd: totals.usd,
            exchangeRateSnapshot: exchangeRate,
            exchangeRateBsSnapshot: exchangeRateBs,
            date: new Date().toISOString(),
            orderType: getOrderType(),
            originalPriceCop: discountData.originalCop,
            originalPriceUsd: discountData.originalUsd,
            discountValue: discountData.discountValue,
            discountPercent: discountData.discountPercent,
            payments: splitsPayload,
            customerId: selectedCustomer?.id || null,
            deliveryAddress: selectedCustomer?.address || null,
        };

        addOrder(orderData);
        setLastOrder(orderData);
        setShowRecipe(true);
    };

    const closeCheckout = () => {
        if (showRecipe) {
            if (tableId && tableId.startsWith('mesa-')) {
                limpiarMesa(tableId);
            } else if (tableId === 'para-llevar' || tableId === 'domicilio') {
                limpiarMesa(tableId);
            }
            if (onBack) onBack();
        }
        setIsCheckoutOpen(false);
        setShowRecipe(false);
        setLastOrder(null);
        setPaymentSplits([]);
        setDiscountFinalPrice('');
        setSelectedCustomer(null);
    };

    // Customer search
    const searchCustomers = useCallback(async (q) => {
        setCustomerSearch(q);
        if (!q || q.length < 1) { setCustomerResults([]); return; }
        try {
            const data = await apiGet(`/customers?search=${encodeURIComponent(q)}`);
            setCustomerResults(Array.isArray(data) ? data : []);
        } catch { setCustomerResults([]); }
    }, []);

    const selectCustomer = (c) => {
        setSelectedCustomer(c);
        setShowCustomerSearch(false);
        setCustomerSearch('');
        setCustomerResults([]);
    };

    // Transfer
    const handleTransfer = async () => {
        if (!targetTable) return alert('Seleccione una mesa destino');
        transferTable(tableId, targetTable);
        setShowTransferModal(false);
        if (onBack) onBack();
    };

    const perPerson = useMemo(() => ({
        cop: totals.cop / splitPersons,
        usd: totals.usd / splitPersons,
    }), [totals, splitPersons]);

    // Discount handlers
    const handleApplyDiscount = () => {
        const price = parseFloat(discountFinalPrice);
        if (price > 0 && price < discountData.originalCop) {
            setShowDiscountModal(false);
        }
    };

    const handleClearDiscount = () => {
        setDiscountFinalPrice('');
        setShowDiscountModal(false);
    };


    return (
        <div className="flex flex-col md:flex-row h-full md:h-[calc(100dvh-theme(spacing.32))] gap-6 relative pb-20 md:pb-0">
            {/* Checkout Modal Overlay */}
            {isCheckoutOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-2 sm:p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-md sm:max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[95vh] overflow-y-auto">
                        <div className="p-4 sm:p-6 bg-primary text-white flex justify-between items-center sticky top-0">
                            <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
                                {showRecipe ? <Check className="w-5 h-5 sm:w-6 sm:h-6" /> : <CreditCard className="w-5 h-5 sm:w-6 sm:h-6" />}
                                {showRecipe ? '¡Venta Exitosa!' : 'Finalizar Compra'}
                            </h2>
                            <button onClick={closeCheckout} className="hover:bg-white/20 p-1 sm:p-2 rounded-full transition-colors">
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
                                    <div className="flex-1 text-center py-2">
                                        <p className="text-gray-500 text-xs font-bold uppercase">Equivalente</p>
                                        <p className="text-xl sm:text-3xl font-bold text-secondary">${totals.usd.toFixed(2)}</p>
                                        <p className="text-xs sm:text-sm text-gray-400">USD</p>
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
                                                                type="number"
                                                                value={split.amount}
                                                                onChange={e => updatePaymentSplit(split.id, 'amount', e.target.value)}
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
                                <div className={cn(
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
                </div>
            )}

            {/* Modifier Modal */}
            {showModifierModal && modifierProduct && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-2 sm:p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-sm sm:max-w-md overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="p-4 sm:p-6 bg-gradient-to-r from-secondary to-secondary-dark text-white">
                            <h2 className="text-lg sm:text-xl font-bold">Personalizar</h2>
                            <p className="text-sm opacity-80">{modifierProduct.name}</p>
                        </div>
                        <div className="p-4 sm:p-6 space-y-5">
                            {modifierGroups.map(g => (
                                <div key={g.id}>
                                    <p className="text-sm font-bold text-gray-700 mb-2">{g.name} {g.type === 'SINGLE' ? '(elige uno)' : '(elige varios)'}</p>
                                    <div className="space-y-1">
                                        {g.modifiers?.map(m => {
                                            const selected = g.type === 'SINGLE'
                                                ? selectedModifiers[g.id] === m.id
                                                : (selectedModifiers[g.id] || []).includes(m.id);
                                            return (
                                                <button key={m.id} onClick={() => toggleModifier(g.id, m.id)} className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-sm transition-colors ${selected ? 'bg-secondary/10 border-secondary text-secondary font-bold' : 'border-gray-200 hover:bg-gray-50'}`}>
                                                    <span>{m.name}</span>
                                                    {m.price > 0 && <span className="text-xs font-bold">+${m.price.toLocaleString()}</span>}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                            <div className="flex gap-2 pt-2">
                                <button onClick={confirmModifiers} className="flex-1 btn-primary bg-secondary hover:bg-secondary-dark">Agregar al pedido</button>
                                <button onClick={() => { setShowModifierModal(false); setModifierProduct(null); }} className="btn-secondary">Cancelar</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Discount Modal */}
            {showDiscountModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-2 sm:p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-sm sm:max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-4 sm:p-6 bg-orange-500 text-white flex justify-between items-center">
                            <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2">
                                <Percent className="w-5 h-5 sm:w-6 sm:h-6" />
                                Aplicar Descuento
                            </h2>
                            <button onClick={() => setShowDiscountModal(false)} className="hover:bg-white/20 p-1 sm:p-2 rounded-full transition-colors">
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
                </div>
            )}

            {/* Left: Product Grid (Same as before) */}
            <div className={cn("flex-1 flex flex-col gap-6 h-[calc(100dvh-160px)] md:h-auto", mobileView !== 'products' && "hidden md:flex")}>
                {/* Header Section */}
                <div className="flex flex-col gap-4">
                    <div>
                        {tableId ? (
                            <div className="flex items-center gap-4">
                                <button onClick={onBack} className="btn-secondary p-2 h-10 w-10 text-lg">←</button>
                                <div>
{tableId.startsWith('mesa-') ? (
                                        <>
                                            <h2 className="text-2xl font-bold text-gray-800">Mesa <span className="text-primary">{tableId.replace('mesa-', '')}</span></h2>
                                            <p className="text-gray-500 text-sm">Añade productos a la cuenta de la mesa.</p>
                                        </>
                                    ) : tableId === 'para-llevar' ? (
                                        <>
                                            <h2 className="text-2xl font-bold text-gray-800"><span className="text-blue-600">Para Llevar</span></h2>
                                            <p className="text-gray-500 text-sm">Venta directa sin mesa.</p>
                                        </>
                                    ) : tableId === 'domicilio' ? (
                                        <>
                                            <h2 className="text-2xl font-bold text-gray-800"><span className="text-purple-600">Domicilio</span></h2>
                                            <p className="text-gray-500 text-sm">Pedido para entrega a domicilio.</p>
                                        </>
                                    ) : null}
                                </div>
                            </div>
                        ) : (
                            <h2 className="text-2xl font-bold text-gray-800">Realizar Pedido (Caja Rápida)</h2>
                        )}
                    </div>
                    {/* Search & Filter */}
                    <div className="flex gap-4 bg-white p-2 rounded-2xl shadow-sm border border-black/5">
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input
                                type="text"
                                placeholder="Buscar productos..."
                                className="w-full pl-12 pr-4 py-3 rounded-xl bg-transparent focus:bg-gray-50 outline-none transition-colors border-none"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={cn(
                                    "px-5 py-2 rounded-xl whitespace-nowrap text-sm font-semibold transition-all duration-200 border",
                                    selectedCategory === cat
                                        ? "bg-primary text-white border-primary shadow-lg shadow-primary/20"
                                        : "bg-white text-gray-600 border-gray-100 hover:border-primary/30 hover:text-primary"
                                )}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Grid */}
                <div className="flex-1 overflow-y-auto pr-2">
                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                        {filteredProducts.map(product => (
                            <button
                                key={product.id}
                                onClick={() => addToCart(product)}
                                className="flex flex-col p-5 bg-white hover:bg-surface border border-transparent hover:border-primary/20 rounded-2xl shadow-sm hover:shadow-md transition-all text-left group relative overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 p-3 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                    <div className="bg-primary text-white p-1.5 rounded-lg shadow-lg">
                                        <Plus className="w-4 h-4" />
                                    </div>
                                </div>
                                <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center mb-3 text-secondary">
                                    <Utensils className="w-5 h-5" />
                                </div>

                                <span className="text-xs font-bold text-secondary uppercase tracking-wider mb-1">{product.category}</span>
                                <span className="font-bold text-gray-800 mb-2 line-clamp-2 h-10 text-lg leading-tight">{product.name}</span>

                                <div className="mt-auto pt-3 border-t border-gray-50 w-full">
                                    <span className="font-bold text-xl text-primary block">
                                        {product.isUsd ? `$${product.price.toFixed(2)}` : `$${product.price.toLocaleString()}`}
                                        <span className="text-xs font-medium text-gray-400 ml-1 align-top">{product.isUsd ? 'USD' : 'COP'}</span>
                                    </span>
                                </div>
                            </button>
                        ))}
                        {filteredProducts.length === 0 && (
                            <div className="col-span-full flex flex-col items-center justify-center py-20 text-gray-400">
                                <Search className="w-12 h-12 mb-4 opacity-20" />
                                <p>No se encontraron productos.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Right: Cart */}
            <div className={cn("w-full md:w-[350px] lg:w-[400px] bg-white rounded-2xl lg:rounded-3xl shadow-xl flex flex-col h-[calc(100dvh-140px)] md:h-full overflow-hidden border border-black/5 mt-4 md:mt-0", mobileView !== 'cart' && "hidden md:flex")}>
                <div className="p-4 lg:p-6 bg-primary text-white">
                    <h2 className="text-lg lg:text-xl font-bold flex items-center gap-2 lg:gap-3">
                        <ShoppingCart className="w-5 h-5 lg:w-6 lg:h-6" />
                        <span>Orden Actual</span>
                    </h2>
                    {tableId ? (
                        tableId.startsWith('mesa-') ? (
                            <p className="text-primary-light/80 text-xs lg:text-sm mt-1">Mesa {tableId.replace('mesa-', '')}</p>
                        ) : tableId === 'para-llevar' ? (
                            <p className="text-primary-light/80 text-xs lg:text-sm mt-1">Para Llevar</p>
                        ) : tableId === 'domicilio' ? (
                            <p className="text-primary-light/80 text-xs lg:text-sm mt-1">Domicilio</p>
                        ) : null
                    ) : (
                        <p className="text-primary-light/80 text-xs lg:text-sm mt-1">{cart.length} ítems</p>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto p-3 lg:p-4 space-y-3 lg:space-y-4">
                    {cart.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-300 gap-3 lg:gap-4">
                            <div className="w-14 lg:w-20 h-14 lg:h-20 bg-gray-50 rounded-full flex items-center justify-center">
                                <ShoppingCart className="w-7 lg:w-10 h-7 lg:h-10 opacity-50" />
                            </div>
                            <p className="font-medium text-sm">El carrito está vacío</p>
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
                                        >
                                            <Minus className="w-2 lg:w-3 h-2 lg:h-3" />
                                        </button>
                                        <span className="text-xs lg:text-sm font-bold w-4 text-center">{item.quantity}</span>
                                        <button
                                            onClick={() => updateQuantity(pid, 1)}
                                            className="min-w-[44px] min-h-[44px] w-5 lg:w-6 h-5 lg:h-6 flex items-center justify-center bg-white rounded-lg shadow-sm text-gray-600 hover:text-green-600 hover:scale-110 transition-all"
                                        >
                                            <Plus className="w-2 lg:w-3 h-2 lg:h-3" />
                                        </button>
                                    </div>

                                    <button
                                        onClick={() => setEditingNote(editingNote === pid ? null : pid)}
                                        className={`p-2 rounded-xl transition-all ${itemNotes[pid] ? 'text-yellow-600 bg-yellow-50' : 'text-gray-300 hover:text-yellow-500 hover:bg-yellow-50'} opacity-100 md:opacity-0 md:group-hover:opacity-100`}
                                        title="Agregar nota"
                                    >
                                        <MessageSquare className="w-4 h-4" />
                                    </button>

                                    <button
                                        onClick={() => removeFromCart(pid)}
                                        className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100"
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
                                <button onClick={() => setSelectedCustomer(null)} className="text-amber-500 hover:text-amber-700 p-1"><X className="w-3 h-3" /></button>
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

                    <div className="space-y-2 lg:space-y-3">
                        <div className="flex justify-between text-xs lg:text-sm text-gray-600">
                            <span>Subtotal COP</span>
                            <span className="font-medium">${totals.cop.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-xs lg:text-sm text-gray-600">
                            <span>Subtotal USD</span>
                            <span className="font-medium">${totals.usd.toFixed(2)}</span>
                        </div>

                        <div className="h-px bg-gray-200 my-1 lg:my-2"></div>

                        <div className="flex justify-between items-end">
                            <span className="font-bold text-gray-800 text-sm">Total</span>
                            <div className="text-right">
                                <div className="text-2xl lg:text-3xl font-bold text-primary">${totals.cop.toLocaleString()}</div>
                                <div className="text-xs lg:text-sm text-secondary font-bold">${totals.usd.toFixed(2)} USD</div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2 lg:gap-3">
                        {tableId && tableId.startsWith('mesa-') && (
                            <>
                                <button onClick={() => setShowTransferModal(true)} disabled={cart.length === 0} className="col-span-1 px-1 lg:px-2 py-2 lg:py-3 text-blue-600 bg-white border border-blue-200 rounded-xl hover:bg-blue-50 font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs flex flex-col items-center gap-1">
                                    <ArrowRight className="w-4 h-4" />
                                    <span>Transferir</span>
                                </button>
                                <button onClick={() => setShowSplitModal(true)} disabled={cart.length === 0} className="col-span-1 px-1 lg:px-2 py-2 lg:py-3 text-purple-600 bg-white border border-purple-200 rounded-xl hover:bg-purple-50 font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs flex flex-col items-center gap-1">
                                    <Users className="w-4 h-4" />
                                    <span>Dividir</span>
                                </button>
                            </>
                        )}
                        <button
                            onClick={clearCart}
                            disabled={cart.length === 0}
                            className={`${tableId && tableId.startsWith('mesa-') ? 'col-span-1' : 'col-span-1'} px-2 lg:px-4 py-2 lg:py-3 text-red-500 bg-white border border-red-100 rounded-xl hover:bg-red-50 font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs`}
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleInitiateCheckout}
                            disabled={cart.length === 0}
                            className={`${tableId && tableId.startsWith('mesa-') ? 'col-span-1' : 'col-span-3'} px-2 lg:px-4 py-2 lg:py-3 bg-primary text-white rounded-xl hover:bg-primary-light font-bold shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-1 lg:gap-2 text-sm transform active:scale-95`}
                        >
                            <CreditCard className="w-4 lg:w-5 h-4 lg:h-5" />
                            <span>Pagar</span>
                        </button>
                    </div>
                </div>
                    </div>

                    {/* Transfer Modal */}
                    {showTransferModal && (
                        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowTransferModal(false)}>
                            <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
                                <h3 className="text-lg font-bold mb-4">Transferir a otra mesa</h3>
                                <p className="text-sm text-gray-500 mb-4">Los items se moverán a la mesa seleccionada</p>
                                <input type="number" min="1" placeholder="Número de mesa" value={targetTable} onChange={e => setTargetTable(e.target.value ? `mesa-${e.target.value}` : '')} className="input-field w-full mb-4" autoFocus />
                                <div className="flex gap-2">
                                    <button onClick={handleTransfer} disabled={!targetTable} className="flex-1 btn-primary bg-blue-600 hover:bg-blue-700 disabled:opacity-50">Transferir</button>
                                    <button onClick={() => setShowTransferModal(false)} className="btn-secondary">Cancelar</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Split Modal */}
                    {showSplitModal && (
                        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowSplitModal(false)}>
                            <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
                                <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Users className="w-5 h-5 text-purple-500" /> Dividir cuenta</h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Número de personas</label>
                                        <div className="flex items-center gap-3">
                                            <button onClick={() => setSplitPersons(Math.max(1, splitPersons - 1))} className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center font-bold hover:bg-gray-200"><Minus className="w-4 h-4" /></button>
                                            <span className="text-3xl font-bold text-gray-800 w-12 text-center">{splitPersons}</span>
                                            <button onClick={() => setSplitPersons(splitPersons + 1)} className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center font-bold hover:bg-gray-200"><Plus className="w-4 h-4" /></button>
                                        </div>
                                    </div>
                                    <div className="bg-purple-50 rounded-xl p-4 space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600">Por persona (COP)</span>
                                            <span className="font-bold">${perPerson.cop.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600">Por persona (USD)</span>
                                            <span className="font-bold">${perPerson.usd.toFixed(2)}</span>
                                        </div>
                                        <div className="border-t border-purple-200 pt-2 flex justify-between text-sm">
                                            <span className="text-gray-600">Total</span>
                                            <span className="font-bold">${totals.cop.toLocaleString()}</span>
                                        </div>
                                    </div>
                                    <button onClick={() => setShowSplitModal(false)} className="w-full btn-primary bg-purple-600 hover:bg-purple-700">Entendido</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Mobile Bottom Bar */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-3 flex gap-3 z-40 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.1)] rounded-t-3xl">
                <button
                    onClick={() => setMobileView('products')}
                    className={cn("flex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all", mobileView === 'products' ? "bg-primary text-white shadow-lg shadow-primary/30" : "bg-gray-100 text-gray-500 hover:bg-gray-200")}
                >
                    <Utensils className="w-5 h-5" />
                    Menú
                </button>
                <button
                    onClick={() => setMobileView('cart')}
                    className={cn("flex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all relative", mobileView === 'cart' ? "bg-primary text-white shadow-lg shadow-primary/30" : "bg-gray-100 text-gray-500 hover:bg-gray-200")}
                >
                    <ShoppingCart className="w-5 h-5" />
                    Carrito
                    {cart.length > 0 && (
                        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full border-2 border-white shadow-sm">
                            {cart.length}
                        </span>
                    )}
                </button>
            </div>
        </div>
    );
}
