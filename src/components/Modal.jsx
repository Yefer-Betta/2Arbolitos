import React, { useEffect, useRef } from 'react';
import { cn } from '../lib/utils';

export function Modal({ isOpen, onClose, label, children, className, maxWidth = 'max-w-sm sm:max-w-md' }) {
    const dialogRef = useRef(null);
    const previouslyFocusedRef = useRef(null);
    // onClose suele ser una funcion nueva en cada render del padre. Guardarla en
    // un ref evita re-ejecutar los efectos (y robar el foco) al escribir.
    const onCloseRef = useRef(onClose);
    useEffect(() => {
        onCloseRef.current = onClose;
    });

    useEffect(() => {
        if (!isOpen) return;
        previouslyFocusedRef.current = document.activeElement;
        dialogRef.current?.focus();
        return () => {
            previouslyFocusedRef.current?.focus?.();
        };
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                onCloseRef.current?.();
                return;
            }
            if (e.key !== 'Tab') return;

            const focusable = dialogRef.current?.querySelectorAll(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            if (!focusable || focusable.length === 0) return;

            const first = focusable[0];
            const last = focusable[focusable.length - 1];

            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 backdrop-blur-sm" onClick={onClose}>
            <div className="absolute inset-0 bg-black/50"></div>
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-label={label}
                tabIndex={-1}
                onClick={(e) => e.stopPropagation()}
                className={cn(
                    'relative w-full shadow-2xl overflow-y-auto bg-white pb-[env(safe-area-inset-bottom)]',
                    'rounded-t-3xl max-h-[92dvh] md:rounded-3xl md:max-h-[90vh] md:pb-0',
                    maxWidth,
                    className
                )}
            >
                <div className="md:hidden mx-auto mt-2 mb-1 h-1.5 w-10 rounded-full bg-gray-300/70" aria-hidden="true" />
                {children}
            </div>
        </div>
    );
}