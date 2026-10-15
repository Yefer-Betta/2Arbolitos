import React from 'react';
import { Search, Plus, Utensils } from 'lucide-react';
import { cn } from '../../lib/utils';

export function ProductGrid({ tableId, onBack, mobileView, searchTerm, setSearchTerm, categories, selectedCategory, setSelectedCategory, filteredProducts, addToCart, gridRef, handleGridKeys }) {
    return (
            <div className={cn("flex flex-col gap-6 min-h-0 md:flex-1 md:h-auto", mobileView !== 'products' && "hidden md:flex")}>
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
                                    ) : tableId?.startsWith('domicilio') ? (
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
                <div className="flex-1 overflow-y-auto pr-2 min-h-0">
                    <div
                        ref={gridRef}
                        onKeyDown={handleGridKeys}
                        className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4"
                    >
                        {filteredProducts.map((product, idx) => (
                            <button
                                key={product.id}
                                data-grid-index={idx}
                                onClick={() => addToCart(product)}
                                className="flex flex-col p-5 bg-white hover:bg-surface border border-transparent hover:border-primary/20 rounded-2xl shadow-sm hover:shadow-md transition-all text-left group relative overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 p-3 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                    <div className="bg-primary text-white p-2 rounded-lg shadow-lg">
                                        <Plus className="w-4 h-4" />
                                    </div>
                                </div>
                                <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center mb-3 text-secondary shrink-0">
                                    <Utensils className="w-5 h-5" />
                                </div>

                                <span className="text-xs font-bold text-secondary uppercase tracking-wider mb-1">{product.category}</span>
                                <span className="font-bold text-gray-800 mb-2 line-clamp-2 text-base lg:text-lg leading-snug">{product.name}</span>

                                <div className="mt-auto pt-3 border-t border-gray-50 w-full">
                                    <span className="font-bold text-base lg:text-xl text-primary block break-words leading-snug">
                                        {product.isUsd ? `$${product.price.toFixed(2)}` : `$${product.price.toLocaleString()}`}
                                        <span className="text-[11px] lg:text-xs font-medium text-gray-500 ml-1 align-top">{product.isUsd ? 'USD' : 'COP'}</span>
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
    );
}
