import React, { useMemo } from 'react';
import { useOrders } from '../context/OrdersContext';
import { formatCurrency, formatDate } from '../lib/utils';

const EndOfDayReport = ({ date }) => {
  const { orders: purchases } = useOrders();

  // OPTIMIZATION:
  // Usamos useMemo para calcular los datos del reporte. Este bloque de código
  // solo se volverá a ejecutar si 'purchases' o 'date' cambian.
  // Esto evita recálculos costosos en cada re-renderizado.
  const reportData = useMemo(() => {
    const todaysPurchases = purchases.filter(
      p => new Date(p.timestamp).toDateString() === date.toDateString()
    );

    const totalSold = todaysPurchases.reduce((sum, p) => sum + p.total, 0);

    const paymentMethodTotals = todaysPurchases.reduce((acc, purchase) => {
      const { paymentMethod, total } = purchase;
      if (!acc[paymentMethod]) {
        acc[paymentMethod] = 0;
      }
      acc[paymentMethod] += total;
      return acc;
    }, {});

    return {
      todaysPurchases,
      totalSold,
      paymentMethodTotals,
    };
  }, [purchases, date]);


  return (
    <div className="end-of-day-report p-4 bg-white rounded-lg shadow">
      <h2 className="text-xl font-bold mb-4">
        Reporte del Día: {formatDate(date)}
      </h2>

      {reportData.todaysPurchases.length === 0 ? (
        <p>No hay ventas registradas para esta fecha.</p>
      ) : (
        <>
          <div className="report-summary mb-6 p-4 bg-gray-50 rounded">
            <h3 className="text-lg font-semibold mb-2">Resumen General</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <strong>Venta Total:</strong>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(reportData.totalSold)}
                </p>
              </div>
              <div>
                <strong>Facturas Emitidas:</strong>
                <p className="text-2xl font-bold">
                  {reportData.todaysPurchases.length}
                </p>
              </div>
              <div>
                <strong>Totales por Método de Pago:</strong>
                <ul className="list-disc list-inside">
                  {Object.entries(reportData.paymentMethodTotals).map(([method, total]) => (
                    <li key={method}>
                      {method}: <strong>{formatCurrency(total)}</strong>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="report-details">
            <h3 className="text-lg font-semibold mb-2">Detalle de Facturas</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border">
                <thead className="bg-gray-200">
                  <tr>
                    {/* NUEVA CARACTERÍSTICA: Columna de ID de la compra */}
                    <th className="py-2 px-4 border-b text-left">ID Factura</th>
                    <th className="py-2 px-4 border-b text-left">Hora</th>
                    <th className="py-2 px-4 border-b text-left">Método de Pago</th>
                    <th className="py-2 px-4 border-b text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.todaysPurchases.map((purchase) => (
                    <tr key={purchase.id} className="hover:bg-gray-100">
                      {/* NUEVA CARACTERÍSTICA: Mostrando el ID de la compra */}
                      <td className="py-2 px-4 border-b font-mono text-sm">{purchase.id}</td>
                      <td className="py-2 px-4 border-b">{new Date(purchase.timestamp).toLocaleTimeString()}</td>
                      <td className="py-2 px-4 border-b">{purchase.paymentMethod}</td>
                      <td className="py-2 px-4 border-b text-right">{formatCurrency(purchase.total)}</td>
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