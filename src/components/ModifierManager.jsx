import React, { useState, useEffect, useCallback } from 'react';
import { apiGet, apiPost, apiPut, apiDelete } from '../lib/api.js';
import { Plus, X, Edit2, Trash2, ListChecks, ToggleLeft, ToggleRight, Layers } from 'lucide-react';
import { useConfirm, useToast } from './ui/feedback-context';
import { Modal } from './Modal';

export function ModifierManager() {
  const toast = useToast();
  const confirm = useConfirm();
  const [groups, setGroups] = useState([]);
  const [products, setProducts] = useState([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState(null);
  const [groupForm, setGroupForm] = useState({ name: '', type: 'SINGLE' });
  const [newModifier, setNewModifier] = useState({ groupId: '', name: '', price: '' });
  const [assignTarget, setAssignTarget] = useState(null);

  const loadData = useCallback(async () => {
    try {
      const [g, p] = await Promise.all([apiGet('/modifier-groups'), apiGet('/products?active=true')]);
      setGroups(Array.isArray(g) ? g : []);
      setProducts(Array.isArray(p) ? p : []);
    } catch {}
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    try {
      if (editingGroupId) {
        await apiPut(`/modifier-groups/${editingGroupId}`, groupForm);
      } else {
        await apiPost('/modifier-groups', groupForm);
      }
      setGroupForm({ name: '', type: 'SINGLE' });
      setEditingGroupId(null); setIsFormOpen(false);
      loadData();
      toast.success(editingGroupId ? 'Grupo actualizado' : 'Grupo creado');
    } catch (err) { toast.error('Error: ' + (err.message || '')); }
  };

  const handleEditGroup = (g) => {
    setGroupForm({ name: g.name, type: g.type });
    setEditingGroupId(g.id); setIsFormOpen(true);
  };

  const handleDeleteGroup = async (id) => {
    const ok = await confirm({ title: '¿Eliminar grupo?', message: 'Se eliminarán también todos sus modificadores.', confirmLabel: 'Eliminar', danger: true });
    if (!ok) return;
    try { await apiDelete(`/modifier-groups/${id}`); loadData(); toast.success('Grupo eliminado'); } catch { toast.error('No se pudo eliminar'); }
  };

  const handleAddModifier = async (groupId) => {
    if (!newModifier.name.trim()) return;
    try {
      await apiPost('/modifiers', { groupId, name: newModifier.name, price: parseFloat(newModifier.price) || 0 });
      setNewModifier({ groupId: '', name: '', price: '' });
      loadData();
    } catch (err) { toast.error('Error: ' + (err.message || '')); }
  };

  const handleDeleteModifier = async (id) => {
    try { await apiDelete(`/modifiers/${id}`); loadData(); } catch {}
  };

  const handleAssignProduct = async () => {
    if (!assignTarget) return;
    try {
      await apiPost('/products/modifier-groups', {
        productId: assignTarget.productId,
        groupIds: assignTarget.groupIds,
      });
      setAssignTarget(null);
      loadData();
      toast.success('Grupos asignados');
    } catch (err) { toast.error('Error: ' + (err.message || '')); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-secondary/10 rounded-xl text-secondary">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Modificadores</h1>
            <p className="text-sm text-gray-500">Grupos y opciones para personalizar productos</p>
          </div>
        </div>
        <button onClick={() => { setEditingGroupId(null); setGroupForm({ name: '', type: 'SINGLE' }); setIsFormOpen(true); }} className="btn-primary bg-secondary hover:bg-secondary-dark flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nuevo Grupo
        </button>
      </div>

      {/* Assign product groups */}
      <div className="card p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200">
        <button onClick={() => setAssignTarget(assignTarget ? null : { productId: '', groupIds: [] })} className="flex items-center gap-2 text-blue-700 font-bold text-sm">
          <ListChecks className="w-4 h-4" />
          {assignTarget ? 'Cerrar' : 'Asignar grupos a productos'}
        </button>
        {assignTarget && (
          <div className="mt-4 space-y-3">
            <select value={assignTarget.productId} onChange={e => setAssignTarget({ ...assignTarget, productId: e.target.value })} className="input-field w-full">
              <option value="">Seleccionar producto...</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            {assignTarget.productId && (
              <div className="space-y-1">
                {groups.map(g => {
                  const checked = assignTarget.groupIds.includes(g.id);
                  return (
                    <label key={g.id} className="flex items-center gap-2 text-sm cursor-pointer p-1 hover:bg-white/50 rounded">
                      <input type="checkbox" checked={checked} onChange={e => {
                        const ids = e.target.checked
                          ? [...assignTarget.groupIds, g.id]
                          : assignTarget.groupIds.filter(id => id !== g.id);
                        setAssignTarget({ ...assignTarget, groupIds: ids });
                      }} className="rounded" />
                      {g.name} ({g.type === 'SINGLE' ? 'una opción' : 'varias'})
                    </label>
                  );
                })}
              </div>
            )}
            {assignTarget.productId && (
              <button onClick={handleAssignProduct} className="btn-primary bg-blue-600 hover:bg-blue-700 text-sm">Guardar asignación</button>
            )}
          </div>
        )}
      </div>

      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} label={editingGroupId ? 'Editar Grupo' : 'Nuevo Grupo'}>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">{editingGroupId ? 'Editar Grupo' : 'Nuevo Grupo'}</h2>
              <button onClick={() => setIsFormOpen(false)} className="min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-gray-100 rounded-lg" aria-label="Cerrar"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreateGroup} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <input type="text" value={groupForm.name} onChange={e => setGroupForm({ ...groupForm, name: e.target.value })} className="input-field w-full" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                <div className="flex gap-3">
                  <label className={`flex-1 p-3 rounded-xl border text-center cursor-pointer ${groupForm.type === 'SINGLE' ? 'bg-secondary/10 border-secondary text-secondary' : 'border-gray-200 hover:bg-gray-50'}`}>
                    <input type="radio" name="type" value="SINGLE" checked={groupForm.type === 'SINGLE'} onChange={e => setGroupForm({ ...groupForm, type: e.target.value })} className="sr-only" />
                    <ToggleLeft className="w-5 h-5 mx-auto mb-1" />
                    <span className="text-xs font-bold">Una opción</span>
                  </label>
                  <label className={`flex-1 p-3 rounded-xl border text-center cursor-pointer ${groupForm.type === 'MULTIPLE' ? 'bg-secondary/10 border-secondary text-secondary' : 'border-gray-200 hover:bg-gray-50'}`}>
                    <input type="radio" name="type" value="MULTIPLE" checked={groupForm.type === 'MULTIPLE'} onChange={e => setGroupForm({ ...groupForm, type: e.target.value })} className="sr-only" />
                    <ToggleRight className="w-5 h-5 mx-auto mb-1" />
                    <span className="text-xs font-bold">Varias opciones</span>
                  </label>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" className="flex-1 btn-primary bg-secondary hover:bg-secondary-dark">{editingGroupId ? 'Guardar' : 'Crear Grupo'}</button>
                <button type="button" onClick={() => setIsFormOpen(false)} className="btn-secondary">Cancelar</button>
              </div>
            </form>
          </div>
      </Modal>

      <div className="space-y-4">
        {groups.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Layers className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium">No hay grupos de modificadores</p>
            <p className="text-sm">Cree un grupo como "Cocción" o "Extras"</p>
          </div>
        ) : (
          groups.map(g => (
            <div key={g.id} className="card overflow-hidden">
              <div className="p-4 bg-gradient-to-r from-gray-50 to-surface flex items-center justify-between border-b">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-secondary/10 text-secondary">{g.type === 'SINGLE' ? <ToggleLeft className="w-5 h-5" /> : <ToggleRight className="w-5 h-5" />}</div>
                  <div>
                    <h3 className="font-bold text-gray-800">{g.name}</h3>
                    <p className="text-xs text-gray-400">{g.type === 'SINGLE' ? 'Selección única' : 'Selección múltiple'} · {g.modifiers?.length || 0} opciones · {g.products?.length || 0} productos asignados</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => handleEditGroup(g)} className="p-2 hover:bg-gray-100 rounded-lg"><Edit2 className="w-4 h-4 text-gray-500" /></button>
                  <button onClick={() => handleDeleteGroup(g.id)} className="p-2 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4 text-red-400" /></button>
                </div>
              </div>
              <div className="p-4 space-y-2">
                {g.modifiers?.map(m => (
                  <div key={m.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2">
                    <span className="text-sm font-medium text-gray-700">{m.name}</span>
                    <div className="flex items-center gap-3">
                      {m.price > 0 && <span className="text-xs font-bold text-secondary">+${m.price.toLocaleString()}</span>}
                      <button onClick={() => handleDeleteModifier(m.id)} className="p-1 hover:bg-red-50 rounded"><X className="w-3 h-3 text-red-400" /></button>
                    </div>
                  </div>
                ))}
                <div className="flex items-center gap-2 pt-1">
                  <input type="text" placeholder="Nueva opción..." value={newModifier.groupId === g.id ? newModifier.name : ''} onChange={e => setNewModifier({ groupId: g.id, name: e.target.value, price: newModifier.price })} className="input-field flex-1 text-sm" />
                  <input type="number" placeholder="$0" value={newModifier.groupId === g.id ? newModifier.price : ''} onChange={e => setNewModifier({ groupId: g.id, name: newModifier.name, price: e.target.value })} className="input-field w-20 text-sm text-center" />
                  <button onClick={() => handleAddModifier(g.id)} className="p-2 bg-secondary/10 text-secondary rounded-lg hover:bg-secondary/20"><Plus className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
