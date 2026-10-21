import React, { useState, useEffect, useCallback } from 'react';
import { apiGet } from '../lib/api.js';
import { ClipboardList, Filter, Calendar, ChevronDown } from 'lucide-react';
import { PageHeader } from './ui/PageHeader';
import { Panel } from './ui/Panel';
import { Badge } from './ui/Badge';
import { EmptyState } from './ui/EmptyState';
import { cn } from '../lib/utils';

const ENTITY_LABELS = {
  Product: 'Producto',
  InventoryItem: 'Insumo',
  User: 'Usuario',
  Order: 'Pedido',
  Category: 'Categoría',
  Table: 'Mesa',
  Settings: 'Configuración',
  Permission: 'Permiso',
  Supplier: 'Proveedor',
  Customer: 'Cliente',
  Reservation: 'Reserva',
};

const ACTION = {
  CREATE: { label: 'Creación', tone: 'ok' },
  UPDATE: { label: 'Edición', tone: 'info' },
  DELETE: { label: 'Eliminación', tone: 'danger' },
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
    } catch { /* sin datos */ }
    setLoading(false);
  }, [entityFilter, daysFilter]);

  // Carga asincrona: el setState ocurre tras el await, no en el render.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadLogs(); }, [loadLogs]);

  const entities = [...new Set(logs.map(l => l.entity))];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Auditoría"
        subtitle="Registro automático de cambios en productos, insumos, pedidos y usuarios."
      />

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[180px] flex-1 sm:max-w-xs">
          <Filter className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-soft" aria-hidden="true" />
          <select
            value={entityFilter}
            onChange={e => setEntityFilter(e.target.value)}
            className="input-field h-9 pl-8 text-[13px]"
            aria-label="Entidad"
          >
            <option value="">Todas las entidades</option>
            {entities.map(e => (
              <option key={e} value={e}>{ENTITY_LABELS[e] || e}</option>
            ))}
          </select>
        </div>
        <div className="relative">
          <Calendar className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-soft" aria-hidden="true" />
          <select
            value={daysFilter}
            onChange={e => setDaysFilter(e.target.value)}
            className="input-field h-9 pl-8 text-[13px]"
            aria-label="Periodo"
          >
            <option value="1">Hoy</option>
            <option value="7">7 días</option>
            <option value="30">30 días</option>
            <option value="90">90 días</option>
          </select>
        </div>
        <p className="ml-auto text-2xs text-ink-muted">
          {logs.length} {logs.length === 1 ? 'registro' : 'registros'}
        </p>
      </div>

      <Panel>
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : logs.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="No hay registros de auditoría"
            description="Los cambios se registran automáticamente al modificar productos, insumos, pedidos o usuarios."
          />
        ) : (
          <div className="divide-y divide-line-soft">
            {logs.map(log => {
              const action = ACTION[log.action] || { label: log.action, tone: 'neutral' };
              const isOpen = expanded === log.id;
              return (
                <div key={log.id}>
                  <button
                    onClick={() => setExpanded(isOpen ? null : log.id)}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-surface"
                    aria-expanded={isOpen}
                  >
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="flex min-w-0 flex-wrap items-center gap-1.5">
                        <Badge tone={action.tone}>{action.label}</Badge>
                        <span className="text-[13px] font-medium text-ink">{ENTITY_LABELS[log.entity] || log.entity}</span>
                        <span className="truncate font-mono text-2xs text-ink-soft">{log.entityId?.slice(0, 8)}…</span>
                      </span>
                      <span className="num mt-0.5 block text-2xs text-ink-muted sm:hidden">
                        {new Date(log.timestamp).toLocaleString('es-CO', {
                          day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
                        })}
                      </span>
                    </span>
                    <span className="hidden shrink-0 items-center gap-3 text-2xs text-ink-muted sm:flex">
                      <span className="num">
                        {new Date(log.timestamp).toLocaleString('es-CO', {
                          day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
                        })}
                      </span>
                      {log.userId && <span className="font-mono">{log.userId.slice(0, 8)}…</span>}
                    </span>
                    <ChevronDown className={cn('h-4 w-4 shrink-0 text-ink-soft transition-transform', isOpen && 'rotate-180')} aria-hidden="true" />
                  </button>

                  {isOpen && (
                    <div className="border-t border-line-soft px-4 pb-3 pt-3">
                      <p className="num mb-2 text-2xs text-ink-muted sm:hidden">
                        {new Date(log.timestamp).toLocaleString('es-CO')}
                      </p>
                      <div className="grid gap-3 md:grid-cols-2">
                        {log.before && (
                          <div>
                            <h4 className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-muted">Antes</h4>
                            <pre className="max-h-48 overflow-auto rounded-lg bg-surface p-3 font-mono text-2xs text-ink">{JSON.stringify(log.before, null, 2)}</pre>
                          </div>
                        )}
                        {log.after && (
                          <div>
                            <h4 className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-muted">Después</h4>
                            <pre className="max-h-48 overflow-auto rounded-lg bg-surface p-3 font-mono text-2xs text-ink">{JSON.stringify(log.after, null, 2)}</pre>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Panel>
    </div>
  );
}
