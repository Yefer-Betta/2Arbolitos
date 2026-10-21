import React, { useState, useEffect } from 'react';
import { Menu, X, LogOut, Wifi, WifiOff, RefreshCw, Moon, Sun } from 'lucide-react';
import { cn } from '../lib/utils';
import { useUser } from '../context/UserContext';
import { useTheme } from '../context/ThemeContext';
import { syncManager } from '../lib/syncManager.js';
import { allTabs, groupTabs } from '../lib/tabs';

const ROLE_LABELS = {
    ADMIN: 'Administrador',
    MANAGER: 'Gerente',
    CASHIER: 'Cajero',
    WAITER: 'Mesero',
    COOK: 'Cocina',
};

/** Reloj aislado para que el layout no se vuelva a pintar cada segundo. */
function Clock() {
    const [now, setNow] = useState(() => new Date());

    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 30000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="flex items-baseline gap-2">
            <span className="num text-lg font-semibold leading-none text-white">
                {now.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false })}
            </span>
            <span className="text-2xs text-white/45">
                {now.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' })}
            </span>
        </div>
    );
}

export function Layout({ children, activeTab, setActiveTab }) {
    const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
    const [isOnline, setIsOnline] = useState(syncManager.isOnline);
    const [pendingChanges, setPendingChanges] = useState(() => syncManager.getPendingCount());
    const [isSyncing, setIsSyncing] = useState(false);
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

        return () => {
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
    const sections = groupTabs(navItems);
    const activeItem = navItems.find(tab => tab.id === activeTab);
    const isFullHeight = activeTab === 'pos' || activeTab === 'kitchen';

    const goTo = (id) => {
        setActiveTab(id);
        setIsMobileNavOpen(false);
    };

    return (
        <div className="flex h-dvh flex-col overflow-hidden bg-background font-sans text-ink md:flex-row">
            {/* Skip link for keyboard users */}
            <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-[100] focus:rounded-lg focus:bg-background-paper focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-ink focus:shadow-pop"
            >
                Saltar al contenido principal
            </a>

            {/* Mobile top bar */}
            <header className="flex h-12 flex-none items-center gap-1 bg-primary-dark px-1.5 text-white md:hidden">
                <button
                    onClick={() => setIsMobileNavOpen(true)}
                    className="grid h-11 w-11 place-items-center rounded-lg transition hover:bg-white/10 active:bg-white/15"
                    aria-label="Abrir menú"
                    aria-expanded={isMobileNavOpen}
                    aria-controls="mobile-nav"
                >
                    <Menu className="h-5 w-5" />
                </button>
                <span className="truncate text-sm font-semibold">{activeItem?.label || '2Arbolitos'}</span>
                <span
                    className="ml-auto flex items-center gap-1.5 pr-2"
                    aria-label={isOnline ? 'Conexión: online' : 'Conexión: offline'}
                >
                    {isOnline ? (
                        <Wifi className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                    ) : (
                        <WifiOff className="h-4 w-4 text-red-400" aria-hidden="true" />
                    )}
                </span>
            </header>

            {isMobileNavOpen && (
                <div
                    className="fixed inset-0 z-30 bg-black/40 md:hidden"
                    onClick={() => setIsMobileNavOpen(false)}
                />
            )}

            <aside
                id="mobile-nav"
                className={cn(
                    'fixed inset-y-0 left-0 z-40 flex w-[264px] flex-col bg-primary-dark text-white transition-transform duration-200 md:relative md:z-0 md:w-[248px] md:translate-x-0',
                    isMobileNavOpen ? 'translate-x-0' : '-translate-x-full'
                )}
            >
                <div className="flex items-center gap-3 px-4 pb-2 pt-[calc(1rem+env(safe-area-inset-top))]">
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-background text-xs font-bold text-primary-dark">
                        2A
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold leading-tight">2Arbolitos</p>
                        <p className="text-2xs text-white/45">Punto de venta</p>
                    </div>
                    <button
                        onClick={() => setIsMobileNavOpen(false)}
                        className="grid h-11 w-11 place-items-center rounded-lg hover:bg-white/10 md:hidden"
                        aria-label="Cerrar menú"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="px-4 pb-3">
                    <Clock />
                </div>

                <nav className="flex-1 overflow-y-auto px-2 pb-3 scrollbar-thin">
                    {sections.map(section => (
                        <div key={section.label}>
                            <p className="px-3 pb-0.5 pt-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/35">
                                {section.label}
                            </p>
                            {section.items.map(item => {
                                const Icon = item.icon;
                                const isActive = activeTab === item.id;
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => goTo(item.id)}
                                        aria-current={isActive ? 'page' : undefined}
                                        className={cn(
                                            'group relative flex min-h-8 w-full items-center gap-2.5 rounded-lg px-3 py-1.5 text-left text-[13px] transition-colors',
                                            isActive
                                                ? 'bg-white/10 font-semibold text-white'
                                                : 'text-white/60 hover:bg-white/5 hover:text-white'
                                        )}
                                    >
                                        {isActive && (
                                            <span className="absolute bottom-1.5 left-0 top-1.5 w-[3px] rounded-full bg-secondary" />
                                        )}
                                        <Icon
                                            className={cn(
                                                'h-[18px] w-[18px] shrink-0',
                                                isActive ? 'text-secondary' : 'text-white/40 group-hover:text-white/70'
                                            )}
                                            aria-hidden="true"
                                        />
                                        <span className="truncate">{item.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    ))}
                </nav>

                <div className="border-t border-white/10 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3">
                    <div className="mb-2 flex items-center gap-2 rounded-lg bg-white/5 px-2.5 py-1.5">
                        <span
                            className={cn('h-2 w-2 shrink-0 rounded-full', isOnline ? 'bg-emerald-400' : 'bg-red-400')}
                            aria-hidden="true"
                        />
                        <span className="flex-1 truncate text-xs text-white/60">
                            {isOnline ? 'En línea' : 'Sin conexión'}
                        </span>

                        {isOnline && (
                            <button
                                onClick={handleSync}
                                disabled={isSyncing}
                                className={cn(
                                    'flex items-center gap-1 rounded-md px-1.5 py-1 text-2xs font-semibold transition-colors',
                                    pendingChanges > 0
                                        ? 'bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30'
                                        : 'text-white/50 hover:bg-white/10 hover:text-white'
                                )}
                                title={pendingChanges > 0 ? `${pendingChanges} cambios pendientes` : 'Sincronizado'}
                                aria-label="Sincronizar ahora"
                            >
                                <RefreshCw className={cn('h-3.5 w-3.5', isSyncing && 'animate-spin')} />
                                {pendingChanges > 0 ? pendingChanges : null}
                            </button>
                        )}

                        <button
                            onClick={toggleTheme}
                            className="grid h-7 w-7 place-items-center rounded-md text-white/50 transition-colors hover:bg-white/10 hover:text-white"
                            title={isDark ? 'Modo claro' : 'Modo oscuro'}
                            aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
                        >
                            {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
                        </button>
                    </div>

                    <div className="flex items-center gap-2.5">
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-secondary/20 text-xs font-semibold text-secondary">
                            {currentUser.name.charAt(0)}
                        </span>
                        <div className="min-w-0 flex-1 leading-tight">
                            <p className="truncate text-xs font-semibold text-white">{currentUser.name}</p>
                            <p className="truncate text-2xs text-white/45">{ROLE_LABELS[currentUser.role] || currentUser.role}</p>
                        </div>
                        <button
                            onClick={logout}
                            className="grid h-9 w-9 place-items-center rounded-lg text-white/50 transition-colors hover:bg-white/10 hover:text-white"
                            title="Cerrar sesión"
                            aria-label="Cerrar sesión"
                        >
                            <LogOut className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </aside>

            <main id="main-content" tabIndex={-1} className="relative min-h-0 flex-1 overflow-y-auto outline-none">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#1A4D2E_1px,transparent_1px)] [background-size:20px_20px] opacity-[0.025]" />

                <div
                    className={cn(
                        'relative mx-auto w-full max-w-[1500px] p-4 pb-[calc(5.25rem+env(safe-area-inset-bottom))] sm:p-6 md:pb-8 lg:p-8',
                        isFullHeight && 'md:h-full'
                    )}
                >
                    {children}
                </div>
            </main>

            <nav
                aria-label="Navegación principal"
                className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-background-paper pb-[env(safe-area-inset-bottom)] md:hidden"
            >
                <div className="flex items-stretch">
                    {navItems.slice(0, 4).map((item) => {
                        const Icon = item.icon;
                        const isActive = activeTab === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => goTo(item.id)}
                                aria-current={isActive ? 'page' : undefined}
                                className={cn(
                                    'relative flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors',
                                    isActive ? 'text-ink-brand' : 'text-ink-muted active:bg-surface'
                                )}
                            >
                                {isActive && <span className="absolute top-0 h-0.5 w-8 rounded-full bg-primary" />}
                                <Icon className="h-5 w-5" aria-hidden="true" />
                                <span className="max-w-full truncate px-1">{item.label}</span>
                            </button>
                        );
                    })}
                    {navItems.length > 4 && (
                        <button
                            onClick={() => setIsMobileNavOpen(true)}
                            aria-label="Más opciones"
                            aria-expanded={isMobileNavOpen}
                            className="relative flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium text-ink-muted active:bg-surface"
                        >
                            <Menu className="h-5 w-5" aria-hidden="true" />
                            <span>Más</span>
                        </button>
                    )}
                </div>
            </nav>
        </div>
    );
}
