import React, { useState, useEffect, useCallback } from 'react';
import { apiGet } from '../lib/api.js';
import {
  Plus,
  Trash2,
  Save,
  Calculator,
  RefreshCw,
  PieChart,
  TrendingUp,
  TrendingDown,
  Minus,
  UtensilsCrossed,
} from 'lucide-react';
import { useToast } from './ui/feedback-context';
import { PageHeader } from './ui/PageHeader';
import { Panel, PanelHeader } from './ui/Panel';
import { SubNav } from './ui/SubNav';
import { StatCard } from './ui/StatCard';
import { EmptyState } from './ui/EmptyState';
import { formatCurrency, cn } from '../lib/utils';

const TABS = [
  { id: 'calculator', label: 'Calculadora', icon: Calculator },
  { id: 'analysis', label: 'Margen por producto', shortLabel: 'Márgenes', icon: PieChart },
];

const UNITS = [
  { value: 'g', label: 'g' },
  { value: 'ml', label: 'ml' },
  { value: 'und', label: 'und' },
];

const EMPTY_INGREDIENT = { nombre: '', cantidadUsada: '', unidad: 'g', costoPresentacion: '', cantidadPresentacion: '' };

function marginTone(margin) {
  if (margin >= 40) return { text: 'text-ok', icon: TrendingUp };
  if (margin >= 20) return { text: 'text-warn', icon: Minus };
  return { text: 'text-danger', icon: TrendingDown };
}

/** Margen del producto; sin insumos vinculados no hay dato real que mostrar. */
function MarginCell({ product, className }) {
  if (!(product.linkedItems > 0)) {
    return <span className={cn('text-2xs text-ink-soft', className)} title="Sin insumos vinculados">—</span>;
  }
  const tone = marginTone(product.margin);
  const Icon = tone.icon;
  return (
    <span className={cn('inline-flex items-center gap-1 font-semibold', tone.text, className)}>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {product.margin.toFixed(1)}%
    </span>
  );
}

export default function Escandallo() {
  const toast = useToast();
  const [tab, setTab] = useState('calculator');
  const [costAnalysis, setCostAnalysis] = useState([]);

  const loadCostAnalysis = useCallback(async () => {
    try { const d = await apiGet('/products/cost-analysis'); setCostAnalysis(Array.isArray(d) ? d : []); } catch { /* sin datos */ }
  }, []);

  // Carga asincrona al cambiar de pestana: el setState ocurre tras el await.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (tab === 'analysis') loadCostAnalysis(); }, [tab, loadCostAnalysis]);

  // Calculator state
  const [nombrePlato, setNombrePlato] = useState('');
  const [ingredientes, setIngredientes] = useState([]);
  const [nuevoIngrediente, setNuevoIngrediente] = useState(EMPTY_INGREDIENT);
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
    setNuevoIngrediente(EMPTY_INGREDIENT);
  };

  const eliminarIngrediente = (id) => {
    setIngredientes(ingredientes.filter(ing => ing.id !== id));
  };

  const costoTotalMateriaPrima = ingredientes.reduce((acc, ing) => acc + calcularCostoIngrediente(ing), 0);
  const precioVentaSugerido = margenDeseado >= 100 ? 0 : costoTotalMateriaPrima / (1 - (margenDeseado / 100));
  const precioConImpuesto = precioVentaSugerido * (1 + (impuesto / 100));
  const gananciaBruta = precioVentaSugerido - costoTotalMateriaPrima;

  const guardarEscandallo = () => {
    if (!nombrePlato) return toast.error('Por favor ponle un nombre al plato');
    const escandallo = { id: Date.now(), nombre: nombrePlato, ingredientes, margenDeseado, fecha: new Date().toLocaleDateString() };
    const guardados = JSON.parse(localStorage.getItem('escandallos') || '[]');
    localStorage.setItem('escandallos', JSON.stringify([...guardados, escandallo]));
    toast.success('Escandallo guardado correctamente');
  };

  const linkedProducts = costAnalysis.filter(p => (p.linkedItems || 0) > 0);
  const avgMargin = linkedProducts.length
    ? linkedProducts.reduce((sum, p) => sum + (p.margin || 0), 0) / linkedProducts.length
    : 0;
  const lowMargin = linkedProducts.filter(p => (p.margin || 0) < 20).length;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Escandallo"
        subtitle="Costo de recetas y margen real de cada producto."
      />

      <SubNav items={TABS} value={tab} onChange={setTab} />

      {tab === 'calculator' && (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          <div className="space-y-3 lg:col-span-2">
            <Panel>
              <PanelHeader title="Producto" subtitle="Nombre del plato o producto a costear." />
              <div className="p-4">
                <input
                  type="text"
                  value={nombrePlato}
                  onChange={e => setNombrePlato(e.target.value)}
                  placeholder="Ej. Hamburguesa Especial"
                  className="input-field h-9"
                  aria-label="Nombre del plato o producto"
                />
              </div>
            </Panel>

            <Panel>
              <PanelHeader title="Ingredientes" subtitle="Usa la misma unidad en la cantidad usada y en el paquete." />

              <div className="grid gap-3 border-b border-line p-4 sm:grid-cols-2 lg:grid-cols-[1fr_140px_110px_110px]">
                <div>
                  <label className="mb-1 block text-2xs font-semibold text-ink-muted">Ingrediente</label>
                  <input
                    type="text"
                    placeholder="Ej. Carne molida"
                    value={nuevoIngrediente.nombre}
                    onChange={e => setNuevoIngrediente({ ...nuevoIngrediente, nombre: e.target.value })}
                    className="input-field h-9 text-[13px]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-2xs font-semibold text-ink-muted">Cant. usada</label>
                  <div className="flex gap-1">
                    <input
                      type="number"
                      placeholder="150"
                      value={nuevoIngrediente.cantidadUsada}
                      onChange={e => setNuevoIngrediente({ ...nuevoIngrediente, cantidadUsada: e.target.value })}
                      className="input-field num h-9 min-w-0 text-[13px]"
                    />
                    <select
                      value={nuevoIngrediente.unidad}
                      onChange={e => setNuevoIngrediente({ ...nuevoIngrediente, unidad: e.target.value })}
                      className="input-field h-9 w-12 shrink-0 px-1 text-[13px]"
                      aria-label="Unidad"
                    >
                      {UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-2xs font-semibold text-ink-muted">Costo paquete</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={nuevoIngrediente.costoPresentacion}
                    onChange={e => setNuevoIngrediente({ ...nuevoIngrediente, costoPresentacion: e.target.value })}
                    className="input-field num h-9 text-[13px]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-2xs font-semibold text-ink-muted">Cant. paquete</label>
                  <input
                    type="number"
                    placeholder="1000"
                    value={nuevoIngrediente.cantidadPresentacion}
                    onChange={e => setNuevoIngrediente({ ...nuevoIngrediente, cantidadPresentacion: e.target.value })}
                    className="input-field num h-9 text-[13px]"
                  />
                </div>
                <div className="flex justify-end sm:col-span-2 lg:col-span-4">
                  <button onClick={agregarIngrediente} className="btn-primary h-9 px-3.5 text-[13px]">
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    Agregar ingrediente
                  </button>
                </div>
              </div>

              {ingredientes.length === 0 ? (
                <EmptyState
                  icon={UtensilsCrossed}
                  title="Aún no hay ingredientes"
                  description="Agrega la primera materia prima para calcular el costo del plato."
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Ingrediente</th>
                        <th className="text-right">Cantidad</th>
                        <th className="text-right">Costo real</th>
                        <th className="w-12 text-right"><span className="sr-only">Acciones</span></th>
                      </tr>
                    </thead>
                    <tbody>
                      {ingredientes.map(ing => (
                        <tr key={ing.id}>
                          <td className="font-medium text-ink">{ing.nombre}</td>
                          <td className="num text-right text-ink-muted">{ing.cantidadUsada} {ing.unidad}</td>
                          <td className="num text-right font-medium text-ink">{formatCurrency(calcularCostoIngrediente(ing))}</td>
                          <td>
                            <div className="-mr-2 flex justify-end">
                              <button onClick={() => eliminarIngrediente(ing.id)} className="grid h-8 w-8 place-items-center rounded-lg text-ink-soft transition-colors hover:bg-danger-soft hover:text-danger" aria-label={`Eliminar ${ing.nombre}`}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>
          </div>

          <div>
            <Panel className="lg:sticky lg:top-4">
              <PanelHeader title="Resumen de costos" subtitle={`${ingredientes.length} ingrediente(s)`} />
              <div className="space-y-3 p-4">
                <div className="flex items-center justify-between rounded-xl bg-surface px-3 py-2">
                  <span className="text-2xs font-semibold uppercase tracking-wide text-ink-muted">Materia prima</span>
                  <span className="num text-sm font-semibold text-ink">{formatCurrency(costoTotalMateriaPrima)}</span>
                </div>

                <div>
                  <label className="mb-1 block text-2xs font-semibold text-ink-muted">Margen deseado (%)</label>
                  <input
                    type="number"
                    value={margenDeseado}
                    onChange={e => setMargenDeseado(Number(e.target.value))}
                    className="input-field num h-9 text-right"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-2xs font-semibold text-ink-muted">Impuesto / propina (%)</label>
                  <input
                    type="number"
                    value={impuesto}
                    onChange={e => setImpuesto(Number(e.target.value))}
                    className="input-field num h-9 text-right"
                  />
                </div>

                <div className="rounded-xl bg-primary px-3.5 py-3 text-white">
                  <p className="text-2xs font-semibold uppercase tracking-wide text-white/70">Precio de venta sugerido</p>
                  <p className="num mt-1 text-3xl font-semibold leading-none tracking-tight">{formatCurrency(precioConImpuesto)}</p>
                  <p className="mt-1.5 text-2xs text-white/75">
                    Ganancia neta: <span className="num font-semibold text-white">{formatCurrency(gananciaBruta)}</span>
                  </p>
                  {margenDeseado >= 100 && (
                    <p className="mt-1.5 text-2xs font-medium text-white">El margen debe ser menor a 100%.</p>
                  )}
                </div>

                <button onClick={guardarEscandallo} className="btn-primary h-9 w-full px-3.5 text-[13px]">
                  <Save className="h-4 w-4" aria-hidden="true" />
                  Guardar receta
                </button>
              </div>
            </Panel>
          </div>
        </div>
      )}

      {tab === 'analysis' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
            <StatCard label="Con receta" value={linkedProducts.length} hint="Con insumos vinculados" icon={PieChart} tone="brand" />
            <StatCard label="Margen promedio" value={`${avgMargin.toFixed(1)}%`} hint="Sobre precio de venta" icon={TrendingUp} tone={avgMargin >= 40 ? 'ok' : 'warn'} />
            <StatCard label="Bajo margen" value={lowMargin} hint="Menos de 20%" icon={TrendingDown} tone={lowMargin === 0 ? 'ok' : 'danger'} className="col-span-2 sm:col-span-1" />
          </div>

          <Panel>
            <PanelHeader
              title="Margen por producto"
              subtitle="Costo estimado según los insumos vinculados en Inventario."
              actions={
                <button onClick={loadCostAnalysis} className="grid h-8 w-8 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-surface hover:text-ink" title="Actualizar" aria-label="Actualizar datos">
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
              }
            />

            {costAnalysis.length === 0 ? (
              <EmptyState
                icon={PieChart}
                title="No hay datos de costos"
                description="Vincula insumos a los productos en Inventario para ver su margen."
              />
            ) : (
              <>
                <div className="divide-y divide-line-soft md:hidden">
                  {costAnalysis.map(p => {
                    return (
                      <div key={p.id} className="px-4 py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-[13px] font-semibold text-ink">{p.name}</p>
                            <p className="text-2xs text-ink-muted">{p.category}</p>
                          </div>
                          <MarginCell product={p} className="shrink-0 text-[13px]" />
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-2xs">
                          <span className="text-ink-muted">Precio venta</span>
                          <span className="num text-right font-medium text-ink">{p.isUsd ? `${p.price.toFixed(2)} USD` : formatCurrency(p.price)}</span>
                          <span className="text-ink-muted">Costo insumos</span>
                          <span className="num text-right font-medium text-ink">{formatCurrency(p.totalInventoryCost)}</span>
                          <span className="text-ink-muted">Insumos vinculados</span>
                          <span className="num text-right text-ink-muted">{p.linkedItems}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="hidden overflow-x-auto md:block">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Producto</th>
                        <th>Categoría</th>
                        <th className="text-right">Precio venta</th>
                        <th className="text-right">Costo insumos</th>
                        <th className="text-right">Margen</th>
                        <th className="text-right">Insumos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {costAnalysis.map(p => {
                        return (
                          <tr key={p.id}>
                            <td className="font-medium text-ink">{p.name}</td>
                            <td className="text-ink-muted">{p.category}</td>
                            <td className="num text-right text-ink">{p.isUsd ? `${p.price.toFixed(2)} USD` : formatCurrency(p.price)}</td>
                            <td className="num text-right text-ink-muted">{formatCurrency(p.totalInventoryCost)}</td>
                            <td className="text-right"><MarginCell product={p} className="justify-end" /></td>
                            <td className="num text-right text-ink-muted">{p.linkedItems}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </Panel>
        </div>
      )}
    </div>
  );
}
