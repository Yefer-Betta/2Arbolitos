import React, { useCallback, useMemo, useRef, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Modal } from '../Modal';
import { FeedbackContext } from './feedback-context';

const TOAST_STYLES = {
    success: { icon: CheckCircle2, classes: 'bg-green-50 border-green-200 text-green-800', iconClass: 'text-green-600' },
    error: { icon: AlertCircle, classes: 'bg-red-50 border-red-200 text-red-800', iconClass: 'text-red-600' },
    info: { icon: Info, classes: 'bg-white border-gray-200 text-gray-800', iconClass: 'text-primary' },
};

export function FeedbackProvider({ children }) {
    const [toasts, setToasts] = useState([]);
    const idRef = useRef(0);

    const dismiss = useCallback((id) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const show = useCallback((message, type = 'info', duration = 3500) => {
        if (!message) return;
        const id = (idRef.current += 1);
        setToasts((prev) => [...prev.slice(-2), { id, message, type }]);
        if (duration > 0) setTimeout(() => dismiss(id), duration);
        return id;
    }, [dismiss]);

    const toast = useMemo(() => ({
        show,
        success: (m, d) => show(m, 'success', d),
        error: (m, d) => show(m, 'error', d),
        info: (m, d) => show(m, 'info', d),
    }), [show]);

    const [confirmState, setConfirmState] = useState(null);

    const confirm = useCallback((options = {}) => new Promise((resolve) => {
        const opts = typeof options === 'string' ? { title: options } : options;
        setConfirmState({
            title: opts.title || 'Confirmar',
            message: opts.message || '',
            confirmLabel: opts.confirmLabel || 'Confirmar',
            cancelLabel: opts.cancelLabel || 'Cancelar',
            danger: !!opts.danger,
            resolve,
        });
    }), []);

    const closeConfirm = useCallback((result) => {
        setConfirmState((prev) => {
            prev?.resolve?.(result);
            return null;
        });
    }, []);

    const value = useMemo(() => ({ toast, confirm }), [toast, confirm]);

    return (
        <FeedbackContext.Provider value={value}>
            {children}

            <div
                aria-live="polite"
                className="pointer-events-none fixed inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-[70] flex flex-col items-center gap-2 px-4 md:inset-x-auto md:right-4 md:bottom-4 md:items-end md:px-0"
            >
                {toasts.map((t) => {
                    const meta = TOAST_STYLES[t.type] || TOAST_STYLES.info;
                    const Icon = meta.icon;
                    return (
                        <div
                            key={t.id}
                            role="status"
                            className={cn('pointer-events-auto w-full max-w-sm rounded-xl border shadow-lg px-4 py-3 flex items-start gap-3', meta.classes)}
                        >
                            <Icon className={cn('w-5 h-5 shrink-0 mt-0.5', meta.iconClass)} aria-hidden="true" />
                            <p className="flex-1 text-sm font-medium break-words">{t.message}</p>
                            <button
                                onClick={() => dismiss(t.id)}
                                className="shrink-0 -m-1 p-1 rounded-lg hover:bg-black/5"
                                aria-label="Cerrar aviso"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    );
                })}
            </div>

            <Modal
                isOpen={!!confirmState}
                onClose={() => closeConfirm(false)}
                label={confirmState?.title || 'Confirmar'}
            >
                <div className="p-5 sm:p-6 w-full max-w-sm mx-auto">
                    <h3 className="text-lg font-bold text-gray-900">{confirmState?.title}</h3>
                    {confirmState?.message ? (
                        <p className="mt-2 text-sm text-gray-600 whitespace-pre-line">{confirmState.message}</p>
                    ) : null}
                    <div className="mt-5 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
                        <button onClick={() => closeConfirm(false)} className="btn-secondary min-h-11 px-4">
                            {confirmState?.cancelLabel}
                        </button>
                        <button
                            onClick={() => closeConfirm(true)}
                            className={cn('btn-primary min-h-11 px-4', confirmState?.danger && 'bg-red-600 hover:bg-red-700')}
                        >
                            {confirmState?.confirmLabel}
                        </button>
                    </div>
                </div>
            </Modal>
        </FeedbackContext.Provider>
    );
}
