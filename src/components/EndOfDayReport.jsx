import React, { useMemo } from 'react';
import { useOrders } from '../context/OrdersContext';
import { useFinance } from '../context/FinanceContext';
import { formatCurrency, formatDate } from '../lib/utils';

<<<<<<< HEAD
const EndOfDayReport = ({ date: dateProp }) => {
  const { orders: purchases } = useOrders();
  const date = dateProp ? new Date(dateProp) : new Date();
=======
const EndOfDayReport = () => {
  const { orders } = useOrders();
  const { lastClosureDate, expenses } = useFinance();
>>>>>>> 6259618a47a04f4138f27f761fe9179394de04e3

  const reportData = useMemo(() => {
<<<<<<< HEAD
    const orderDate = (p) => p.date || p.timestamp;
    const todaysPurchases = purchases.filter(
      p => new Date(orderDate(p)).toDateString() === date.toDateString()
    );

    const totalSold = todaysPurchases.reduce((sum, p) => sum + (p.totalCop ?? p.total ?? 0), 0);

    const paymentMethodTotals = todaysPurchases.reduce((acc, purchase) => {
      const method = purchase.payment?.method ?? purchase.paymentMethod ?? 'N/A';
      const total = purchase.totalCop ?? purchase.total ?? 0;
      if (!acc[method]) acc[method] = 0;
      acc[method] += total;
=======
    const closureDate = new Date(lastClosureDate);
    
    // Show ALL orders since last closure (not just today)
    const filteredOrders = orders.filter(o => {
      const orderDate = new Date(o.date);
      return orderDate >= closureDate;
    });

    const filteredExpenses = expenses.filter(e => {
      const expenseDate = new Date(e.date);
      return expenseDate >= closureDate;
    });

    const totalSalesCOP = filteredOrders.reduce((sum, o) => sum + o.totalCop, 0);
    const totalSalesUSD = filteredOrders.reduce((sum, o) => sum + o.totalUsd, 0);

    const paymentMethodTotals = filteredOrders.reduce((acc, order) => {
      const method = order.payment?.method || 'unknown';
      if (!acc[method]) {
        acc[method] = { cop: 0, usd: 0 };
      }
      acc[method].cop += order.totalCop;
      acc[method].usd += order.totalUsd;
>>>>>>> 6259618a47a04f4138f27f761fe9179394de04e3
      return acc;
    }, {});

    const totalItems = filteredOrders.reduce((sum, o) => 
      sum + o.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0
    );

    const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

    return {
      filteredOrders,
      filteredExpenses,
      totalSalesCOP,
      totalSalesUSD,
      totalExpenses,
      paymentMethodTotals,
      totalItems,
      orderCount: filteredOrders.length,
      expenseCount: filteredExpenses.length
    };
  }, [orders, expenses, lastClosureDate]);

  const today = useMemo(() => new Date(), []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">
          Resumen de Ventas
        </h2>
        <div className="text-sm text-gray-500">
          Período: {formatDate(lastClosureDate)} - {formatDate(today)}
        </div>
      </div>

      {reportData.orderCount === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-gray-500 text-lg">No hay ventas registradas desde el último cierre.</p>
          <p className="text-sm text-gray-400 mt-2">
            Último cierre: {formatDate(lastClosureDate)}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="card p-4 border-l-4 border-green-500">
              <p className="text-xs font-bold text-gray-500 uppercase">Ventas COP</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(reportData.totalSalesCOP)}</p>
            </div>
            <div className="card p-4 border-l-4 border-blue-500">
              <p className="text-xs font-bold text-gray-500 uppercase">Ventas USD</p>
              <p className="text-2xl font-bold text-blue-600">${reportData.totalSalesUSD.toFixed(2)}</p>
            </div>
            <div className="card p-4 border-l-4 border-red-500">
              <p className="text-xs font-bold text-gray-500 uppercase">Gastos</p>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(reportData.totalExpenses)}</p>
            </div>
            <div className="card p-4 border-l-4 border-primary">
              <p className="text-xs font-bold text-gray-500 uppercase">Balance Neto</p>
              <p className="text-2xl font-bold text-primary">{formatCurrency(reportData.totalSalesCOP - reportData.totalExpenses)}</p>
            </div>
          </div>

          <div className="card p-4">
            <h3 className="font-bold text-gray-700 mb-4">Totales por Método de Pago</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Object.entries(reportData.paymentMethodTotals).map(([method, totals]) => (
                <div key={method} className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs font-bold text-gray-500 uppercase mb-1">
                    {method.replace(/_/g, ' ')}
                  </p>
                  <p className="font-bold text-gray-800">{formatCurrency(totals.cop)}</p>
                  <p className="text-xs text-gray-500">${totals.usd.toFixed(2)} USD</p>
                </div>
              ))}
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
              <h3 className="font-bold text-gray-700">Detalle de Pedidos</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-white border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">Hora</th>
                    <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">Items</th>
                    <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase text-right">Total COP</th>
                    <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase text-right">Total USD</th>
                    <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase text-right">Pago</th>
                  </tr>
                </thead>
<<<<<<< HEAD
                <tbody>
                  {reportData.todaysPurchases.map((purchase) => (
                    <tr key={purchase.id} className="hover:bg-gray-100">
                      {/* NUEVA CARACTERÍSTICA: Mostrando el ID de la compra */}
                      <td className="py-2 px-4 border-b font-mono text-sm">{purchase.id}</td>
                      <td className="py-2 px-4 border-b">{new Date(purchase.date || purchase.timestamp).toLocaleTimeString()}</td>
                      <td className="py-2 px-4 border-b">{purchase.payment?.method?.replace('_', ' ') ?? purchase.paymentMethod ?? 'N/A'}</td>
                      <td className="py-2 px-4 border-b text-right">{formatCurrency(purchase.totalCop ?? purchase.total ?? 0)}</td>
=======
                <tbody className="divide-y divide-gray-100">
                  {reportData.filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {new Date(order.date).toLocaleTimeString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {order.items.map((item, idx) => (
                          <span key={idx} className="inline-block bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs mr-1 mb-1">
                            {item.quantity}x {item.product.name}
                          </span>
                        ))}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-green-700">
                        {formatCurrency(order.totalCop)}
                      </td>
                      <td className="px-6 py-4 text-right text-gray-600">
                        ${order.totalUsd.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase">
                        {order.payment?.method?.replace(/_/g, ' ') || 'N/A'}
                      </td>
>>>>>>> 6259618a47a04f4138f27f761fe9179394de04e3
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default EndOfDayReport;
