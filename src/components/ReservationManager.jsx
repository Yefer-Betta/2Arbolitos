import React, { useState, useEffect, useCallback } from 'react';
import { apiGet, apiPost, apiPut, apiDelete } from '../lib/api.js';
import { CalendarDays, Plus, X, Pencil, Trash2, Phone, Users, Check, UserCheck } from 'lucide-react';
import { Modal } from './Modal';
import { useConfirm, useToast } from './ui/feedback-context';
import { Panel, PanelHeader } from './ui/Panel';
import { Badge } from './ui/Badge';
import { EmptyState } from './ui/EmptyState';
import { cn } from '../lib/utils';

const STATUS = {
  PENDING: { label: 'Pendiente', tone: 'warn' },
  CONFIRMED: { label: 'Confirmada', tone: 'info' },
  SEATED: { label: 'En mesa', tone: 'ok' },
  CANCELLED: { label: 'Cancelada', tone: 'danger' },
  NO_SHOW: { label: 'No asistió', tone: 'neutral' },
};

function toLocalDateString(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Interpreta YYYY-MM-DD como fecha local (new Date() la leería como UTC). */
function parseLocalDate(value) {
  const [y, m, d] = String(value).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function timeLabel(value) {
  return new Date(value).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false });
}

export function ReservationManager() {
  const toast = useToast();
  const confirm = useConfirm();
  const [reservations, setReservations] = useState([]);
  const [selectedDate, setSelectedDate] = useState(toLocalDateString());
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
    } catch { /* sin datos */ }
  }, [selectedDate]);

  const loadTables = useCallback(async () => {
    try { const data = await apiGet('/tables'); setTables(Array.isArray(data) ? data : []); } catch { /* sin datos */ }
  }, []);

  // Carga inicial asincrona: el setState ocurre tras el await, no en el render.
  // eslint-disable-next-line react-hooks/set-state-in-effect
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
    if (!formData.customerName.trim() || !formData.dateTime) return toast.error('Nombre y fecha/hora requeridos');
    try {
      if (editingId) {
        const updated = await apiPut(`/reservations/${editingId}`, formData);
        setReservations(prev => prev.map(r => r.id === editingId ? { ...r, ...updated } : r));
      } else {
        const created = await apiPost('/reservations', formData);
        setReservations(prev => [...prev, created]);
      }
      resetForm();
      toast.success(editingId ? 'Reserva actualizada' : 'Reserva creada');
    } catch (err) { toast.error('Error: ' + (err.message || 'desconocido')); }
  };

  const handleDelete = async (id) => {
    const ok = await confirm({ title: '¿Eliminar esta reserva?', confirmLabel: 'Eliminar', danger: true });
    if (!ok) return;
    try { await apiDelete(`/reservations/${id}`); setReservations(prev => prev.filter(r => r.id !== id)); toast.success('Reserva eliminada'); } catch { toast.error('No se pudo eliminar'); }
  };

  const handleStatusChange = async (id, status) => {
    try {
      const updated = await apiPut(`/reservations/${id}`, { status });
      setReservations(prev => prev.map(r => r.id === id ? { ...r, ...updated } : r));
      toast.success('Estado actualizado');
    } catch { toast.error('No se pudo actualizar el estado'); }
  };

  const requestClose = () => {
    const hasData = formData.customerName.trim() !== '' || formData.phone.trim() !== '' || formData.notes.trim() !== '';
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

  const today = toLocalDateString();
  const dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return toLocalDateString(d);
  });

  return (
    <div className="space-y-3">
      <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 scrollbar-hide">
        {dates.map(d => {
          const active = selectedDate === d;
          return (
            <button
              key={d}
              onClick={() => setSelectedDate(d)}
              className={cn(
                'inline-flex h-9 shrink-0 items-center rounded-lg border px-3 text-[13px] font-medium transition-colors',
                active
                  ? 'border-primary bg-primary text-white'
                  : 'border-line bg-background-paper text-ink-muted hover:bg-surface hover:text-ink'
              )}
            >
              {d === today ? 'Hoy' : parseLocalDate(d).toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric' })}
            </button>
          );
        })}
      </div>

      <Panel>
        <PanelHeader
          title={`${reservations.length} ${reservations.length === 1 ? 'reserva' : 'reservas'}`}
          subtitle={parseLocalDate(selectedDate).toLocaleDateString('es-CO', { dateStyle: 'full' })}
          actions={
            <button onClick={() => { resetForm(); setIsFormOpen(true); }} className="btn-primary h-9 px-3.5 text-[13px]">
              <Plus className="h-4 w-4" aria-hidden="true" />
              Nueva reserva
            </button>
          }
        />

        {reservations.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="No hay reservas para este día"
            description="Elige otra fecha o registra una nueva reserva."
            action={
              <button onClick={() => { resetForm(); setIsFormOpen(true); }} className="btn-primary h-9 px-3.5 text-[13px]">
                <Plus className="h-4 w-4" aria-hidden="true" />
                Nueva reserva
              </button>
            }
          />
        ) : (
          <div className="divide-y divide-line-soft">
            {reservations.map(r => {
              const status = STATUS[r.status] || { label: r.status, tone: 'neutral' };
              const canConfirm = r.status === 'PENDING';
              const canSeat = r.status === 'CONFIRMED';
              const canCancel = r.status === 'PENDING' || r.status === 'CONFIRMED';
              return (
                <div key={r.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-4">
                  <div className="flex w-16 shrink-0 flex-col">
                    <span className="num text-base font-semibold leading-tight text-ink">{timeLabel(r.dateTime)}</span>
                    <span className="text-2xs text-ink-muted">{r.guests} pers.</span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="truncate text-[13px] font-semibold text-ink">{r.customerName}</p>
                      <Badge tone={status.tone}>{status.label}</Badge>
                      {r.table?.number ? <Badge tone="neutral">Mesa {r.table.number}</Badge> : null}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-2xs text-ink-muted">
                      {r.phone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" aria-hidden="true" />{r.phone}</span>}
                      {r.email && <span className="truncate">{r.email}</span>}
                      {r.notes && <span className="truncate italic">“{r.notes}”</span>}
                    </div>
                  </div>

                  <div className="-mr-2 flex shrink-0 items-center justify-end gap-1 sm:mr-0">
                    {canConfirm && (
                      <button onClick={() => handleStatusChange(r.id, 'CONFIRMED')} className="grid h-8 w-8 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-info-soft hover:text-info" title="Confirmar" aria-label={`Confirmar reserva de ${r.customerName}`}>
                        <Check className="h-4 w-4" />
                      </button>
                    )}
                    {canSeat && (
                      <button onClick={() => handleStatusChange(r.id, 'SEATED')} className="grid h-8 w-8 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-ok-soft hover:text-ok" title="Marcar llegada" aria-label={`Marcar llegada de ${r.customerName}`}>
                        <UserCheck className="h-4 w-4" />
                      </button>
                    )}
                    {canCancel && (
                      <button onClick={() => handleStatusChange(r.id, 'CANCELLED')} className="grid h-8 w-8 place-items-center rounded-lg text-ink-soft transition-colors hover:bg-danger-soft hover:text-danger" title="Cancelar" aria-label={`Cancelar reserva de ${r.customerName}`}>
                        <X className="h-4 w-4" />
                      </button>
                    )}
                    <button onClick={() => handleEdit(r)} className="grid h-8 w-8 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-surface hover:text-ink" title="Editar" aria-label={`Editar reserva de ${r.customerName}`}>
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => handleDelete(r.id)} className="grid h-8 w-8 place-items-center rounded-lg text-ink-soft transition-colors hover:bg-danger-soft hover:text-danger" title="Eliminar" aria-label={`Eliminar reserva de ${r.customerName}`}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Panel>

      <Modal isOpen={isFormOpen} onClose={requestClose} label={editingId ? 'Editar Reserva' : 'Nueva Reserva'}>
        <div className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-ink">{editingId ? 'Editar reserva' : 'Nueva reserva'}</h2>
              <p className="text-2xs text-ink-muted">Nombre y fecha/hora son obligatorios.</p>
            </div>
            <button onClick={requestClose} className="grid h-9 w-9 place-items-center rounded-lg text-ink-muted hover:bg-surface hover:text-ink" aria-label="Cerrar"><X className="h-4 w-4" /></button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="mb-1 block text-2xs font-semibold text-ink-muted">Nombre *</label>
              <input type="text" value={formData.customerName} onChange={e => setFormData({ ...formData, customerName: e.target.value })} className="input-field h-9" placeholder="Ej. Familia Rodríguez" required />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-2xs font-semibold text-ink-muted">Teléfono</label>
                <input type="text" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="input-field h-9" />
              </div>
              <div>
                <label className="mb-1 block text-2xs font-semibold text-ink-muted">Email</label>
                <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="input-field h-9" />
              </div>
              <div>
                <label className="mb-1 block text-2xs font-semibold text-ink-muted">Fecha y hora *</label>
                <input type="datetime-local" value={formData.dateTime} onChange={e => setFormData({ ...formData, dateTime: e.target.value })} className="input-field h-9" required />
              </div>
              <div>
                <label className="mb-1 block text-2xs font-semibold text-ink-muted">Personas</label>
                <input type="number" min="1" value={formData.guests} onChange={e => setFormData({ ...formData, guests: parseInt(e.target.value) || 1 })} className="input-field h-9" />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-2xs font-semibold text-ink-muted">Mesa</label>
              <select value={formData.tableId} onChange={e => setFormData({ ...formData, tableId: e.target.value })} className="input-field h-9">
                <option value="">Sin asignar</option>
                {tables.filter(t => t.active).map(t => (
                  <option key={t.id} value={t.id}>Mesa {t.number} ({t.capacity} pers.)</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-2xs font-semibold text-ink-muted">Notas</label>
              <textarea value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} className="input-field" rows="2" placeholder="Cumpleaños, silla para bebé..." />
            </div>
            <div className="flex gap-2 pt-1">
              <button type="submit" className="btn-primary h-9 flex-1 px-3.5 text-[13px]">{editingId ? 'Guardar cambios' : 'Crear reserva'}</button>
              <button type="button" onClick={requestClose} className="btn-secondary h-9 px-3 text-[13px]">Cancelar</button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
}
