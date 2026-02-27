import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Calculator, DollarSign, RefreshCw, PieChart } from 'lucide-react';

export default function Escandallo() {
  const [nombrePlato, setNombrePlato] = useState('');
  const [ingredientes, setIngredientes] = useState([]);
  const [nuevoIngrediente, setNuevoIngrediente] = useState({
    nombre: '',
    cantidadUsada: '',
    unidad: 'g',
    costoPresentacion: '',
    cantidadPresentacion: ''
  });
  const [margenDeseado, setMargenDeseado] = useState(35); // 35% por defecto
  const [impuesto, setImpuesto] = useState(0); // 0% u 8% impoconsumo

  // Calcular costo de una fila
  const calcularCostoIngrediente = (ing) => {
    const costoPres = parseFloat(ing.costoPresentacion) || 0;
    const cantPres = parseFloat(ing.cantidadPresentacion) || 1;
    const cantUsada = parseFloat(ing.cantidadUsada) || 0;
    
    if (cantPres === 0) return 0;
    return (costoPres / cantPres) * cantUsada;
  };

  // Agregar ingrediente
  const agregarIngrediente = () => {
    if (!nuevoIngrediente.nombre || !nuevoIngrediente.costoPresentacion) return;
    
    setIngredientes([...ingredientes, { ...nuevoIngrediente, id: Date.now() }]);
    setNuevoIngrediente({
      nombre: '',
      cantidadUsada: '',
      unidad: 'g',
      costoPresentacion: '',
      cantidadPresentacion: ''
    });
  };

  // Eliminar ingrediente
  const eliminarIngrediente = (id) => {
    setIngredientes(ingredientes.filter(ing => ing.id !== id));
  };

  // Cálculos Totales
  const costoTotalMateriaPrima = ingredientes.reduce((acc, ing) => acc + calcularCostoIngrediente(ing), 0);
  
  // Precio de Venta Sugerido = Costo / (1 - (Margen/100))
  // Ejemplo: Costo 10.000, Margen 30% -> 10.000 / 0.7 = 14.285
  const precioVentaSugerido = margenDeseado >= 100 ? 0 : costoTotalMateriaPrima / (1 - (margenDeseado / 100));
  
  const precioConImpuesto = precioVentaSugerido * (1 + (impuesto / 100));
  const gananciaBruta = precioVentaSugerido - costoTotalMateriaPrima;

  // Guardar (Simulado en LocalStorage)
  const guardarEscandallo = () => {
    if (!nombrePlato) return alert('Por favor ponle un nombre al plato');
    const escandallo = {
      id: Date.now(),
      nombre: nombrePlato,
      ingredientes,
      margenDeseado,
      fecha: new Date().toLocaleDateString()
    };
    
    const guardados = JSON.parse(localStorage.getItem('escandallos') || '[]');
    localStorage.setItem('escandallos', JSON.stringify([...guardados, escandallo]));
    alert('¡Escandallo guardado correctamente!');
  };

  return (
    <div className="p-6 max-w-6xl mx-auto bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
            <Calculator className="w-8 h-8 text-blue-600" />
            Calculadora de Costos (Escandallo)
          </h1>
          <p className="text-gray-500">Calcula el costo real de tus platos y define el precio correcto.</p>
        </div>
        <button 
          onClick={guardarEscandallo}
          className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg flex items-center gap-2 shadow-lg transition-colors"
        >
          <Save className="w-5 h-5" /> Guardar Receta
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna Izquierda: Ingredientes */}
        <div className="lg:col-span-2 space-y-6">
          {/* Nombre del Plato */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Plato / Producto</label>
            <input 
              type="text" 
              value={nombrePlato}
              onChange={(e) => setNombrePlato(e.target.value)}
              placeholder="Ej: Hamburguesa Especial"
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* Formulario de Ingredientes */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-blue-500" /> Agregar Ingrediente
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
              <div className="md:col-span-2">
                <label className="text-xs text-gray-500">Ingrediente</label>
                <input 
                  type="text" 
                  placeholder="Ej: Carne Molida"
                  value={nuevoIngrediente.nombre}
                  onChange={(e) => setNuevoIngrediente({...nuevoIngrediente, nombre: e.target.value})}
                  className="w-full p-2 border rounded-md text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">Cant. Usada</label>
                <input 
                  type="number" 
                  placeholder="150"
                  value={nuevoIngrediente.cantidadUsada}
                  onChange={(e) => setNuevoIngrediente({...nuevoIngrediente, cantidadUsada: e.target.value})}
                  className="w-full p-2 border rounded-md text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">Costo Paquete</label>
                <input 
                  type="number" 
                  placeholder="$"
                  value={nuevoIngrediente.costoPresentacion}
                  onChange={(e) => setNuevoIngrediente({...nuevoIngrediente, costoPresentacion: e.target.value})}
                  className="w-full p-2 border rounded-md text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">Cant. Paquete</label>
                <input 
                  type="number" 
                  placeholder="1000"
                  value={nuevoIngrediente.cantidadPresentacion}
                  onChange={(e) => setNuevoIngrediente({...nuevoIngrediente, cantidadPresentacion: e.target.value})}
                  className="w-full p-2 border rounded-md text-sm"
                />
              </div>
              <button 
                onClick={agregarIngrediente}
                className="bg-blue-600 text-white p-2 rounded-md hover:bg-blue-700 flex justify-center"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-2">* Asegúrate de usar la misma unidad (gramos, ml) para la cantidad usada y la del paquete.</p>
          </div>

          {/* Tabla de Ingredientes */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
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
                {ingredientes.map((ing) => (
                  <tr key={ing.id} className="hover:bg-gray-50">
                    <td className="p-3">{ing.nombre}</td>
                    <td className="p-3 text-right">{ing.cantidadUsada} {ing.unidad}</td>
                    <td className="p-3 text-right font-medium text-gray-800">
                      ${Math.round(calcularCostoIngrediente(ing)).toLocaleString()}
                    </td>
                    <td className="p-3 text-center">
                      <button onClick={() => eliminarIngrediente(ing.id)} className="text-red-400 hover:text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {ingredientes.length === 0 && (
                  <tr>
                    <td colSpan="4" className="p-8 text-center text-gray-400">
                      No hay ingredientes agregados aún.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Columna Derecha: Resultados */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-lg border border-blue-100">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <PieChart className="w-5 h-5 text-blue-600" /> Resumen de Costos
            </h3>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-600">Costo Materia Prima</span>
                <span className="text-xl font-bold text-gray-800">${Math.round(costoTotalMateriaPrima).toLocaleString()}</span>
              </div>

              <div className="pt-4 border-t">
                <label className="block text-sm font-medium text-gray-700 mb-1">Margen de Ganancia Deseado (%)</label>
                <input 
                  type="number" 
                  value={margenDeseado}
                  onChange={(e) => setMargenDeseado(Number(e.target.value))}
                  className="w-full p-2 border border-gray-300 rounded-lg text-right font-mono"
                />
              </div>

              <div className="pt-4 border-t">
                <label className="block text-sm font-medium text-gray-700 mb-1">Impuesto / Propina (%)</label>
                <input 
                  type="number" 
                  value={impuesto}
                  onChange={(e) => setImpuesto(Number(e.target.value))}
                  className="w-full p-2 border border-gray-300 rounded-lg text-right font-mono"
                />
              </div>

              <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
                <p className="text-sm text-blue-600 font-medium mb-1">Precio de Venta Sugerido</p>
                <p className="text-3xl font-bold text-blue-800">${Math.round(precioConImpuesto).toLocaleString()}</p>
                <p className="text-xs text-blue-500 mt-1">
                  Ganancia Neta: ${Math.round(gananciaBruta).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}