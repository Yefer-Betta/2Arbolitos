import React, { useState, useEffect, useCallback } from 'react';
import { apiGet, apiPost, apiPut } from '../lib/api.js';
import { Plus, X, Edit2, Building2, Phone, Mail, MapPin, Package, Truck, Check, Ban, Eye, ClipboardList } from 'lucide-react';

const PO_STATUS = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-blue-100 text-blue-800',
  RECEIVED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

export function SupplierManager() {
  const [tab, setTab] = useState('suppliers');
  const [suppliers, setSuppliers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: '', phone: '', email: '', address: '', notes: '' });

  // PO form
  const [isPOFormOpen, setIsPOFormOpen] = useState(false);
  const [poForm, setPoForm] = useState({ supplierId: '', notes: '', items: [] });
  const [inventoryItems, setInventoryItems] = useState([]);

  const loadSuppliers = useCallback(async () => {
    try { const d = await apiGet('/suppliers'); setSuppliers(Array.isArray(d) ? d : []); } catch {}
  }, []);
  const loadOrders = useCallback(async () => {
    try { const d = await apiGet('/purchase-orders'); setOrders(Array.isArray(d) ? d : []); } catch {}
  }, []);
  const loadInventory = useCallback(async () => {
    try { const d = await apiGet('/inventory'); setInventoryItems(Array.isArray(d) ? d : []); } catch {}
  }, []);

  useEffect(() => { loadSuppliers(); if (tab === 'orders') { loadOrders(); loadInventory(); } }, [tab, loadSuppliers, loadOrders, loadInventory]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return alert('Nombre requerido');
    try {
      if (editingId) {
        const updated = await apiPut(`/suppliers/${editingId}`, formData);
        setSuppliers(prev => prev.map(s => s.id === editingId ? { ...s, ...updated } : s));
      } else {
        const created = await apiPost('/suppliers', formData);
        setSuppliers(prev => [...prev, created]);
      }
      setFormData({ name: '', phone: '', email: '', address: '', notes: '' });
      setEditingId(null); setIsFormOpen(false);
    } catch (err) { alert('Error: ' + (err.message || '')); }
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
    if (poForm.items.length === 0) return alert('Agregue al menos un item');
    try {
      await apiPost('/purchase-orders', poForm);
      setPoForm({ supplierId: '', notes: '', items: [] });
      setIsPOFormOpen(false);
      loadOrders();
    } catch (err) { alert('Error: ' + (err.message || '')); }
  };

  const handlePOStatus = async (id, status) => {
    try {
      await apiPut(`/purchase-orders/${id}/status`, { status });
      loadOrders();
    } catch (err) { alert('Error: ' + (err.message || '')); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-3 bg-secondary/10 rounded-xl text-secondary">
          <Building2 className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Proveedores</h1>
          <p className="text-sm text-gray-500">Gestión de proveedores y órdenes de compra</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button onClick={() => setTab('suppliers')} className={`px-4 py-2 rounded-xl font-bold text-sm transition-colors ${tab === 'suppliers' ? 'bg-secondary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
          <Building2 className="w-4 h-4 inline mr-1" /> Proveedores
        </button>
        <button onClick={() => setTab('orders')} className={`px-4 py-2 rounded-xl font-bold text-sm transition-colors ${tab === 'orders' ? 'bg-secondary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
          <ClipboardList className="w-4 h-4 inline mr-1" /> Órdenes de Compra
        </button>
      </div>

      {tab === 'suppliers' && (
        <>
          <div className="flex justify-end">
            <button onClick={() => { setEditingId(null); setFormData({ name: '', phone: '', email: '', address: '', notes: '' }); setIsFormOpen(true); }} className="btn-primary bg-secondary hover:bg-secondary-dark flex items-center gap-2">
              <Plus className="w-4 h-4" /> Nuevo Proveedor
            </button>
          </div>

          {isFormOpen && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setIsFormOpen(false)}>
              <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
                <h2 className="text-lg font-bold mb-4">{editingId ? 'Editar Proveedor' : 'Nuevo Proveedor'}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                    <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="input-field w-full" required />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                      <input type="text" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="input-field w-full" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="input-field w-full" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                    <input type="text" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} className="input-field w-full" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                    <textarea value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} className="input-field w-full" rows="2" />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button type="submit" className="flex-1 btn-primary bg-secondary hover:bg-secondary-dark">{editingId ? 'Guardar' : 'Crear'}</button>
                    <button type="button" onClick={() => setIsFormOpen(false)} className="btn-secondary">Cancelar</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-2">
            {suppliers.length === 0 ? (
              <div className="text-center py-12 text-gray-400 col-span-2">
                <Building2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium">No hay proveedores registrados</p>
              </div>
            ) : (
              suppliers.map(s => (
                <div key={s.id} className="card p-4 flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-800">{s.name}</p>
                    <div className="flex items-center gap-3 text-xs text-gray-500 mt-1 flex-wrap">
                      {s.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{s.phone}</span>}
                      {s.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{s.email}</span>}
                      {s.address && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{s.address}</span>}
                    </div>
                  </div>
                  <button onClick={() => { setFormData({ name: s.name, phone: s.phone || '', email: s.email || '', address: s.address || '', notes: s.notes || '' }); setEditingId(s.id); setIsFormOpen(true); }} className="p-2 hover:bg-gray-100 rounded-lg">
                    <Edit2 className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {tab === 'orders' && (
        <>
          <div className="flex justify-end">
            <button onClick={() => { setIsPOFormOpen(true); loadInventory(); }} className="btn-primary bg-secondary hover:bg-secondary-dark flex items-center gap-2">
              <Plus className="w-4 h-4" /> Nueva Orden de Compra
            </button>
          </div>

          {isPOFormOpen && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setIsPOFormOpen(false)}>
              <div className="bg-white rounded-2xl p-6 w-full max-w-lg mx-4 shadow-2xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <h2 className="text-lg font-bold mb-4">Nueva Orden de Compra</h2>
                <form onSubmit={handleCreatePO} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor</label>
                    <select value={poForm.supplierId} onChange={e => setPoForm({ ...poForm, supplierId: e.target.value })} className="input-field w-full">
                      <option value="">Sin proveedor</option>
                      {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Items</label>
                    <div className="space-y-2">
                      {poForm.items.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <select value={item.inventoryItemId} onChange={e => updatePOItem(idx, 'inventoryItemId', e.target.value)} className="input-field flex-1 text-sm">
                            <option value="">Seleccionar insumo...</option>
                            {inventoryItems.map(inv => <option key={inv.id} value={inv.id}>{inv.name} ({inv.unit})</option>)}
                          </select>
                          <input type="number" min="1" value={item.quantity} onChange={e => updatePOItem(idx, 'quantity', parseInt(e.target.value) || 1)} className="input-field w-16 text-sm text-center" />
                          <input type="number" min="0" step="100" value={item.unitCost} onChange={e => updatePOItem(idx, 'unitCost', parseFloat(e.target.value) || 0)} className="input-field w-24 text-sm text-center" placeholder="Costo" />
                          <button type="button" onClick={() => removePOItem(idx)} className="p-1.5 hover:bg-red-50 rounded-lg"><X className="w-4 h-4 text-red-400" /></button>
                        </div>
                      ))}
                    </div>
                    <button type="button" onClick={addPOItem} className="mt-2 text-sm text-secondary font-bold hover:underline">+ Agregar item</button>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                    <textarea value={poForm.notes} onChange={e => setPoForm({ ...poForm, notes: e.target.value })} className="input-field w-full" rows="2" />
                  </div>
                  {poForm.items.length > 0 && (
                    <div className="text-right text-sm font-bold text-gray-700">
                      Total: ${poForm.items.reduce((sum, i) => sum + (i.quantity || 0) * (i.unitCost || 0), 0).toLocaleString()}
                    </div>
                  )}
                  <div className="flex gap-2 pt-2">
                    <button type="submit" className="flex-1 btn-primary bg-secondary hover:bg-secondary-dark">Crear Orden</button>
                    <button type="button" onClick={() => setIsPOFormOpen(false)} className="btn-secondary">Cancelar</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {orders.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium">No hay órdenes de compra</p>
              </div>
            ) : (
              orders.map(o => {
                const total = o.items.reduce((sum, i) => sum + (i.quantity || 0) * (i.unitCost || 0), 0);
                return (
                  <div key={o.id} className="card p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Truck className="w-4 h-4 text-gray-500" />
                        <span className="font-bold text-gray-800">{o.supplier?.name || 'Sin proveedor'}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PO_STATUS[o.status] || ''}`}>{o.status}</span>
                      </div>
                      <div className="text-right text-sm">
                        <span className="font-bold">${total.toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 mb-2">
                      {new Date(o.createdAt).toLocaleDateString('es-CO', { dateStyle: 'medium' })} · {o.items.length} item(s)
                      {o.receivedAt && ` · Recibido: ${new Date(o.receivedAt).toLocaleDateString('es-CO', { dateStyle: 'medium' })}`}
                    </div>
                    <details className="text-xs">
                      <summary className="text-secondary font-medium cursor-pointer hover:underline">Ver items</summary>
                      <div className="mt-2 space-y-1 bg-gray-50 rounded-xl p-3">
                        {o.items.map((item, i) => (
                          <div key={i} className="flex justify-between">
                            <span>{item.name || 'Insumo'}</span>
                            <span>{item.quantity} × ${(item.unitCost || 0).toLocaleString()} = ${((item.quantity || 0) * (item.unitCost || 0)).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </details>
                    <div className="flex gap-1 mt-2">
                      {o.status === 'PENDING' && <button onClick={() => handlePOStatus(o.id, 'APPROVED')} className="px-3 py-1 text-xs font-bold bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"><Check className="w-3 h-3 inline mr-1" />Aprobar</button>}
                      {o.status === 'APPROVED' && <button onClick={() => handlePOStatus(o.id, 'RECEIVED')} className="px-3 py-1 text-xs font-bold bg-green-100 text-green-700 rounded-lg hover:bg-green-200"><Package className="w-3 h-3 inline mr-1" />Recibir</button>}
                      {(o.status === 'PENDING' || o.status === 'APPROVED') && <button onClick={() => handlePOStatus(o.id, 'CANCELLED')} className="px-3 py-1 text-xs font-bold bg-red-100 text-red-700 rounded-lg hover:bg-red-200"><Ban className="w-3 h-3 inline mr-1" />Cancelar</button>}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}
