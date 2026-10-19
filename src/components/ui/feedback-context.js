import { createContext, useContext } from 'react';

export const FeedbackContext = createContext(null);

/**
 * Acceso a notificaciones no bloqueantes.
 * const toast = useToast(); toast.success('Pedido enviado');
 */
export function useToast() {
    const ctx = useContext(FeedbackContext);
    if (!ctx) throw new Error('useToast debe usarse dentro de <FeedbackProvider>');
    return ctx.toast;
}

/**
 * Confirmación accesible (hoja inferior en móvil).
 * const confirm = useConfirm();
 * if (await confirm({ title: '¿Eliminar?', danger: true })) { ... }
 */
export function useConfirm() {
    const ctx = useContext(FeedbackContext);
    if (!ctx) throw new Error('useConfirm debe usarse dentro de <FeedbackProvider>');
    return ctx.confirm;
}
