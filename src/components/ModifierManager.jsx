import React, { useState, useEffect, useCallback } from 'react';
import { apiGet, apiPost, apiPut, apiDelete } from '../lib/api.js';
import {
  Plus,
  X,
  Pencil,
  Trash2,
  ListChecks,
  ToggleLeft,
  ToggleRight,
  Layers,
  ChevronDown,
} from 'lucide-react';
import { useConfirm, useToast } from './ui/feedback-context';
import { Modal } from './Modal';
import { PageHeader } from './ui/PageHeader';
import { Panel, PanelHeader } from './ui/Panel';
import { Badge } from './ui/Badge';
import { EmptyState } from './ui/EmptyState';
import { cn } from '../lib/utils';

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
    } catch { /* sin datos */ }
  }, []);

  // Carga inicial asincrona: el setState ocurre tras el await, no en el render.
  // eslint-disable-next-line react-hooks/set-state-in-effect
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
    try { await apiDelete(`/modifiers/${id}`); loadData(); } catch { /* sin datos */ }
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
    <div className="space-y-4">
      <PageHeader
        title="Modificadores"
        subtitle="Grupos y opciones para personalizar productos."
        actions={
          <button
            onClick={() => { setEditingGroupId(null); setGroupForm({ name: '', type: 'SINGLE' }); setIsFormOpen(true); }}
            className="btn-primary h-9 px-3.5 text-[13px]"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Nuevo grupo
          </button>
        }
      />

      <Panel>
        <button
          onClick={() => setAssignTarget(assignTarget ? null : { productId: '', groupIds: [] })}
          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-surface"
          aria-expanded={!!assignTarget}
        >
          <span className="flex min-w-0 items-center gap-2.5">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-ink-brand">
              <ListChecks className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block text-[13px] font-semibold text-ink">Asignar grupos a productos</span>
              <span className="block truncate text-2xs text-ink-muted">
                Elige un producto y marca los grupos que debe mostrar al venderlo.
              </span>
            </span>
          </span>
          <ChevronDown className={cn('h-4 w-4 shrink-0 text-ink-soft transition-transform', assignTarget && 'rotate-180')} aria-hidden="true" />
        </button>

        {assignTarget && (
          <div className="grid gap-3 border-t border-line p-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-2xs font-semibold text-ink-muted">Producto</label>
              <select
                value={assignTarget.productId}
                onChange={e => setAssignTarget({ ...assignTarget, productId: e.target.value })}
                className="input-field h-9"
              >
                <option value="">Seleccionar producto...</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>

            {assignTarget.productId ? (
              <div className="min-w-0">
                <p className="mb-1 text-2xs font-semibold text-ink-muted">Grupos disponibles</p>
                <div className="max-h-44 space-y-1 overflow-y-auto rounded-xl border border-line p-2">
                  {groups.length === 0 ? (
                    <p className="px-1 py-2 text-2xs text-ink-muted">Todavía no hay grupos creados.</p>
                  ) : groups.map(g => {
                    const checked = assignTarget.groupIds.includes(g.id);
                    return (
                      <label key={g.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-1.5 py-1 text-[13px] text-ink hover:bg-surface">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={e => {
                            const ids = e.target.checked
                              ? [...assignTarget.groupIds, g.id]
                              : assignTarget.groupIds.filter(id => id !== g.id);
                            setAssignTarget({ ...assignTarget, groupIds: ids });
                          }}
                          className="h-4 w-4 rounded border-line text-primary focus:ring-primary"
                        />
                        <span className="truncate">{g.name}</span>
                        <span className="ml-auto shrink-0 text-2xs text-ink-muted">{g.type === 'SINGLE' ? 'una opción' : 'varias'}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ) : (
              <p className="self-end text-2xs text-ink-muted">Selecciona un producto para ver sus grupos.</p>
            )}

            <div className="flex justify-end md:col-span-2">
              <button
                onClick={handleAssignProduct}
                disabled={!assignTarget.productId}
                className="btn-primary h-9 px-3.5 text-[13px] disabled:opacity-50"
              >
                Guardar asignación
              </button>
            </div>
          </div>
        )}
      </Panel>

      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} label={editingGroupId ? 'Editar Grupo' : 'Nuevo Grupo'}>
        <div className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-ink">{editingGroupId ? 'Editar grupo' : 'Nuevo grupo'}</h2>
            <button onClick={() => setIsFormOpen(false)} className="grid h-9 w-9 place-items-center rounded-lg text-ink-muted hover:bg-surface hover:text-ink" aria-label="Cerrar"><X className="h-4 w-4" /></button>
          </div>
          <form onSubmit={handleCreateGroup} className="space-y-4">
            <div>
              <label className="mb-1 block text-2xs font-semibold text-ink-muted">Nombre</label>
              <input
                type="text"
                value={groupForm.name}
                onChange={e => setGroupForm({ ...groupForm, name: e.target.value })}
                className="input-field h-9"
                placeholder="Ej. Cocción, Extras, Tamaño"
                required
              />
            </div>
            <div>
              <span className="mb-1 block text-2xs font-semibold text-ink-muted">Tipo de selección</span>
              <div className="grid grid-cols-2 gap-2">
                <label className={cn(
                  'cursor-pointer rounded-xl border px-3 py-2.5 text-center transition-colors',
                  groupForm.type === 'SINGLE'
                    ? 'border-primary bg-primary/10 text-ink-brand'
                    : 'border-line text-ink-muted hover:bg-surface'
                )}>
                  <input type="radio" name="type" value="SINGLE" checked={groupForm.type === 'SINGLE'} onChange={e => setGroupForm({ ...groupForm, type: e.target.value })} className="sr-only" />
                  <ToggleLeft className="mx-auto mb-1 h-5 w-5" aria-hidden="true" />
                  <span className="text-2xs font-semibold">Una opción</span>
                </label>
                <label className={cn(
                  'cursor-pointer rounded-xl border px-3 py-2.5 text-center transition-colors',
                  groupForm.type === 'MULTIPLE'
                    ? 'border-primary bg-primary/10 text-ink-brand'
                    : 'border-line text-ink-muted hover:bg-surface'
                )}>
                  <input type="radio" name="type" value="MULTIPLE" checked={groupForm.type === 'MULTIPLE'} onChange={e => setGroupForm({ ...groupForm, type: e.target.value })} className="sr-only" />
                  <ToggleRight className="mx-auto mb-1 h-5 w-5" aria-hidden="true" />
                  <span className="text-2xs font-semibold">Varias opciones</span>
                </label>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button type="submit" className="btn-primary h-9 flex-1 px-3.5 text-[13px]">{editingGroupId ? 'Guardar cambios' : 'Crear grupo'}</button>
              <button type="button" onClick={() => setIsFormOpen(false)} className="btn-secondary h-9 px-3 text-[13px]">Cancelar</button>
            </div>
          </form>
        </div>
      </Modal>

      {groups.length === 0 ? (
        <Panel>
          <EmptyState
            icon={Layers}
            title="No hay grupos de modificadores"
            description='Crea un grupo como "Cocción" o "Extras" y luego agrega sus opciones.'
            action={
              <button
                onClick={() => { setEditingGroupId(null); setGroupForm({ name: '', type: 'SINGLE' }); setIsFormOpen(true); }}
                className="btn-primary h-9 px-3.5 text-[13px]"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                Nuevo grupo
              </button>
            }
          />
        </Panel>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {groups.map(g => {
            const count = g.modifiers?.length || 0;
            const isDraft = newModifier.groupId === g.id;
            return (
              <Panel key={g.id} className="flex flex-col">
                <PanelHeader
                  title={g.name}
                  subtitle={`${count} ${count === 1 ? 'opción' : 'opciones'} · ${g.products?.length || 0} ${(g.products?.length || 0) === 1 ? 'producto' : 'productos'}`}
                  actions={
                    <div className="flex items-center gap-1">
                      <Badge tone={g.type === 'SINGLE' ? 'brand' : 'info'}>
                        {g.type === 'SINGLE' ? 'Única' : 'Múltiple'}
                      </Badge>
                      <button onClick={() => handleEditGroup(g)} className="grid h-8 w-8 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-surface hover:text-ink" title="Editar grupo" aria-label={`Editar ${g.name}`}>
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => handleDeleteGroup(g.id)} className="grid h-8 w-8 place-items-center rounded-lg text-ink-soft transition-colors hover:bg-danger-soft hover:text-danger" title="Eliminar grupo" aria-label={`Eliminar ${g.name}`}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  }
                />

                <div className="flex-1 divide-y divide-line-soft">
                  {count === 0 ? (
                    <p className="px-4 py-3 text-2xs text-ink-muted">Sin opciones todavía. Agrega la primera abajo.</p>
                  ) : g.modifiers.map(m => (
                    <div key={m.id} className="flex items-center justify-between gap-3 px-4 py-2">
                      <span className="truncate text-[13px] text-ink">{m.name}</span>
                      <div className="flex shrink-0 items-center gap-1">
                        {m.price > 0 && <span className="num text-2xs font-semibold text-ink-muted">+{m.price.toLocaleString('es-CO')}</span>}
                        <button onClick={() => handleDeleteModifier(m.id)} className="grid h-7 w-7 place-items-center rounded-lg text-ink-soft transition-colors hover:bg-danger-soft hover:text-danger" aria-label={`Eliminar ${m.name}`}>
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 border-t border-line p-3">
                  <input
                    type="text"
                    placeholder="Nueva opción..."
                    value={isDraft ? newModifier.name : ''}
                    onChange={e => setNewModifier({ groupId: g.id, name: e.target.value, price: isDraft ? newModifier.price : '' })}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddModifier(g.id); } }}
                    className="input-field h-8 min-w-0 flex-1 text-[13px]"
                  />
                  <input
                    type="number"
                    placeholder="0"
                    value={isDraft ? newModifier.price : ''}
                    onChange={e => setNewModifier({ groupId: g.id, name: isDraft ? newModifier.name : '', price: e.target.value })}
                    className="input-field num h-8 w-20 shrink-0 text-center text-[13px]"
                    aria-label="Precio adicional"
                  />
                  <button
                    onClick={() => handleAddModifier(g.id)}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-ink-brand transition-colors hover:bg-primary/15"
                    title="Agregar opción"
                    aria-label={`Agregar opción a ${g.name}`}
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </Panel>
            );
          })}
        </div>
      )}
    </div>
  );
}
