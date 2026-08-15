import React, { useEffect, useRef } from 'react';
import { cn } from '../lib/utils';

export function Modal({ isOpen, onClose, label, children, className, maxWidth = 'max-w-sm sm:max-w-md' }) {
    const dialogRef = useRef(null);
    const previouslyFocusedRef = useRef(null);

    useEffect(() => {
        if (!isOpen) return;
        previouslyFocusedRef.current = document.activeElement;
        dialogRef.current?.focus();
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                onClose();
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
            previouslyFocusedRef.current?.focus?.();
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 backdrop-blur-sm" onClick={onClose}>
            <div className="absolute inset-0 bg-black/50"></div>
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-label={label}
                tabIndex={-1}
                onClick={(e) => e.stopPropagation()}
                className={cn('relative w-full rounded-2xl sm:rounded-3xl shadow-2xl overflow-y-auto max-h-[90vh] bg-white', maxWidth, className)}
            >
                {children}
            </div>
        </div>
    );
}