import React from 'react';
import { X } from 'lucide-react';
import { Modal } from '../Modal';

export function ModifierModal({ showModifierModal, setShowModifierModal, modifierProduct, setModifierProduct, modifierGroups, selectedModifiers, toggleModifier, confirmModifiers }) {
    return (
            <Modal isOpen={showModifierModal && !!modifierProduct} onClose={() => { setShowModifierModal(false); setModifierProduct(null); }} label={modifierProduct ? `Personalizar ${modifierProduct.name}` : 'Personalizar'}>
                <div className="p-4 sm:p-6 bg-primary text-white">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h2 className="text-lg sm:text-xl font-bold">Personalizar</h2>
                            <p className="text-sm opacity-80">{modifierProduct?.name}</p>
                        </div>
                        <button onClick={() => { setShowModifierModal(false); setModifierProduct(null); }} className="shrink-0 p-2 rounded-full hover:bg-white/20 transition-colors" aria-label="Cerrar">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>
                        <div className="p-4 sm:p-6 space-y-5">
                            {modifierGroups.map(g => (
                                <div key={g.id}>
                                    <p className="text-sm font-bold text-ink mb-2">{g.name} {g.type === 'SINGLE' ? '(elige uno)' : '(elige varios)'}</p>
                                    <div className="space-y-1">
                                        {g.modifiers?.map(m => {
                                            const selected = g.type === 'SINGLE'
                                                ? selectedModifiers[g.id] === m.id
                                                : (selectedModifiers[g.id] || []).includes(m.id);
                                            return (
                                                <button key={m.id} onClick={() => toggleModifier(g.id, m.id)} className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-sm transition-colors ${selected ? 'bg-primary/10 border-primary text-ink-brand font-bold' : 'border-line hover:bg-surface'}`}>
                                                    <span>{m.name}</span>
                                                    {m.price > 0 && <span className="text-xs font-bold">+${m.price.toLocaleString()}</span>}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                            <div className="flex gap-2 pt-2">
                                <button onClick={confirmModifiers} className="flex-1 btn-primary">Agregar al pedido</button>
                                <button onClick={() => { setShowModifierModal(false); setModifierProduct(null); }} className="btn-secondary">Cancelar</button>
                            </div>
                        </div>
                </Modal>
    );
}
