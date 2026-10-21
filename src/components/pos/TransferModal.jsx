import React from 'react';
import { Modal } from '../Modal';

export function TransferModal({ showTransferModal, setShowTransferModal, targetTable, setTargetTable, handleTransfer }) {
    return (
                    <Modal isOpen={showTransferModal} onClose={() => setShowTransferModal(false)} label="Transferir a otra mesa" maxWidth="max-w-sm">
                        <div className="p-6 w-full max-w-sm">
                            <h3 className="text-lg font-bold mb-4">Transferir a otra mesa</h3>
                            <p className="text-sm text-ink-muted mb-4">Los items se moverán a la mesa seleccionada</p>
                            <input type="number" min="1" inputMode="numeric" placeholder="Número de mesa" value={targetTable} onChange={e => setTargetTable(e.target.value ? `mesa-${e.target.value}` : '')} className="input-field w-full mb-4" autoFocus />
                            <div className="flex gap-2">
                                <button onClick={handleTransfer} disabled={!targetTable} className="flex-1 btn-primary disabled:opacity-50">Transferir</button>
                                <button onClick={() => setShowTransferModal(false)} className="btn-secondary">Cancelar</button>
                            </div>
                        </div>
                    </Modal>
    );
}
