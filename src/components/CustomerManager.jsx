import React, { useState, useEffect, useCallback } from 'react';
import { apiGet, apiPost, apiPut } from '../lib/api.js';
import { Plus, Edit2, X, Search, Users, Phone, Mail, MapPin, ChevronRight, CalendarDays } from 'lucide-react';
import { cn } from '../lib/utils';
import { ReservationManager } from './ReservationManager';

const TABS = [
  { id: 'customers', label: 'Clientes', icon: Users },
  { id: 'reservations', label: 'Reservas', icon: CalendarDays },
];

function CustomerList() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: '', phone: '', email: '', address: '' });
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [orders, setOrders] = useState([]);

  const loadCustomers = useCallback(async () => {
    try {
      const q = search ? `?search=${encodeURIComponent(search)}` : '';
      const data = await apiGet(`/customers${q}`);
      if (Array.isArray(data)) setCustomers(data);
    } catch {}
  }, [search]);

  useEffect(() => { loadCustomers(); }, [loadCustomers]);

  const resetForm = () => {
    setFormData({ name: '', phone: '', email: '', address: '' });
    setEditingId(null); setIsFormOpen(false);
  };

  const handleEdit = (c) => {
    setFormData({ name: c.name, phone: c.phone || '', email: c.email || '', address: c.address || '' });
    setEditingId(c.id); setIsFormOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return alert('Nombre requerido');
    try {
      if (editingId) {
        const updated = await apiPut(`/customers/${editingId}`, formData);
        setCustomers(prev => prev.map(c => c.id === editingId ? { ...c, ...updated } : c));
      } else {
        const created = await apiPost('/customers', formData);
        setCustomers(prev => [created, ...prev]);
      }
      resetForm();
    } catch (err) { alert('Error: ' + (err.message || 'desconocido')); }
  };

  const viewOrders = async (c) => {
    setSelectedCustomer(c);
    try {
      const data = await apiGet(`/customers/${c.id}/orders`);
      setOrders(Array.isArray(data) ? data : []);
    } catch { setOrders([]); }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text" placeholder="Buscar por nombre, teléfono o email..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="input-field pl-10 w-full"
          />
        </div>
        <button onClick={() => { resetForm(); setIsFormOpen(true); }} className="btn-primary bg-secondary hover:bg-secondary-dark flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nuevo Cliente
        </button>
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => { if (!window.confirm('¿Cancelar?')) return; resetForm(); }}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">{editingId ? 'Editar Cliente' : 'Nuevo Cliente'}</h2>
              <button onClick={resetForm} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="input-field w-full" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                <input type="text" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="input-field w-full" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="input-field w-full" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                <input type="text" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} className="input-field w-full" />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" className="flex-1 btn-primary bg-secondary hover:bg-secondary-dark">
                  {editingId ? 'Guardar Cambios' : 'Crear Cliente'}
                </button>
                <button type="button" onClick={resetForm} className="btn-secondary">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedCustomer && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setSelectedCustomer(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl mx-4 shadow-2xl max-h-[80vh] overflow-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Historial de {selectedCustomer.name}</h2>
              <button onClick={() => setSelectedCustomer(null)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            {orders.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Este cliente no tiene órdenes registradas</p>
            ) : (
              <div className="space-y-3">
                {orders.map(order => (
                  <div key={order.id} className="border rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">
                        {new Date(order.createdAt).toLocaleDateString('es-CO', { dateStyle: 'medium' })}
                        {' '}
                        {new Date(order.createdAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      <p className="text-xs text-gray-500">
                        {order.orderType} · {order.table?.number ? `Mesa ${order.table.number}` : ''} · {order.status}
                      </p>
                      <p className="text-xs text-gray-400">{order.items.length} producto(s)</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-secondary">${order.totalCop.toLocaleString()}</p>
                      {order.totalUsd > 0 && <p className="text-xs text-gray-400">${order.totalUsd.toFixed(2)} USD</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        {customers.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium">No hay clientes registrados</p>
            <p className="text-sm">Agregue el primer cliente con el botón "Nuevo Cliente"</p>
          </div>
        ) : (
          <div className="divide-y">
            {customers.map(c => (
              <div key={c.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 truncate">{c.name}</p>
                  <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                    {c.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{c.phone}</span>}
                    {c.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{c.email}</span>}
                    {c.address && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{c.address}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleEdit(c)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-secondary" title="Editar">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => viewOrders(c)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-secondary" title="Historial">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

export function CustomerManager() {
  const [tab, setTab] = useState('customers');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-3 bg-secondary/10 rounded-xl text-secondary">
          <Users className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Clientes</h1>
          <p className="text-sm text-gray-500">Gestión de clientes y reservas</p>
        </div>
      </div>

      <div className="flex gap-2 bg-white rounded-xl p-1.5 border border-gray-200 w-fit">
        {TABS.map(t => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all',
                active ? 'bg-primary text-white shadow-md' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              )}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'customers' ? <CustomerList /> : <ReservationManager />}
    </div>
  );
}
