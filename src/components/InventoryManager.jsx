import React, { useState, useEffect, useCallback } from 'react';
import { apiGet, apiPost, apiPut, apiDelete } from '../lib/api.js';
import { Plus, Edit2, Trash2, X, Check, Package, AlertTriangle, Search, Filter, ArrowUp, ArrowDown, History } from 'lucide-react';

const UNITS = [
  { value: 'pcs', label: 'Unidades' },
  { value: 'lt', label: 'Litros' },
  { value: 'ml', label: 'Mililitros' },
  { value: 'kg', label: 'Kilogramos' },
  { value: 'g', label: 'Gramos' },
  { value: 'lb', label: 'Libras' },
  { value: 'oz', label: 'Onzas' },
];

export function InventoryManager() {
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
    try { const data = await apiGet('/inventory'); if (Array.isArray(data)) setItems(data); } catch {}
  }, []);

  const loadProducts = useCallback(async () => {
    try { const data = await apiGet('/products'); if (Array.isArray(data)) setProducts(data); } catch {}
  }, []);

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
    } catch (err) { alert('Error al guardar: ' + (err.message || 'desconocido')); }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Seguro de eliminar este insumo?')) return;
    try { await apiDelete('/inventory', id); setItems(prev => prev.filter(i => i.id !== id)); } catch {}
  };

  const handleAdjust = async () => {
    if (!adjustTarget || !adjustQty) return;
    const qty = parseFloat(adjustQty);
    if (isNaN(qty) || qty === 0) return;
    try {
      await apiPost('/inventory-movements', { itemId: adjustTarget.id, quantity: qty, reason: adjustReason });
      await loadInventory();
      setAdjustTarget(null); setAdjustQty(''); setAdjustReason('ajuste');
    } catch (err) { alert('Error al ajustar stock: ' + (err.message || '')); }
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

  const REASON_LABELS = { ajuste: 'Ajuste', compra: 'Compra', venta: 'Venta', merma: 'Merma', devolucion: 'Devolución' };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Inventario de Insumos</h2>
          <p className="text-gray-500 text-sm">Control de bebidas, materias primas y stock</p>
        </div>
        {!isFormOpen && (
          <button onClick={() => setIsFormOpen(true)} className="btn-primary flex items-center gap-2">
            <Plus className="w-5 h-5" /> Nuevo Insumo
          </button>
        )}
      </div>

      {isFormOpen && (
        <div className="card p-8 bg-white border border-primary/10 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-secondary"></div>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-primary flex items-center gap-2"><Package className="w-5 h-5" />{editingId ? 'Editar Insumo' : 'Nuevo Insumo'}</h3>
            <button onClick={resetForm} className="text-gray-400 hover:text-red-500"><X className="w-6 h-6" /></button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div><label className="block text-sm font-bold text-gray-700 mb-2">Nombre *</label><input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="input-field" placeholder="Ej. Coca-Cola 2L" /></div>
            <div><label className="block text-sm font-bold text-gray-700 mb-2">SKU / Código</label><input value={formData.sku} onChange={e => setFormData({ ...formData, sku: e.target.value })} className="input-field" placeholder="Ej. CC-2L-001" /></div>
            <div><label className="block text-sm font-bold text-gray-700 mb-2">Proveedor</label><input value={formData.provider} onChange={e => setFormData({ ...formData, provider: e.target.value })} className="input-field" placeholder="Ej. Distribuidora XYZ" /></div>
            <div className="flex gap-3">
              <div className="flex-1"><label className="block text-sm font-bold text-gray-700 mb-2">Cantidad</label><input type="number" step="0.01" min="0" required value={formData.quantity} onChange={e => setFormData({ ...formData, quantity: e.target.value })} className="input-field" placeholder="0" /></div>
              <div className="w-28"><label className="block text-sm font-bold text-gray-700 mb-2">Unidad</label><select value={formData.unit} onChange={e => setFormData({ ...formData, unit: e.target.value })} className="input-field">{UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}</select></div>
            </div>
            <div><label className="block text-sm font-bold text-gray-700 mb-2">Stock Mínimo</label><input type="number" step="0.01" min="0" value={formData.minStock} onChange={e => setFormData({ ...formData, minStock: e.target.value })} className="input-field" placeholder="0" /></div>
            <div><label className="block text-sm font-bold text-gray-700 mb-2">Vencimiento</label><input type="date" value={formData.expirationDate} onChange={e => setFormData({ ...formData, expirationDate: e.target.value })} className="input-field" /></div>
            <div><label className="block text-sm font-bold text-gray-700 mb-2">Costo Unitario</label><input type="number" step="0.01" min="0" value={formData.unitCost} onChange={e => setFormData({ ...formData, unitCost: e.target.value })} className="input-field" placeholder="0.00" /></div>
            <div><label className="block text-sm font-bold text-gray-700 mb-2">Producto asociado</label><select value={formData.productId} onChange={e => setFormData({ ...formData, productId: e.target.value })} className="input-field"><option value="">Ninguno</option>{products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
            <div className="col-span-3 flex justify-end gap-3 mt-4 pt-4 border-t border-gray-100">
              <button type="button" onClick={resetForm} className="btn-secondary">Cancelar</button>
              <button type="submit" className="btn-primary flex items-center gap-2"><Check className="w-5 h-5" /> Guardar</button>
            </div>
          </form>
        </div>
      )}

      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Buscar insumo..." value={search} onChange={e => setSearch(e.target.value)} className="input-field pl-10" />
        </div>
        <button onClick={() => setLowFilter(!lowFilter)} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all border ${lowFilter ? 'bg-red-50 border-red-300 text-red-700' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'}`}>
          <Filter className="w-4 h-4" /> Stock bajo
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filtered.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-20 text-gray-400 bg-white rounded-3xl border border-dashed border-gray-200">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4"><Package className="w-8 h-8 opacity-20" /></div>
            <p className="font-medium">{lowFilter ? 'No hay insumos con stock bajo' : 'No hay insumos registrados'}</p>
            {!isFormOpen && <button onClick={() => setIsFormOpen(true)} className="mt-4 text-primary font-bold hover:underline">Agregar el primer insumo</button>}
          </div>
        ) : (
          filtered.map(item => (
            <div key={item.id} className={`card p-5 flex flex-col justify-between group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 relative overflow-hidden bg-white ${isLowStock(item) ? 'border-l-4 border-l-red-500' : ''}`}>
              <div className="absolute top-0 right-0 p-3 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity z-10 flex gap-1">
                <button onClick={() => { setAdjustTarget(item); setAdjustQty(''); setAdjustReason('ajuste'); }} className="p-2 bg-white text-green-600 hover:bg-green-50 rounded-lg shadow-sm" title="Ajustar stock"><ArrowUp className="w-4 h-4" /></button>
                <button onClick={() => openMovements(item)} className="p-2 bg-white text-purple-600 hover:bg-purple-50 rounded-lg shadow-sm" title="Historial de movimientos"><History className="w-4 h-4" /></button>
                <button onClick={() => handleEdit(item)} className="p-2 bg-white text-blue-600 hover:bg-blue-50 rounded-lg shadow-sm" title="Editar"><Edit2 className="w-4 h-4" /></button>
                <button onClick={() => handleDelete(item.id)} className="p-2 bg-white text-red-600 hover:bg-red-50 rounded-lg shadow-sm" title="Eliminar"><Trash2 className="w-4 h-4" /></button>
              </div>
              <div>
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-full bg-surface flex items-center justify-center text-primary"><Package className="w-5 h-5" /></div>
                  {isLowStock(item) && <span className="flex items-center gap-1 px-2 py-1 text-xs font-bold bg-red-100 text-red-700 rounded-full"><AlertTriangle className="w-3 h-3" /> Stock bajo</span>}
                </div>
                <h3 className="font-bold text-lg text-gray-800 leading-tight mb-1">{item.name}</h3>
                {item.sku && <p className="text-xs font-mono text-gray-400 mb-2">SKU: {item.sku}</p>}
                {item.provider && <p className="text-xs text-gray-400 mb-1">{item.provider}</p>}
              </div>
              <div className="mt-4 pt-4 border-t border-gray-50 space-y-2">
                <div className="flex justify-between items-baseline">
                  <span className="text-sm text-gray-500">Stock</span>
                  <span className={`text-xl font-bold ${isLowStock(item) ? 'text-red-600' : 'text-primary'}`}>{item.quantity} <span className="text-sm font-normal text-gray-400">{item.unit}</span></span>
                </div>
                {item.minStock > 0 && <div className="flex justify-between text-xs text-gray-400"><span>Stock mín.</span><span>{item.minStock} {item.unit}</span></div>}
                {item.unitCost && <div className="flex justify-between text-xs text-gray-400"><span>Costo unit.</span><span>${Number(item.unitCost).toLocaleString()}</span></div>}
                {item.expirationDate && <div className="flex justify-between text-xs text-gray-400"><span>Vence</span><span>{new Date(item.expirationDate).toLocaleDateString('es-CO')}</span></div>}
              </div>
            </div>
          ))
        )}
      </div>

      {adjustTarget && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setAdjustTarget(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-800">Ajustar stock</h3>
              <button onClick={() => setAdjustTarget(null)} className="text-gray-400 hover:text-red-500"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-sm text-gray-500 mb-1">{adjustTarget.name}</p>
            <p className="text-sm text-gray-500 mb-4">Stock actual: <span className="font-bold text-primary">{adjustTarget.quantity} {adjustTarget.unit}</span></p>
            <div className="flex gap-3">
              <input type="number" step="0.01" value={adjustQty} onChange={e => setAdjustQty(e.target.value)} className="input-field flex-1" placeholder="+ para agregar, - para quitar" autoFocus />
              <button onClick={handleAdjust} className="btn-primary px-6 flex items-center gap-2"><Check className="w-4 h-4" /> Aplicar</button>
            </div>
            <div className="flex gap-3 mt-3">
              <button onClick={() => setAdjustQty(String((Math.abs(parseFloat(adjustQty) || 0)) * -1))} className="flex-1 text-sm text-red-600 hover:bg-red-50 py-2 rounded-lg border border-red-200">Restar</button>
              <button onClick={() => setAdjustQty(String(Math.abs(parseFloat(adjustQty) || 0)))} className="flex-1 text-sm text-green-600 hover:bg-green-50 py-2 rounded-lg border border-green-200">Sumar</button>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-bold text-gray-700 mb-2">Motivo</label>
              <select value={adjustReason} onChange={e => setAdjustReason(e.target.value)} className="input-field">
                {Object.entries(REASON_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>
        </div>
      )}

      {movementsTarget && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setMovementsTarget(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center p-6 border-b sticky top-0 bg-white rounded-t-2xl">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2"><History className="w-5 h-5 text-purple-600" /> {movementsTarget.name} — movimientos</h3>
              <button onClick={() => setMovementsTarget(null)} className="text-gray-400 hover:text-red-500"><X className="w-5 h-5" /></button>
            </div>
            <div className="overflow-auto flex-1 p-6">
              {loadingMovements ? (
                <div className="flex justify-center py-10"><div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full"></div></div>
              ) : movements.length === 0 ? (
                <p className="text-center text-gray-400 py-10">No hay movimientos registrados</p>
              ) : (
                <table className="w-full text-left">
                  <thead><tr className="text-xs font-bold text-gray-500 uppercase border-b"><th className="pb-3">Fecha</th><th className="pb-3">Cantidad</th><th className="pb-3">Anterior</th><th className="pb-3">Nuevo</th><th className="pb-3">Motivo</th></tr></thead>
                  <tbody className="divide-y">
                    {movements.map(m => (
                      <tr key={m.id} className="text-sm hover:bg-gray-50">
                        <td className="py-3 text-gray-500">{new Date(m.createdAt).toLocaleString('es-CO', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                        <td className={`py-3 font-bold ${m.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>{m.quantity > 0 ? '+' : ''}{m.quantity}</td>
                        <td className="py-3 text-gray-500">{m.previous}</td>
                        <td className="py-3 font-bold">{m.newQuantity}</td>
                        <td className="py-3"><span className="bg-gray-100 px-2 py-0.5 rounded text-xs">{REASON_LABELS[m.reason] || m.reason}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
