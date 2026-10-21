import React, { useState } from 'react';
import { SettingsTabs } from './SettingsTabs';
import { SettingsNegocio } from './SettingsNegocio';
import { SettingsMovil } from './SettingsMovil';
import { SettingsDatos } from './SettingsDatos';
import { SettingsServidor } from './SettingsServidor';
import { PageHeader } from './ui/PageHeader';

export function CurrencySettings() {
    const [activeTab, setActiveTab] = useState('negocio');

    return (
        <div className="space-y-4">
            <PageHeader
                title="Ajustes"
                subtitle="Negocio, acceso móvil, datos y servidor."
            />

            <SettingsTabs activeTab={activeTab} setActiveTab={setActiveTab} />

            <div className="max-w-4xl">
                {activeTab === 'negocio' && <SettingsNegocio />}
                {activeTab === 'movil' && <SettingsMovil />}
                {activeTab === 'datos' && <SettingsDatos />}
                {activeTab === 'servidor' && <SettingsServidor />}
            </div>
        </div>
    );
}
