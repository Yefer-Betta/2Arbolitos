import React, { useState, useEffect, useCallback } from 'react';
import { apiGet, apiPost } from '../lib/api.js';
import { Clock, LogIn, LogOut, CalendarDays, Users, Search, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { useUser } from '../context/UserContext';

const STATUS_STYLES = {
  PRESENT: 'bg-green-100 text-green-800',
  LATE: 'bg-yellow-100 text-yellow-800',
  ABSENT: 'bg-red-100 text-red-800',
  HALF_DAY: 'bg-orange-100 text-orange-800',
};

export function AttendanceManager() {
  const { currentUser } = useUser();
  const [records, setRecords] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterUser, setFilterUser] = useState('');
  const [todayStatus, setTodayStatus] = useState({ checkedIn: false, checkedOut: false });

  const loadRecords = useCallback(async () => {
    try {
      const params = new URLSearchParams({ startDate: selectedDate, endDate: selectedDate });
      if (filterUser) params.set('userId', filterUser);
      const d = await apiGet(`/attendance?${params}`);
      setRecords(Array.isArray(d) ? d : []);
    } catch {}
  }, [selectedDate, filterUser]);

  const loadUsers = useCallback(async () => {
    try { const d = await apiGet('/users'); setUsers(Array.isArray(d) ? d : []); } catch {}
  }, []);

  const loadTodayStatus = useCallback(async () => {
    try { const d = await apiGet('/attendance/today'); setTodayStatus(d); } catch {}
  }, []);

  useEffect(() => { loadRecords(); loadUsers(); }, [loadRecords, loadUsers]);
  useEffect(() => { loadTodayStatus(); }, [loadTodayStatus]);

  const handleCheckIn = async () => {
    try {
      await apiPost('/attendance/check-in', {});
      loadTodayStatus();
      loadRecords();
    } catch (err) { alert('Error: ' + (err.message || '')); }
  };

  const handleCheckOut = async () => {
    try {
      await apiPost('/attendance/check-out', {});
      loadTodayStatus();
      loadRecords();
    } catch (err) { alert('Error: ' + (err.message || '')); }
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-3 bg-secondary/10 rounded-xl text-secondary">
          <Clock className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Asistencia</h1>
          <p className="text-sm text-gray-500">Registro de entrada y salida de empleados</p>
        </div>
      </div>

      {/* Check In/Out card */}
      <div className="card p-6 bg-gradient-to-br from-secondary/5 to-secondary/10 border border-secondary/20">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold text-gray-800 text-lg">{currentUser.name}</h2>
            <p className="text-sm text-gray-500">
              {!todayStatus.checkedIn
                ? 'Aún no has registrado tu entrada hoy'
                : todayStatus.checkedOut
                  ? 'Jornada completada'
                  : 'Jornada en curso'}
            </p>
            {todayStatus.checkedIn && !todayStatus.checkedOut && (
              <p className="text-xs text-gray-400 mt-1">
                Entrada: {new Date(todayStatus.record?.checkIn).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
            {todayStatus.checkedIn && todayStatus.checkedOut && (
              <p className="text-xs text-gray-400 mt-1">
                {new Date(todayStatus.record?.checkIn).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })} →{' '}
                {new Date(todayStatus.record?.checkOut).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })} ·{' '}
                {todayStatus.record?.hours?.toFixed(1)} horas
              </p>
            )}
          </div>
          <div className="flex gap-2">
            {!todayStatus.checkedIn && (
              <button onClick={handleCheckIn} className="btn-primary bg-green-600 hover:bg-green-700 flex items-center gap-2">
                <LogIn className="w-4 h-4" /> Marcar Entrada
              </button>
            )}
            {todayStatus.checkedIn && !todayStatus.checkedOut && (
              <button onClick={handleCheckOut} className="btn-primary bg-red-500 hover:bg-red-600 flex items-center gap-2">
                <LogOut className="w-4 h-4" /> Marcar Salida
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="input-field pl-10 w-full" />
        </div>
        <select value={filterUser} onChange={e => setFilterUser(e.target.value)} className="input-field max-w-xs">
          <option value="">Todos los empleados</option>
          {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
        </select>
      </div>

      {/* Records */}
      <div className="card overflow-hidden">
        {records.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium">No hay registros para esta fecha</p>
          </div>
        ) : (
          <div className="divide-y">
            {records.map(r => (
              <div key={r.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center text-secondary font-bold text-sm">
                    {r.user?.name?.charAt(0) || '?'}
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">{r.user?.name || 'Usuario'}</p>
                    <p className="text-xs text-gray-500">{r.user?.role}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[r.status] || ''}`}>{r.status}</span>
                  </div>
                  <p className="text-xs text-gray-500">
                    {new Date(r.checkIn).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                    {r.checkOut && ` → ${new Date(r.checkOut).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}`}
                  </p>
                  {r.hours > 0 && <p className="text-xs font-bold text-gray-700">{r.hours.toFixed(1)} horas</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
