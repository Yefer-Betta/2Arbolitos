import React, { useState } from 'react';
import {
    AlertCircle,
    ChefHat,
    Eye,
    EyeOff,
    Loader2,
    Receipt,
    ShoppingBag,
    Wifi,
    WifiOff,
} from 'lucide-react';
import { useUser } from '../context/UserContext';
import { syncManager } from '../lib/syncManager.js';

const HIGHLIGHTS = [
    { icon: ShoppingBag, text: 'Pedidos de mesa, para llevar y domicilio' },
    { icon: ChefHat, text: 'Cocina sincronizada en tiempo real' },
    { icon: Receipt, text: 'Caja, cierres y respaldo automático' },
];

export function LoginScreen() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { login } = useUser();

    const friendlyError = (msg) => {
        if (!msg) return 'Usuario o contraseña incorrectos.';
        const m = msg.toLowerCase();
        if (m.includes('fetch') || m.includes('network') || m.includes('502') || m.includes('503') || m.includes('request failed')) {
            return 'No se puede conectar con el servidor. Espera 10 segundos y vuelve a intentar.';
        }
        return msg;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        if (!syncManager.isOnline) {
            setError('El login requiere conexión. Por favor verifica tu red.');
            setIsLoading(false);
            return;
        }

        const result = await login(username, password);

        if (!result.success) {
            setError(friendlyError(result.error));
        }

        setIsLoading(false);
    };

    return (
        <div className="grid min-h-dvh bg-background lg:grid-cols-[1.05fr_1fr]">
            {/* Panel de marca */}
            <aside className="relative hidden overflow-hidden bg-primary-dark p-12 text-white lg:flex lg:flex-col">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#D4A373_1px,transparent_1px)] [background-size:22px_22px] opacity-[0.08]" />

                <div className="relative flex items-center gap-3">
                    <div className="rounded-xl bg-background px-2 py-1.5">
                        <img src="./logo.png" alt="" className="h-11 w-auto" />
                    </div>
                    <div>
                        <p className="text-sm font-semibold leading-tight">2Arbolitos</p>
                        <p className="text-2xs text-white/45">Punto de venta</p>
                    </div>
                </div>

                <div className="relative my-auto max-w-md py-12">
                    <h2 className="text-3xl font-semibold leading-tight tracking-tight">
                        El turno completo,
                        <br />
                        en una sola pantalla.
                    </h2>
                    <ul className="mt-8 space-y-4">
                        {HIGHLIGHTS.map((item) => {
                            const HighlightIcon = item.icon;
                            return (
                                <li key={item.text} className="flex items-center gap-3 text-sm text-white/70">
                                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/10 text-secondary">
                                        <HighlightIcon className="h-4 w-4" aria-hidden="true" />
                                    </span>
                                    {item.text}
                                </li>
                            );
                        })}
                    </ul>
                </div>

                <p className="relative text-2xs text-white/35">
                    Uso interno del restaurante · Los datos se sincronizan aunque se corte la red
                </p>
            </aside>

            {/* Formulario */}
            <div className="flex items-center justify-center px-5 py-10 pt-[calc(2.5rem+env(safe-area-inset-top))] pb-[calc(2.5rem+env(safe-area-inset-bottom))]">
                <div className="w-full max-w-[360px]">
                    <div className="mb-8 flex items-center justify-center gap-2.5 lg:hidden">
                        <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-xs font-bold text-white">
                            2A
                        </span>
                        <span className="text-lg font-semibold tracking-tight text-ink">2Arbolitos</span>
                    </div>

                    <h1 className="text-2xl font-semibold tracking-tight text-ink">Iniciar sesión</h1>
                    <p className="mt-1 text-sm text-ink-muted">Ingresa con tu usuario del equipo.</p>

                    <form onSubmit={handleSubmit} className="mt-7 space-y-4">
                        <div>
                            <label htmlFor="login-username" className="mb-1.5 block text-xs font-semibold text-ink-muted">
                                Usuario
                            </label>
                            <input
                                id="login-username"
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="input-field"
                                autoFocus
                                disabled={isLoading}
                                autoComplete="username"
                                aria-invalid={!!error}
                                aria-describedby={error ? 'login-error' : undefined}
                            />
                        </div>

                        <div>
                            <label htmlFor="login-password" className="mb-1.5 block text-xs font-semibold text-ink-muted">
                                Contraseña
                            </label>
                            <div className="relative">
                                <input
                                    id="login-password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="input-field pr-11"
                                    disabled={isLoading}
                                    autoComplete="current-password"
                                    aria-invalid={!!error}
                                    aria-describedby={error ? 'login-error' : undefined}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword((v) => !v)}
                                    className="absolute right-1 top-1 grid h-9 w-9 place-items-center rounded-lg text-ink-soft transition-colors hover:bg-surface hover:text-ink"
                                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                                    tabIndex={-1}
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        {error ? (
                            <div
                                id="login-error"
                                role="alert"
                                className="flex items-start gap-2 rounded-xl border border-danger/20 bg-danger-soft px-3 py-2 text-xs text-danger"
                            >
                                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                                <span>{error}</span>
                            </div>
                        ) : null}

                        <button type="submit" className="btn-primary mt-2 w-full" disabled={isLoading}>
                            {isLoading ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                                    Ingresando...
                                </>
                            ) : (
                                'Ingresar'
                            )}
                        </button>
                    </form>

                    <div className="mt-8 flex items-center justify-between border-t border-line pt-4">
                        <span className="flex items-center gap-1.5 text-2xs text-ink-muted">
                            {syncManager.isOnline ? (
                                <>
                                    <Wifi className="h-3.5 w-3.5 text-ok" aria-hidden="true" />
                                    Servidor conectado
                                </>
                            ) : (
                                <>
                                    <WifiOff className="h-3.5 w-3.5 text-danger" aria-hidden="true" />
                                    Sin conexión
                                </>
                            )}
                        </span>
                        <span className="text-2xs text-ink-soft">2Arbolitos POS</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
