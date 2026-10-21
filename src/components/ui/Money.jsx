import React from 'react';
import { cn } from '../../lib/utils';

/**
 * Importe con cifras tabulares y la moneda como sufijo pequeno.
 * Evita que las columnas de precios bailen entre filas.
 */
export function Money({ amount = 0, currency = 'COP', className, currencyClassName, suffix = true }) {
    const value =
        currency === 'COP'
            ? Math.round(Number(amount) || 0).toLocaleString('es-CO')
            : (Number(amount) || 0).toFixed(2);

    return (
        <span className={cn('num font-semibold', className)}>
            ${value}
            {suffix ? (
                <span className={cn('ml-1 align-top text-2xs font-medium text-ink-soft', currencyClassName)}>{currency}</span>
            ) : null}
        </span>
    );
}
