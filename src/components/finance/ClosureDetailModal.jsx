import React from 'react';
import { X, Printer } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import { printClosure } from '../../lib/print';

export function ClosureDetailModal({ selectedClosure, setSelectedClosure, business }) {
    return (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="p-4 bg-primary text-white flex justify-between items-center sticky top-0">
                            <h2 className="text-lg font-bold">Detalle del Cierre</h2>
                            <button onClick={() => setSelectedClosure(null)} className="hover:bg-white/20 p-1 rounded-full">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="bg-gray-50 p-4 rounded-xl">
                                <p className="text-sm font-bold text-gray-700">
                                    {new Date(selectedClosure.date).toLocaleString()}
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-green-50 p-4 rounded-xl text-center">
                                    <p className="text-xs text-gray-500 uppercase">Ventas</p>
                                    <p className="text-xl font-bold text-green-700">{formatCurrency(selectedClosure.totalSalesCOP || 0)}</p>
                                </div>
                                <div className="bg-red-50 p-4 rounded-xl text-center">
                                    <p className="text-xs text-gray-500 uppercase">Gastos</p>
                                    <p className="text-xl font-bold text-red-700">{formatCurrency(selectedClosure.totalExpenses || 0)}</p>
                                </div>
                            </div>

                            <div className="border-t pt-4">
                                <p className="text-xs text-gray-500 uppercase mb-2">Ventas por Método</p>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span>Efectivo COP:</span>
                                        <span className="font-bold">{formatCurrency(selectedClosure.salesByMethod?.cash_cop || 0)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Efectivo USD:</span>
                                        <span className="font-bold">${(selectedClosure.salesByMethod?.cash_usd || 0).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Efectivo Bs.:</span>
                                        <span className="font-bold">Bs. {(selectedClosure.salesByMethod?.cash_bs || 0).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Nequi:</span>
                                        <span className="font-bold">{formatCurrency(selectedClosure.salesByMethod?.nequi || 0)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Débito:</span>
                                        <span className="font-bold">{formatCurrency(selectedClosure.salesByMethod?.debit || 0)}</span>
                                    </div>
                                </div>
                            </div>

                            {selectedClosure.differences && (
                                <div className="border-t pt-4">
                                    <p className="text-xs text-gray-500 uppercase mb-2">Arqueo</p>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span>Contado COP:</span>
                                            <span className="font-bold">{formatCurrency(selectedClosure.countedCash || 0)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Contado USD:</span>
                                            <span className="font-bold">${(selectedClosure.countedUsd || 0).toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Contado Bs.:</span>
                                            <span className="font-bold">Bs. {(selectedClosure.countedBs || 0).toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between font-bold border-t pt-2">
                                            <span>Diferencia:</span>
                                            <span className={selectedClosure.totalDifference >= 0 ? "text-green-600" : "text-red-600"}>
                                                {formatCurrency(selectedClosure.totalDifference || 0)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {selectedClosure.observations && (
                                <div className="border-t pt-4">
                                    <p className="text-xs text-gray-500 uppercase mb-1">Observaciones</p>
                                    <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">{selectedClosure.observations}</p>
                                </div>
                            )}

                            <div className="flex gap-3">
                              <button
                                  onClick={() => setSelectedClosure(null)}
                                  className="flex-1 btn-secondary py-2"
                              >
                                  Cerrar
                              </button>
                              <button
                                  onClick={() => printClosure(selectedClosure, business?.name)}
                                  className="flex-1 btn-primary py-2 flex items-center justify-center gap-2"
                              >
                                  <Printer className="w-4 h-4" />
                                  Imprimir
                              </button>
                            </div>
                        </div>
                    </div>
                </div>
    );
}
