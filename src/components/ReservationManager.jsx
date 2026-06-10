import React, { useState, useEffect, useCallback } from 'react';
import { apiGet, apiPost, apiPut, apiDelete } from '../lib/api.js';
import { CalendarDays, Plus, X, Edit2, Trash2, Phone, Users, Clock, Check, AlertTriangle } from 'lucide-react';

const STATUS_COLORS = {
  PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  CONFIRMED: 'bg-blue-100 text-blue-800 border-blue-200',
  SEATED: 'bg-green-100 text-green-800 border-green-200',
  CANCELLED: 'bg-red-100 text-red-800 border-red-200',
  NO_SHOW: 'bg-gray-100 text-gray-800 border-gray-200',
};

export function ReservationManager() {
  const [reservations, setReservations] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [tables, setTables] = useState([]);
  const [formData, setFormData] = useState({
    customerName: '', phone: '', email: '', guests: 2,
    dateTime: '', tableId: '', notes: '', status: 'PENDING',
  });

  const loadReservations = useCallback(async () => {
    try {
      const data = await apiGet(`/reservations?date=${selectedDate}`);
      setReservations(Array.isArray(data) ? data : []);
    } catch {}
  }, [selectedDate]);

  const loadTables = useCallback(async () => {
    try { const data = await apiGet('/tables'); setTables(Array.isArray(data) ? data : []); } catch {}
  }, []);

  useEffect(() => { loadReservations(); loadTables(); }, [loadReservations, loadTables]);

  const resetForm = () => {
    setFormData({ customerName: '', phone: '', email: '', guests: 2, dateTime: `${selectedDate}T12:00`, tableId: '', notes: '', status: 'PENDING' });
    setEditingId(null); setIsFormOpen(false);
  };

  const handleEdit = (r) => {
    setFormData({
      customerName: r.customerName, phone: r.phone || '', email: r.email || '',
      guests: r.guests, dateTime: r.dateTime.slice(0, 16), tableId: r.tableId || '',
      notes: r.notes || '', status: r.status,
    });
    setEditingId(r.id); setIsFormOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.customerName.trim() || !formData.dateTime) return alert('Nombre y fecha/hora requeridos');
    try {
      if (editingId) {
        const updated = await apiPut(`/reservations/${editingId}`, formData);
        setReservations(prev => prev.map(r => r.id === editingId ? { ...r, ...updated } : r));
      } else {
        const created = await apiPost('/reservations', formData);
        setReservations(prev => [...prev, created]);
      }
      resetForm();
    } catch (err) { alert('Error: ' + (err.message || 'desconocido')); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar esta reserva?')) return;
    try { await apiDelete(`/reservations/${id}`); setReservations(prev => prev.filter(r => r.id !== id)); } catch {}
  };

  const handleStatusChange = async (id, status) => {
    try {
      const updated = await apiPut(`/reservations/${id}`, { status });
      setReservations(prev => prev.map(r => r.id === id ? { ...r, ...updated } : r));
    } catch {}
  };

  const today = new Date().toISOString().split('T')[0];
  const dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d.toISOString().split('T')[0];
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-3 bg-secondary/10 rounded-xl text-secondary">
          <CalendarDays className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Reservas</h1>
          <p className="text-sm text-gray-500">Gestión de reservaciones</p>
        </div>
      </div>

      {/* Date selector */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {dates.map(d => (
          <button key={d} onClick={() => setSelectedDate(d)} className={`px-4 py-2 rounded-xl font-bold text-sm whitespace-nowrap transition-colors ${selectedDate === d ? 'bg-secondary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {d === today ? 'Hoy' : new Date(d).toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric' })}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{reservations.length} reserva(s) para {new Date(selectedDate).toLocaleDateString('es-CO', { dateStyle: 'full' })}</p>
        <button onClick={() => { resetForm(); setIsFormOpen(true); }} className="btn-primary bg-secondary hover:bg-secondary-dark flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nueva Reserva
        </button>
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => { if (!window.confirm('¿Cancelar?')) return; resetForm(); }}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">{editingId ? 'Editar Reserva' : 'Nueva Reserva'}</h2>
              <button onClick={resetForm} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <input type="text" value={formData.customerName} onChange={e => setFormData({ ...formData, customerName: e.target.value })} className="input-field w-full" required />
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha y hora *</label>
                  <input type="datetime-local" value={formData.dateTime} onChange={e => setFormData({ ...formData, dateTime: e.target.value })} className="input-field w-full" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Personas</label>
                  <input type="number" min="1" value={formData.guests} onChange={e => setFormData({ ...formData, guests: parseInt(e.target.value) || 1 })} className="input-field w-full" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mesa</label>
                <select value={formData.tableId} onChange={e => setFormData({ ...formData, tableId: e.target.value })} className="input-field w-full">
                  <option value="">Sin asignar</option>
                  {tables.filter(t => t.active).map(t => (
                    <option key={t.id} value={t.id}>Mesa {t.number} ({t.capacity} pers.)</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                <textarea value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} className="input-field w-full" rows="2" />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" className="flex-1 btn-primary bg-secondary hover:bg-secondary-dark">{editingId ? 'Guardar' : 'Crear Reserva'}</button>
                <button type="button" onClick={resetForm} className="btn-secondary">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {reservations.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium">No hay reservas para este día</p>
          </div>
        ) : (
          reservations.map(r => (
            <div key={r.id} className="card p-4 flex items-center gap-4 hover:shadow-md transition-shadow">
              <div className="flex-shrink-0 w-16 h-16 rounded-xl bg-gradient-to-br from-secondary/20 to-secondary/10 flex flex-col items-center justify-center">
                <span className="text-lg font-bold text-secondary">
                  {new Date(r.dateTime).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-bold text-gray-800 truncate">{r.customerName}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${STATUS_COLORS[r.status] || STATUS_COLORS.PENDING}`}>{r.status}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                  <span className="flex items-center gap-1"><Users className="w-3 h-3" />{r.guests} pers.</span>
                  {r.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{r.phone}</span>}
                  {r.table && <span className="flex items-center gap-1"><span className="font-medium">Mesa {r.table.number}</span></span>}
                  {r.notes && <span className="text-gray-400 italic">"{r.notes}"</span>}
                </div>
              </div>
              <div className="flex items-center gap-1">
                {r.status === 'PENDING' && (
                  <button onClick={() => handleStatusChange(r.id, 'CONFIRMED')} className="p-2 hover:bg-blue-50 rounded-lg text-blue-500" title="Confirmar"><Check className="w-4 h-4" /></button>
                )}
                {r.status === 'CONFIRMED' && (
                  <button onClick={() => handleStatusChange(r.id, 'SEATED')} className="p-2 hover:bg-green-50 rounded-lg text-green-500" title="Marcar llegada"><Users className="w-4 h-4" /></button>
                )}
                {(r.status === 'PENDING' || r.status === 'CONFIRMED') && (
                  <button onClick={() => handleStatusChange(r.id, 'CANCELLED')} className="p-2 hover:bg-red-50 rounded-lg text-red-400" title="Cancelar"><X className="w-4 h-4" /></button>
                )}
                <button onClick={() => handleEdit(r)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500" title="Editar"><Edit2 className="w-4 h-4" /></button>
                <button onClick={() => handleDelete(r.id)} className="p-2 hover:bg-red-50 rounded-lg text-red-400" title="Eliminar"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
