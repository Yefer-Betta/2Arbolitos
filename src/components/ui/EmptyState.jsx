import React from 'react';
import { cn } from '../../lib/utils';

export function EmptyState({ icon: Icon, title, description, action, className }) {
    return (
        <div className={cn('flex flex-col items-center justify-center px-6 py-14 text-center', className)}>
            {Icon ? (
                <span className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-surface text-ink-soft">
                    <Icon className="h-6 w-6" aria-hidden="true" />
                </span>
            ) : null}
            <p className="text-sm font-semibold text-ink">{title}</p>
            {description ? <p className="mt-1 max-w-xs text-xs text-ink-muted">{description}</p> : null}
            {action ? <div className="mt-4">{action}</div> : null}
        </div>
    );
}
