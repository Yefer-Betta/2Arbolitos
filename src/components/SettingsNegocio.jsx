import React, { useState } from 'react';
import { useSettings } from '../context/SettingsContext';
import { DollarSign, RefreshCw, Building, Save } from 'lucide-react';

export function SettingsNegocio() {
    const { exchangeRate, setExchangeRate, exchangeRateBs, setExchangeRateBs, business, setBusiness } = useSettings();
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
            alert('La imagen es muy grande. Por favor, elige una imagen de menos de 1MB.');
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

    return (
        <div className="space-y-6 sm:space-y-8">
            {/* Tasa de Cambio */}
            <div className="card p-6 sm:p-8">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-green-50 rounded-xl text-green-600">
                        <DollarSign className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">Tasa de Cambio</h2>
                        <p className="text-sm text-gray-500">Valor del Dólar hoy</p>
                    </div>
                </div>

                <div className="flex flex-col gap-4">
                    <label htmlFor="rate" className="text-sm font-bold text-gray-700">
                        1 USD = COP
                    </label>

                    <div className="relative group">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-green-600 font-bold text-lg">
                            $
                        </span>
                        <input
                            id="rate"
                            type="number"
                            value={exchangeRate}
                            onChange={handleRateChange}
                            className="w-full pl-10 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-xl text-2xl font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
                            step="50"
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2">
                            <div className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded-lg">
                                <RefreshCw className="w-3 h-3" />
                                <span>Auto</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-4 mt-6 pt-6 border-t border-gray-100">
                    <label htmlFor="rateBs" className="text-sm font-bold text-gray-700">
                        1 Bs. = COP
                    </label>

                    <div className="relative group">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-yellow-600 font-bold text-lg">
                            Bs.
                        </span>
                        <input
                            id="rateBs"
                            type="number"
                            value={exchangeRateBs}
                            onChange={handleRateBsChange}
                            className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-xl text-2xl font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500 transition-all"
                            step="1"
                        />
                    </div>
                </div>
            </div>

            {/* Datos del Negocio */}
            <div className="card p-6 sm:p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full pointer-events-none"></div>
                <div className="flex items-center gap-3 mb-6 relative">
                    <div className="p-3 bg-primary/10 rounded-xl text-primary">
                        <Building className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">Datos del Negocio</h2>
                        <p className="text-sm text-gray-500">Información para facturación</p>
                    </div>
                </div>

                <form onSubmit={saveBusinessSettings} className="space-y-4 relative">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Nombre del Negocio</label>
                        <input
                            type="text"
                            name="name"
                            value={localBusiness.name}
                            onChange={handleBusinessChange}
                            className="input-field"
                            placeholder="Ej. Restaurante 2Arbolitos"
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">NIT / RUT</label>
                            <input
                                type="text"
                                name="nit"
                                value={localBusiness.nit}
                                onChange={handleBusinessChange}
                                className="input-field"
                                placeholder="Ej. 123456789-0"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Teléfono</label>
                            <input
                                type="text"
                                name="phone"
                                value={localBusiness.phone}
                                onChange={handleBusinessChange}
                                className="input-field"
                                placeholder="Ej. 300 123 4567"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Dirección</label>
                        <input
                            type="text"
                            name="address"
                            value={localBusiness.address}
                            onChange={handleBusinessChange}
                            className="input-field"
                            placeholder="Ej. Calle 123 # 45-67"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Mensaje Ticket</label>
                        <input
                            type="text"
                            name="message"
                            value={localBusiness.message}
                            onChange={handleBusinessChange}
                            className="input-field"
                            placeholder="Ej. ¡Gracias por su visita!"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Logo del Sistema</label>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleImageUpload(e, 'logo')}
                            className="input-field"
                        />
                        {localBusiness.logo && <img src={localBusiness.logo} alt="Logo Preview" className="mt-2 h-16" />}
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Logo para Factura</label>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleImageUpload(e, 'invoiceLogo')}
                            className="input-field"
                        />
                        {localBusiness.invoiceLogo && <img src={localBusiness.invoiceLogo} alt="Invoice Logo Preview" className="mt-2 h-16" />}
                    </div>

                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={isSaved}
                            className={`w-full btn-primary flex items-center justify-center gap-2 ${isSaved ? 'bg-green-600 hover:bg-green-700' : ''}`}
                        >
                            {isSaved ? (
                                <>¡Guardado!</>
                            ) : (
                                <><Save className="w-5 h-5" /> Guardar Cambios</>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
