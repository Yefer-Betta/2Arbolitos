import React, { useState } from 'react';
import { useSettings } from '../context/SettingsContext';
import { DollarSign, RefreshCw, Building, Check, Upload } from 'lucide-react';
import { useToast } from './ui/feedback-context';
import { Panel, PanelHeader } from './ui/Panel';

export function SettingsNegocio() {
    const { exchangeRate, setExchangeRate, exchangeRateBs, setExchangeRateBs, business, setBusiness } = useSettings();
    const toast = useToast();
    const [localBusiness, setLocalBusiness] = useState(business);
    const [isSaved, setIsSaved] = useState(false);

    const handleRateChange = (e) => {
        const value = parseFloat(e.target.value);
        if (!isNaN(value) && value > 0) {
            setExchangeRate(value);
        }
    };

    const handleRateBsChange = (e) => {
        const value = parseFloat(e.target.value);
        if (!isNaN(value) && value > 0) {
            setExchangeRateBs(value);
        }
    };

    const handleBusinessChange = (e) => {
        const { name, value } = e.target;
        setLocalBusiness(prev => ({ ...prev, [name]: value }));
        setIsSaved(false);
    };

    const saveBusinessSettings = (e) => {
        e.preventDefault();
        setBusiness(localBusiness);
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 3000);
    };

    const handleImageUpload = (e, field) => {
        const file = e.target.files[0];
        if (file && file.size > 1024 * 1024) {
            toast.error('La imagen es muy grande. Por favor, elige una imagen de menos de 1MB.');
            e.target.value = null;
            return;
        }

        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setLocalBusiness(prev => ({ ...prev, [field]: reader.result }));
                setIsSaved(false);
            };
            reader.readAsDataURL(file);
        }
    };

    const filePicker = (field, label) => (
        <div>
            <label className="mb-1 block text-2xs font-semibold text-ink-muted">{label}</label>
            <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-dashed border-line px-3 py-2 transition-colors hover:border-primary/40">
                <span className="min-w-0 truncate text-2xs text-ink-muted">
                    {localBusiness[field] ? 'Imagen cargada' : 'PNG o JPG, máximo 1 MB'}
                </span>
                <span className="inline-flex h-7 shrink-0 items-center gap-1 rounded-lg border border-line px-2 text-2xs font-medium text-ink">
                    <Upload className="h-3 w-3" aria-hidden="true" />
                    Elegir
                </span>
                <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, field)}
                    className="hidden"
                />
            </label>
            {localBusiness[field] && (
                <img
                    src={localBusiness[field]}
                    alt={`Vista previa de ${label.toLowerCase()}`}
                    className="mt-2 h-10 w-auto rounded-md border border-line bg-background-paper object-contain p-1"
                />
            )}
        </div>
    );

    return (
        <div className="space-y-4">
            <Panel>
                <PanelHeader title="Tasa de cambio" subtitle="Se usa para convertir precios y pagos." />
                <div className="grid gap-4 p-4 sm:grid-cols-2">
                    <div>
                        <label htmlFor="rate" className="mb-1 block text-2xs font-semibold text-ink-muted">
                            1 USD = COP
                        </label>
                        <div className="relative">
                            <DollarSign className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
                            <input
                                id="rate"
                                type="number"
                                value={exchangeRate}
                                onChange={handleRateChange}
                                className="input-field num h-11 pl-8 text-base font-semibold"
                                step="50"
                            />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="rateBs" className="mb-1 block text-2xs font-semibold text-ink-muted">
                            1 Bs. = COP
                        </label>
                        <div className="relative">
                            <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-2xs font-semibold text-ink-soft">
                                Bs.
                            </span>
                            <input
                                id="rateBs"
                                type="number"
                                value={exchangeRateBs}
                                onChange={handleRateBsChange}
                                className="input-field num h-11 pl-9 text-base font-semibold"
                                step="1"
                            />
                        </div>
                    </div>
                </div>
                <p className="flex items-center gap-1.5 border-t border-line-soft px-4 py-2 text-2xs text-ink-soft">
                    <RefreshCw className="h-3 w-3" aria-hidden="true" />
                    Los importes en USD y Bs. se recalculan con esta tasa.
                </p>
            </Panel>

            <Panel>
                <PanelHeader title="Datos del negocio" subtitle="Aparecen en el ticket y en la factura." />
                <form onSubmit={saveBusinessSettings} className="space-y-3 p-4">
                    <div>
                        <label className="mb-1 block text-2xs font-semibold text-ink-muted">Nombre del negocio</label>
                        <input
                            type="text"
                            name="name"
                            value={localBusiness.name}
                            onChange={handleBusinessChange}
                            className="input-field h-9"
                            placeholder="Ej. Restaurante 2Arbolitos"
                        />
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                            <label className="mb-1 block text-2xs font-semibold text-ink-muted">NIT / RUT</label>
                            <input
                                type="text"
                                name="nit"
                                value={localBusiness.nit}
                                onChange={handleBusinessChange}
                                className="input-field h-9"
                                placeholder="Ej. 123456789-0"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-2xs font-semibold text-ink-muted">Teléfono</label>
                            <input
                                type="text"
                                name="phone"
                                value={localBusiness.phone}
                                onChange={handleBusinessChange}
                                className="input-field h-9"
                                placeholder="Ej. 300 123 4567"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="mb-1 block text-2xs font-semibold text-ink-muted">Dirección</label>
                        <input
                            type="text"
                            name="address"
                            value={localBusiness.address}
                            onChange={handleBusinessChange}
                            className="input-field h-9"
                            placeholder="Ej. Calle 123 # 45-67"
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-2xs font-semibold text-ink-muted">Mensaje del ticket</label>
                        <input
                            type="text"
                            name="message"
                            value={localBusiness.message}
                            onChange={handleBusinessChange}
                            className="input-field h-9"
                            placeholder="Ej. ¡Gracias por su visita!"
                        />
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                        {filePicker('logo', 'Logo del sistema')}
                        {filePicker('invoiceLogo', 'Logo para factura')}
                    </div>

                    <div className="flex items-center justify-between gap-3 border-t border-line-soft pt-3">
                        <p className="flex items-center gap-1.5 text-2xs text-ink-soft">
                            <Building className="h-3 w-3" aria-hidden="true" />
                            Se guarda en este dispositivo y en el servidor.
                        </p>
                        <button
                            type="submit"
                            disabled={isSaved}
                            className={isSaved ? 'btn-primary h-9 bg-ok px-3.5 text-[13px] hover:bg-ok' : 'btn-primary h-9 px-3.5 text-[13px]'}
                        >
                            {isSaved ? (
                                <>
                                    <Check className="h-4 w-4" aria-hidden="true" />
                                    Guardado
                                </>
                            ) : (
                                'Guardar cambios'
                            )}
                        </button>
                    </div>
                </form>
            </Panel>
        </div>
    );
}
