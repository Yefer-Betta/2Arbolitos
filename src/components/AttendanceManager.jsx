import React, { useState, useEffect, useCallback } from 'react';
import { apiGet, apiPost } from '../lib/api.js';
import { Clock, LogIn, LogOut, CalendarDays, CheckCircle } from 'lucide-react';
import { useUser } from '../context/UserContext';
import { useToast } from './ui/feedback-context';
import { Panel, PanelHeader } from './ui/Panel';
import { StatCard } from './ui/StatCard';
import { Badge } from './ui/Badge';
import { EmptyState } from './ui/EmptyState';

const STATUS = {
  PRESENT: { label: 'Presente', tone: 'ok' },
  LATE: { label: 'Tarde', tone: 'warn' },
  ABSENT: { label: 'Ausente', tone: 'danger' },
  HALF_DAY: { label: 'Medio día', tone: 'info' },
};

const ROLE_LABELS = { ADMIN: 'Administrador', MANAGER: 'Gerente', CASHIER: 'Cajero', WAITER: 'Mesero', COOK: 'Cocinero' };

function toLocalDateString(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function timeLabel(value) {
  if (!value) return '—';
  return new Date(value).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function roleLabel(role) {
  return ROLE_LABELS[String(role || '').toUpperCase()] || role || '—';
}

export function AttendanceManager() {
  const { currentUser } = useUser();
  const toast = useToast();
  const [records, setRecords] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedDate, setSelectedDate] = useState(toLocalDateString());
  const [filterUser, setFilterUser] = useState('');
  const [todayStatus, setTodayStatus] = useState({ checkedIn: false, checkedOut: false });

  const loadRecords = useCallback(async () => {
    try {
      const params = new URLSearchParams({ startDate: selectedDate, endDate: selectedDate });
      if (filterUser) params.set('userId', filterUser);
      const d = await apiGet(`/attendance?${params}`);
      setRecords(Array.isArray(d) ? d : []);
    } catch { /* sin datos */ }
  }, [selectedDate, filterUser]);

  const loadUsers = useCallback(async () => {
    try { const d = await apiGet('/users'); setUsers(Array.isArray(d) ? d : []); } catch { /* sin datos */ }
  }, []);

  const loadTodayStatus = useCallback(async () => {
    try { const d = await apiGet('/attendance/today'); setTodayStatus(d); } catch { /* sin datos */ }
  }, []);

  // Carga inicial asincrona: el setState ocurre tras el await, no en el render.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadRecords(); loadUsers(); }, [loadRecords, loadUsers]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadTodayStatus(); }, [loadTodayStatus]);

  const handleCheckIn = async () => {
    try {
      await apiPost('/attendance/check-in', {});
      loadTodayStatus();
      loadRecords();
      toast.success('Entrada registrada');
    } catch (err) { toast.error('Error: ' + (err.message || '')); }
  };

  const handleCheckOut = async () => {
    try {
      await apiPost('/attendance/check-out', {});
      loadTodayStatus();
      loadRecords();
      toast.success('Salida registrada');
    } catch (err) { toast.error('Error: ' + (err.message || '')); }
  };

  const presentCount = records.filter(r => r.status === 'PRESENT' || r.status === 'LATE').length;
  const totalHours = records.reduce((sum, r) => sum + (r.hours || 0), 0);

  return (
    <div className="space-y-3">
      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-ink-brand">
              {currentUser?.name?.charAt(0)?.toUpperCase() || '?'}
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.09em] text-ink-muted">Mi jornada</p>
              <p className="truncate text-[13px] font-semibold text-ink">{currentUser?.name}</p>
              <p className="text-2xs text-ink-muted">
                {!todayStatus.checkedIn
                  ? 'Aún no has registrado tu entrada hoy'
                  : todayStatus.checkedOut
                    ? 'Jornada completada'
                    : 'Jornada en curso'}
              </p>
              {todayStatus.checkedIn && (
                <p className="num mt-0.5 text-2xs text-ink-muted">
                  {timeLabel(todayStatus.record?.checkIn)}
                  {todayStatus.checkedOut && ` → ${timeLabel(todayStatus.record?.checkOut)} · ${todayStatus.record?.hours?.toFixed(1)} h`}
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {!todayStatus.checkedIn && (
              <button onClick={handleCheckIn} className="btn-primary h-9 px-3.5 text-[13px]">
                <LogIn className="h-4 w-4" aria-hidden="true" />
                Marcar entrada
              </button>
            )}
            {todayStatus.checkedIn && !todayStatus.checkedOut && (
              <button onClick={handleCheckOut} className="btn-danger h-9 px-3.5 text-[13px]">
                <LogOut className="h-4 w-4" aria-hidden="true" />
                Marcar salida
              </button>
            )}
          </div>
        </div>
      </Panel>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
        <StatCard label="Registros" value={records.length} hint="En la fecha elegida" icon={CalendarDays} tone="brand" />
        <StatCard label="Presentes" value={presentCount} hint="Incluye llegadas tarde" icon={CheckCircle} tone={presentCount === 0 ? 'neutral' : 'ok'} />
        <StatCard label="Horas trabajadas" value={`${totalHours.toFixed(1)} h`} hint="Suma del día" icon={Clock} tone="neutral" className="col-span-2 sm:col-span-1" />
      </div>

      <Panel>
        <PanelHeader
          title="Registros de asistencia"
          subtitle={new Date(`${selectedDate}T12:00`).toLocaleDateString('es-CO', { dateStyle: 'full' })}
          actions={
            <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="input-field h-8 w-36 text-[13px]"
                aria-label="Fecha"
              />
              <select
                value={filterUser}
                onChange={e => setFilterUser(e.target.value)}
                className="input-field h-8 text-[13px] sm:w-44"
                aria-label="Empleado"
              >
                <option value="">Todos los empleados</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
          }
        />

        {records.length === 0 ? (
          <EmptyState
            icon={Clock}
            title="No hay registros para esta fecha"
            description="Las entradas y salidas del equipo aparecerán aquí."
          />
        ) : (
          <>
            <div className="divide-y divide-line-soft md:hidden">
              {records.map(r => {
                const status = STATUS[r.status] || { label: r.status, tone: 'neutral' };
                return (
                  <div key={r.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/10 text-[13px] font-semibold text-ink-brand">
                        {r.user?.name?.charAt(0) || '?'}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold text-ink">{r.user?.name || 'Usuario'}</p>
                        <p className="text-2xs text-ink-muted">{roleLabel(r.user?.role)}</p>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <Badge tone={status.tone}>{status.label}</Badge>
                      <p className="num mt-1 text-2xs text-ink-muted">
                        {timeLabel(r.checkIn)}{r.checkOut ? ` → ${timeLabel(r.checkOut)}` : ''}
                      </p>
                      {r.hours > 0 && <p className="num text-2xs font-semibold text-ink">{r.hours.toFixed(1)} h</p>}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Empleado</th>
                    <th>Rol</th>
                    <th>Estado</th>
                    <th className="text-right">Entrada</th>
                    <th className="text-right">Salida</th>
                    <th className="text-right">Horas</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map(r => {
                    const status = STATUS[r.status] || { label: r.status, tone: 'neutral' };
                    return (
                      <tr key={r.id}>
                        <td className="font-medium text-ink">{r.user?.name || 'Usuario'}</td>
                        <td className="text-ink-muted">{roleLabel(r.user?.role)}</td>
                        <td><Badge tone={status.tone}>{status.label}</Badge></td>
                        <td className="num text-right text-ink">{timeLabel(r.checkIn)}</td>
                        <td className="num text-right text-ink-muted">{timeLabel(r.checkOut)}</td>
                        <td className="num text-right font-medium text-ink">{r.hours > 0 ? `${r.hours.toFixed(1)}` : '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Panel>
    </div>
  );
}
