import React, { useState, useEffect } from 'react';
import { Menu, X, LogOut, Clock, Wifi, WifiOff, RefreshCw, Moon, Sun } from 'lucide-react';
import { cn } from '../lib/utils';
import { useUser } from '../context/UserContext';
import { useTheme } from '../context/ThemeContext';
import { syncManager } from '../lib/syncManager.js';
import { allTabs } from '../lib/tabs';

export function Layout({ children, activeTab, setActiveTab }) {
    const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
    const [isOnline, setIsOnline] = useState(syncManager.isOnline);
    const [pendingChanges, setPendingChanges] = useState(0);
    const [isSyncing, setIsSyncing] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());
    const { currentUser, logout } = useUser();
    const { isDark, toggleTheme } = useTheme();
    useEffect(() => {
        const unsubscribe = syncManager.addListener((event, data) => {
            if (event === 'online') {
                setIsOnline(true);
            } else if (event === 'offline') {
                setIsOnline(false);
            } else if (event === 'change') {
                setPendingChanges(data);
            } else if (event === 'syncing') {
                setIsSyncing(data);
            } else if (event === 'syncComplete') {
                setPendingChanges(0);
                setIsSyncing(false);
            }
        });

        setPendingChanges(syncManager.getPendingCount());

        const timer = setInterval(() => setCurrentTime(new Date()), 1000);

        return () => {
            clearInterval(timer);
            unsubscribe();
        };
    }, []);

    const handleSync = async () => {
        if (isOnline && !isSyncing) {
            setIsSyncing(true);
            await syncManager.syncNow();
            setIsSyncing(false);
        }
    };

    const userPerms = currentUser.permissions || [];

    const navItems = allTabs.filter(tab =>
        tab.roles.includes(currentUser.role) ||
        tab.permissions.some(p => userPerms.includes(p))
    );

    return (
        <div className="flex flex-col md:flex-row h-screen bg-background text-gray-800 font-sans">
            {/* Skip link for keyboard users */}
            <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:bg-white focus:text-gray-900 focus:px-4 focus:py-2 focus:rounded-lg focus:shadow-lg focus:text-sm focus:font-bold"
            >
                Saltar al contenido principal
            </a>
            {/* Mobile top bar */}
            <header className="md:hidden flex items-center justify-between bg-primary text-white px-4 py-3 shadow">
                <button
                    onClick={() => setIsMobileNavOpen(true)}
                    className="p-2 rounded-lg hover:bg-primary-light/20 transition"
                    aria-label="Abrir menú"
                    aria-expanded={isMobileNavOpen}
                    aria-controls="mobile-nav"
                >
                    <Menu className="w-6 h-6" />
                </button>
                <div className="text-lg font-bold flex items-center justify-center">
                    <img src="./logo-light.png" alt="2Arbolitos" className="h-10 w-auto" />
                </div>
                
                {/* Connection status on mobile */}
                <div className="flex items-center gap-2" aria-label={isOnline ? 'Conexión: online' : 'Conexión: offline'}>
                    {isOnline ? (
                        <Wifi className="w-4 h-4 text-green-400" aria-hidden="true" />
                    ) : (
                        <WifiOff className="w-4 h-4 text-red-400" aria-hidden="true" />
                    )}
                    <span className="sr-only">{isOnline ? 'Online' : 'Offline'}</span>
                </div>
            </header>

            {/* Sidebar with new Brand Colors */}
            {isMobileNavOpen && (
                <div className="fixed inset-0 bg-black/40 z-20 md:hidden" onClick={() => setIsMobileNavOpen(false)} />
            )}

            <aside
                id="mobile-nav"
                className={cn(
                    "bg-primary text-white flex flex-col shadow-2xl z-30 md:relative fixed top-0 left-0 h-dvh w-72 md:w-56 lg:w-72 md:translate-x-0 transform transition-transform duration-300 overflow-hidden",
                    isMobileNavOpen ? "translate-x-0" : "-translate-x-full",
                )}
            >
                <div className="p-6 border-b border-primary-light/30 flex flex-col items-center gap-3 relative">
                    <button
                        onClick={() => setIsMobileNavOpen(false)}
                        className="md:hidden absolute top-4 right-4 p-2 rounded-lg hover:bg-primary-light/20 transition"
                        aria-label="Cerrar menú"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <div className="flex items-center gap-2">
                        <img src="./logo-light.png" alt="2Arbolitos" className="h-16 w-auto" />
                        <div className={cn(
                            "flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                            isOnline ? "bg-green-500/20 text-green-300" : "bg-red-500/20 text-red-300"
                        )}>
                            {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                            <span>{isOnline ? 'Online' : 'Offline'}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 text-sm font-mono">
                        <span className="font-bold text-white tracking-widest">PUNTO DE VENTA</span>
                        <span className="text-white/40">·</span>
                        <span className="font-bold text-secondary tracking-wider">
                            {currentTime.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="text-secondary/80 text-[10px]">
                            {currentTime.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' })}
                        </span>
                    </div>
                </div>

                {/* Connection Status Bar */}
                <div className="px-4 py-3 mx-4 mt-2 rounded-lg bg-primary-dark/30 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {isOnline ? (
                            <>
                                <Wifi className="w-4 h-4 text-green-400" />
                                <span className="text-xs text-green-400 font-medium">Online</span>
                            </>
                        ) : (
                            <>
                                <WifiOff className="w-4 h-4 text-red-400" />
                                <span className="text-xs text-red-400 font-medium">Offline</span>
                            </>
                        )}
                    </div>

                    <div className="flex items-center gap-1">
                        {isOnline && (
                            <button
                                onClick={handleSync}
                                disabled={isSyncing}
                                className={cn(
                                    "flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors",
                                    pendingChanges > 0 
                                        ? "bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30" 
                                        : "bg-green-500/20 text-green-400"
                                )}
                            >
                                <RefreshCw className={cn("w-3 h-3", isSyncing && "animate-spin")} />
                                {pendingChanges > 0 ? `${pendingChanges} pendiente${pendingChanges > 1 ? 's' : ''}` : 'Sincronizado'}
                            </button>
                        )}
                        <button
                            onClick={toggleTheme}
                            className="p-2 rounded-lg text-white/70 hover:bg-primary-light/20 hover:text-white transition-colors"
                            title={isDark ? 'Modo claro' : 'Modo oscuro'}
                            aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
                        >
                            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                        </button>
                    </div>
                </div>

                <nav className="flex-1 p-4 space-y-1 overflow-y-auto scrollbar-thin">
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
                                    "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-left",
                                    isActive
                                        ? "bg-secondary text-primary-dark font-bold shadow-lg"
                                        : "text-primary-surface hover:bg-primary-light/30 hover:text-white"
                                )}
                            >
                                <Icon className={cn("w-5 h-5", isActive ? "text-primary-dark" : "text-secondary")} />
                                <span className="tracking-wide text-sm">{item.label}</span>
                            </button>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-primary-light/30">
                    <div className="flex items-center gap-3 bg-primary-dark/30 p-3 rounded-xl">
                        <div className="w-9 h-9 rounded-full bg-secondary/20 flex items-center justify-center text-secondary font-bold text-sm">
                            {currentUser.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0 leading-tight">
                            <p className="text-sm font-bold text-white truncate">{currentUser.name}</p>
                            <p className="text-xs text-white/70 truncate">{currentUser.role}</p>
                        </div>
                        <button 
                            onClick={logout} 
                            className="p-2 text-white/70 hover:text-white hover:bg-primary-light/20 rounded-full transition-colors" 
                            title="Cerrar Sesión"
                            aria-label="Cerrar sesión"
                        >
                            <LogOut className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <main id="main-content" tabIndex={-1} className="flex-1 overflow-auto relative outline-none">
                {/* Background Pattern */}
                <div className="absolute inset-0 bg-[radial-gradient(#1A4D2E_1px,transparent_1px)] [background-size:20px_20px] opacity-[0.03] pointer-events-none"></div>

                <div className="relative p-6 md:p-8 max-w-7xl mx-auto min-h-full">
                    {children}
                </div>
            </main>
        </div>
    );
}
