import React, { useState, useEffect, useCallback } from 'react';
import { apiGet } from '../lib/api.js';
import { Plus, Trash2, Save, Calculator, DollarSign, RefreshCw, PieChart, TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function Escandallo() {
  const [tab, setTab] = useState('calculator');
  const [costAnalysis, setCostAnalysis] = useState([]);

  const loadCostAnalysis = useCallback(async () => {
    try { const d = await apiGet('/products/cost-analysis'); setCostAnalysis(Array.isArray(d) ? d : []); } catch {}
  }, []);

  useEffect(() => { if (tab === 'analysis') loadCostAnalysis(); }, [tab, loadCostAnalysis]);

  // Calculator state
  const [nombrePlato, setNombrePlato] = useState('');
  const [ingredientes, setIngredientes] = useState([]);
  const [nuevoIngrediente, setNuevoIngrediente] = useState({ nombre: '', cantidadUsada: '', unidad: 'g', costoPresentacion: '', cantidadPresentacion: '' });
  const [margenDeseado, setMargenDeseado] = useState(35);
  const [impuesto, setImpuesto] = useState(0);

  const calcularCostoIngrediente = (ing) => {
    const costoPres = parseFloat(ing.costoPresentacion) || 0;
    const cantPres = parseFloat(ing.cantidadPresentacion) || 1;
    const cantUsada = parseFloat(ing.cantidadUsada) || 0;
    if (cantPres === 0) return 0;
    return (costoPres / cantPres) * cantUsada;
  };

  const agregarIngrediente = () => {
    if (!nuevoIngrediente.nombre || !nuevoIngrediente.costoPresentacion) return;
    setIngredientes([...ingredientes, { ...nuevoIngrediente, id: Date.now() }]);
    setNuevoIngrediente({ nombre: '', cantidadUsada: '', unidad: 'g', costoPresentacion: '', cantidadPresentacion: '' });
  };

  const eliminarIngrediente = (id) => {
    setIngredientes(ingredientes.filter(ing => ing.id !== id));
  };

  const costoTotalMateriaPrima = ingredientes.reduce((acc, ing) => acc + calcularCostoIngrediente(ing), 0);
  const precioVentaSugerido = margenDeseado >= 100 ? 0 : costoTotalMateriaPrima / (1 - (margenDeseado / 100));
  const precioConImpuesto = precioVentaSugerido * (1 + (impuesto / 100));
  const gananciaBruta = precioVentaSugerido - costoTotalMateriaPrima;

  const guardarEscandallo = () => {
    if (!nombrePlato) return alert('Por favor ponle un nombre al plato');
    const escandallo = { id: Date.now(), nombre: nombrePlato, ingredientes, margenDeseado, fecha: new Date().toLocaleDateString() };
    const guardados = JSON.parse(localStorage.getItem('escandallos') || '[]');
    localStorage.setItem('escandallos', JSON.stringify([...guardados, escandallo]));
    alert('¡Escandallo guardado correctamente!');
  };

  const marginIcon = (margin) => {
    if (margin >= 40) return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (margin >= 20) return <Minus className="w-4 h-4 text-yellow-500" />;
    return <TrendingDown className="w-4 h-4 text-red-500" />;
  };

  const marginColor = (margin) => {
    if (margin >= 40) return 'text-green-600';
    if (margin >= 20) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-3 bg-secondary/10 rounded-xl text-secondary">
          <Calculator className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Escandallo</h1>
          <p className="text-sm text-gray-500">Análisis de costos y márgenes</p>
        </div>
      </div>

      <div className="flex gap-2">
        <button onClick={() => setTab('calculator')} className={`px-4 py-2 rounded-xl font-bold text-sm transition-colors ${tab === 'calculator' ? 'bg-secondary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
          <Calculator className="w-4 h-4 inline mr-1" /> Calculadora
        </button>
        <button onClick={() => setTab('analysis')} className={`px-4 py-2 rounded-xl font-bold text-sm transition-colors ${tab === 'analysis' ? 'bg-secondary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
          <PieChart className="w-4 h-4 inline mr-1" /> Margen por Producto
        </button>
      </div>

      {tab === 'calculator' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="card p-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Plato / Producto</label>
              <input type="text" value={nombrePlato} onChange={e => setNombrePlato(e.target.value)} placeholder="Ej: Hamburguesa Especial" className="input-field w-full" />
            </div>

            <div className="card p-4">
              <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
                <Plus className="w-5 h-5 text-secondary" /> Agregar Ingrediente
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
                <div className="md:col-span-2">
                  <label className="text-xs text-gray-500">Ingrediente</label>
                  <input type="text" placeholder="Ej: Carne Molida" value={nuevoIngrediente.nombre} onChange={e => setNuevoIngrediente({...nuevoIngrediente, nombre: e.target.value})} className="input-field w-full text-sm" />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Cant. Usada</label>
                  <input type="number" placeholder="150" value={nuevoIngrediente.cantidadUsada} onChange={e => setNuevoIngrediente({...nuevoIngrediente, cantidadUsada: e.target.value})} className="input-field w-full text-sm" />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Costo Paquete</label>
                  <input type="number" placeholder="$" value={nuevoIngrediente.costoPresentacion} onChange={e => setNuevoIngrediente({...nuevoIngrediente, costoPresentacion: e.target.value})} className="input-field w-full text-sm" />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Cant. Paquete</label>
                  <input type="number" placeholder="1000" value={nuevoIngrediente.cantidadPresentacion} onChange={e => setNuevoIngrediente({...nuevoIngrediente, cantidadPresentacion: e.target.value})} className="input-field w-full text-sm" />
                </div>
                <button onClick={agregarIngrediente} className="bg-secondary text-white p-2 rounded-lg hover:bg-secondary-dark flex justify-center">
                  <Plus className="w-5 h-5" />
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-2">* Asegúrate de usar la misma unidad (gramos, ml) para la cantidad usada y la del paquete.</p>
            </div>

            <div className="card overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-600 font-medium border-b">
                  <tr>
                    <th className="p-3">Ingrediente</th>
                    <th className="p-3 text-right">Cant.</th>
                    <th className="p-3 text-right">Costo Real</th>
                    <th className="p-3 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {ingredientes.map(ing => (
                    <tr key={ing.id} className="hover:bg-gray-50">
                      <td className="p-3">{ing.nombre}</td>
                      <td className="p-3 text-right">{ing.cantidadUsada} {ing.unidad}</td>
                      <td className="p-3 text-right font-medium">${Math.round(calcularCostoIngrediente(ing)).toLocaleString()}</td>
                      <td className="p-3 text-center">
                        <button onClick={() => eliminarIngrediente(ing.id)} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                      </td>
                    </tr>
                  ))}
                  {ingredientes.length === 0 && (
                    <tr><td colSpan="4" className="p-8 text-center text-gray-400">No hay ingredientes agregados aún.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-6">
            <div className="card p-6 border border-secondary/20">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <PieChart className="w-5 h-5 text-secondary" /> Resumen de Costos
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                  <span className="text-gray-600">Costo Materia Prima</span>
                  <span className="text-xl font-bold text-gray-800">${Math.round(costoTotalMateriaPrima).toLocaleString()}</span>
                </div>
                <div className="pt-4 border-t">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Margen de Ganancia Deseado (%)</label>
                  <input type="number" value={margenDeseado} onChange={e => setMargenDeseado(Number(e.target.value))} className="input-field w-full text-right font-mono" />
                </div>
                <div className="pt-4 border-t">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Impuesto / Propina (%)</label>
                  <input type="number" value={impuesto} onChange={e => setImpuesto(Number(e.target.value))} className="input-field w-full text-right font-mono" />
                </div>
                <div className="mt-6 p-4 bg-secondary/10 rounded-xl border border-secondary/20">
                  <p className="text-sm text-secondary font-medium mb-1">Precio de Venta Sugerido</p>
                  <p className="text-3xl font-bold text-secondary">${Math.round(precioConImpuesto).toLocaleString()}</p>
                  <p className="text-xs text-gray-500 mt-1">Ganancia Neta: ${Math.round(gananciaBruta).toLocaleString()}</p>
                </div>
                <button onClick={guardarEscandallo} className="w-full btn-primary bg-secondary hover:bg-secondary-dark flex items-center justify-center gap-2">
                  <Save className="w-4 h-4" /> Guardar Receta
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'analysis' && (
        <div className="card overflow-hidden">
          <div className="p-4 bg-gradient-to-r from-surface to-white border-b flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Costo estimado basado en insumos vinculados a cada producto
            </p>
            <button onClick={loadCostAnalysis} className="p-2 hover:bg-gray-100 rounded-lg"><RefreshCw className="w-4 h-4 text-gray-500" /></button>
          </div>
          {costAnalysis.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <PieChart className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No hay datos de costos</p>
              <p className="text-sm">Vincule insumos a productos en Inventario para ver el análisis</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600 font-medium border-b">
                  <tr>
                    <th className="p-3 text-left">Producto</th>
                    <th className="p-3 text-left">Categoría</th>
                    <th className="p-3 text-right">Precio Venta</th>
                    <th className="p-3 text-right">Costo Insumos</th>
                    <th className="p-3 text-right">Margen</th>
                    <th className="p-3 text-center">Insumos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {costAnalysis.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="p-3 font-medium text-gray-800">{p.name}</td>
                      <td className="p-3 text-gray-500">{p.category}</td>
                      <td className="p-3 text-right font-medium">{p.isUsd ? '$' : '$'}{p.isUsd ? p.price.toFixed(2) + ' USD' : p.price.toLocaleString()}</td>
                      <td className="p-3 text-right">${p.totalInventoryCost.toLocaleString()}</td>
                      <td className={`p-3 text-right font-bold flex items-center justify-end gap-1 ${marginColor(p.margin)}`}>
                        {marginIcon(p.margin)}
                        {p.margin.toFixed(1)}%
                      </td>
                      <td className="p-3 text-center text-xs text-gray-400">{p.linkedItems}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
