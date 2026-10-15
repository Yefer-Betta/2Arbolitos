/**
 * Abre una ventana e imprime el cierre de caja con formato de ticket.
 * Devuelve `false` si el navegador bloqueó la ventana emergente.
 */
export function printClosure(closure, businessName = '2 Arbolitos') {
  const c = closure;
  const w = window.open('', '_blank', 'width=400,height=600');
  if (!w) { alert('Permite ventanas emergentes'); return false; }
  const b = businessName || '2 Arbolitos';
  const fmt = (n) => '$' + Number(n || 0).toLocaleString('es-CO');
  const methods = [
    ['Efectivo COP', fmt(c.salesByMethod?.cash_cop)],
    ['Efectivo USD', '$' + (c.salesByMethod?.cash_usd || 0).toFixed(2)],
    ['Efectivo Bs.', 'Bs. ' + (c.salesByMethod?.cash_bs || 0).toFixed(2)],
    ['Nequi', fmt(c.salesByMethod?.nequi)],
    ['Débito', fmt(c.salesByMethod?.debit)],
  ];
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Cierre - ${b}</title><style>
    body{font-family:'Courier New',monospace;font-size:12px;margin:20px;max-width:320px;margin:0 auto;padding:20px}
    h2{text-align:center;font-size:16px;margin:0 0 4px}
    .sub{text-align:center;font-size:11px;color:#666;margin:0 0 16px}
    .line{border-bottom:1px dashed #999;padding-bottom:12px;margin-bottom:12px}
    .row{display:flex;justify-content:space-between;padding:2px 0}
    .b{font-weight:bold}
    .g{color:#16a34a}.r{color:#dc2626}
    .total{font-size:14px;padding-top:6px;border-top:1px solid #999}
    .center{text-align:center;font-size:10px;color:#999;margin-top:16px;padding-top:12px;border-top:1px dashed #ccc}
  </style></head><body>
    <h2>${b.toUpperCase()}</h2>
    <p class="sub">CIERRE DE CAJA<br>${new Date(c.date).toLocaleString('es-CO')}</p>
    <div class="line">
      <div class="row"><span>Pedidos:</span><span class="b">${c.orderCount || 0}</span></div>
      <div class="row g"><span>Ventas:</span><span class="b">${fmt(c.totalSalesCOP)}</span></div>
      <div class="row r"><span>Gastos:</span><span class="b">-${fmt(c.totalExpenses)}</span></div>
      <div class="row b total"><span>BALANCE:</span><span>${fmt((c.totalSalesCOP||0)-(c.totalExpenses||0))}</span></div>
    </div>
    <div class="line"><p class="b" style="margin:0 0 8px">Ventas por método</p>
      ${methods.map(([l, v]) => `<div class="row"><span>${l}:</span><span class="b">${v}</span></div>`).join('')}
    </div>
    ${c.countedCash !== undefined ? `<div class="line"><p class="b" style="margin:0 0 8px">Arqueo</p>
      <div class="row"><span>Contado COP:</span><span class="b">${fmt(c.countedCash)}</span></div>
      <div class="row"><span>Contado USD:</span><span class="b">$${(c.countedUsd||0).toFixed(2)}</span></div>
      <div class="row"><span>Contado Bs.:</span><span class="b">Bs. ${(c.countedBs||0).toFixed(2)}</span></div>
      <div class="row"><span>Nequi:</span><span class="b">${fmt(c.countedNequi)}</span></div>
      <div class="row"><span>Débito:</span><span class="b">${fmt(c.countedDebit)}</span></div>
    </div>` : ''}
    ${c.totalDifference !== undefined ? `<div class="line">
      <div class="row"><span>Diferencia:</span><span class="b ${c.totalDifference>=0?'g':'r'}">${c.totalDifference>=0?'+':''}${fmt(Math.abs(c.totalDifference))}</span></div>
    </div>` : ''}
    ${c.observations ? `<div class="line"><p class="b" style="margin:0 0 4px">Obs:</p><p style="margin:0;font-size:11px">${c.observations}</p></div>` : ''}
    <p class="center">Generado: ${new Date().toLocaleString('es-CO')}</p>
    <script>window.onload=function(){window.print();setTimeout(function(){window.close()},500)}</script>
  </body></html>`);
  w.document.close();
  return true;
}
