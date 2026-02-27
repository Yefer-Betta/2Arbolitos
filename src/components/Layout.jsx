import React from 'react';
import { LayoutDashboard, Coffee, Settings, ShoppingCart, TrendingUp, Calculator } from 'lucide-react';
import { cn } from '../lib/utils';

export function Layout({ children, activeTab, setActiveTab }) {
    const navItems = [
        { id: 'pos', label: 'Pedidos', icon: ShoppingCart },
        { id: 'menu', label: 'Menú', icon: Coffee },
        { id: 'history', label: 'Historial', icon: LayoutDashboard },
        { id: 'finance', label: 'Contabilidad', icon: TrendingUp },
        { id: 'escandallo', label: 'Escandallo', icon: Calculator },
        { id: 'settings', label: 'Configuración', icon: Settings },
    ];

    return (
        <div className="flex h-screen bg-background text-gray-800 font-sans">
            {/* Sidebar with new Brand Colors */}
            <aside className="w-72 bg-primary text-white flex flex-col shadow-2xl z-10">
                <div className="p-8 border-b border-primary-light/30">
                    <h1 className="text-3xl font-bold font-sans tracking-tight flex items-center gap-2">
                        <span>2Arbolitos</span>
                    </h1>
                    <p className="text-primary-light/80 text-sm mt-1 font-medium">Gestión & Sabores</p>
                </div>

                <nav className="flex-1 p-6 space-y-3">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = activeTab === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => setActiveTab(item.id)}
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
                    <div className="flex items-center gap-3 bg-primary-dark/30 p-3 rounded-lg">
                        <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center text-secondary font-bold text-xs">A</div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">Administrador</p>
                            <p className="text-xs text-primary-light/70 truncate">v1.1.0 (Elegance)</p>
                        </div>
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
