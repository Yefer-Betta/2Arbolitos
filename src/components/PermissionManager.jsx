import React, { useState, useEffect, useCallback } from 'react';
import { apiGet, apiPost, apiDelete } from '../lib/api.js';
import { Shield, Check, X as XIcon, ShieldCheck } from 'lucide-react';

const ROLES = ['ADMIN', 'MANAGER', 'CASHIER', 'WAITER', 'COOK'];
const ROLE_LABELS = { ADMIN: 'Administrador', MANAGER: 'Gerente', CASHIER: 'Cajero', WAITER: 'Mesero', COOK: 'Cocinero' };

export function PermissionManager() {
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
    } catch {}
    setLoading(false);
  }, []);

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
      alert('Error al cambiar permiso: ' + (err.message || 'desconocido'));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Permisos por Rol</h2>
          <p className="text-gray-500 text-sm">Asigna qué permisos tiene cada rol del sistema</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-xl text-sm font-medium">
          <ShieldCheck className="w-5 h-5" />
          ADMIN tiene todos los permisos
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-surface">
              <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase w-48">Permiso</th>
              {ROLES.map(role => (
                <th key={role} className="px-3 py-3 text-xs font-bold text-gray-500 uppercase text-center">
                  <div className="flex flex-col items-center gap-1">
                    <Shield className={`w-4 h-4 ${role === 'ADMIN' ? 'text-primary' : 'text-gray-400'}`} />
                    <span>{ROLE_LABELS[role]}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {permissions.map(perm => (
              <tr key={perm.id} className="hover:bg-gray-50">
                <td className="px-4 py-4 font-medium text-sm text-gray-800">{perm.name.replace(/_/g, ' ')}</td>
                {ROLES.map(role => {
                  const has = role === 'ADMIN' || rolePerms[role]?.includes(perm.id);
                  return (
                    <td key={role} className="px-3 py-4 text-center">
                      <button
                        disabled={role === 'ADMIN'}
                        onClick={() => togglePermission(role, perm.id, has)}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center mx-auto transition-all ${
                          has
                            ? 'bg-green-100 text-green-700 hover:bg-green-200 disabled:opacity-60'
                            : 'bg-gray-100 text-gray-400 hover:bg-gray-200 disabled:opacity-60'
                        }`}
                        title={has ? `Quitar permiso a ${ROLE_LABELS[role]}` : `Dar permiso a ${ROLE_LABELS[role]}`}
                      >
                        {has ? <Check className="w-4 h-4" /> : <XIcon className="w-4 h-4" />}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {permissions.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400 bg-white rounded-3xl border border-dashed border-gray-200">
          <Shield className="w-12 h-12 opacity-20 mb-4" />
          <p className="font-medium">No hay permisos definidos</p>
        </div>
      )}
    </div>
  );
}
