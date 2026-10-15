import React from 'react';
import { X, Printer } from 'lucide-react';
import { Ticket } from '../Ticket';

export function ReprintTicketModal({ reprintOrder, setReprintOrder, business }) {
    return (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md">
                        <div className="p-4 bg-primary text-white flex justify-between items-center">
                            <h2 className="text-lg font-bold">Reimprimir Factura</h2>
                            <button onClick={() => setReprintOrder(null)} className="hover:bg-white/20 p-1 rounded-full">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-4 flex justify-center">
                            <Ticket 
                                order={reprintOrder} 
                                business={business} 
                                orderType={reprintOrder.orderType || reprintOrder.tableId} 
                            />
                        </div>

                        <div className="p-4 border-t flex gap-3">
                            <button
                                onClick={() => setReprintOrder(null)}
                                className="flex-1 btn-secondary py-2"
                            >
                                Cerrar
                            </button>
                            <button
                                onClick={() => window.print()}
                                className="flex-1 btn-primary py-2 flex items-center justify-center gap-2"
                            >
                                <Printer className="w-4 h-4" />
                                Imprimir
                            </button>
                        </div>
                    </div>
                </div>
    );
}
