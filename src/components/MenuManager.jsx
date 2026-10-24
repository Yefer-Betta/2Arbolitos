import React, { useState, useEffect, useCallback } from 'react';
import { useMenu } from '../context/MenuContext';
import { useSettings } from '../context/SettingsContext';
import { Plus, Trash2, Pencil, X, Check, Search, Utensils, Package, DollarSign, Layers } from 'lucide-react';
import { apiGet } from '../lib/api.js';
import { useConfirm, useToast } from './ui/feedback-context';
import { PageHeader } from './ui/PageHeader';
import { Panel, PanelHeader } from './ui/Panel';
import { StatCard } from './ui/StatCard';
import { Badge } from './ui/Badge';
import { EmptyState } from './ui/EmptyState';
import { SubNav } from './ui/SubNav';

export function MenuManager() {
    const {
        products,
        categories,
        addProduct,
        updateProduct,
        deleteProduct,
        addCategory,
        updateCategory,
        deleteCategory,
        refreshMenu,
    } = useMenu();
    const { exchangeRate } = useSettings();
    const toast = useToast();
    const confirm = useConfirm();
    const [section, setSection] = useState('products');
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [inventoryItems, setInventoryItems] = useState([]);
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [isCategoryFormOpen, setIsCategoryFormOpen] = useState(false);
    const [editingCategoryId, setEditingCategoryId] = useState(null);
    const [categoryName, setCategoryName] = useState('');

    // Load inventory items for linking
    const loadInventory = useCallback(async () => {
        try {
            const data = await apiGet('/inventory');
            if (Array.isArray(data)) setInventoryItems(data);
        } catch { /* sin datos */ }
    }, []);

    // Carga inicial asincrona: el setState ocurre tras el await.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { loadInventory(); }, [loadInventory]);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        categoryId: '',
        price: '',
        isUsd: false,
        inventoryItemId: '',
    });

    const resetForm = () => {
        setFormData({ name: '', categoryId: '', price: '', isUsd: false, inventoryItemId: '' });
        setIsAdding(false);
        setEditingId(null);
    };

    const handleEditClick = (product) => {
        setFormData({
            name: product.name,
            categoryId: product.categoryId,
            price: product.price,
            isUsd: product.isUsd || false,
            inventoryItemId: product.inventoryItems?.[0]?.id || product.inventoryItemId || '',
        });
        setEditingId(product.id);
        setIsAdding(true);
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!formData.categoryId) {
            toast.error('Por favor selecciona una categoría');
            return;
        }

        const productData = {
            name: formData.name,
            categoryId: formData.categoryId,
            price: parseFloat(formData.price),
            isUsd: formData.isUsd,
            inventoryItemId: formData.inventoryItemId || null,
        };

        if (editingId) {
            updateProduct(editingId, productData);
        } else {
            addProduct(productData);
        }
        resetForm();
    };

    const formatPrice = (price, isUsd) => {
        if (isUsd) return `$${Number(price).toFixed(2)} USD`;
        return `$${Number(price).toLocaleString('es-CO')} COP`;
    };

    const calculateConverted = (price, isUsd) => {
        if (!exchangeRate) return '';
        if (isUsd) return `$${Math.round(price * exchangeRate).toLocaleString('es-CO')} COP`;
        return `$${(price / exchangeRate).toFixed(2)} USD`;
    };

    const filtered = products.filter(product => {
        if (categoryFilter !== 'all' && product.categoryId !== categoryFilter) return false;
        if (search) {
            const term = search.toLowerCase();
            const inName = product.name?.toLowerCase().includes(term);
            const inCategory = product.category?.toLowerCase().includes(term);
            if (!inName && !inCategory) return false;
        }
        return true;
    });

    const usdCount = products.filter(p => p.isUsd).length;

    const countProductsInCategory = (categoryId) =>
        products.filter(p => p.categoryId === categoryId).length;

    const openCategoryForm = (category = null) => {
        if (category) {
            setEditingCategoryId(category.id);
            setCategoryName(category.name);
        } else {
            setEditingCategoryId(null);
            setCategoryName('');
        }
        setIsCategoryFormOpen(true);
    };

    const closeCategoryForm = () => {
        setIsCategoryFormOpen(false);
        setEditingCategoryId(null);
        setCategoryName('');
    };

    const handleCategorySubmit = async (e) => {
        e.preventDefault();
        const name = categoryName.trim();
        if (!name) {
            toast.error('Escribe un nombre para la categoría');
            return;
        }

        if (editingCategoryId) {
            await updateCategory(editingCategoryId, { name });
            toast.success('Categoría actualizada');
        } else {
            await addCategory({ name });
            toast.success('Categoría creada');
        }

        closeCategoryForm();
        await refreshMenu();
    };

    const handleCategoryDelete = async (category) => {
        const used = countProductsInCategory(category.id);
        const ok = await confirm({
            title: `¿Eliminar "${category.name}"?`,
            message: used > 0
                ? `Tiene ${used} producto(s). Dejarán de mostrarse en el POS hasta que los asignes a otra categoría.`
                : 'La categoría dejará de estar disponible en el menú.',
            confirmLabel: 'Eliminar',
            danger: true,
        });
        if (!ok) return;

        await deleteCategory(category.id);
        if (categoryFilter === category.id) setCategoryFilter('all');
        toast.success('Categoría eliminada');
        await refreshMenu();
    };

    return (
        <div className="space-y-4">
            <PageHeader
                title="Menú"
                subtitle="Productos, categorías y precios de venta."
                actions={
                    section === 'products' ? (
                        !isAdding ? (
                            <button onClick={() => setIsAdding(true)} className="btn-primary h-9 px-3.5 text-[13px]">
                                <Plus className="h-4 w-4" aria-hidden="true" />
                                Nuevo producto
                            </button>
                        ) : null
                    ) : (
                        !isCategoryFormOpen ? (
                            <button onClick={() => openCategoryForm()} className="btn-primary h-9 px-3.5 text-[13px]">
                                <Plus className="h-4 w-4" aria-hidden="true" />
                                Nueva categoría
                            </button>
                        ) : null
                    )
                }
            />

            <SubNav
                items={[
                    { id: 'products', label: 'Productos', icon: Utensils },
                    { id: 'categories', label: 'Categorías', icon: Layers },
                ]}
                value={section}
                onChange={setSection}
            />

            {section === 'products' && (
                <>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
                <StatCard label="Productos" value={products.length} hint="Disponibles en el POS" icon={Utensils} tone="brand" />
                <StatCard label="Categorías" value={categories.length} hint="Agrupación del menú" icon={Layers} tone="neutral" />
                <StatCard label="Precios en USD" value={usdCount} hint="El resto se cobra en COP" icon={DollarSign} tone="info" className="col-span-2 sm:col-span-1" />
            </div>

            {isAdding && (
                <Panel>
                    <PanelHeader
                        title={editingId ? 'Editar producto' : 'Nuevo producto'}
                        subtitle="El precio se puede fijar en COP o USD."
                        actions={
                            <button onClick={resetForm} className="grid h-8 w-8 place-items-center rounded-lg text-ink-muted hover:bg-surface hover:text-ink" aria-label="Cerrar formulario">
                                <X className="h-4 w-4" />
                            </button>
                        }
                    />
                    <form onSubmit={handleSubmit} className="grid gap-3 p-4 sm:grid-cols-2">
                        <div>
                            <label className="mb-1 block text-2xs font-semibold text-ink-muted">Nombre del producto</label>
                            <input
                                required
                                type="text"
                                placeholder="Ej. Hamburguesa de la casa"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                className="input-field h-9"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-2xs font-semibold text-ink-muted">Categoría</label>
                            <select
                                required
                                value={formData.categoryId}
                                onChange={e => setFormData({ ...formData, categoryId: e.target.value })}
                                className="input-field h-9"
                            >
                                <option value="">Selecciona categoría</option>
                                {categories.map(cat => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="mb-1 block text-2xs font-semibold text-ink-muted">Precio base</label>
                            <div className="flex gap-2">
                                <input
                                    required
                                    type="number"
                                    step="0.01"
                                    placeholder="0.00"
                                    value={formData.price}
                                    onChange={e => setFormData({ ...formData, price: e.target.value })}
                                    className="input-field h-9"
                                />
                                <select
                                    value={formData.isUsd ? 'USD' : 'COP'}
                                    onChange={e => setFormData({ ...formData, isUsd: e.target.value === 'USD' })}
                                    className="input-field h-9 w-24 shrink-0"
                                    aria-label="Moneda del precio"
                                >
                                    <option value="COP">COP</option>
                                    <option value="USD">USD</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="mb-1 block text-2xs font-semibold text-ink-muted">Insumo vinculado</label>
                            <select
                                value={formData.inventoryItemId}
                                onChange={e => {
                                    const invId = e.target.value;
                                    const selected = inventoryItems.find(i => i.id === invId);
                                    setFormData(prev => ({
                                        ...prev,
                                        inventoryItemId: invId,
                                        name: selected && !prev.name ? selected.name : prev.name,
                                        price: selected && selected.unitCost && !prev.price ? String(selected.unitCost) : prev.price,
                                    }));
                                }}
                                className="input-field h-9"
                            >
                                <option value="">Ninguno</option>
                                {inventoryItems.map(inv => (
                                    <option key={inv.id} value={inv.id}>
                                        {inv.name} ({inv.quantity} {inv.unit})
                                    </option>
                                ))}
                            </select>
                            <p className="mt-1 text-2xs text-ink-soft">Al vender este producto se descuenta del inventario.</p>
                        </div>

                        <div className="flex items-end justify-end gap-2 sm:col-span-2">
                            <button type="button" onClick={resetForm} className="btn-secondary h-9 px-3 text-[13px]">Cancelar</button>
                            <button type="submit" className="btn-primary h-9 px-3.5 text-[13px]">
                                <Check className="h-4 w-4" aria-hidden="true" />
                                {editingId ? 'Guardar cambios' : 'Crear producto'}
                            </button>
                        </div>
                    </form>
                </Panel>
            )}

            <Panel>
                <PanelHeader
                    title="Catálogo"
                    subtitle={`${filtered.length} de ${products.length} productos`}
                    actions={
                        <div className="flex w-full items-center gap-2 sm:w-auto">
                            <div className="relative flex-1 sm:w-56">
                                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-soft" />
                                <input
                                    type="text"
                                    placeholder="Buscar producto..."
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    className="input-field h-8 pl-8 text-[13px]"
                                />
                            </div>
                            <select
                                value={categoryFilter}
                                onChange={e => setCategoryFilter(e.target.value)}
                                className="input-field h-8 w-auto min-w-[8rem] text-[13px]"
                                aria-label="Filtrar por categoría"
                            >
                                <option value="all">Todas</option>
                                {categories.map(cat => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                            </select>
                        </div>
                    }
                />

                {filtered.length === 0 ? (
                    <EmptyState
                        icon={Utensils}
                        title="No hay productos en la vista"
                        description="Ajusta la búsqueda o la categoría, o crea el primer producto del menú."
                        action={
                            !isAdding ? (
                                <button onClick={() => setIsAdding(true)} className="btn-primary h-9 px-3.5 text-[13px]">
                                    <Plus className="h-4 w-4" aria-hidden="true" />
                                    Nuevo producto
                                </button>
                            ) : null
                        }
                    />
                ) : (
                    <>
                        <div className="divide-y divide-line-soft md:hidden">
                            {filtered.map(product => (
                                <div key={product.id} className="flex items-start gap-3 px-4 py-3">
                                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-surface text-ink-muted">
                                        <Utensils className="h-4 w-4" aria-hidden="true" />
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-[13px] font-semibold text-ink">{product.name}</p>
                                        <div className="mt-0.5 flex flex-wrap items-center gap-1">
                                            <Badge tone="neutral" className="rounded-md">{product.category}</Badge>
                                            {product.inventoryItems?.length > 0 && (
                                                <Badge tone="warn" className="rounded-md">
                                                    <Package className="h-3 w-3" />
                                                    {product.inventoryItems[0].quantity} {product.inventoryItems[0].unit}
                                                </Badge>
                                            )}
                                        </div>
                                        <p className="num mt-1 text-[13px] font-semibold text-ink">
                                            {formatPrice(product.price, product.isUsd)}
                                            <span className="ml-1.5 text-2xs font-normal text-ink-soft">
                                                ≈ {calculateConverted(product.price, product.isUsd)}
                                            </span>
                                        </p>
                                    </div>
                                    <div className="flex shrink-0 items-center">
                                        <button
                                            onClick={() => handleEditClick(product)}
                                            className="grid h-8 w-8 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-surface hover:text-ink"
                                            aria-label={`Editar ${product.name}`}
                                        >
                                            <Pencil className="h-3.5 w-3.5" />
                                        </button>
                                        <button
                                            onClick={() => {
                                                confirm({ title: `¿Eliminar ${product.name}?`, message: 'El producto dejará de estar disponible.', confirmLabel: 'Eliminar', danger: true }).then(ok => { if (ok) deleteProduct(product.id); });
                                            }}
                                            className="grid h-8 w-8 place-items-center rounded-lg text-ink-soft transition-colors hover:bg-danger-soft hover:text-danger"
                                            aria-label={`Eliminar ${product.name}`}
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="hidden overflow-x-auto md:block">
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>Producto</th>
                                        <th>Categoría</th>
                                        <th className="text-right">Precio</th>
                                        <th className="text-right">Equivalente</th>
                                        <th className="w-20 text-right">
                                            <span className="sr-only">Acciones</span>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map(product => (
                                        <tr key={product.id}>
                                            <td>
                                                <div className="flex items-center gap-2">
                                                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-surface text-ink-muted">
                                                        <Utensils className="h-3.5 w-3.5" aria-hidden="true" />
                                                    </span>
                                                    <div className="min-w-0">
                                                        <p className="truncate font-medium text-ink">{product.name}</p>
                                                        {product.inventoryItems?.length > 0 && (
                                                            <p className="num text-2xs text-ink-soft">
                                                                Inventario: {product.inventoryItems[0].quantity} {product.inventoryItems[0].unit}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <Badge tone="neutral" className="rounded-md">{product.category}</Badge>
                                            </td>
                                            <td className="cell-num font-semibold text-ink">
                                                {formatPrice(product.price, product.isUsd)}
                                            </td>
                                            <td className="cell-num text-2xs text-ink-soft">
                                                ≈ {calculateConverted(product.price, product.isUsd)}
                                            </td>
                                            <td>
                                                <div className="flex items-center justify-end">
                                                    <button
                                                        onClick={() => handleEditClick(product)}
                                                        className="grid h-8 w-8 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-surface hover:text-ink"
                                                        title="Editar"
                                                        aria-label={`Editar ${product.name}`}
                                                    >
                                                        <Pencil className="h-3.5 w-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            confirm({ title: `¿Eliminar ${product.name}?`, message: 'El producto dejará de estar disponible.', confirmLabel: 'Eliminar', danger: true }).then(ok => { if (ok) deleteProduct(product.id); });
                                                        }}
                                                        className="grid h-8 w-8 place-items-center rounded-lg text-ink-soft transition-colors hover:bg-danger-soft hover:text-danger"
                                                        title="Eliminar"
                                                        aria-label={`Eliminar ${product.name}`}
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </Panel>
                </>
            )}

            {section === 'categories' && (
                <div className="space-y-4">
                    {isCategoryFormOpen && (
                        <Panel>
                            <PanelHeader
                                title={editingCategoryId ? 'Editar categoría' : 'Nueva categoría'}
                                subtitle="Agrupa los productos del menú por tipo."
                                actions={
                                    <button onClick={closeCategoryForm} className="grid h-8 w-8 place-items-center rounded-lg text-ink-muted hover:bg-surface hover:text-ink" aria-label="Cerrar formulario">
                                        <X className="h-4 w-4" />
                                    </button>
                                }
                            />
                            <form onSubmit={handleCategorySubmit} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
                                <div className="flex-1">
                                    <label className="mb-1 block text-2xs font-semibold text-ink-muted">Nombre de la categoría</label>
                                    <input
                                        required
                                        autoFocus
                                        value={categoryName}
                                        onChange={e => setCategoryName(e.target.value)}
                                        className="input-field h-9"
                                        placeholder="Ej. Bebidas, Postres, Entradas"
                                    />
                                </div>
                                <div className="flex justify-end gap-2">
                                    <button type="button" onClick={closeCategoryForm} className="btn-secondary h-9 px-3 text-[13px]">Cancelar</button>
                                    <button type="submit" className="btn-primary h-9 px-3.5 text-[13px]">
                                        <Check className="h-4 w-4" aria-hidden="true" />
                                        {editingCategoryId ? 'Guardar cambios' : 'Crear categoría'}
                                    </button>
                                </div>
                            </form>
                        </Panel>
                    )}

                    <Panel>
                        <PanelHeader
                            title="Categorías"
                            subtitle={`${categories.length} ${categories.length === 1 ? 'categoría' : 'categorías'} en el menú`}
                        />

                        {categories.length === 0 ? (
                            <EmptyState
                                icon={Layers}
                                title="No hay categorías"
                                description="Crea la primera categoría para organizar el menú del POS."
                                action={
                                    <button onClick={() => openCategoryForm()} className="btn-primary h-9 px-3.5 text-[13px]">
                                        <Plus className="h-4 w-4" aria-hidden="true" />
                                        Nueva categoría
                                    </button>
                                }
                            />
                        ) : (
                            <ul className="divide-y divide-line-soft">
                                {categories.map(category => {
                                    const count = countProductsInCategory(category.id);
                                    return (
                                        <li key={category.id} className="flex items-center justify-between gap-3 px-4 py-3">
                                            <div className="flex min-w-0 items-center gap-2.5">
                                                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-surface text-ink-muted">
                                                    <Layers className="h-4 w-4" aria-hidden="true" />
                                                </span>
                                                <div className="min-w-0">
                                                    <p className="truncate text-[13px] font-semibold text-ink">{category.name}</p>
                                                    <p className="text-2xs text-ink-muted">
                                                        {count === 0
                                                            ? 'Sin productos'
                                                            : `${count} ${count === 1 ? 'producto' : 'productos'}`}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="-mr-2 flex shrink-0 items-center">
                                                <button
                                                    onClick={() => openCategoryForm(category)}
                                                    className="grid h-8 w-8 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-surface hover:text-ink"
                                                    aria-label={`Editar ${category.name}`}
                                                >
                                                    <Pencil className="h-3.5 w-3.5" />
                                                </button>
                                                <button
                                                    onClick={() => handleCategoryDelete(category)}
                                                    className="grid h-8 w-8 place-items-center rounded-lg text-ink-soft transition-colors hover:bg-danger-soft hover:text-danger"
                                                    aria-label={`Eliminar ${category.name}`}
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </Panel>
                </div>
            )}
        </div>
    );
}
