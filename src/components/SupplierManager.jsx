import React, { useState, useEffect, useCallback } from 'react';
import { apiGet, apiPost, apiPut } from '../lib/api.js';
import {
  Plus,
  X,
  Pencil,
  Building2,
  Phone,
  Mail,
  MapPin,
  Package,
  Truck,
  Check,
  Ban,
  ClipboardList,
  Trash2,
} from 'lucide-react';
import { useToast } from './ui/feedback-context';
import { Modal } from './Modal';
import { PageHeader } from './ui/PageHeader';
import { Panel, PanelHeader } from './ui/Panel';
import { SubNav } from './ui/SubNav';
import { Badge } from './ui/Badge';
import { EmptyState } from './ui/EmptyState';
import { formatCurrency } from '../lib/utils';

const TABS = [
  { id: 'suppliers', label: 'Proveedores', icon: Building2 },
  { id: 'orders', label: 'Órdenes de compra', shortLabel: 'Órdenes', icon: ClipboardList },
];

const PO_STATUS = {
  PENDING: { label: 'Pendiente', tone: 'warn' },
  APPROVED: { label: 'Aprobada', tone: 'info' },
  RECEIVED: { label: 'Recibida', tone: 'ok' },
  CANCELLED: { label: 'Cancelada', tone: 'danger' },
};

const EMPTY_SUPPLIER = { name: '', phone: '', email: '', address: '', notes: '' };

export function SupplierManager() {
  const toast = useToast();
  const [tab, setTab] = useState('suppliers');
  const [suppliers, setSuppliers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(EMPTY_SUPPLIER);

  // PO form
  const [isPOFormOpen, setIsPOFormOpen] = useState(false);
  const [poForm, setPoForm] = useState({ supplierId: '', notes: '', items: [] });
  const [inventoryItems, setInventoryItems] = useState([]);

  const loadSuppliers = useCallback(async () => {
    try { const d = await apiGet('/suppliers'); setSuppliers(Array.isArray(d) ? d : []); } catch { /* sin datos */ }
  }, []);
  const loadOrders = useCallback(async () => {
    try { const d = await apiGet('/purchase-orders'); setOrders(Array.isArray(d) ? d : []); } catch { /* sin datos */ }
  }, []);
  const loadInventory = useCallback(async () => {
    try { const d = await apiGet('/inventory'); setInventoryItems(Array.isArray(d) ? d : []); } catch { /* sin datos */ }
  }, []);

  // Carga inicial asincrona: el setState ocurre tras el await, no en el render.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadSuppliers(); if (tab === 'orders') { loadOrders(); loadInventory(); } }, [tab, loadSuppliers, loadOrders, loadInventory]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return toast.error('Nombre requerido');
    try {
      if (editingId) {
        const updated = await apiPut(`/suppliers/${editingId}`, formData);
        setSuppliers(prev => prev.map(s => s.id === editingId ? { ...s, ...updated } : s));
      } else {
        const created = await apiPost('/suppliers', formData);
        setSuppliers(prev => [...prev, created]);
      }
      setFormData(EMPTY_SUPPLIER);
      setEditingId(null); setIsFormOpen(false);
      toast.success(editingId ? 'Proveedor actualizado' : 'Proveedor creado');
    } catch (err) { toast.error('Error: ' + (err.message || '')); }
  };

  const startCreate = () => {
    setEditingId(null);
    setFormData(EMPTY_SUPPLIER);
    setIsFormOpen(true);
  };

  const startEdit = (s) => {
    setFormData({ name: s.name, phone: s.phone || '', email: s.email || '', address: s.address || '', notes: s.notes || '' });
    setEditingId(s.id);
    setIsFormOpen(true);
  };

  const addPOItem = () => {
    setPoForm(prev => ({ ...prev, items: [...prev.items, { inventoryItemId: '', name: '', quantity: 1, unitCost: 0 }] }));
  };
  const updatePOItem = (idx, field, value) => {
    setPoForm(prev => {
      const items = [...prev.items];
      items[idx] = { ...items[idx], [field]: value };
      if (field === 'inventoryItemId' && value) {
        const inv = inventoryItems.find(i => i.id === value);
        if (inv) items[idx] = { ...items[idx], name: inv.name, unitCost: inv.unitCost || 0 };
      }
      return { ...prev, items };
    });
  };
  const removePOItem = (idx) => {
    setPoForm(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== idx) }));
  };

  const handleCreatePO = async (e) => {
    e.preventDefault();
    if (poForm.items.length === 0) return toast.error('Agregue al menos un item');
    try {
      await apiPost('/purchase-orders', poForm);
      setPoForm({ supplierId: '', notes: '', items: [] });
      setIsPOFormOpen(false);
      loadOrders();
      toast.success('Orden de compra creada');
    } catch (err) { toast.error('Error: ' + (err.message || '')); }
  };

  const handlePOStatus = async (id, status) => {
    try {
      await apiPut(`/purchase-orders/${id}/status`, { status });
      loadOrders();
      toast.success('Estado actualizado');
    } catch (err) { toast.error('Error: ' + (err.message || '')); }
  };

  const pendingOrders = orders.filter(o => o.status === 'PENDING' || o.status === 'APPROVED').length;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Proveedores"
        subtitle="Contactos y órdenes de compra de materias primas."
        actions={
          tab === 'suppliers' ? (
            !isFormOpen ? (
              <button onClick={startCreate} className="btn-primary h-9 px-3.5 text-[13px]">
                <Plus className="h-4 w-4" aria-hidden="true" />
                Nuevo proveedor
              </button>
            ) : null
          ) : (
            <button onClick={() => { setIsPOFormOpen(true); loadInventory(); }} className="btn-primary h-9 px-3.5 text-[13px]">
              <Plus className="h-4 w-4" aria-hidden="true" />
              Nueva orden
            </button>
          )
        }
      />

      <SubNav items={TABS} value={tab} onChange={setTab} />

      {tab === 'suppliers' && (
        <>
          {isFormOpen && (
            <Panel>
              <PanelHeader
                title={editingId ? 'Editar proveedor' : 'Nuevo proveedor'}
                subtitle="Nombre obligatorio; el resto es opcional."
                actions={
                  <button onClick={() => setIsFormOpen(false)} className="grid h-8 w-8 place-items-center rounded-lg text-ink-muted hover:bg-surface hover:text-ink" aria-label="Cerrar formulario">
                    <X className="h-4 w-4" />
                  </button>
                }
              />
              <form onSubmit={handleSubmit} className="grid gap-3 p-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-2xs font-semibold text-ink-muted">Nombre *</label>
                  <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="input-field h-9" placeholder="Ej. Distribuidora El Campo" required />
                </div>
                <div>
                  <label className="mb-1 block text-2xs font-semibold text-ink-muted">Teléfono</label>
                  <input type="text" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="input-field h-9" />
                </div>
                <div>
                  <label className="mb-1 block text-2xs font-semibold text-ink-muted">Email</label>
                  <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="input-field h-9" />
                </div>
                <div>
                  <label className="mb-1 block text-2xs font-semibold text-ink-muted">Dirección</label>
                  <input type="text" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} className="input-field h-9" />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-2xs font-semibold text-ink-muted">Notas</label>
                  <textarea value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} className="input-field" rows="2" placeholder="Días de entrega, condiciones..." />
                </div>
                <div className="flex items-end justify-end gap-2 sm:col-span-2">
                  <button type="button" onClick={() => setIsFormOpen(false)} className="btn-secondary h-9 px-3 text-[13px]">Cancelar</button>
                  <button type="submit" className="btn-primary h-9 px-3.5 text-[13px]">
                    <Check className="h-4 w-4" aria-hidden="true" />
                    {editingId ? 'Guardar cambios' : 'Crear proveedor'}
                  </button>
                </div>
              </form>
            </Panel>
          )}

          <Panel>
            <PanelHeader title="Proveedores" subtitle={`${suppliers.length} registrados`} />

            {suppliers.length === 0 ? (
              <EmptyState
                icon={Building2}
                title="No hay proveedores registrados"
                description="Agrega a quién le compras para asociar órdenes e insumos."
                action={!isFormOpen ? (
                  <button onClick={startCreate} className="btn-primary h-9 px-3.5 text-[13px]">
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    Nuevo proveedor
                  </button>
                ) : null}
              />
            ) : (
              <>
                <div className="divide-y divide-line-soft md:hidden">
                  {suppliers.map(s => (
                    <div key={s.id} className="flex items-start justify-between gap-3 px-4 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold text-ink">{s.name}</p>
                        <div className="mt-1 space-y-0.5 text-2xs text-ink-muted">
                          {s.phone && <p className="flex items-center gap-1"><Phone className="h-3 w-3 shrink-0" aria-hidden="true" />{s.phone}</p>}
                          {s.email && <p className="flex items-center gap-1 truncate"><Mail className="h-3 w-3 shrink-0" aria-hidden="true" />{s.email}</p>}
                          {s.address && <p className="flex items-center gap-1 truncate"><MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />{s.address}</p>}
                        </div>
                      </div>
                      <button onClick={() => startEdit(s)} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-ink-muted hover:bg-surface hover:text-ink" title="Editar" aria-label={`Editar ${s.name}`}>
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="hidden overflow-x-auto md:block">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Proveedor</th>
                        <th>Contacto</th>
                        <th>Dirección</th>
                        <th className="w-16 text-right"><span className="sr-only">Acciones</span></th>
                      </tr>
                    </thead>
                    <tbody>
                      {suppliers.map(s => (
                        <tr key={s.id}>
                          <td>
                            <p className="font-medium text-ink">{s.name}</p>
                            {s.notes && <p className="mt-0.5 max-w-xs truncate text-2xs text-ink-muted">{s.notes}</p>}
                          </td>
                          <td className="text-ink-muted">
                            {s.phone || s.email ? (
                              <div className="space-y-0.5">
                                {s.phone && <p className="num">{s.phone}</p>}
                                {s.email && <p className="text-2xs">{s.email}</p>}
                              </div>
                            ) : '—'}
                          </td>
                          <td className="max-w-[220px] truncate text-ink-muted">{s.address || '—'}</td>
                          <td>
                            <div className="-mr-2 flex justify-end">
                              <button onClick={() => startEdit(s)} className="grid h-8 w-8 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-surface hover:text-ink" title="Editar" aria-label={`Editar ${s.name}`}>
                                <Pencil className="h-3.5 w-3.5" />
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

      {tab === 'orders' && (
        <>
          <Modal isOpen={isPOFormOpen} onClose={() => setIsPOFormOpen(false)} label="Nueva Orden de Compra" maxWidth="max-w-xl">
            <div className="p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-ink">Nueva orden de compra</h2>
                  <p className="text-2xs text-ink-muted">Los items entran al stock al marcarla como recibida.</p>
                </div>
                <button onClick={() => setIsPOFormOpen(false)} className="grid h-9 w-9 place-items-center rounded-lg text-ink-muted hover:bg-surface hover:text-ink" aria-label="Cerrar"><X className="h-4 w-4" /></button>
              </div>
              <form onSubmit={handleCreatePO} className="space-y-3">
                <div>
                  <label className="mb-1 block text-2xs font-semibold text-ink-muted">Proveedor</label>
                  <select value={poForm.supplierId} onChange={e => setPoForm({ ...poForm, supplierId: e.target.value })} className="input-field h-9">
                    <option value="">Sin proveedor</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>

                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-2xs font-semibold text-ink-muted">Items</span>
                    <button type="button" onClick={addPOItem} className="text-2xs font-semibold text-ink-brand hover:underline">+ Agregar item</button>
                  </div>
                  {poForm.items.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-line px-3 py-4 text-center text-2xs text-ink-muted">
                      Agrega al menos un insumo a la orden.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      <div className="hidden grid-cols-[1fr_64px_96px_28px] gap-2 px-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-muted sm:grid">
                        <span>Insumo</span>
                        <span className="text-center">Cant.</span>
                        <span className="text-center">Costo</span>
                        <span />
                      </div>
                      {poForm.items.map((item, idx) => (
                        <div key={idx} className="grid grid-cols-[1fr_28px] gap-2 sm:grid-cols-[1fr_64px_96px_28px]">
                          <select value={item.inventoryItemId} onChange={e => updatePOItem(idx, 'inventoryItemId', e.target.value)} className="input-field h-9 min-w-0 text-[13px]">
                            <option value="">Seleccionar insumo...</option>
                            {inventoryItems.map(inv => <option key={inv.id} value={inv.id}>{inv.name} ({inv.unit})</option>)}
                          </select>
                          <input type="number" min="1" value={item.quantity} onChange={e => updatePOItem(idx, 'quantity', parseInt(e.target.value) || 1)} className="input-field num order-3 h-9 text-center text-[13px] sm:order-none" aria-label="Cantidad" />
                          <input type="number" min="0" step="100" value={item.unitCost} onChange={e => updatePOItem(idx, 'unitCost', parseFloat(e.target.value) || 0)} className="input-field num order-4 h-9 text-center text-[13px] sm:order-none" placeholder="Costo" aria-label="Costo unitario" />
                          <button type="button" onClick={() => removePOItem(idx)} className="order-2 grid h-9 w-7 place-items-center rounded-lg text-ink-soft transition-colors hover:bg-danger-soft hover:text-danger sm:order-none" aria-label="Quitar item">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="mb-1 block text-2xs font-semibold text-ink-muted">Notas</label>
                  <textarea value={poForm.notes} onChange={e => setPoForm({ ...poForm, notes: e.target.value })} className="input-field" rows="2" />
                </div>

                {poForm.items.length > 0 && (
                  <div className="flex items-center justify-between rounded-xl bg-surface px-3 py-2">
                    <span className="text-2xs font-semibold uppercase tracking-wide text-ink-muted">Total estimado</span>
                    <span className="num text-sm font-semibold text-ink">
                      {formatCurrency(poForm.items.reduce((sum, i) => sum + (i.quantity || 0) * (i.unitCost || 0), 0))}
                    </span>
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <button type="submit" className="btn-primary h-9 flex-1 px-3.5 text-[13px]">Crear orden</button>
                  <button type="button" onClick={() => setIsPOFormOpen(false)} className="btn-secondary h-9 px-3 text-[13px]">Cancelar</button>
                </div>
              </form>
            </div>
          </Modal>

          <Panel>
            <PanelHeader
              title="Órdenes de compra"
              subtitle={`${orders.length} en total · ${pendingOrders} por recibir`}
            />

            {orders.length === 0 ? (
              <EmptyState
                icon={ClipboardList}
                title="No hay órdenes de compra"
                description="Crea una orden para reponer insumos y controlar costos."
                action={
                  <button onClick={() => { setIsPOFormOpen(true); loadInventory(); }} className="btn-primary h-9 px-3.5 text-[13px]">
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    Nueva orden
                  </button>
                }
              />
            ) : (
              <div className="divide-y divide-line-soft">
                {orders.map(o => {
                  const total = o.items.reduce((sum, i) => sum + (i.quantity || 0) * (i.unitCost || 0), 0);
                  const status = PO_STATUS[o.status] || { label: o.status, tone: 'neutral' };
                  return (
                    <div key={o.id} className="px-4 py-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Truck className="h-3.5 w-3.5 shrink-0 text-ink-soft" aria-hidden="true" />
                            <span className="truncate text-[13px] font-semibold text-ink">{o.supplier?.name || 'Sin proveedor'}</span>
                            <Badge tone={status.tone}>{status.label}</Badge>
                          </div>
                          <p className="mt-0.5 text-2xs text-ink-muted">
                            {new Date(o.createdAt).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                            {' · '}{o.items.length} {o.items.length === 1 ? 'ítem' : 'ítems'}
                            {o.receivedAt ? ` · recibida ${new Date(o.receivedAt).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit' })}` : ''}
                          </p>
                        </div>

                        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                          <p className="num mr-1 text-[13px] font-semibold text-ink">{formatCurrency(total)}</p>
                          {o.status === 'PENDING' && (
                            <button onClick={() => handlePOStatus(o.id, 'APPROVED')} className="inline-flex h-8 items-center gap-1 rounded-lg bg-info-soft px-2.5 text-2xs font-semibold text-info transition-opacity hover:opacity-80">
                              <Check className="h-3 w-3" aria-hidden="true" />Aprobar
                            </button>
                          )}
                          {o.status === 'APPROVED' && (
                            <button onClick={() => handlePOStatus(o.id, 'RECEIVED')} className="inline-flex h-8 items-center gap-1 rounded-lg bg-ok-soft px-2.5 text-2xs font-semibold text-ok transition-opacity hover:opacity-80">
                              <Package className="h-3 w-3" aria-hidden="true" />Recibir
                            </button>
                          )}
                          {(o.status === 'PENDING' || o.status === 'APPROVED') && (
                            <button onClick={() => handlePOStatus(o.id, 'CANCELLED')} className="inline-flex h-8 items-center gap-1 rounded-lg bg-danger-soft px-2.5 text-2xs font-semibold text-danger transition-opacity hover:opacity-80">
                              <Ban className="h-3 w-3" aria-hidden="true" />Cancelar
                            </button>
                          )}
                        </div>
                      </div>

                      <details className="mt-1 text-2xs">
                        <summary className="w-fit cursor-pointer list-none font-medium text-ink-brand hover:underline">Ver items</summary>
                        <div className="mt-2 space-y-1 rounded-lg bg-surface px-3 py-2">
                          {o.items.map((item, i) => (
                            <div key={i} className="flex justify-between gap-3">
                              <span className="truncate text-ink-muted">{item.name || 'Insumo'}</span>
                              <span className="num shrink-0 text-ink">{item.quantity} × {formatCurrency(item.unitCost || 0)} <span className="text-ink-muted">= {formatCurrency((item.quantity || 0) * (item.unitCost || 0))}</span></span>
                            </div>
                          ))}
                        </div>
                      </details>
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>
        </>
      )}
    </div>
  );
}
