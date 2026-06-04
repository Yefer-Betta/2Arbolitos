import React, { useState } from 'react';
import { SettingsTabs } from './SettingsTabs';
import { SettingsNegocio } from './SettingsNegocio';
import { SettingsMovil } from './SettingsMovil';
import { SettingsDatos } from './SettingsDatos';
import { SettingsServidor } from './SettingsServidor';

export function CurrencySettings() {
    const [activeTab, setActiveTab] = useState('negocio');

    return (
        <div className="space-y-6">
            <SettingsTabs activeTab={activeTab} setActiveTab={setActiveTab} />

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2">
                    {activeTab === 'negocio' && <SettingsNegocio />}
                    {activeTab === 'movil' && <SettingsMovil />}
                    {activeTab === 'datos' && <SettingsDatos />}
                    {activeTab === 'servidor' && <SettingsServidor />}
                </div>
            </div>
        </div>
    );
}
