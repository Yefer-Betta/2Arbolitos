import React from 'react';
import { Building, Smartphone, Database, Server } from 'lucide-react';
import { cn } from '../lib/utils';

const TABS = [
    { id: 'negocio', label: 'Negocio', icon: Building, color: 'primary' },
    { id: 'movil', label: 'Móvil', icon: Smartphone, color: 'purple' },
    { id: 'datos', label: 'Datos', icon: Database, color: 'red' },
    { id: 'servidor', label: 'Servidor', icon: Server, color: 'gray' },
];

const COLOR_STYLES = {
    primary: {
        active: 'bg-primary text-white shadow-lg shadow-primary/30',
        icon: 'text-primary',
        iconActive: 'text-white',
    },
    purple: {
        active: 'bg-purple-600 text-white shadow-lg shadow-purple-600/30',
        icon: 'text-purple-600',
        iconActive: 'text-white',
    },
    red: {
        active: 'bg-red-600 text-white shadow-lg shadow-red-600/30',
        icon: 'text-red-600',
        iconActive: 'text-white',
    },
    gray: {
        active: 'bg-gray-700 text-white shadow-lg shadow-gray-700/30',
        icon: 'text-gray-600',
        iconActive: 'text-white',
    },
};

export function SettingsTabs({ activeTab, setActiveTab }) {
    return (
        <div className="bg-white rounded-2xl shadow-sm border border-black/5 p-2 sticky top-0 z-10 backdrop-blur-sm bg-white/95">
            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                {TABS.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    const styles = COLOR_STYLES[tab.color];
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                "flex-1 min-w-[100px] sm:min-w-[140px] md:min-w-0 flex items-center justify-center gap-2 px-4 py-3 md:py-4 rounded-xl font-semibold transition-all duration-200 whitespace-nowrap text-sm md:text-base",
                                isActive
                                    ? styles.active
                                    : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                            )}
                        >
                            <Icon className={cn("w-4 h-4 md:w-5 md:h-5 flex-shrink-0", isActive ? styles.iconActive : styles.icon)} />
                            <span>{tab.label}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
