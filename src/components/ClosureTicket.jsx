import React from 'react';
import { formatCurrency } from '../lib/utils';

export function ClosureTicket({ closure, business, exchangeRate }) {
  if (!closure) return null;
  const rate = exchangeRate > 0 ? exchangeRate : 4000;

  return (
    <div className="bg-white p-6 rounded-lg w-full max-w-sm font-mono text-sm border border-gray-200 shadow-sm mx-auto">
      {/* Header */}
      <div className="text-center mb-4 pb-4 border-b border-dashed border-gray-300">
        <h2 className="font-bold text-lg uppercase">{business.name || '2 Arbolitos'}</h2>
        <p className="text-xs font-bold mt-1">CIERRE DE CAJA</p>
        {business.nit && <p className="text-xs">NIT: {business.nit}</p>}
        {business.address && <p className="text-xs">{business.address}</p>}
        {business.phone && <p className="text-xs">Tel: {business.phone}</p>}
        <p className="mt-1 text-xs text-gray-500">{new Date(closure.date).toLocaleString('es-CO')}</p>
      </div>

      {/* Summary */}
      <div className="space-y-1 mb-4 pb-4 border-b border-dashed border-gray-300">
        <div className="flex justify-between">
          <span>Pedidos:</span>
          <span className="font-bold">{closure.orderCount || 0}</span>
        </div>
        <div className="flex justify-between text-green-700">
          <span>Ventas:</span>
          <span className="font-bold">{formatCurrency(closure.totalSalesCOP || 0)}</span>
        </div>
        <div className="flex justify-between text-red-600">
          <span>Gastos:</span>
          <span className="font-bold">-{formatCurrency(closure.totalExpenses || 0)}</span>
        </div>
        <div className="flex justify-between font-bold text-base pt-1 border-t border-gray-200">
          <span>BALANCE NETO:</span>
          <span>{formatCurrency((closure.totalSalesCOP || 0) - (closure.totalExpenses || 0))}</span>
        </div>
      </div>

      {/* Sales by method */}
      <div className="mb-4 pb-4 border-b border-dashed border-gray-300">
        <p className="font-bold text-xs uppercase mb-2">Ventas por método</p>
        <div className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span>Efectivo COP:</span>
            <span className="font-bold">{formatCurrency(closure.salesByMethod?.cash_cop || 0)}</span>
          </div>
          <div className="flex justify-between">
            <span>Efectivo USD:</span>
            <span className="font-bold">${(closure.salesByMethod?.cash_usd || 0).toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Nequi:</span>
            <span className="font-bold">{formatCurrency(closure.salesByMethod?.nequi || 0)}</span>
          </div>
          <div className="flex justify-between">
            <span>Débito:</span>
            <span className="font-bold">{formatCurrency(closure.salesByMethod?.debit || 0)}</span>
          </div>
        </div>
      </div>

      {/* Arqueo */}
      {closure.countedCash !== undefined && (
        <div className="mb-4 pb-4 border-b border-dashed border-gray-300">
          <p className="font-bold text-xs uppercase mb-2">Arqueo</p>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span>Contado COP:</span>
              <span className="font-bold">{formatCurrency(closure.countedCash || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span>Contado USD:</span>
              <span className="font-bold">${(closure.countedUsd || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Nequi contado:</span>
              <span className="font-bold">{formatCurrency(closure.countedNequi || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span>Débito contado:</span>
              <span className="font-bold">{formatCurrency(closure.countedDebit || 0)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Differences */}
      {closure.totalDifference !== undefined && (
        <div className="mb-4 pb-4 border-b border-dashed border-gray-300">
          <p className="font-bold text-xs uppercase mb-2">Diferencia</p>
          <div className="flex justify-between">
            <span>Total:</span>
            <span className={`font-bold ${closure.totalDifference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {closure.totalDifference >= 0 ? '+' : ''}{formatCurrency(Math.abs(closure.totalDifference))}
            </span>
          </div>
        </div>
      )}

      {/* Observations */}
      {closure.observations && (
        <div className="mb-4 pb-4 border-b border-dashed border-gray-300">
          <p className="font-bold text-xs uppercase mb-2">Observaciones</p>
          <p className="text-xs text-gray-600">{closure.observations}</p>
        </div>
      )}

      <div className="text-center mt-4 pt-2 border-t border-dashed text-xs text-gray-400">
        <p>Generado: {new Date().toLocaleString('es-CO')}</p>
      </div>
    </div>
  );
}
