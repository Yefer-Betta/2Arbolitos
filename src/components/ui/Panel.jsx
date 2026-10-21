import { cn } from '../../lib/utils';

/**
 * Superficie de administracion: una sola tarjeta con cabecera opcional.
 * Evita el patron "tarjeta dentro de tarjeta" de las pantallas antiguas.
 */
export function Panel({ children, className }) {
    return (
        <section className={cn('overflow-hidden rounded-2xl border border-line bg-background-paper', className)}>
            {children}
        </section>
    );
}

export function PanelHeader({ title, subtitle, actions, className }) {
    return (
        <header
            className={cn(
                'flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3',
                className
            )}
        >
            <div className="min-w-0">
                <h2 className="truncate text-sm font-semibold text-ink">{title}</h2>
                {subtitle && <p className="mt-0.5 truncate text-2xs text-ink-muted">{subtitle}</p>}
            </div>
            {actions && <div className="ml-auto flex shrink-0 items-center gap-2">{actions}</div>}
        </header>
    );
}
