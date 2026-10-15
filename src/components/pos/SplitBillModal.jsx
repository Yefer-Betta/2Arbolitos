import React from 'react';
import { Plus, Minus, Users } from 'lucide-react';
import { Modal } from '../Modal';

export function SplitBillModal({ showSplitModal, setShowSplitModal, splitPersons, setSplitPersons, perPerson, totals }) {
    return (
                    <Modal isOpen={showSplitModal} onClose={() => setShowSplitModal(false)} label="Dividir cuenta" maxWidth="max-w-sm">
                        <div className="p-6 w-full max-w-sm">
                            <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Users className="w-5 h-5 text-purple-500" /> Dividir cuenta</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Número de personas</label>
                                    <div className="flex items-center gap-3">
                                        <button onClick={() => setSplitPersons(Math.max(1, splitPersons - 1))} className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center font-bold hover:bg-gray-200" aria-label="Reducir número de personas"><Minus className="w-4 h-4" /></button>
                                        <span className="text-3xl font-bold text-gray-800 w-12 text-center">{splitPersons}</span>
                                        <button onClick={() => setSplitPersons(splitPersons + 1)} className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center font-bold hover:bg-gray-200" aria-label="Aumentar número de personas"><Plus className="w-4 h-4" /></button>
                                    </div>
                                </div>
                                <div className="bg-purple-50 rounded-xl p-4 space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Por persona (COP)</span>
                                        <span className="font-bold">${perPerson.cop.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Por persona (USD)</span>
                                        <span className="font-bold">${perPerson.usd.toFixed(2)}</span>
                                    </div>
                                    <div className="border-t border-purple-200 pt-2 flex justify-between text-sm">
                                        <span className="text-gray-600">Total</span>
                                        <span className="font-bold">${totals.cop.toLocaleString()}</span>
                                    </div>
                                </div>
                                <button onClick={() => setShowSplitModal(false)} className="w-full btn-primary bg-purple-600 hover:bg-purple-700">Entendido</button>
                            </div>
                        </div>
                    </Modal>

    );
}
