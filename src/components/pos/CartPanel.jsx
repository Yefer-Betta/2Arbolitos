import React from 'react';
import {
    ArrowRight,
    Check,
    ChevronDown,
    CreditCard,
    Minus,
    Pencil,
    Plus,
    ShoppingCart,
    Trash2,
    User,
    Users,
    X,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { EmptyState } from '../ui/EmptyState';
import { Money } from '../ui/Money';

function orderLabel(tableId) {
    if (!tableId) return 'Caja rápida';
    if (tableId.startsWith('mesa-')) return `Mesa ${tableId.replace('mesa-', '')}`;
    if (tableId === 'para-llevar') return 'Para llevar';
    if (tableId.startsWith('domicilio')) return 'Domicilio';
    return 'Pedido';
}

export function CartPanel({
    cart,
    tableId,
    mobileView,
    updateQuantity,
    editingNote,
    setEditingNote,
    itemNotes,
    setItemNotes,
    removeFromCart,
    selectedCustomer,
    setSelectedCustomer,
    setDeliveryAddressInput,
    setDeliveryPhoneInput,
    deliveryAddressInput,
    deliveryPhoneInput,
    deliveryCostInput,
    setDeliveryCostInput,
    cleanAmount,
    formatAmount,
    showCustomerSearch,
    setShowCustomerSearch,
    customerSearch,
    searchCustomers,
    customerResults,
    selectCustomer,
    deliveryCostNum,
    totals,
    exchangeRate,
    clearCart,
    handleInitiateCheckout,
    setShowTransferModal,
    setShowSplitModal,
    tableDisplayName,
    editingTableName,
    setEditingTableName,
    tableNameInput,
    setTableNameInput,
    handleStartRenameTable,
    handleSaveTableName,
    savingTableName,
    canRenameTable,
}) {
    const isMesa = Boolean(tableId && tableId.startsWith('mesa-'));
    const isEmpty = cart.length === 0;
    const itemCount = cart.reduce((sum, item) => sum + (item.quantity || 0), 0);

    return (
        <div
            className={cn(
                'flex h-full w-full flex-col overflow-hidden rounded-2xl border border-line bg-background-paper md:w-[360px] md:min-w-0 md:shrink-0 lg:w-[380px]',
                mobileView !== 'cart' && 'hidden md:flex'
            )}
        >
            <div className="flex items-center gap-2.5 bg-primary px-4 py-3 text-white">
                <ShoppingCart className="h-4 w-4 shrink-0 opacity-80" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold leading-tight">Orden actual</p>
                    {editingTableName && isMesa ? (
                        <div className="mt-0.5 flex items-center gap-1">
                            <input
                                autoFocus
                                value={tableNameInput}
                                onChange={(e) => setTableNameInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleSaveTableName?.();
                                    }
                                    if (e.key === 'Escape') {
                                        e.preventDefault();
                                        setEditingTableName(false);
                                    }
                                }}
                                className="h-6 w-full rounded-md bg-white/10 px-1.5 text-2xs text-white placeholder:text-white/50 focus:outline-none focus:ring-1 focus:ring-white/40"
                                placeholder={orderLabel(tableId)}
                                disabled={savingTableName}
                            />
                            <button
                                type="button"
                                onClick={handleSaveTableName}
                                disabled={savingTableName}
                                className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-white/10 hover:bg-white/20 disabled:opacity-60"
                                aria-label="Guardar nombre de mesa"
                            >
                                <Check className="h-3.5 w-3.5" />
                            </button>
                            <button
                                type="button"
                                onClick={() => setEditingTableName(false)}
                                className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-white/10 hover:bg-white/20"
                                aria-label="Cancelar cambio"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={canRenameTable ? handleStartRenameTable : undefined}
                            className={cn(
                                'group mt-0.5 flex max-w-full items-center gap-1 truncate text-2xs text-white/65',
                                canRenameTable && 'cursor-pointer hover:text-white'
                            )}
                            title={canRenameTable ? 'Cambiar nombre de la mesa' : undefined}
                        >
                            <span className="truncate">{tableDisplayName || orderLabel(tableId)}</span>
                            {canRenameTable && <Pencil className="h-3 w-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true" />}
                        </button>
                    )}
                </div>
                <span className="shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-2xs font-semibold">
                    {itemCount} {itemCount === 1 ? 'ítem' : 'ítems'}
                </span>
            </div>

            <div className="flex-1 overflow-y-auto">
                {isEmpty ? (
                    <EmptyState
                        icon={ShoppingCart}
                        title="El carrito está vacío"
                        description="Toca un producto del menú para agregarlo a la orden."
                        className="h-full"
                    />
                ) : (
                    <div className="divide-y divide-line-soft">
                        {cart.map(item => {
                            const pid = item.product?.id || item.id;
                            const unitPrice = item.product?.price || 0;
                            const currency = item.product?.isUsd ? 'USD' : 'COP';
                            const lineTotal = unitPrice * (item.quantity || 0);

                            return (
                                <div key={pid} className="group px-3.5 py-2.5 transition-colors hover:bg-surface/40">
                                    <div className="flex items-center gap-2">
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-[13px] font-semibold leading-tight text-ink">
                                                {item.product?.name || 'Producto'}
                                            </p>
                                            <p className="mt-0.5 flex items-center gap-1.5 text-2xs text-ink-muted">
                                                <Money
                                                    amount={unitPrice}
                                                    currency={currency}
                                                    className="text-2xs font-medium text-ink-muted"
                                                />
                                                <button
                                                    onClick={() => setEditingNote(editingNote === pid ? null : pid)}
                                                    className={cn(
                                                        'grid h-6 w-6 place-items-center rounded transition-colors',
                                                        itemNotes[pid]
                                                            ? 'bg-warn-soft text-warn'
                                                            : 'text-ink-soft hover:bg-warn-soft hover:text-warn'
                                                    )}
                                                    aria-label={itemNotes[pid] ? 'Editar nota' : 'Agregar nota'}
                                                    title={itemNotes[pid] ? 'Editar nota' : 'Agregar nota'}
                                                >
                                                    <Pencil className="h-3 w-3" aria-hidden="true" />
                                                </button>
                                            </p>
                                        </div>

                                        <div className="flex shrink-0 items-center rounded-lg border border-line">
                                            <button
                                                onClick={() => updateQuantity(pid, -1)}
                                                className="grid h-8 w-8 place-items-center rounded-l-lg text-ink-muted transition-colors hover:bg-surface hover:text-ink"
                                                aria-label={`Disminuir cantidad de ${item.product?.name || 'producto'}`}
                                            >
                                                <Minus className="h-3.5 w-3.5" />
                                            </button>
                                            <span className="num w-5 text-center text-xs font-semibold text-ink">
                                                {item.quantity}
                                            </span>
                                            <button
                                                onClick={() => updateQuantity(pid, 1)}
                                                className="grid h-8 w-8 place-items-center rounded-r-lg text-ink-muted transition-colors hover:bg-surface hover:text-ink"
                                                aria-label={`Aumentar cantidad de ${item.product?.name || 'producto'}`}
                                            >
                                                <Plus className="h-3.5 w-3.5" />
                                            </button>
                                        </div>

                                        <span className="w-[68px] shrink-0 text-right">
                                            <Money
                                                amount={lineTotal}
                                                currency={currency}
                                                suffix={false}
                                                className="text-xs text-ink"
                                            />
                                        </span>

                                        <button
                                            onClick={() => removeFromCart(pid)}
                                            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-ink-soft transition-colors hover:bg-danger-soft hover:text-danger"
                                            aria-label={`Eliminar ${item.product?.name || 'producto'} del pedido`}
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    </div>

                                    {itemNotes[pid] && editingNote !== pid && (
                                        <p className="mt-1 truncate rounded bg-warn-soft px-1.5 py-0.5 text-2xs text-warn">
                                            {itemNotes[pid]}
                                        </p>
                                    )}

                                    {editingNote === pid && (
                                        <input
                                            type="text"
                                            value={itemNotes[pid] || ''}
                                            onChange={e => setItemNotes(prev => ({ ...prev, [pid]: e.target.value }))}
                                            className="input-field mt-1.5 py-1 text-xs"
                                            placeholder="Ej. Sin cebolla, bien cocido..."
                                            autoFocus
                                            aria-label="Nota del producto"
                                        />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <div className="space-y-3 border-t border-line bg-background px-4 py-3">
                {/* Cliente */}
                <div className="relative">
                    {selectedCustomer ? (
                        <div className="flex items-center justify-between rounded-lg border border-line bg-background-paper px-2.5 py-1.5">
                            <div className="flex min-w-0 items-center gap-1.5">
                                <User className="h-3.5 w-3.5 shrink-0 text-ink-muted" aria-hidden="true" />
                                <span className="truncate text-xs font-medium text-ink">{selectedCustomer.name}</span>
                            </div>
                            <button
                                onClick={() => {
                                    setSelectedCustomer(null);
                                    if (tableId?.startsWith('domicilio')) {
                                        setDeliveryAddressInput('');
                                        setDeliveryPhoneInput('');
                                    }
                                }}
                                className="grid h-6 w-6 shrink-0 place-items-center rounded text-ink-soft hover:bg-surface hover:text-ink"
                                aria-label="Quitar cliente"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </div>
                    ) : (
                        <div className="relative">
                            <button
                                onClick={() => setShowCustomerSearch(!showCustomerSearch)}
                                className="flex w-full items-center gap-1.5 rounded-lg border border-dashed border-line px-2.5 py-1.5 text-xs text-ink-muted transition-colors hover:border-primary/40 hover:text-ink-brand"
                            >
                                <User className="h-3.5 w-3.5" aria-hidden="true" />
                                <span>Asignar cliente</span>
                                <ChevronDown className="ml-auto h-3 w-3" aria-hidden="true" />
                            </button>

                            {showCustomerSearch && (
                                <div className="absolute bottom-full left-0 right-0 z-50 mb-2 rounded-xl border border-line bg-background-paper shadow-pop">
                                    <div className="p-2.5">
                                        <input
                                            type="text"
                                            placeholder="Buscar cliente..."
                                            value={customerSearch}
                                            onChange={e => searchCustomers(e.target.value)}
                                            className="input-field text-sm"
                                            autoFocus
                                        />
                                        {customerResults.length > 0 && (
                                            <div className="mt-2 max-h-40 divide-y divide-line-soft overflow-auto">
                                                {customerResults.map(c => (
                                                    <button
                                                        key={c.id}
                                                        onClick={() => selectCustomer(c)}
                                                        className="flex w-full items-center gap-2 px-1.5 py-2 text-left text-sm hover:bg-surface"
                                                    >
                                                        <User className="h-3 w-3 shrink-0 text-ink-soft" aria-hidden="true" />
                                                        <span className="min-w-0">
                                                            <span className="block truncate font-medium text-ink">{c.name}</span>
                                                            {c.phone && <span className="block text-2xs text-ink-muted">{c.phone}</span>}
                                                        </span>
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
                    <div className="space-y-2 rounded-lg border border-line bg-background-paper p-2.5">
                        <p className="text-2xs font-semibold uppercase tracking-wide text-ink-muted">Datos de entrega</p>
                        <input
                            type="text"
                            placeholder="Dirección de entrega *"
                            value={deliveryAddressInput}
                            onChange={e => setDeliveryAddressInput(e.target.value)}
                            className="input-field text-xs"
                            aria-label="Dirección de entrega"
                        />
                        <input
                            type="text"
                            placeholder="Teléfono de contacto *"
                            value={deliveryPhoneInput}
                            onChange={e => setDeliveryPhoneInput(e.target.value)}
                            className="input-field text-xs"
                            aria-label="Teléfono de contacto"
                        />
                        <div>
                            <label className="text-2xs text-ink-muted" htmlFor="delivery-cost">Costo de envío (COP)</label>
                            <input
                                id="delivery-cost"
                                type="text"
                                inputMode="numeric"
                                placeholder="0"
                                value={deliveryCostInput}
                                onChange={e => setDeliveryCostInput(cleanAmount(e.target.value, 'COP'))}
                                onBlur={e => setDeliveryCostInput(formatAmount(e.target.value, 'COP'))}
                                onFocus={e => setDeliveryCostInput(cleanAmount(e.target.value, 'COP'))}
                                className="input-field text-xs"
                            />
                        </div>
                    </div>
                )}

                <div className="space-y-1">
                    <div className="flex items-center justify-between text-2xs text-ink-muted">
                        <span>Subtotal COP</span>
                        <Money
                            amount={totals.cop - deliveryCostNum}
                            suffix={false}
                            className="text-xs font-medium text-ink"
                        />
                    </div>
                    <div className="flex items-center justify-between text-2xs text-ink-muted">
                        <span>Subtotal USD</span>
                        <Money
                            amount={totals.usd - (deliveryCostNum / (exchangeRate || 4000))}
                            currency="USD"
                            suffix={false}
                            className="text-xs font-medium text-ink"
                        />
                    </div>
                    {deliveryCostNum > 0 && (
                        <div className="flex items-center justify-between text-2xs text-ink-muted">
                            <span>Envío</span>
                            <Money amount={deliveryCostNum} suffix={false} className="text-xs font-medium text-ink" />
                        </div>
                    )}

                    <div className="my-2 h-px bg-line" />

                    <div className="flex items-end justify-between">
                        <span className="text-2xs font-semibold uppercase tracking-wide text-ink-muted">Total</span>
                        <div className="text-right">
                            <Money amount={totals.cop} suffix={false} className="text-2xl leading-none text-ink" />
                            <p className="mt-0.5">
                                <Money amount={totals.usd} currency="USD" className="text-2xs font-medium text-ink-muted" />
                            </p>
                        </div>
                    </div>
                </div>

                <div className="space-y-2">
                    {isMesa && (
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => setShowTransferModal(true)}
                                disabled={isEmpty}
                                className="btn-secondary h-9 text-xs"
                            >
                                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                                Transferir
                            </button>
                            <button
                                onClick={() => setShowSplitModal(true)}
                                disabled={isEmpty}
                                className="btn-secondary h-9 text-xs"
                            >
                                <Users className="h-3.5 w-3.5" aria-hidden="true" />
                                Dividir
                            </button>
                        </div>
                    )}

                    <div className="flex gap-2">
                        <button
                            onClick={clearCart}
                            disabled={isEmpty}
                            className="btn-secondary h-10 px-3 text-xs text-danger"
                        >
                            <X className="h-3.5 w-3.5" aria-hidden="true" />
                            Cancelar
                        </button>
                        <button
                            onClick={handleInitiateCheckout}
                            disabled={isEmpty}
                            className="btn-primary h-10 flex-1"
                        >
                            <CreditCard className="h-4 w-4" aria-hidden="true" />
                            Cobrar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
