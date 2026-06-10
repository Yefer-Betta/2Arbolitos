import React, { useState } from 'react';
import { UserManager } from '../context/UserManager';
import { PermissionManager } from './PermissionManager';
import { AttendanceManager } from './AttendanceManager';
import { Users, Shield, Clock } from 'lucide-react';
import { cn } from '../lib/utils';
import { useUser } from '../context/UserContext';

const ALL_SECTIONS = [
  { id: 'users', label: 'Usuarios', icon: Users, roles: ['ADMIN'] },
  { id: 'permissions', label: 'Permisos', icon: Shield, roles: ['ADMIN'] },
  { id: 'attendance', label: 'Asistencia', icon: Clock, roles: ['ADMIN', 'MANAGER'] },
];

export function AdminPanel() {
  const { currentUser } = useUser();
  const sections = ALL_SECTIONS.filter(s => s.roles.includes(currentUser.role));
  const [section, setSection] = useState(sections[0]?.id || 'attendance');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Administración</h2>
        <p className="text-gray-500 text-sm">Gestión del sistema</p>
      </div>

      <div className="flex gap-2 bg-white rounded-xl p-1.5 border border-gray-200 w-fit">
        {sections.map(s => {
          const Icon = s.icon;
          const active = section === s.id;
          return (
            <button
              key={s.id}
              onClick={() => setSection(s.id)}
              className={cn(
                'flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all',
                active ? 'bg-primary text-white shadow-md' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              )}
            >
              <Icon className="w-4 h-4" />
              {s.label}
            </button>
          );
        })}
      </div>

      {section === 'users' && <UserManager />}
      {section === 'permissions' && <PermissionManager />}
      {section === 'attendance' && <AttendanceManager />}
    </div>
  );
}
