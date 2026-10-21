import React from 'react';
import { cn } from '../../lib/utils';

const VARIANTS = {
    primary: 'bg-primary text-white hover:bg-primary-light',
    secondary: 'bg-background-paper text-ink border border-line hover:bg-surface',
    ghost: 'text-ink-muted hover:bg-surface hover:text-ink',
    soft: 'bg-primary/5 text-ink-brand hover:bg-primary/10',
    danger: 'bg-danger-soft text-danger hover:bg-danger hover:text-white',
};

const SIZES = {
    sm: 'h-9 px-3 text-xs',
    md: 'h-10 px-4 text-sm',
    lg: 'h-11 px-5 text-sm',
    icon: 'h-10 w-10',
};

/**
 * Boton base del sistema. Sustituye a las combinaciones sueltas de
 * btn-primary/btn-secondary cuando hace falta elegir variante desde codigo.
 */
export function Button({ variant = 'secondary', size = 'md', className, type = 'button', ...props }) {
    return (
        <button
            type={type}
            className={cn(
                'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors disabled:pointer-events-none disabled:opacity-45',
                VARIANTS[variant],
                SIZES[size],
                className
            )}
            {...props}
        />
    );
}
