import React from 'react';
import { cn } from '../../lib/utils';

const TONES = {
    neutral: 'bg-surface text-ink-muted',
    brand: 'bg-primary/10 text-ink-brand',
    ok: 'bg-ok-soft text-ok',
    warn: 'bg-warn-soft text-warn',
    danger: 'bg-danger-soft text-danger',
    info: 'bg-info-soft text-info',
};

export function Badge({ tone = 'neutral', className, children }) {
    return (
        <span
            className={cn(
                'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-2xs font-semibold whitespace-nowrap',
                TONES[tone],
                className
            )}
        >
            {children}
        </span>
    );
}
