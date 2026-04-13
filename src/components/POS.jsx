import React, { useState, useMemo } from 'react';
import { useMenu } from '../context/MenuContext';
import { useSettings } from '../context/SettingsContext';
import { useOrders } from '../context/OrdersContext';
import { Search, ShoppingCart, Trash2, Plus, Minus, CreditCard, Utensils, X, Printer, Calculator, Check, Receipt, Smartphone, Banknote, DollarSign, Percent } from 'lucide-react';
import { PARA_LLEVAR_ID } from './VistaMesas';
import { cn } from '../lib/utils';
import { Ticket } from './Ticket';

export function POS({ tableId, onBack }) {
    const { products } = useMenu();
    const { exchangeRate, business } = useSettings();
    const {
        addOrder,
        activeTables,
        agregarPlatilloAMesa,
        actualizarCantidad,
        limpiarMesa,
    } = useOrders();

    const cart = useMemo(() => activeTables[tableId] || [], [activeTables, tableId]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('Todos');

    // Checkout State
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
    const [amountReceived, setAmountReceived] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('cash_cop'); // 'cash_cop', 'cash_usd', 'nequi'
    const [showRecipe, setShowRecipe] = useState(false);
    const [lastOrder, setLastOrder] = useState(null);
    
    // Discount State
    const [showDiscountModal, setShowDiscountModal] = useState(false);
    const [discountFinalPrice, setDiscountFinalPrice] = useState('');

    // Filter products
    const categories = ['Todos', ...new Set(products.map(p => p.category))];

    const filteredProducts = products.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategory === 'Todos' || p.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    // Cart Logic
    const addToCart = (product) => {
        agregarPlatilloAMesa(tableId, product);
    };

    const removeFromCart = (productId) => {
        // Setting quantity to 0 or less will remove it, per context logic
        actualizarCantidad(tableId, productId, 0);
    };

    const updateQuantity = (productId, delta) => {
        const item = cart.find(item => item.product.id === productId);
        if (item) {
            const newQty = item.quantity + delta;
            // The context function handles removing if quantity is <= 0
            actualizarCantidad(tableId, productId, newQty);
        }
    };

    const clearCart = () => {
        limpiarMesa(tableId);
    };

    // Totals with discount
    const discountData = useMemo(() => {
        const originalCop = cart.reduce((sum, item) => {
            const price = item.product.price;
            const isUsd = item.product.isUsd;
            const qty = item.quantity;
            return sum + (isUsd ? (price * exchangeRate) * qty : price * qty);
        }, 0);
        
        const originalUsd = cart.reduce((sum, item) => {
            const price = item.product.price;
            const isUsd = item.product.isUsd;
            const qty = item.quantity;
            return sum + (isUsd ? price * qty : (price / exchangeRate) * qty);
        }, 0);

        const finalPrice = parseFloat(discountFinalPrice) || 0;
        const discountValue = originalCop - finalPrice;
        const discountPercent = originalCop > 0 ? ((discountValue / originalCop) * 100) : 0;
        
        // Calculate USD equivalent of final price
        const finalUsd = finalPrice / exchangeRate;
        const discountUsd = originalUsd - finalUsd;

        return {
            originalCop,
            originalUsd,
            finalCop: finalPrice,
            finalUsd,
            discountValue: Math.max(0, discountValue),
            discountPercent: Math.max(0, discountPercent),
            discountUsd: Math.max(0, discountUsd)
        };
    }, [cart, exchangeRate, discountFinalPrice]);

    const totals = useMemo(() => ({
        cop: discountData.finalCop > 0 ? discountData.finalCop : discountData.originalCop,
        usd: discountData.finalUsd > 0 ? discountData.finalUsd : discountData.originalUsd
    }), [discountData]);


    // Checkout Logic
    const handleInitiateCheckout = () => {
        if (cart.length === 0) return;
        setIsCheckoutOpen(true);
        setAmountReceived('');
        setPaymentMethod('cash_cop');
        setShowRecipe(false);
    };

    const change = useMemo(() => {
        const received = parseFloat(amountReceived) || 0;

        if (paymentMethod === 'nequi') return 0; // Nequi is usually exact payment

        if (paymentMethod === 'cash_usd') {
            return received - totals.usd;
        } else {
            return received - totals.cop;
        }
    }, [amountReceived, paymentMethod, totals]);

    const handleFinalizeSale = () => {
        const currency = paymentMethod === 'cash_usd' ? 'USD' : 'COP';
        const received = parseFloat(amountReceived) || (paymentMethod === 'nequi' ? totals.cop : 0);

        const getOrderType = () => {
            if (!tableId || tableId.startsWith('mesa-')) return 'mesa';
            if (tableId === 'para-llevar') return 'para-llevar';
            if (tableId === 'domicilio') return 'domicilio';
            return tableId;
        };

        const orderData = {
            tableId: tableId || null,
            items: cart,
            totalCop: totals.cop,
            totalUsd: totals.usd,
            exchangeRateSnapshot: exchangeRate,
            date: new Date().toISOString(),
            orderType: getOrderType(),
            // Discount data
            originalPriceCop: discountData.originalCop,
            originalPriceUsd: discountData.originalUsd,
            discountValue: discountData.discountValue,
            discountPercent: discountData.discountPercent,
            payment: {
                method: paymentMethod, // 'cash_cop', 'cash_usd', 'nequi'
                currency: currency,
                received: received,
                change: currency === 'USD' ? (received - totals.usd) : (received - totals.cop)
            }
        };

        // Auto-correct negative change for Nequi/Exact payment
        if (orderData.payment.change < 0) orderData.payment.change = 0;

        addOrder(orderData);
        setLastOrder(orderData);
        setShowRecipe(true);
        // The table is cleared when the user closes the checkout modal
    };

    const closeCheckout = () => {
        if (showRecipe) { // A sale was just completed
            // Only clean up if it was a table order
            if (tableId && tableId.startsWith('mesa-')) {
                limpiarMesa(tableId);
            } else if (tableId === 'para-llevar' || tableId === 'domicilio') {
                // For direct sales, clear the cart but stay in POS for new orders
                limpiarMesa(tableId);
            }
            if (onBack) onBack(); // Go back to table view
        }
        // Reset state for next time
        setIsCheckoutOpen(false);
        setShowRecipe(false);
        setLastOrder(null);
        setDiscountFinalPrice('');
    };

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
        <div className="flex flex-col md:flex-row h-[calc(100vh-theme(spacing.32))] gap-6 relative">
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
                                        <p className="text-gray-500 text-[10px] sm:text-xs font-bold uppercase">Total a Pagar</p>
                                        <p className="text-xl sm:text-3xl font-bold text-primary">${totals.cop.toLocaleString()}</p>
                                        <p className="text-xs sm:text-sm text-gray-400">COP</p>
                                        {discountData.discountValue > 0 && (
                                            <p className="text-[10px] sm:text-xs text-red-500 font-bold mt-1">
                                                -{discountData.discountPercent.toFixed(1)}% (${discountData.discountValue.toLocaleString()})
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex-1 text-center py-2">
                                        <p className="text-gray-500 text-[10px] sm:text-xs font-bold uppercase">Equivalente</p>
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

                                {/* Payment Method Selector */}
                                <div>
                                    <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-2">Método de Pago</label>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                        <button
                                            onClick={() => { setPaymentMethod('cash_cop'); setAmountReceived(''); }}
                                            className={cn("p-2 sm:p-3 rounded-lg sm:rounded-xl border flex flex-col items-center gap-1 transition-all", paymentMethod === 'cash_cop' ? 'bg-green-50 border-green-500 text-green-700' : 'border-gray-200 hover:bg-gray-50')}
                                        >
                                            <Banknote className="w-4 h-4 sm:w-5 sm:h-5" />
                                            <span className="text-[10px] sm:text-xs font-bold">Efectivo COP</span>
                                        </button>
                                        <button
                                            onClick={() => { setPaymentMethod('cash_usd'); setAmountReceived(''); }}
                                            className={cn("p-2 sm:p-3 rounded-lg sm:rounded-xl border flex flex-col items-center gap-1 transition-all", paymentMethod === 'cash_usd' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'border-gray-200 hover:bg-gray-50')}
                                        >
                                            <DollarSign className="w-4 h-4 sm:w-5 sm:h-5" />
                                            <span className="text-[10px] sm:text-xs font-bold">Efectivo USD</span>
                                        </button>
                                        <button
                                            onClick={() => { setPaymentMethod('nequi'); setAmountReceived(String(totals.cop)); }}
                                            className={cn("col-span-2 sm:col-span-1 p-2 sm:p-3 rounded-lg sm:rounded-xl border flex flex-col items-center gap-1 transition-all", paymentMethod === 'nequi' ? 'bg-purple-50 border-purple-500 text-purple-700' : 'border-gray-200 hover:bg-gray-50')}
                                        >
                                            <Smartphone className="w-4 h-4 sm:w-5 sm:h-5" />
                                            <span className="text-[10px] sm:text-xs font-bold">Nequi / Digital</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Payment Input */}
                                {paymentMethod !== 'nequi' && (
                                    <div>
                                        <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-2">
                                            Monto Recibido ({paymentMethod === 'cash_usd' ? 'USD' : 'COP'})
                                        </label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <span className="text-gray-500 font-bold">$</span>
                                            </div>
                                            <input
                                                type="number"
                                                autoFocus
                                                value={amountReceived}
                                                onChange={e => setAmountReceived(e.target.value)}
                                                className="input-field pl-8 text-base sm:text-lg font-bold py-3 sm:py-2"
                                                placeholder="0"
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Change Calculation */}
                                {paymentMethod !== 'nequi' && (
                                    <div className={cn(
                                        "p-3 sm:p-4 rounded-xl flex justify-between items-center transition-colors",
                                        change >= 0 ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                                    )}>
                                        <span className="font-bold text-xs sm:text-sm uppercase flex items-center gap-2">
                                            <Calculator className="w-3 h-3 sm:w-4 sm:h-4" />
                                            {change >= 0 ? 'Vueltos' : 'Faltante'}
                                        </span>
                                        <span className="text-lg sm:text-2xl font-bold">
                                            ${Math.abs(change).toLocaleString()} <span className="text-[10px] sm:text-xs opacity-70">{paymentMethod === 'cash_usd' ? 'USD' : 'COP'}</span>
                                        </span>
                                    </div>
                                )}

                                <button
                                    onClick={handleFinalizeSale}
                                    disabled={(paymentMethod !== 'nequi' && change < 0) || (paymentMethod !== 'nequi' && !amountReceived)}
                                    className="w-full btn-primary py-3 sm:py-4 text-base sm:text-lg shadow-xl disabled:opacity-50 disabled:shadow-none"
                                >
                                    Confirmar y Facturar
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
                                        onChange={e => setDiscountFinalPrice(e.target.value)}
                                        className="input-field pl-10 text-base sm:text-xl font-bold py-2 sm:py-3"
                                        placeholder={String(discountData.originalCop)}
                                    />
                                </div>
                            </div>

                            {discountFinalPrice && parseFloat(discountFinalPrice) > 0 && (
                                <div className="bg-green-50 p-3 sm:p-4 rounded-xl border border-green-200">
                                    <div className="text-center">
                                        <p className="text-xs sm:text-sm text-green-600 font-bold uppercase mb-1">Nuevo Descuento</p>
                                        <p className="text-xl sm:text-2xl font-bold text-red-600">
                                            -${(discountData.originalCop - parseFloat(discountFinalPrice)).toLocaleString()}
                                            <span className="text-xs sm:text-sm ml-2">
                                                ({(((discountData.originalCop - parseFloat(discountFinalPrice)) / discountData.originalCop) * 100).toFixed(1)}%)
                                            </span>
                                        </p>
                                    </div>
                                </div>
                            )}

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
            <div className="flex-1 flex flex-col gap-6">
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
                                <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
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
            <div className="w-full md:w-[350px] lg:w-[400px] bg-white rounded-2xl lg:rounded-3xl shadow-xl flex flex-col h-full overflow-hidden border border-black/5">
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
                        cart.map(item => (
                            <div key={item.product.id} className="flex gap-2 lg:gap-4 items-center p-2 lg:p-3 hover:bg-gray-50 rounded-xl lg:rounded-2xl transition-colors group border border-transparent hover:border-gray-100">
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-gray-800 text-xs lg:text-sm truncate">{item.product.name}</h4>
                                    <p className="text-xs text-secondary font-bold">
                                        {item.product.isUsd
                                            ? `$${item.product.price.toFixed(2)} USD`
                                            : `$${item.product.price.toLocaleString()} COP`
                                        }
                                    </p>
                                </div>

                                <div className="flex items-center gap-1 lg:gap-2 bg-surface rounded-lg lg:rounded-xl px-1 lg:px-2 py-1">
                                    <button
                                        onClick={() => updateQuantity(item.product.id, -1)}
                                        className="w-5 lg:w-6 h-5 lg:h-6 flex items-center justify-center bg-white rounded-lg shadow-sm text-gray-600 hover:text-red-500 hover:scale-110 transition-all"
                                    >
                                        <Minus className="w-2 lg:w-3 h-2 lg:h-3" />
                                    </button>
                                    <span className="text-xs lg:text-sm font-bold w-4 text-center">{item.quantity}</span>
                                    <button
                                        onClick={() => updateQuantity(item.product.id, 1)}
                                        className="w-5 lg:w-6 h-5 lg:h-6 flex items-center justify-center bg-white rounded-lg shadow-sm text-gray-600 hover:text-green-600 hover:scale-110 transition-all"
                                    >
                                        <Plus className="w-2 lg:w-3 h-2 lg:h-3" />
                                    </button>
                                </div>

                                <button
                                    onClick={() => removeFromCart(item.product.id)}
                                    className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))
                    )}
                </div>

                <div className="p-4 lg:p-6 bg-surface space-y-3 lg:space-y-5">
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

                    <div className="grid grid-cols-3 gap-2 lg:gap-3">
                        <button
                            onClick={clearCart}
                            disabled={cart.length === 0}
                            className="col-span-1 px-2 lg:px-4 py-2 lg:py-3 text-red-500 bg-white border border-red-100 rounded-xl hover:bg-red-50 font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleInitiateCheckout}
                            disabled={cart.length === 0}
                            className="col-span-2 px-2 lg:px-4 py-2 lg:py-3 bg-primary text-white rounded-xl hover:bg-primary-light font-bold shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-1 lg:gap-2 text-sm transform active:scale-95"
                        >
                            <CreditCard className="w-4 lg:w-5 h-4 lg:h-5" />
                            <span>Pagar</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
