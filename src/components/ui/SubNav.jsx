import { cn } from '../../lib/utils';

/**
 * Navegacion secundaria dentro de una pantalla (Resumen / Ventas / Cierres...).
 * items: [{ id, label, shortLabel?, icon? }]
 * En movil usa shortLabel para que las pestanas quepan sin cortarse.
 */
export function SubNav({ items, value, onChange, className }) {
    return (
        <div
            role="tablist"
            className={cn(
                'flex w-fit max-w-full gap-1 overflow-x-auto scrollbar-hide rounded-xl border border-line bg-background-paper p-1',
                className
            )}
        >
            {items.map(({ id, label, shortLabel, icon: Icon }) => {
                const isActive = value === id;
                return (
                    <button
                        key={id}
                        role="tab"
                        aria-selected={isActive}
                        onClick={() => onChange(id)}
                        className={cn(
                            'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-3 text-[13px] font-medium transition-colors',
                            isActive
                                ? 'bg-primary text-white'
                                : 'text-ink-muted hover:bg-surface hover:text-ink'
                        )}
                    >
                        {Icon && <Icon className="h-3.5 w-3.5" aria-hidden="true" />}
                        <span className="sm:hidden">{shortLabel || label}</span>
                        <span className="hidden sm:inline">{label}</span>
                    </button>
                );
            })}
        </div>
    );
}
