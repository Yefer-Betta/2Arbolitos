import React, { useState, useEffect, useCallback } from 'react';
import { apiGet, apiPost, apiDelete } from '../lib/api.js';
import { Shield, Check, X as XIcon } from 'lucide-react';
import { cn } from '../lib/utils';
import { useToast } from './ui/feedback-context';
import { Panel, PanelHeader } from './ui/Panel';
import { EmptyState } from './ui/EmptyState';

const ROLES = ['ADMIN', 'MANAGER', 'CASHIER', 'WAITER', 'COOK'];
const ROLE_LABELS = { ADMIN: 'Administrador', MANAGER: 'Gerente', CASHIER: 'Cajero', WAITER: 'Mesero', COOK: 'Cocinero' };

const PERMISSION_LABELS = {
  create_product: 'Crear productos',
  edit_product: 'Editar productos',
  delete_product: 'Eliminar productos',
  manage_inventory: 'Gestionar inventario',
  manage_orders: 'Gestionar pedidos',
  view_orders: 'Ver pedidos',
  view_reports: 'Ver reportes',
  view_audit: 'Ver auditoría',
  manage_users: 'Gestionar usuarios',
  manage_permissions: 'Gestionar permisos',
  manage_settings: 'Gestionar ajustes',
  manage_backup: 'Gestionar respaldos',
};

function permissionLabel(name) {
  const key = String(name || '').trim().toLowerCase();
  if (PERMISSION_LABELS[key]) return PERMISSION_LABELS[key];
  const spaced = key.replace(/_/g, ' ');
  return spaced.replace(/^./, c => c.toUpperCase());
}

export function PermissionManager() {
  const toast = useToast();
  const [permissions, setPermissions] = useState([]);
  const [rolePerms, setRolePerms] = useState({});
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const perms = await apiGet('/permissions');
      setPermissions(Array.isArray(perms) ? perms : []);

      const rp = {};
      for (const role of ROLES) {
        try {
          const data = await apiGet(`/roles/${role}/permissions`);
          rp[role] = Array.isArray(data) ? data.map(p => p.id) : [];
        } catch {
          rp[role] = [];
        }
      }
      setRolePerms(rp);
    } catch { /* sin datos */ }
    setLoading(false);
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadAll(); }, [loadAll]);

  const togglePermission = async (role, permissionId, has) => {
    if (role === 'ADMIN') return;
    try {
      if (has) {
        await apiDelete(`/roles/${role}/permissions/${permissionId}`);
        setRolePerms(prev => ({ ...prev, [role]: prev[role].filter(id => id !== permissionId) }));
      } else {
        await apiPost(`/roles/${role}/permissions`, { permissionId });
        setRolePerms(prev => ({ ...prev, [role]: [...prev[role], permissionId] }));
      }
    } catch (err) {
      toast.error('Error al cambiar permiso: ' + (err.message || 'desconocido'));
    }
  };

  if (loading) {
    return (
      <Panel>
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </Panel>
    );
  }

  return (
    <Panel>
      <PanelHeader
        title="Permisos por rol"
        subtitle="El administrador conserva todos los permisos; los demás roles se ajustan aquí."
      />

      {permissions.length === 0 ? (
        <EmptyState
          icon={Shield}
          title="No hay permisos definidos"
          description="Los permisos se crean junto con las funciones del sistema."
        />
      ) : (
        <>
          {/* Móvil: tarjeta por permiso con toggles por rol */}
          <div className="divide-y divide-line-soft md:hidden">
            {permissions.map(perm => (
              <div key={perm.id} className="px-4 py-3">
                <p className="text-[13px] font-semibold text-ink">{permissionLabel(perm.name)}</p>
                <div className="mt-2 grid grid-cols-2 gap-1.5">
                  {ROLES.map(role => {
                    const has = role === 'ADMIN' || rolePerms[role]?.includes(perm.id);
                    return (
                      <button
                        key={role}
                        disabled={role === 'ADMIN'}
                        onClick={() => togglePermission(role, perm.id, has)}
                        aria-pressed={has}
                        aria-label={`${has ? 'Quitar' : 'Dar'} permiso de ${permissionLabel(perm.name)} a ${ROLE_LABELS[role]}`}
                        className={cn(
                          'flex min-h-[38px] items-center justify-between gap-2 rounded-lg border px-2.5 text-2xs font-semibold transition-colors disabled:opacity-60',
                          has
                            ? 'border-ok/25 bg-ok-soft text-ok'
                            : 'border-line bg-surface text-ink-muted hover:text-ink'
                        )}
                      >
                        <span className="truncate">{ROLE_LABELS[role]}</span>
                        {has ? <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> : <XIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop: matriz */}
          <div className="hidden overflow-x-auto md:block">
            <table className="admin-table">
              <thead>
                <tr>
                  <th className="w-56">Permiso</th>
                  {ROLES.map(role => (
                    <th key={role} className="text-center">
                      <span className="inline-flex items-center gap-1">
                        <Shield className={cn('h-3 w-3', role === 'ADMIN' ? 'text-ink-brand' : 'text-ink-soft')} aria-hidden="true" />
                        {ROLE_LABELS[role]}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {permissions.map(perm => (
                  <tr key={perm.id}>
                    <td className="font-medium text-ink">{permissionLabel(perm.name)}</td>
                    {ROLES.map(role => {
                      const has = role === 'ADMIN' || rolePerms[role]?.includes(perm.id);
                      return (
                        <td key={role} className="text-center">
                          <button
                            disabled={role === 'ADMIN'}
                            onClick={() => togglePermission(role, perm.id, has)}
                            className={cn(
                              'mx-auto grid h-7 w-7 place-items-center rounded-lg transition-colors disabled:opacity-60',
                              has
                                ? 'bg-ok-soft text-ok hover:bg-ok-soft/70'
                                : 'bg-surface text-ink-soft hover:bg-line-soft hover:text-ink-muted'
                            )}
                            title={has ? `Quitar permiso a ${ROLE_LABELS[role]}` : `Dar permiso a ${ROLE_LABELS[role]}`}
                            aria-label={`${has ? 'Quitar' : 'Dar'} permiso de ${permissionLabel(perm.name)} a ${ROLE_LABELS[role]}`}
                            aria-pressed={has}
                          >
                            {has ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <XIcon className="h-3.5 w-3.5" aria-hidden="true" />}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Panel>
  );
}
