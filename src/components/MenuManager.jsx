import React, { useState } from 'react';
import { useMenu } from '../context/MenuContext';
import { useSettings } from '../context/SettingsContext';
import { Plus, Trash2, Edit2, X, Check, Search, Utensils } from 'lucide-react';

export function MenuManager() {
    const { products, addProduct, updateProduct, deleteProduct } = useMenu();
    const { exchangeRate } = useSettings();
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState(null);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        category: '',
        price: '',
        isUsd: false,
    });

    const resetForm = () => {
        setFormData({ name: '', category: '', price: '', isUsd: false });
        setIsAdding(false);
        setEditingId(null);
    };

    const handleEditClick = (product) => {
        setFormData({
            name: product.name,
            category: product.category,
            price: product.price,
            isUsd: product.isUsd || false,
        });
        setEditingId(product.id);
        setIsAdding(true);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const productData = {
            ...formData,
            price: parseFloat(formData.price),
        };

        if (editingId) {
            updateProduct(editingId, productData);
        } else {
            addProduct(productData);
        }
        resetForm();
    };

    // Helper to display price
    const formatPrice = (price, isUsd) => {
        if (isUsd) {
            return `$${price.toFixed(2)} USD`;
        }
        return `$${price.toLocaleString()} COP`;
    };

    const calculateConverted = (price, isUsd) => {
        if (isUsd) {
            return `$${(price * exchangeRate).toLocaleString()} COP`;
        }
        return `$${(price / exchangeRate).toFixed(2)} USD`;
    }

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Menú del Restaurante</h2>
                    <p className="text-gray-500 text-sm">Gestiona tus productos y precios</p>
                </div>
                {!isAdding && (
                    <button
                        onClick={() => setIsAdding(true)}
                        className="btn-primary flex items-center gap-2"
                    >
                        <Plus className="w-5 h-5" />
                        Nuevo Producto
                    </button>
                )}
            </div>

            {isAdding && (
                <div className="card p-8 bg-white border border-primary/10 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-secondary"></div>
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold text-primary flex items-center gap-2">
                            {editingId ? <Edit2 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                            {editingId ? 'Editar Producto' : 'Nuevo Producto'}
                        </h3>
                        <button onClick={resetForm} className="text-gray-400 hover:text-red-500 transition-colors"><X className="w-6 h-6" /></button>
                    </div>

                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="col-span-2 md:col-span-1">
                            <label className="block text-sm font-bold text-gray-700 mb-2">Nombre del Producto</label>
                            <input
                                required
                                type="text"
                                placeholder="Ej. Hamburguesa de la Casa"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                className="input-field"
                            />
                        </div>
                        <div className="col-span-2 md:col-span-1">
                            <label className="block text-sm font-bold text-gray-700 mb-2">Categoría</label>
                            <input
                                required
                                type="text"
                                placeholder="Ej. Platos Fuertes"
                                value={formData.category}
                                onChange={e => setFormData({ ...formData, category: e.target.value })}
                                className="input-field"
                            />
                        </div>

                        <div className="col-span-2 md:col-span-1">
                            <label className="block text-sm font-bold text-gray-700 mb-2">Precio Base</label>
                            <div className="flex rounded-xl shadow-sm">
                                <input
                                    required
                                    type="number"
                                    step="0.01"
                                    placeholder="0.00"
                                    value={formData.price}
                                    onChange={e => setFormData({ ...formData, price: e.target.value })}
                                    className="input-field rounded-r-none border-r-0"
                                />
                                <select
                                    value={formData.isUsd ? 'USD' : 'COP'}
                                    onChange={e => setFormData({ ...formData, isUsd: e.target.value === 'USD' })}
                                    className="bg-gray-50 border border-gray-200 rounded-r-xl px-4 font-bold text-gray-700 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all cursor-pointer hover:bg-gray-100"
                                >
                                    <option value="COP">COP</option>
                                    <option value="USD">USD</option>
                                </select>
                            </div>
                        </div>

                        <div className="col-span-2 flex justify-end gap-3 mt-4 pt-4 border-t border-gray-100">
                            <button
                                type="button"
                                onClick={resetForm}
                                className="btn-secondary"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                className="btn-primary flex items-center gap-2"
                            >
                                <Check className="w-5 h-5" />
                                Guardar Producto
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {products.length === 0 ? (
                    <div className="col-span-full flex flex-col items-center justify-center py-20 text-gray-400 bg-white rounded-3xl border border-dashed border-gray-200">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                            <Utensils className="w-8 h-8 opacity-20" />
                        </div>
                        <p className="font-medium">Tu menú está vacío</p>
                        <button onClick={() => setIsAdding(true)} className="mt-4 text-primary font-bold hover:underline">Agregar el primer plato</button>
                    </div>
                ) : (
                    products.map((product) => (
                        <div key={product.id} className="card p-5 flex flex-col justify-between group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 relative overflow-hidden bg-white">
                            <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex gap-2">
                                <button
                                    onClick={() => handleEditClick(product)}
                                    className="p-2 bg-white text-blue-600 hover:bg-blue-50 rounded-lg shadow-sm"
                                    title="Editar"
                                >
                                    <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => {
                                        if (confirm('¿Seguro de eliminar este producto?')) deleteProduct(product.id)
                                    }}
                                    className="p-2 bg-white text-red-600 hover:bg-red-50 rounded-lg shadow-sm"
                                    title="Eliminar"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>

                            <div>
                                <div className="w-10 h-10 rounded-full bg-surface flex items-center justify-center mb-4 text-primary">
                                    <Utensils className="w-5 h-5" />
                                </div>
                                <span className="inline-block px-2.5 py-1 text-xs font-bold bg-primary/5 text-primary rounded-md mb-2 uppercase tracking-wide">
                                    {product.category}
                                </span>
                                <h3 className="font-bold text-lg text-gray-800 leading-tight mb-1">{product.name}</h3>
                            </div>

                            <div className="mt-4 pt-4 border-t border-gray-50">
                                <div className="flex justify-between items-baseline">
                                    <div className="text-2xl font-bold text-primary">
                                        {formatPrice(product.price, product.isUsd)}
                                    </div>
                                    <div className="text-xs font-medium text-gray-400">
                                        ≈ {calculateConverted(product.price, product.isUsd)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
