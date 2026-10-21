import React, { useState, useEffect, useCallback } from 'react';
import { apiGet, apiPost, apiPut } from '../lib/api.js';
import { Plus, Pencil, X, Search, Users, Phone, Mail, MapPin, History, Check, CalendarDays } from 'lucide-react';
import { ReservationManager } from './ReservationManager';
import { Modal } from './Modal';
import { useConfirm, useToast } from './ui/feedback-context';
import { PageHeader } from './ui/PageHeader';
import { Panel, PanelHeader } from './ui/Panel';
import { StatCard } from './ui/StatCard';
import { SubNav } from './ui/SubNav';
import { Badge } from './ui/Badge';
import { EmptyState } from './ui/EmptyState';
import { getOrderTypeLabel } from '../lib/sales';
import { formatCurrency } from '../lib/utils';

const TABS = [
  { id: 'customers', label: 'Clientes', icon: Users },
  { id: 'reservations', label: 'Reservas', icon: CalendarDays },
];

const ORDER_STATUS = {
  PENDING: { label: 'Pendiente', tone: 'warn' },
  PREPARING: { label: 'En preparación', tone: 'info' },
  READY: { label: 'Listo', tone: 'info' },
  SERVED: { label: 'Servido', tone: 'ok' },
  CANCELLED: { label: 'Cancelado', tone: 'danger' },
};

const EMPTY_FORM = { name: '', phone: '', email: '', address: '' };

function CustomerList() {
  const toast = useToast();
  const confirm = useConfirm();
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [orders, setOrders] = useState([]);

  const loadCustomers = useCallback(async () => {
    try {
      const q = search ? `?search=${encodeURIComponent(search)}` : '';
      const data = await apiGet(`/customers${q}`);
      if (Array.isArray(data)) setCustomers(data);
    } catch { /* sin datos */ }
  }, [search]);

  // Carga inicial asincrona: el setState ocurre tras el await, no en el render.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadCustomers(); }, [loadCustomers]);

  const resetForm = () => {
    setFormData(EMPTY_FORM);
    setEditingId(null); setIsFormOpen(false);
  };

  const handleEdit = (c) => {
    setFormData({ name: c.name, phone: c.phone || '', email: c.email || '', address: c.address || '' });
    setEditingId(c.id); setIsFormOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return toast.error('Nombre requerido');
    try {
      if (editingId) {
        const updated = await apiPut(`/customers/${editingId}`, formData);
        setCustomers(prev => prev.map(c => c.id === editingId ? { ...c, ...updated } : c));
        toast.success('Cliente actualizado');
      } else {
        const created = await apiPost('/customers', formData);
        setCustomers(prev => [created, ...prev]);
        toast.success('Cliente creado');
      }
      resetForm();
    } catch (err) { toast.error('Error: ' + (err.message || 'desconocido')); }
  };

  const requestClose = () => {
    const hasData = Object.values(formData).some(v => String(v).trim() !== '');
    if (editingId || hasData) {
      confirm({
        title: '¿Descartar cambios?',
        message: 'Se perderán los datos ingresados.',
        confirmLabel: 'Descartar',
        cancelLabel: 'Seguir editando',
        danger: true,
      }).then(ok => { if (ok) resetForm(); });
    } else {
      resetForm();
    }
  };

  const viewOrders = async (c) => {
    setSelectedCustomer(c);
    try {
      const data = await apiGet(`/customers/${c.id}/orders`);
      setOrders(Array.isArray(data) ? data : []);
    } catch { setOrders([]); }
  };

  const withPhone = customers.filter(c => c.phone).length;
  const withEmail = customers.filter(c => c.email).length;

  return (
    <>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
        <StatCard label="Clientes" value={customers.length} hint={search ? 'Resultado de la búsqueda' : 'Registrados en el sistema'} icon={Users} tone="brand" />
        <StatCard label="Con teléfono" value={withPhone} hint="Para contacto y domicilios" icon={Phone} tone="neutral" />
        <StatCard label="Con email" value={withEmail} hint="Para reservas y facturas" icon={Mail} tone="neutral" className="col-span-2 sm:col-span-1" />
      </div>

      {isFormOpen && (
        <Panel>
          <PanelHeader
            title={editingId ? 'Editar cliente' : 'Nuevo cliente'}
            subtitle={editingId ? 'Actualiza los datos de contacto.' : 'Solo el nombre es obligatorio.'}
            actions={
              <button onClick={requestClose} className="grid h-8 w-8 place-items-center rounded-lg text-ink-muted hover:bg-surface hover:text-ink" aria-label="Cerrar formulario">
                <X className="h-4 w-4" />
              </button>
            }
          />
          <form onSubmit={handleSubmit} className="grid gap-3 p-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-2xs font-semibold text-ink-muted">Nombre *</label>
              <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="input-field h-9" placeholder="Ej. María Gómez" required />
            </div>
            <div>
              <label className="mb-1 block text-2xs font-semibold text-ink-muted">Teléfono</label>
              <input type="text" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="input-field h-9" placeholder="Ej. 300 123 4567" />
            </div>
            <div>
              <label className="mb-1 block text-2xs font-semibold text-ink-muted">Email</label>
              <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="input-field h-9" placeholder="cliente@correo.com" />
            </div>
            <div>
              <label className="mb-1 block text-2xs font-semibold text-ink-muted">Dirección</label>
              <input type="text" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} className="input-field h-9" placeholder="Para domicilios" />
            </div>
            <div className="flex items-end justify-end gap-2 sm:col-span-2">
              <button type="button" onClick={requestClose} className="btn-secondary h-9 px-3 text-[13px]">Cancelar</button>
              <button type="submit" className="btn-primary h-9 px-3.5 text-[13px]">
                <Check className="h-4 w-4" aria-hidden="true" />
                {editingId ? 'Guardar cambios' : 'Crear cliente'}
              </button>
            </div>
          </form>
        </Panel>
      )}

      <Modal isOpen={!!selectedCustomer} onClose={() => setSelectedCustomer(null)} label={selectedCustomer ? `Historial de ${selectedCustomer.name}` : 'Historial'} maxWidth="max-w-2xl">
        <div className="p-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="truncate text-lg font-semibold text-ink">Historial de {selectedCustomer?.name}</h2>
              <p className="text-2xs text-ink-muted">Pedidos asociados a este cliente.</p>
            </div>
            <button onClick={() => setSelectedCustomer(null)} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-ink-muted hover:bg-surface hover:text-ink" aria-label="Cerrar"><X className="h-4 w-4" /></button>
          </div>
          {orders.length === 0 ? (
            <EmptyState
              icon={History}
              title="Sin órdenes registradas"
              description="Cuando este cliente haga un pedido aparecerá aquí."
            />
          ) : (
            <div className="divide-y divide-line-soft rounded-xl border border-line">
              {orders.map(order => {
                const status = ORDER_STATUS[order.status] || { label: order.status, tone: 'neutral' };
                return (
                  <div key={order.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="num text-[13px] font-medium text-ink">
                        {new Date(order.createdAt).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                        <span className="ml-1.5 text-ink-muted">
                          {new Date(order.createdAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false })}
                        </span>
                      </p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-2xs text-ink-muted">
                        <span>{getOrderTypeLabel(order.orderType)}</span>
                        {order.table?.number ? <span>· Mesa {order.table.number}</span> : null}
                        <span>· {order.items?.length || 0} producto(s)</span>
                        <Badge tone={status.tone}>{status.label}</Badge>
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="num text-[13px] font-semibold text-ink">{formatCurrency(order.totalCop || 0)}</p>
                      {order.totalUsd > 0 && <p className="num text-2xs text-ink-muted">{formatCurrency(order.totalUsd)} USD</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Modal>

      <Panel>
        <PanelHeader
          title="Directorio"
          subtitle={`${customers.length} ${customers.length === 1 ? 'cliente' : 'clientes'}`}
          actions={
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-soft" aria-hidden="true" />
              <input
                type="text"
                placeholder="Nombre, teléfono o email..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="input-field h-8 pl-8 text-[13px]"
              />
            </div>
          }
        />

        {customers.length === 0 ? (
          <EmptyState
            icon={Users}
            title={search ? 'Sin resultados' : 'No hay clientes registrados'}
            description={search ? 'Prueba con otro nombre, teléfono o email.' : 'Registra al primer cliente para asociar pedidos y reservas.'}
            action={!search && !isFormOpen ? (
              <button onClick={() => { resetForm(); setIsFormOpen(true); }} className="btn-primary h-9 px-3.5 text-[13px]">
                <Plus className="h-4 w-4" aria-hidden="true" />
                Nuevo cliente
              </button>
            ) : null}
          />
        ) : (
          <>
            <div className="divide-y divide-line-soft md:hidden">
              {customers.map(c => (
                <div key={c.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold text-ink">{c.name}</p>
                      <div className="mt-1 space-y-0.5 text-2xs text-ink-muted">
                        {c.phone && <p className="flex items-center gap-1"><Phone className="h-3 w-3 shrink-0" aria-hidden="true" />{c.phone}</p>}
                        {c.email && <p className="flex items-center gap-1 truncate"><Mail className="h-3 w-3 shrink-0" aria-hidden="true" />{c.email}</p>}
                        {c.address && <p className="flex items-center gap-1 truncate"><MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />{c.address}</p>}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button onClick={() => handleEdit(c)} className="grid h-8 w-8 place-items-center rounded-lg text-ink-muted hover:bg-surface hover:text-ink" title="Editar" aria-label={`Editar ${c.name}`}>
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => viewOrders(c)} className="grid h-8 w-8 place-items-center rounded-lg text-ink-muted hover:bg-surface hover:text-ink" title="Historial" aria-label={`Ver historial de ${c.name}`}>
                        <History className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Teléfono</th>
                    <th>Email</th>
                    <th className="w-24 text-right"><span className="sr-only">Acciones</span></th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map(c => (
                    <tr key={c.id}>
                      <td>
                        <p className="font-medium text-ink">{c.name}</p>
                        {c.address && <p className="mt-0.5 truncate text-2xs text-ink-muted">{c.address}</p>}
                      </td>
                      <td className="num text-ink-muted">{c.phone || '—'}</td>
                      <td className="text-ink-muted">{c.email || '—'}</td>
                      <td>
                        <div className="-mr-2 flex justify-end">
                          <button onClick={() => handleEdit(c)} className="grid h-8 w-8 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-surface hover:text-ink" title="Editar" aria-label={`Editar ${c.name}`}>
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => viewOrders(c)} className="grid h-8 w-8 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-surface hover:text-ink" title="Historial" aria-label={`Ver historial de ${c.name}`}>
                            <History className="h-3.5 w-3.5" />
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
  );
}

export function CustomerManager() {
  const [tab, setTab] = useState('customers');

  return (
    <div className="space-y-4">
      <PageHeader
        title="Clientes"
        subtitle="Datos de contacto, historial de pedidos y reservas."
      />

      <SubNav items={TABS} value={tab} onChange={setTab} />

      {tab === 'customers' ? <CustomerList /> : <ReservationManager />}
    </div>
  );
}
