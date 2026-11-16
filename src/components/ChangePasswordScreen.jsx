import React, { useState } from 'react';
import { AlertCircle, Eye, EyeOff, KeyRound, Loader2, LogOut } from 'lucide-react';
import { useUser } from '../context/UserContext';

export function ChangePasswordScreen() {
    const { currentUser, changePassword, logout } = useUser();
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (newPassword.length < 8) {
            setError('La nueva contraseña debe tener al menos 8 caracteres.');
            return;
        }
        if (newPassword !== confirmPassword) {
            setError('La confirmación no coincide con la nueva contraseña.');
            return;
        }
        if (newPassword === currentPassword) {
            setError('La nueva contraseña debe ser distinta a la actual.');
            return;
        }

        setIsLoading(true);
        const result = await changePassword(currentPassword, newPassword);
        if (!result.success) {
            setError(result.error || 'No se pudo cambiar la contraseña.');
        }
        setIsLoading(false);
    };

    return (
        <div className="grid min-h-dvh bg-background lg:grid-cols-[1.05fr_1fr]">
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
                    <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10 text-secondary">
                        <KeyRound className="h-6 w-6" aria-hidden="true" />
                    </span>
                    <h2 className="mt-6 text-3xl font-semibold leading-tight tracking-tight">
                        Protege tu cuenta.
                    </h2>
                    <p className="mt-3 text-sm text-white/60">
                        Estás usando una contraseña inicial. Define una propia antes de empezar el turno.
                    </p>
                </div>

                <p className="relative text-2xs text-white/35">
                    Solo tú conoces la nueva contraseña · Los datos del POS no cambian
                </p>
            </aside>

            <div className="flex items-center justify-center px-5 py-10 pt-[calc(2.5rem+env(safe-area-inset-top))] pb-[calc(2.5rem+env(safe-area-inset-bottom))]">
                <div className="w-full max-w-[360px]">
                    <div className="mb-8 flex items-center justify-center gap-2.5 lg:hidden">
                        <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-xs font-bold text-white">
                            2A
                        </span>
                        <span className="text-lg font-semibold tracking-tight text-ink">2Arbolitos</span>
                    </div>

                    <h1 className="text-2xl font-semibold tracking-tight text-ink">Cambiar contraseña</h1>
                    <p className="mt-1 text-sm text-ink-muted">
                        {currentUser?.name ? `${currentUser.name}, ` : ''}define una contraseña nueva para continuar.
                    </p>

                    <form onSubmit={handleSubmit} className="mt-7 space-y-4">
                        <div>
                            <label htmlFor="current-password" className="mb-1.5 block text-xs font-semibold text-ink-muted">
                                Contraseña actual
                            </label>
                            <input
                                id="current-password"
                                type="password"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                className="input-field"
                                autoFocus
                                disabled={isLoading}
                                autoComplete="current-password"
                            />
                        </div>

                        <div>
                            <label htmlFor="new-password" className="mb-1.5 block text-xs font-semibold text-ink-muted">
                                Contraseña nueva
                            </label>
                            <div className="relative">
                                <input
                                    id="new-password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="input-field pr-11"
                                    disabled={isLoading}
                                    autoComplete="new-password"
                                    minLength={8}
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
                            <p className="mt-1 text-2xs text-ink-soft">Mínimo 8 caracteres.</p>
                        </div>

                        <div>
                            <label htmlFor="confirm-password" className="mb-1.5 block text-xs font-semibold text-ink-muted">
                                Repetir contraseña nueva
                            </label>
                            <input
                                id="confirm-password"
                                type={showPassword ? 'text' : 'password'}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="input-field"
                                disabled={isLoading}
                                autoComplete="new-password"
                            />
                        </div>

                        {error ? (
                            <div
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
                                    Guardando...
                                </>
                            ) : (
                                'Guardar y continuar'
                            )}
                        </button>
                    </form>

                    <div className="mt-8 flex items-center justify-between border-t border-line pt-4">
                        <button
                            type="button"
                            onClick={logout}
                            className="inline-flex items-center gap-1.5 text-2xs text-ink-muted transition-colors hover:text-ink"
                        >
                            <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                            Cerrar sesión
                        </button>
                        <span className="text-2xs text-ink-soft">{currentUser?.username || '2Arbolitos POS'}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
