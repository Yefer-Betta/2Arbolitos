import React, { useState, useEffect, useCallback } from 'react';
import { apiGet, apiPost, apiPut, apiDelete } from '../lib/api.js';
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  Package,
  AlertTriangle,
  Search,
  ArrowUpDown,
  History,
  Boxes,
  Wallet,
} from 'lucide-react';
import { useConfirm, useToast } from './ui/feedback-context';
import { Modal } from './Modal';
import { PageHeader } from './ui/PageHeader';
import { Panel, PanelHeader } from './ui/Panel';
import { StatCard } from './ui/StatCard';
import { Badge } from './ui/Badge';
import { EmptyState } from './ui/EmptyState';
import { formatCurrency } from '../lib/utils';

const UNITS = [
  { value: 'pcs', label: 'Unidades' },
  { value: 'lt', label: 'Litros' },
  { value: 'ml', label: 'Mililitros' },
  { value: 'kg', label: 'Kilogramos' },
  { value: 'g', label: 'Gramos' },
  { value: 'lb', label: 'Libras' },
  { value: 'oz', label: 'Onzas' },
];

const REASON_LABELS = { ajuste: 'Ajuste', compra: 'Compra', venta: 'Venta', merma: 'Merma', devolucion: 'Devolución' };

function shortDate(value) {
  return new Date(value).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

function movementDate(value) {
  return new Date(value).toLocaleString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function InventoryManager() {
  const toast = useToast();
  const confirm = useConfirm();
  const [items, setItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [lowFilter, setLowFilter] = useState(false);
  const [search, setSearch] = useState('');
  const [formData, setFormData] = useState({
    name: '', sku: '', quantity: '', unit: 'pcs', minStock: '',
    expirationDate: '', provider: '', unitCost: '', productId: '',
  });

  const [adjustTarget, setAdjustTarget] = useState(null);
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustReason, setAdjustReason] = useState('ajuste');

  const [movementsTarget, setMovementsTarget] = useState(null);
  const [movements, setMovements] = useState([]);
  const [loadingMovements, setLoadingMovements] = useState(false);

  const loadInventory = useCallback(async () => {
    try { const data = await apiGet('/inventory'); if (Array.isArray(data)) setItems(data); } catch { /* sin datos */ }
  }, []);

  const loadProducts = useCallback(async () => {
    try { const data = await apiGet('/products'); if (Array.isArray(data)) setProducts(data); } catch { /* sin datos */ }
  }, []);

  // Carga inicial asincrona: el setState ocurre tras el await, no en el render.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadInventory(); loadProducts(); }, [loadInventory, loadProducts]);

  const resetForm = () => {
    setFormData({ name: '', sku: '', quantity: '', unit: 'pcs', minStock: '', expirationDate: '', provider: '', unitCost: '', productId: '' });
    setEditingId(null); setIsFormOpen(false);
  };

  const handleEdit = (item) => {
    setFormData({
      name: item.name, sku: item.sku || '', quantity: String(item.quantity),
      unit: item.unit, minStock: String(item.minStock || 0),
      expirationDate: item.expirationDate ? item.expirationDate.split('T')[0] : '',
      provider: item.provider || '', unitCost: item.unitCost ? String(item.unitCost) : '',
      productId: item.productId || '',
    });
    setEditingId(item.id); setIsFormOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      name: formData.name, sku: formData.sku || null, quantity: parseFloat(formData.quantity) || 0,
      unit: formData.unit, minStock: parseFloat(formData.minStock) || 0,
      expirationDate: formData.expirationDate ? new Date(formData.expirationDate).toISOString() : null,
      provider: formData.provider || null, unitCost: formData.unitCost ? parseFloat(formData.unitCost) : null,
      productId: formData.productId || null,
    };
    try {
      if (editingId) {
        const updated = await apiPut(`/inventory/${editingId}`, payload);
        setItems(prev => prev.map(i => i.id === editingId ? { ...i, ...updated } : i));
      } else {
        const created = await apiPost('/inventory', payload);
        setItems(prev => [...prev, created]);
      }
      resetForm();
      toast.success(editingId ? 'Insumo actualizado' : 'Insumo creado');
    } catch (err) { toast.error('Error al guardar: ' + (err.message || 'desconocido')); }
  };

  const handleDelete = async (id) => {
    const ok = await confirm({ title: '¿Eliminar insumo?', message: 'Esta acción no se puede deshacer.', confirmLabel: 'Eliminar', danger: true });
    if (!ok) return;
    try { await apiDelete('/inventory', id); setItems(prev => prev.filter(i => i.id !== id)); toast.success('Insumo eliminado'); } catch { toast.error('No se pudo eliminar el insumo'); }
  };

  const handleAdjust = async () => {
    if (!adjustTarget || !adjustQty) return;
    const qty = parseFloat(adjustQty);
    if (isNaN(qty) || qty === 0) return;
    try {
      await apiPost('/inventory-movements', { itemId: adjustTarget.id, quantity: qty, reason: adjustReason });
      await loadInventory();
      setAdjustTarget(null); setAdjustQty(''); setAdjustReason('ajuste');
      toast.success('Stock ajustado');
    } catch (err) { toast.error('Error al ajustar stock: ' + (err.message || '')); }
  };

  const openMovements = async (item) => {
    setMovementsTarget(item);
    setLoadingMovements(true);
    try {
      const data = await apiGet(`/inventory-movements?itemId=${item.id}`);
      setMovements(Array.isArray(data) ? data : []);
    } catch { setMovements([]); }
    setLoadingMovements(false);
  };

  const isLowStock = (item) => item.quantity <= item.minStock;

  const filtered = items.filter(item => {
    if (lowFilter && !isLowStock(item)) return false;
    if (search && !item.name.toLowerCase().includes(search.toLowerCase()) && !(item.sku && item.sku.includes(search))) return false;
    return true;
  });

  const lowCount = items.filter(isLowStock).length;
  const stockValue = items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitCost) || 0), 0);

  const rowActions = (item) => (
    <div className="flex items-center justify-end gap-0.5">
      <button
        onClick={() => { setAdjustTarget(item); setAdjustQty(''); setAdjustReason('ajuste'); }}
        className="grid h-8 w-8 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-surface hover:text-ink"
        title="Ajustar stock"
        aria-label={`Ajustar stock de ${item.name}`}
      >
        <ArrowUpDown className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={() => openMovements(item)}
        className="grid h-8 w-8 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-surface hover:text-ink"
        title="Historial de movimientos"
        aria-label={`Ver movimientos de ${item.name}`}
      >
        <History className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={() => handleEdit(item)}
        className="grid h-8 w-8 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-surface hover:text-ink"
        title="Editar"
        aria-label={`Editar ${item.name}`}
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={() => handleDelete(item.id)}
        className="grid h-8 w-8 place-items-center rounded-lg text-ink-soft transition-colors hover:bg-danger-soft hover:text-danger"
        title="Eliminar"
        aria-label={`Eliminar ${item.name}`}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="Inventario"
        subtitle="Materias primas, stock mínimo y movimientos."
        actions={
          !isFormOpen ? (
            <button onClick={() => setIsFormOpen(true)} className="btn-primary h-9 px-3.5 text-[13px]">
              <Plus className="h-4 w-4" aria-hidden="true" />
              Nuevo insumo
            </button>
          ) : null
        }
      />

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
        <StatCard label="Insumos registrados" value={items.length} hint={lowFilter ? `${filtered.length} en la vista` : 'Materias primas y bebidas'} icon={Boxes} tone="brand" />
        <StatCard label="Stock bajo" value={lowCount} hint={lowCount === 0 ? 'Todo por encima del mínimo' : 'Compras pendientes'} icon={AlertTriangle} tone={lowCount === 0 ? 'ok' : 'warn'} />
        <StatCard label="Valor de inventario" value={formatCurrency(stockValue)} hint="Stock × costo unitario" icon={Wallet} tone="neutral" className="col-span-2 sm:col-span-1" />
      </div>

      {isFormOpen && (
        <Panel>
          <PanelHeader
            title={editingId ? 'Editar insumo' : 'Nuevo insumo'}
            subtitle="El stock se ajusta después desde la tabla."
            actions={
              <button onClick={resetForm} className="grid h-8 w-8 place-items-center rounded-lg text-ink-muted hover:bg-surface hover:text-ink" aria-label="Cerrar formulario">
                <X className="h-4 w-4" />
              </button>
            }
          />
          <form onSubmit={handleSubmit} className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="mb-1 block text-2xs font-semibold text-ink-muted">Nombre *</label>
              <input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="input-field h-9" placeholder="Ej. Coca-Cola 2L" />
            </div>
            <div>
              <label className="mb-1 block text-2xs font-semibold text-ink-muted">SKU / Código</label>
              <input value={formData.sku} onChange={e => setFormData({ ...formData, sku: e.target.value })} className="input-field h-9" placeholder="Ej. CC-2L-001" />
            </div>
            <div>
              <label className="mb-1 block text-2xs font-semibold text-ink-muted">Proveedor</label>
              <input value={formData.provider} onChange={e => setFormData({ ...formData, provider: e.target.value })} className="input-field h-9" placeholder="Ej. Distribuidora XYZ" />
            </div>
            <div>
              <label className="mb-1 block text-2xs font-semibold text-ink-muted">Cantidad</label>
              <div className="flex gap-2">
                <input type="number" step="0.01" min="0" required value={formData.quantity} onChange={e => setFormData({ ...formData, quantity: e.target.value })} className="input-field h-9" placeholder="0" />
                <select value={formData.unit} onChange={e => setFormData({ ...formData, unit: e.target.value })} className="input-field h-9 w-32 shrink-0">
                  {UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-2xs font-semibold text-ink-muted">Stock mínimo</label>
              <input type="number" step="0.01" min="0" value={formData.minStock} onChange={e => setFormData({ ...formData, minStock: e.target.value })} className="input-field h-9" placeholder="0" />
            </div>
            <div>
              <label className="mb-1 block text-2xs font-semibold text-ink-muted">Vencimiento</label>
              <input type="date" value={formData.expirationDate} onChange={e => setFormData({ ...formData, expirationDate: e.target.value })} className="input-field h-9" />
            </div>
            <div>
              <label className="mb-1 block text-2xs font-semibold text-ink-muted">Costo unitario</label>
              <input type="number" step="0.01" min="0" value={formData.unitCost} onChange={e => setFormData({ ...formData, unitCost: e.target.value })} className="input-field h-9" placeholder="0.00" />
            </div>
            <div>
              <label className="mb-1 block text-2xs font-semibold text-ink-muted">Producto asociado</label>
              <select value={formData.productId} onChange={e => setFormData({ ...formData, productId: e.target.value })} className="input-field h-9">
                <option value="">Ninguno</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="flex items-end justify-end gap-2 sm:col-span-2 lg:col-span-1">
              <button type="button" onClick={resetForm} className="btn-secondary h-9 px-3 text-[13px]">Cancelar</button>
              <button type="submit" className="btn-primary h-9 px-3.5 text-[13px]">
                <Check className="h-4 w-4" aria-hidden="true" />
                Guardar
              </button>
            </div>
          </form>
        </Panel>
      )}

      <Panel>
        <PanelHeader
          title="Insumos"
          subtitle={`${filtered.length} de ${items.length} insumos`}
          actions={
            <div className="flex w-full items-center gap-2 sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-soft" />
                <input
                  type="text"
                  placeholder="Buscar insumo o SKU..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="input-field h-8 pl-8 text-[13px]"
                />
              </div>
              <button
                onClick={() => setLowFilter(!lowFilter)}
                className={
                  lowFilter
                    ? 'inline-flex h-8 items-center gap-1.5 rounded-lg border border-danger/30 bg-danger-soft px-2.5 text-2xs font-semibold text-danger'
                    : 'inline-flex h-8 items-center gap-1.5 rounded-lg border border-line px-2.5 text-2xs font-medium text-ink-muted transition-colors hover:bg-surface hover:text-ink'
                }
                aria-pressed={lowFilter}
              >
                <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                Stock bajo
              </button>
            </div>
          }
        />

        {filtered.length === 0 ? (
          <EmptyState
            icon={Package}
            title={lowFilter ? 'No hay insumos con stock bajo' : 'No hay insumos registrados'}
            description={lowFilter ? 'Desactiva el filtro para ver todo el inventario.' : 'Registra la primera materia prima para controlar el stock.'}
            action={
              !isFormOpen && !lowFilter ? (
                <button onClick={() => setIsFormOpen(true)} className="btn-primary h-9 px-3.5 text-[13px]">
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Nuevo insumo
                </button>
              ) : null
            }
          />
        ) : (
          <>
            <div className="divide-y divide-line-soft md:hidden">
              {filtered.map(item => (
                <div key={item.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate text-[13px] font-semibold text-ink">{item.name}</p>
                        {isLowStock(item) && <Badge tone="danger">Stock bajo</Badge>}
                      </div>
                      <p className="mt-0.5 truncate text-2xs text-ink-muted">
                        {[item.sku, item.provider].filter(Boolean).join(' · ') || 'Sin SKU ni proveedor'}
                      </p>
                    </div>
                    <p className={`num shrink-0 text-right text-lg font-semibold ${isLowStock(item) ? 'text-danger' : 'text-ink'}`}>
                      {item.quantity}
                      <span className="ml-1 text-2xs font-normal text-ink-muted">{item.unit}</span>
                    </p>
                  </div>
                  <div className="mt-1.5 flex items-center justify-between gap-2">
                    <p className="text-2xs text-ink-muted">
                      Mín. {item.minStock} {item.unit}
                      {item.unitCost ? ` · ${formatCurrency(Number(item.unitCost))}` : ''}
                      {item.expirationDate ? ` · vence ${shortDate(item.expirationDate)}` : ''}
                    </p>
                  </div>
                  <div className="mt-1 -mr-2">{rowActions(item)}</div>
                </div>
              ))}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Insumo</th>
                    <th>Proveedor</th>
                    <th className="text-right">Stock</th>
                    <th className="text-right">Mínimo</th>
                    <th className="text-right">Costo</th>
                    <th>Vence</th>
                    <th className="w-32 text-right">
                      <span className="sr-only">Acciones</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(item => (
                    <tr key={item.id}>
                      <td>
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-ink">{item.name}</span>
                          {isLowStock(item) && <Badge tone="danger">Bajo</Badge>}
                        </div>
                        {item.sku && <p className="font-mono text-2xs text-ink-soft">{item.sku}</p>}
                      </td>
                      <td className="text-ink-muted">{item.provider || '—'}</td>
                      <td className={`cell-num font-semibold ${isLowStock(item) ? 'text-danger' : 'text-ink'}`}>
                        {item.quantity} <span className="text-2xs font-normal text-ink-muted">{item.unit}</span>
                      </td>
                      <td className="cell-num text-ink-muted">
                        {item.minStock} <span className="text-2xs">{item.unit}</span>
                      </td>
                      <td className="cell-num text-ink-muted">
                        {item.unitCost ? formatCurrency(Number(item.unitCost)) : '—'}
                      </td>
                      <td className="whitespace-nowrap text-ink-muted">
                        {item.expirationDate ? shortDate(item.expirationDate) : '—'}
                      </td>
                      <td>{rowActions(item)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Panel>

      <Modal isOpen={!!adjustTarget} onClose={() => setAdjustTarget(null)} label="Ajustar stock">
        <div className="p-5">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-ink">Ajustar stock</h3>
              <p className="mt-0.5 text-2xs text-ink-muted">{adjustTarget?.name}</p>
            </div>
            <button onClick={() => setAdjustTarget(null)} className="grid h-8 w-8 place-items-center rounded-lg text-ink-muted hover:bg-surface hover:text-ink" aria-label="Cerrar">
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="mb-3 text-xs text-ink-muted">
            Stock actual:{' '}
            <span className="num font-semibold text-ink">
              {adjustTarget?.quantity} {adjustTarget?.unit}
            </span>
          </p>
          <div className="flex gap-2">
            <input
              type="number"
              step="0.01"
              value={adjustQty}
              onChange={e => setAdjustQty(e.target.value)}
              className="input-field h-9"
              placeholder="+ agrega, - quita"
              autoFocus
            />
            <button onClick={handleAdjust} className="btn-primary h-9 shrink-0 px-3 text-[13px]">
              <Check className="h-4 w-4" aria-hidden="true" />
              Aplicar
            </button>
          </div>
          <div className="mt-2 flex gap-2">
            <button
              onClick={() => setAdjustQty(String(Math.abs(parseFloat(adjustQty) || 0) * -1))}
              className="inline-flex h-8 flex-1 items-center justify-center rounded-lg border border-line text-2xs font-medium text-danger transition-colors hover:bg-danger-soft"
            >
              Restar
            </button>
            <button
              onClick={() => setAdjustQty(String(Math.abs(parseFloat(adjustQty) || 0)))}
              className="inline-flex h-8 flex-1 items-center justify-center rounded-lg border border-line text-2xs font-medium text-ok transition-colors hover:bg-ok-soft"
            >
              Sumar
            </button>
          </div>
          <div className="mt-3">
            <label className="mb-1 block text-2xs font-semibold text-ink-muted">Motivo</label>
            <select value={adjustReason} onChange={e => setAdjustReason(e.target.value)} className="input-field h-9">
              {Object.entries(REASON_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={!!movementsTarget}
        onClose={() => setMovementsTarget(null)}
        label={movementsTarget ? `${movementsTarget.name} — movimientos` : 'Movimientos'}
        maxWidth="max-w-2xl"
      >
        <div className="flex flex-col">
          <div className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
            <div>
              <h3 className="text-base font-semibold text-ink">Movimientos</h3>
              <p className="mt-0.5 text-2xs text-ink-muted">{movementsTarget?.name}</p>
            </div>
            <button onClick={() => setMovementsTarget(null)} className="grid h-8 w-8 place-items-center rounded-lg text-ink-muted hover:bg-surface hover:text-ink" aria-label="Cerrar">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="max-h-[65vh] flex-1 overflow-auto p-4">
            {loadingMovements ? (
              <div className="flex justify-center py-10">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : movements.length === 0 ? (
              <EmptyState icon={History} title="Sin movimientos" description="Los ajustes y ventas de este insumo aparecerán aquí." />
            ) : (
              <>
                <div className="space-y-2 md:hidden">
                  {movements.map(m => (
                    <div key={m.id} className="rounded-lg border border-line px-3 py-2">
                      <div className="flex items-center justify-between">
                        <span className="num text-2xs text-ink-muted">{movementDate(m.createdAt)}</span>
                        <span className={`num text-[13px] font-semibold ${m.quantity > 0 ? 'text-ok' : 'text-danger'}`}>
                          {m.quantity > 0 ? '+' : ''}{m.quantity}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center justify-between text-2xs text-ink-muted">
                        <span>{REASON_LABELS[m.reason] || m.reason}</span>
                        <span className="num">
                          {m.previous} → <span className="font-semibold text-ink">{m.newQuantity}</span>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <table className="admin-table hidden md:table">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th className="text-right">Cantidad</th>
                      <th className="text-right">Anterior</th>
                      <th className="text-right">Nuevo</th>
                      <th>Motivo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movements.map(m => (
                      <tr key={m.id}>
                        <td className="num whitespace-nowrap text-ink-muted">{movementDate(m.createdAt)}</td>
                        <td className={`cell-num font-semibold ${m.quantity > 0 ? 'text-ok' : 'text-danger'}`}>
                          {m.quantity > 0 ? '+' : ''}{m.quantity}
                        </td>
                        <td className="cell-num text-ink-muted">{m.previous}</td>
                        <td className="cell-num font-semibold text-ink">{m.newQuantity}</td>
                        <td>
                          <span className="rounded-md bg-surface px-1.5 py-0.5 text-2xs font-medium text-ink-muted">
                            {REASON_LABELS[m.reason] || m.reason}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
