import React, { useState } from 'react';
import { LayoutDashboard, Coffee, Settings, ShoppingCart, TrendingUp, Calculator, Menu, X, Utensils, LogOut, Users } from 'lucide-react';
import { cn } from '../lib/utils';
import { useUser } from '../context/UserContext';

import { useSettings } from '../context/SettingsContext';

export function Layout({ children, activeTab, setActiveTab }) {
    const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
    const { currentUser, logout } = useUser();
    const { business } = useSettings();

    const allTabs = [
        { id: 'pos', label: 'Pedidos', icon: ShoppingCart, roles: ['admin', 'waiter'] },
        { id: 'kitchen', label: 'Cocina', icon: Utensils, roles: ['admin', 'cook'] },
        { id: 'menu', label: 'Menú', icon: Coffee, roles: ['admin'] },
        { id: 'history', label: 'Historial', icon: LayoutDashboard, roles: ['admin', 'waiter'] },
        { id: 'finance', label: 'Contabilidad', icon: TrendingUp, roles: ['admin'] },
        { id: 'escandallo', label: 'Escandallo', icon: Calculator, roles: ['admin'] },
        { id: 'users', label: 'Usuarios', icon: Users, roles: ['admin'] },
        { id: 'settings', label: 'Configuración', icon: Settings, roles: ['admin'] },
    ];

    const navItems = allTabs.filter(tab => tab.roles.includes(currentUser.role));

    return (
        <div className="flex flex-col md:flex-row h-screen bg-background text-gray-800 font-sans">
            {/* Mobile top bar */}
            <header className="md:hidden flex items-center justify-between bg-primary text-white px-4 py-3 shadow">
                <button
                    onClick={() => setIsMobileNavOpen(true)}
                    className="p-2 rounded-lg hover:bg-primary-light/20 transition"
                    aria-label="Abrir menú"
                >
                    <Menu className="w-6 h-6" />
                </button>
                <div className="text-lg font-bold">
                    {business.logo ? <img src={business.logo} alt={business.name} className="h-8" /> : business.name}
                </div>
                <div className="w-10" />
            </header>

            {/* Sidebar with new Brand Colors */}
            {isMobileNavOpen && (
                <div className="fixed inset-0 bg-black/40 z-20 md:hidden" onClick={() => setIsMobileNavOpen(false)} />
            )}

            <aside
                className={cn(
                    "bg-primary text-white flex flex-col shadow-2xl z-30 md:relative fixed top-0 left-0 h-full w-72 md:translate-x-0 transform transition-transform duration-300",
                    isMobileNavOpen ? "translate-x-0" : "-translate-x-full",
                )}
            >
                <div className="p-8 border-b border-primary-light/30 flex items-start justify-between">
                    <div>
                        <h1 className="text-3xl font-bold font-sans tracking-tight flex items-center gap-2">
                            {business.logo ? <img src={business.logo} alt={business.name} className="h-10" /> : <span>{business.name}</span>}
                        </h1>
                        <p className="text-primary-light/80 text-sm mt-1 font-medium">Gestión & Sabores</p>
                    </div>
                    <button
                        onClick={() => setIsMobileNavOpen(false)}
                        className="md:hidden p-2 rounded-lg hover:bg-primary-light/20 transition"
                        aria-label="Cerrar menú"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <nav className="flex-1 p-6 space-y-3">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = activeTab === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => {
                                    setActiveTab(item.id);
                                    setIsMobileNavOpen(false);
                                }}
                                className={cn(
                                    "w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-300 text-left group",
                                    isActive
                                        ? "bg-secondary text-primary-dark font-bold shadow-lg shadow-black/10 scale-[1.02]"
                                        : "text-primary-surface hover:bg-primary-light/30 hover:text-white"
                                )}
                            >
                                <Icon className={cn("w-5 h-5 transition-transform group-hover:scale-110", isActive ? "text-primary-dark" : "text-secondary")} />
                                <span className="tracking-wide">{item.label}</span>
                            </button>
                        );
                    })}
                </nav>

                <div className="p-6 border-t border-primary-light/30">
                    <div className="flex items-center gap-3 bg-primary-dark/30 p-3 rounded-xl">
                        <div className="w-9 h-9 rounded-full bg-secondary/20 flex items-center justify-center text-secondary font-bold text-sm">
                            {currentUser.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0 leading-tight">
                            <p className="text-sm font-bold text-white truncate">{currentUser.name}</p>
                            <p className="text-xs text-primary-light/70 truncate">{currentUser.role}</p>
                        </div>
                        <button onClick={logout} className="p-2 text-primary-light/70 hover:text-white hover:bg-primary-light/20 rounded-full transition-colors" title="Cerrar Sesión">
                            <LogOut className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 overflow-auto relative">
                {/* Background Pattern */}
                <div className="absolute inset-0 bg-[radial-gradient(#1A4D2E_1px,transparent_1px)] [background-size:20px_20px] opacity-[0.03] pointer-events-none"></div>

                <div className="relative p-8 max-w-7xl mx-auto min-h-full">
                    {children}
                </div>
            </main>
        </div>
    );
}
