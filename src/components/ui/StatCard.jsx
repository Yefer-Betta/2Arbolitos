import { cn } from '../../lib/utils';

const TONES = {
    neutral: 'bg-surface text-ink-muted',
    brand: 'bg-primary/10 text-ink-brand',
    ok: 'bg-ok-soft text-ok',
    warn: 'bg-warn-soft text-warn',
    danger: 'bg-danger-soft text-danger',
    info: 'bg-info-soft text-info',
};

/**
 * Cifra principal de una pantalla de administracion.
 * El valor usa cifras tabulares para que las columnas no bailen.
 */
export function StatCard({ label, value, hint, icon: Icon, tone = 'neutral', className }) {
    return (
        <div className={cn('rounded-2xl border border-line bg-background-paper px-4 py-3.5', className)}>
            <div className="flex items-start justify-between gap-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.09em] text-ink-muted">{label}</p>
                {Icon && (
                    <span className={cn('grid h-7 w-7 shrink-0 place-items-center rounded-lg', TONES[tone])}>
                        <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                )}
            </div>
            <p className="num mt-1.5 truncate text-2xl font-semibold leading-none tracking-tight text-ink">{value}</p>
            {hint && <p className="mt-1.5 truncate text-2xs text-ink-muted">{hint}</p>}
        </div>
    );
}
