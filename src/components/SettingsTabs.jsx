import React from 'react';
import { Building, Smartphone, Database, Server } from 'lucide-react';
import { SubNav } from './ui/SubNav';

const TABS = [
    { id: 'negocio', label: 'Negocio', icon: Building },
    { id: 'movil', label: 'Acceso móvil', shortLabel: 'Móvil', icon: Smartphone },
    { id: 'datos', label: 'Datos', icon: Database },
    { id: 'servidor', label: 'Servidor', icon: Server },
];

export function SettingsTabs({ activeTab, setActiveTab }) {
    return <SubNav items={TABS} value={activeTab} onChange={setActiveTab} />;
}
