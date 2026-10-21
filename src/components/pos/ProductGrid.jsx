import React from 'react';
import { ArrowLeft, Plus, Search } from 'lucide-react';
import { cn } from '../../lib/utils';
import { EmptyState } from '../ui/EmptyState';
import { Money } from '../ui/Money';

function orderContext(tableId) {
    if (!tableId) return { title: 'Caja rápida', subtitle: 'Pedido sin mesa asignada.' };
    if (tableId.startsWith('mesa-')) {
        return {
            title: `Mesa ${tableId.replace('mesa-', '')}`,
            subtitle: 'Añade productos a la mesa.',
        };
    }
    if (tableId === 'para-llevar') {
        return { title: 'Para llevar', subtitle: 'Venta directa sin mesa.' };
    }
    if (tableId.startsWith('domicilio')) {
        return { title: 'Domicilio', subtitle: 'Pedido para entrega a domicilio.' };
    }
    return { title: 'Pedido', subtitle: '' };
}

export function ProductGrid({
    tableId,
    onBack,
    mobileView,
    searchTerm,
    setSearchTerm,
    categories,
    selectedCategory,
    setSelectedCategory,
    filteredProducts,
    addToCart,
    gridRef,
    handleGridKeys,
}) {
    const context = orderContext(tableId);

    return (
        <div className={cn('flex min-h-0 min-w-0 flex-col gap-4 md:flex-1', mobileView !== 'products' && 'hidden md:flex')}>
            {/* Cabecera del pedido */}
            <div className="flex items-center gap-3">
                <button
                    onClick={onBack}
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-line bg-background-paper text-ink-muted transition-colors hover:bg-surface hover:text-ink"
                    aria-label="Volver a las mesas"
                >
                    <ArrowLeft className="h-4 w-4" />
                </button>

                <div className="min-w-0 flex-1">
                    <h1 className="truncate text-xl font-semibold tracking-tight text-ink">{context.title}</h1>
                    <p className="mt-0.5 hidden truncate text-xs text-ink-muted sm:block">{context.subtitle}</p>
                </div>

                <span className="hidden shrink-0 text-2xs text-ink-muted sm:block">
                    {filteredProducts.length} {filteredProducts.length === 1 ? 'producto' : 'productos'}
                </span>
            </div>

            {/* Buscador + categorías en una sola franja */}
            <div className="flex flex-col gap-2.5 xl:flex-row xl:items-center">
                <div className="relative w-full xl:max-w-[280px]">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" aria-hidden="true" />
                    <input
                        type="text"
                        placeholder="Buscar producto..."
                        className="input-field pl-9"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        aria-label="Buscar producto"
                    />
                </div>

                <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5 scrollbar-hide">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            aria-pressed={selectedCategory === cat}
                            className={cn(
                                'h-9 shrink-0 whitespace-nowrap rounded-full border px-3.5 text-xs font-semibold transition-colors',
                                selectedCategory === cat
                                    ? 'border-primary bg-primary text-white'
                                    : 'border-line bg-background-paper text-ink-muted hover:border-primary/40 hover:text-ink-brand'
                            )}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* Rejilla de productos */}
            <div className="min-h-0 flex-1 overflow-y-auto">
                <div
                    ref={gridRef}
                    onKeyDown={handleGridKeys}
                    className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-2.5 md:gap-3"
                >
                    {filteredProducts.map((product, idx) => (
                        <button
                            key={product.id}
                            data-grid-index={idx}
                            onClick={() => addToCart(product)}
                            className="group relative flex min-h-[104px] flex-col rounded-xl border border-line bg-background-paper p-3 text-left transition-colors hover:border-primary/40 hover:bg-surface/40 active:scale-[0.99]"
                        >
                            <div className="flex items-start justify-between gap-2">
                                <span className="line-clamp-1 text-2xs font-semibold text-ink-soft">
                                    {product.category}
                                </span>
                                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary/5 text-ink-brand opacity-0 transition-opacity group-hover:opacity-100">
                                    <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                                </span>
                            </div>

                            <span className="mt-1 line-clamp-2 text-sm font-semibold leading-snug text-ink">
                                {product.name}
                            </span>

                            <div className="mt-auto pt-2">
                                <Money
                                    amount={product.price}
                                    currency={product.isUsd ? 'USD' : 'COP'}
                                    className="text-base text-ink-brand"
                                />
                            </div>
                        </button>
                    ))}

                    {filteredProducts.length === 0 && (
                        <EmptyState
                            icon={Search}
                            title="Sin resultados"
                            description="Prueba con otro nombre o cambia de categoría."
                            className="col-span-full"
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
