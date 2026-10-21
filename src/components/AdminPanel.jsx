import React, { useState } from 'react';
import { UserManager } from '../context/UserManager';
import { PermissionManager } from './PermissionManager';
import { AttendanceManager } from './AttendanceManager';
import { Users, Shield, Clock } from 'lucide-react';
import { PageHeader } from './ui/PageHeader';
import { SubNav } from './ui/SubNav';
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
    <div className="space-y-4">
      <PageHeader
        title="Administración"
        subtitle="Usuarios, permisos por rol y control de asistencia."
      />

      <SubNav items={sections} value={section} onChange={setSection} />

      {section === 'users' && <UserManager />}
      {section === 'permissions' && <PermissionManager />}
      {section === 'attendance' && <AttendanceManager />}
    </div>
  );
}
