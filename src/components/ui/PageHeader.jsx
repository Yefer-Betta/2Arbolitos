import React from 'react';
import { cn } from '../../lib/utils';

/**
 * Cabecera unica de pantalla: titulo, subtitulo y acciones a la derecha.
 * Evita los 30 bloques de "text-2xl font-bold + subtitulo gris" repetidos.
 */
export function PageHeader({ title, subtitle, actions, className }) {
    return (
        <div className={cn('flex flex-wrap items-end justify-between gap-x-4 gap-y-3', className)}>
            <div className="min-w-0">
                <h1 className="text-2xl font-semibold tracking-tight text-ink">{title}</h1>
                {subtitle ? <p className="mt-1 text-sm text-ink-muted">{subtitle}</p> : null}
            </div>
            {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
    );
}
