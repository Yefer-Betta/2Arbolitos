import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useMenu } from '../context/MenuContext';
import { useSettings } from '../context/SettingsContext';
import { useOrders } from '../context/OrdersContext';
import { useUser } from '../context/UserContext';
import { apiGet, apiPut } from '../lib/api.js';
import { ShoppingCart, Utensils, ArrowRight } from 'lucide-react';
import { cn } from '../lib/utils';
import { cleanAmount, formatAmount, amountToCop } from '../lib/amount';
import { genId } from '../lib/id';
import { CheckoutModal } from './pos/CheckoutModal';
import { ModifierModal } from './pos/ModifierModal';
import { DiscountModal } from './pos/DiscountModal';
import { ProductGrid } from './pos/ProductGrid';
import { CartPanel } from './pos/CartPanel';
import { TransferModal } from './pos/TransferModal';
import { SplitBillModal } from './pos/SplitBillModal';
import { useToast } from './ui/feedback-context';

export function POS({ tableId, onBack }) {
    const { products } = useMenu();
    const toast = useToast();
    const { exchangeRate, exchangeRateBs, business } = useSettings();
    const {
        addOrder,
        activeTables,
        agregarPlatilloAMesa,
        actualizarCantidad,
        limpiarMesa,
        transferTable,
    } = useOrders();
    const { currentUser } = useUser();

    const cart = useMemo(() => activeTables[tableId]?.items || [], [activeTables, tableId]);

    // Delivery fields
    const [deliveryAddressInput, setDeliveryAddressInput] = useState('');
    const [deliveryPhoneInput, setDeliveryPhoneInput] = useState('');
    const [deliveryCostInput, setDeliveryCostInput] = useState('');

    // Cargar datos de domicilio desde activeTables al montar
    const tableEntry = activeTables[tableId];
    const [tableDisplayName, setTableDisplayName] = useState(tableEntry?.name || null);
    const [editingTableName, setEditingTableName] = useState(false);
    const [tableNameInput, setTableNameInput] = useState('');
    const [savingTableName, setSavingTableName] = useState(false);
    const canRenameTable = tableId?.startsWith('mesa-') && ['ADMIN', 'MANAGER'].includes(String(currentUser?.role || '').toUpperCase());

    useEffect(() => {
        if (tableEntry?.name) {
            setTableDisplayName(tableEntry.name);
        }
    }, [tableEntry?.name]);

    useEffect(() => {
        if (tableId?.startsWith('domicilio') && tableEntry) {
            setDeliveryAddressInput(tableEntry.deliveryAddress || '');
            setDeliveryPhoneInput(tableEntry.deliveryPhone || '');
            setDeliveryCostInput(tableEntry.deliveryCost ? String(tableEntry.deliveryCost) : '');
        }
    }, [tableId, tableEntry?.deliveryAddress, tableEntry?.deliveryPhone, tableEntry?.deliveryCost]);

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('Todos');

    // Checkout State - Mixed Payments
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
    const [paymentSplits, setPaymentSplits] = useState([]);
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

    // Keyboard navigation for product grid
    const gridRef = useRef(null);
    const handleGridKeys = (e) => {
        const buttons = gridRef.current
            ? Array.from(gridRef.current.querySelectorAll('button[data-grid-index]'))
            : [];
        if (buttons.length === 0) return;
        const current = buttons.findIndex(b => b === document.activeElement);
        if (current === -1) return;
        let next = current;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
            next = current + 1;
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
            next = current - 1;
        } else {
            return;
        }
        e.preventDefault();
        if (next >= 0 && next < buttons.length) {
            buttons[next].focus();
        }
    };

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
        } catch { /* sin modificadores */ }
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

    const deliveryCostNum = parseFloat(deliveryCostInput) || 0;

    const totals = useMemo(() => ({
        cop: (discountData.finalCop > 0 ? discountData.finalCop : discountData.originalCop) + deliveryCostNum,
        usd: (discountData.finalUsd > 0 ? discountData.finalUsd : discountData.originalUsd) + (deliveryCostNum / (exchangeRate || 4000)),
        bs: ((discountData.finalCop > 0 ? discountData.finalCop : discountData.originalCop) + deliveryCostNum) / (exchangeRateBs || 40),
    }), [discountData, exchangeRateBs, exchangeRate, deliveryCostNum]);


    // Checkout Logic - Mixed Payments
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
        paymentSplits.reduce((sum, s) => sum + amountToCop(s.amount, s.method, exchangeRate, exchangeRateBs), 0)
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
            if (tableId?.startsWith('domicilio')) return 'domicilio';
            return tableId;
        };

        const currentSplits = paymentSplits;
        const rate = exchangeRate > 0 ? exchangeRate : 4000;
        const rateBs = exchangeRateBs > 0 ? exchangeRateBs : 40;
        const totalPaidCopVal = currentSplits.reduce((sum, s) => {
            const amt = parseFloat(s.amount) || 0;
            if (s.method === 'cash_usd') return sum + amt * rate;
            if (s.method === 'cash_bs') return sum + amt * rateBs;
            return sum + amt;
        }, 0);
        const factor = totalPaidCopVal > 0 ? 1 - (totals.cop / totalPaidCopVal) : 0;

        const splitsPayload = currentSplits
            .filter(s => parseFloat(s.amount) > 0)
            .map(s => {
            const amount = parseFloat(s.amount) || 0;
            const change = s.method === 'nequi' || s.method === 'card' ? 0 : Math.max(0, amount * factor);
            return {
                method: s.method.toUpperCase(),
                currency: s.currency,
                amount,
                change,
            };
        });

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
            deliveryAddress: tableId?.startsWith('domicilio') ? (deliveryAddressInput || selectedCustomer?.address || null) : (selectedCustomer?.address || null),
            deliveryPhone: tableId?.startsWith('domicilio') ? (deliveryPhoneInput || selectedCustomer?.phone || null) : null,
            deliveryCost: tableId?.startsWith('domicilio') ? deliveryCostNum : 0,
        };

        addOrder(orderData);
        setLastOrder(orderData);
        setShowRecipe(true);
    };

    const closeCheckout = () => {
        if (showRecipe) {
            if (tableId && tableId.startsWith('mesa-')) {
                limpiarMesa(tableId);
            } else if (tableId === 'para-llevar' || tableId?.startsWith('domicilio')) {
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
        setDeliveryAddressInput('');
        setDeliveryPhoneInput('');
        setDeliveryCostInput('');
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
        if (tableId?.startsWith('domicilio')) {
            if (c.address) setDeliveryAddressInput(c.address);
            if (c.phone) setDeliveryPhoneInput(c.phone);
        }
    };

    // Transfer
    const handleTransfer = async () => {
        if (!targetTable) return toast.error('Seleccione una mesa destino');
        transferTable(tableId, targetTable);
        setShowTransferModal(false);
        toast.success('Pedido transferido');
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
        <div className="relative flex h-full flex-col gap-4 md:flex-row md:gap-5">
            {/* Selector Menú / Carrito (solo móvil, sticky arriba) */}
            <div className="sticky top-0 z-30 -mx-4 bg-background/95 px-4 pb-2 pt-1 backdrop-blur-sm md:hidden">
                <div className="flex gap-1 rounded-xl border border-line bg-background-paper p-1">
                    <button
                        onClick={() => setMobileView('products')}
                        aria-pressed={mobileView === 'products'}
                        className={cn(
                            "flex h-11 flex-1 items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-colors",
                            mobileView === 'products' ? "bg-primary text-white" : "text-ink-muted active:bg-surface"
                        )}
                    >
                        <Utensils className="w-4 h-4" aria-hidden="true" /> Menú
                    </button>
                    <button
                        onClick={() => setMobileView('cart')}
                        aria-pressed={mobileView === 'cart'}
                        className={cn(
                            "relative flex h-11 flex-1 items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-colors",
                            mobileView === 'cart' ? "bg-primary text-white" : "text-ink-muted active:bg-surface"
                        )}
                    >
                        <ShoppingCart className="w-4 h-4" aria-hidden="true" /> Carrito
                        {cart.length > 0 ? (
                            <span
                                aria-hidden="true"
                                className="num ml-0.5 rounded-full bg-secondary px-1.5 text-2xs font-semibold text-primary-dark"
                            >
                                {cart.reduce((sum, item) => sum + (item.quantity || 0), 0)}
                            </span>
                        ) : null}
                    </button>
                </div>
            </div>
            <CheckoutModal
                isCheckoutOpen={isCheckoutOpen}
                closeCheckout={closeCheckout}
                showRecipe={showRecipe}
                totals={totals}
                discountData={discountData}
                setShowDiscountModal={setShowDiscountModal}
                paymentSplits={paymentSplits}
                getSplitChange={getSplitChange}
                cleanAmount={cleanAmount}
                formatAmount={formatAmount}
                updatePaymentSplit={updatePaymentSplit}
                addPaymentSplit={addPaymentSplit}
                removePaymentSplit={removePaymentSplit}
                isFullyPaid={isFullyPaid}
                totalPaidCop={totalPaidCop}
                remaining={remaining}
                handleFinalizeSale={handleFinalizeSale}
                lastOrder={lastOrder}
                business={business}
                tableId={tableId}
            />

            <ModifierModal
                showModifierModal={showModifierModal}
                setShowModifierModal={setShowModifierModal}
                modifierProduct={modifierProduct}
                setModifierProduct={setModifierProduct}
                modifierGroups={modifierGroups}
                selectedModifiers={selectedModifiers}
                toggleModifier={toggleModifier}
                confirmModifiers={confirmModifiers}
            />

            <DiscountModal
                showDiscountModal={showDiscountModal}
                setShowDiscountModal={setShowDiscountModal}
                discountData={discountData}
                discountFinalPrice={discountFinalPrice}
                setDiscountFinalPrice={setDiscountFinalPrice}
                discountPercent={discountPercent}
                setDiscountPercent={setDiscountPercent}
                handleApplyDiscount={handleApplyDiscount}
                handleClearDiscount={handleClearDiscount}
            />

            <ProductGrid
                tableId={tableId}
                onBack={onBack}
                mobileView={mobileView}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                categories={categories}
                selectedCategory={selectedCategory}
                setSelectedCategory={setSelectedCategory}
                filteredProducts={filteredProducts}
                addToCart={addToCart}
                gridRef={gridRef}
                handleGridKeys={handleGridKeys}
            />

            <CartPanel
                cart={cart}
                tableId={tableId}
                mobileView={mobileView}
                updateQuantity={updateQuantity}
                editingNote={editingNote}
                setEditingNote={setEditingNote}
                itemNotes={itemNotes}
                setItemNotes={setItemNotes}
                removeFromCart={removeFromCart}
                selectedCustomer={selectedCustomer}
                setSelectedCustomer={setSelectedCustomer}
                setDeliveryAddressInput={setDeliveryAddressInput}
                setDeliveryPhoneInput={setDeliveryPhoneInput}
                deliveryAddressInput={deliveryAddressInput}
                deliveryPhoneInput={deliveryPhoneInput}
                deliveryCostInput={deliveryCostInput}
                setDeliveryCostInput={setDeliveryCostInput}
                cleanAmount={cleanAmount}
                formatAmount={formatAmount}
                showCustomerSearch={showCustomerSearch}
                setShowCustomerSearch={setShowCustomerSearch}
                customerSearch={customerSearch}
                searchCustomers={searchCustomers}
                customerResults={customerResults}
                selectCustomer={selectCustomer}
                deliveryCostNum={deliveryCostNum}
                totals={totals}
                exchangeRate={exchangeRate}
                clearCart={clearCart}
                handleInitiateCheckout={handleInitiateCheckout}
                setShowTransferModal={setShowTransferModal}
                setShowSplitModal={setShowSplitModal}
                tableDisplayName={tableDisplayName}
                editingTableName={editingTableName}
                setEditingTableName={setEditingTableName}
                tableNameInput={tableNameInput}
                setTableNameInput={setTableNameInput}
                handleStartRenameTable={handleStartRenameTable}
                handleSaveTableName={handleSaveTableName}
                savingTableName={savingTableName}
                canRenameTable={canRenameTable}
            />

            <TransferModal
                showTransferModal={showTransferModal}
                setShowTransferModal={setShowTransferModal}
                targetTable={targetTable}
                setTargetTable={setTargetTable}
                handleTransfer={handleTransfer}
            />

            <SplitBillModal
                showSplitModal={showSplitModal}
                setShowSplitModal={setShowSplitModal}
                splitPersons={splitPersons}
                setSplitPersons={setSplitPersons}
                perPerson={perPerson}
                totals={totals}
            />

            <div aria-live="polite" className="sr-only">
                {cart.length} {cart.length === 1 ? 'ítem' : 'ítems'} en el pedido
            </div>
        </div>
    );
}
