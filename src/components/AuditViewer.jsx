import React, { useState, useEffect, useCallback } from 'react';
import { apiGet } from '../lib/api.js';
import { ClipboardList, Search, Filter, Calendar, User, Activity } from 'lucide-react';

const ENTITY_LABELS = {
  Product: 'Producto',
  InventoryItem: 'Insumo',
  User: 'Usuario',
  Order: 'Pedido',
  Category: 'Categoría',
  Table: 'Mesa',
  Settings: 'Configuración',
  Permission: 'Permiso',
};

const ACTION_COLORS = {
  CREATE: 'text-green-600 bg-green-50',
  UPDATE: 'text-blue-600 bg-blue-50',
  DELETE: 'text-red-600 bg-red-50',
};

export function AuditViewer() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [entityFilter, setEntityFilter] = useState('');
  const [daysFilter, setDaysFilter] = useState('7');
  const [expanded, setExpanded] = useState(null);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (entityFilter) params.set('entity', entityFilter);
      if (daysFilter) params.set('days', daysFilter);
      params.set('limit', '200');
      const data = await apiGet(`/audit?${params.toString()}`);
      setLogs(Array.isArray(data) ? data : []);
    } catch {}
    setLoading(false);
  }, [entityFilter, daysFilter]);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  const entities = [...new Set(logs.map(l => l.entity))];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Registro de Auditoría</h2>
          <p className="text-gray-500 text-sm">Cambios realizados en el sistema</p>
        </div>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <select
            value={entityFilter}
            onChange={e => setEntityFilter(e.target.value)}
            className="input-field pl-10"
          >
            <option value="">Todas las entidades</option>
            {entities.map(e => (
              <option key={e} value={e}>{ENTITY_LABELS[e] || e}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-400" />
          <select value={daysFilter} onChange={e => setDaysFilter(e.target.value)} className="input-field w-32">
            <option value="1">Hoy</option>
            <option value="7">7 días</option>
            <option value="30">30 días</option>
            <option value="90">90 días</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      ) : logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400 bg-white rounded-3xl border border-dashed border-gray-200">
          <ClipboardList className="w-12 h-12 opacity-20 mb-4" />
          <p className="font-medium">No hay registros de auditoría</p>
          <p className="text-sm">Los cambios se registrarán automáticamente al modificar productos, insumos, etc.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map(log => (
            <div key={log.id} className="card bg-white overflow-hidden">
              <button
                onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors text-left"
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-600'}`}>
                  <Activity className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-600'}`}>
                      {log.action}
                    </span>
                    <span className="font-medium text-sm text-gray-800">{ENTITY_LABELS[log.entity] || log.entity}</span>
                    <span className="text-xs font-mono text-gray-400">{log.entityId?.slice(0, 8)}...</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(log.timestamp).toLocaleString('es-CO')}
                    </span>
                    {log.userId && (
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {log.userId.slice(0, 8)}...
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-gray-300">
                  <svg className={`w-5 h-5 transition-transform ${expanded === log.id ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {expanded === log.id && (
                <div className="px-4 pb-4 pt-0 border-t border-gray-100">
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {log.before && (
                      <div>
                        <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Antes</h4>
                        <pre className="bg-gray-50 rounded-lg p-3 text-xs overflow-auto max-h-48">{JSON.stringify(log.before, null, 2)}</pre>
                      </div>
                    )}
                    {log.after && (
                      <div>
                        <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Después</h4>
                        <pre className="bg-gray-50 rounded-lg p-3 text-xs overflow-auto max-h-48">{JSON.stringify(log.after, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
