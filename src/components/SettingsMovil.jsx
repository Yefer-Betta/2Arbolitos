import React, { useState, useEffect } from 'react';
import { useSettings } from '../context/SettingsContext';
import { Smartphone, QrCode, RefreshCw, Download } from 'lucide-react';
import { useToast } from './ui/feedback-context';
import { Panel, PanelHeader } from './ui/Panel';

export function SettingsMovil() {
    const { serverUrl } = useSettings();
    const toast = useToast();
    const [qrSvg, setQrSvg] = useState('');
    const [qrLoading, setQrLoading] = useState(false);

    const loadQr = async () => {
        if (qrLoading) return;
        setQrLoading(true);
        try {
            const res = await fetch('/api/settings/qr');
            const data = await res.json();
            setQrSvg(data.qrSvg);
        } catch { /* sin conexion */ }
        setQrLoading(false);
    };

    const downloadQr = () => {
        if (!qrSvg) return;
        const canvas = document.createElement('canvas');
        canvas.width = 600;
        canvas.height = 600;
        const ctx = canvas.getContext('2d');
        const img = new Image();
        const svgBlob = new Blob([qrSvg], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);
        img.onload = () => {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, 600, 600);
            ctx.drawImage(img, 0, 0, 600, 600);
            URL.revokeObjectURL(url);
            canvas.toBlob((blob) => {
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = '2Arbolitos-QR.png';
                link.click();
                URL.revokeObjectURL(link.href);
            });
        };
        img.src = url;
    };

    const copyUrl = async () => {
        try {
            await navigator.clipboard.writeText(serverUrl);
            toast.success('URL copiada al portapapeles');
        } catch {
            const input = document.createElement('input');
            input.value = serverUrl;
            document.body.appendChild(input);
            input.select();
            document.execCommand('copy');
            document.body.removeChild(input);
            toast.success('URL copiada al portapapeles');
        }
    };

    // Carga asincrona del QR: el setState ocurre tras el fetch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { loadQr(); }, []);

    return (
        <Panel>
            <PanelHeader
                title="Acceso móvil"
                subtitle="Celulares y tablets en la misma red WiFi."
                actions={
                    <span className="inline-flex items-center gap-1 text-2xs text-ink-muted">
                        <Smartphone className="h-3.5 w-3.5" aria-hidden="true" />
                        PWA
                    </span>
                }
            />
            <div className="grid gap-5 p-4 sm:grid-cols-[minmax(0,220px)_1fr] sm:items-start">
                <div className="mx-auto rounded-2xl border border-line bg-white p-3">
                    {qrLoading ? (
                        <div className="flex h-[196px] w-[196px] items-center justify-center text-ink-soft">
                            <RefreshCw className="h-8 w-8 animate-spin" />
                        </div>
                    ) : qrSvg ? (
                        <div
                            className="h-[196px] w-[196px] [&>svg]:h-full [&>svg]:w-full"
                            dangerouslySetInnerHTML={{ __html: qrSvg }}
                        />
                    ) : (
                        <div className="flex h-[196px] w-[196px] items-center justify-center text-center text-2xs text-ink-soft">
                            Sin conexión al servidor
                        </div>
                    )}
                </div>

                <div>
                    <p className="text-xs leading-relaxed text-ink-muted">
                        Escanea el código con un celular o tablet para abrir la app. Todos los dispositivos
                        deben estar en la misma red WiFi que este equipo.
                    </p>
                    <p className="mt-3 break-all rounded-lg bg-surface px-3 py-2 font-mono text-2xs text-ink select-all">
                        {serverUrl || 'URL no disponible'}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                        <button
                            onClick={downloadQr}
                            disabled={!qrSvg}
                            className="btn-primary h-9 px-3 text-[13px]"
                        >
                            <Download className="h-4 w-4" aria-hidden="true" />
                            Descargar QR
                        </button>
                        <button
                            onClick={copyUrl}
                            disabled={!serverUrl}
                            className="btn-secondary h-9 px-3 text-[13px]"
                        >
                            <QrCode className="h-4 w-4" aria-hidden="true" />
                            Copiar URL
                        </button>
                        <a href="/qr" target="_blank" rel="noopener noreferrer" className="btn-secondary h-9 px-3 text-[13px]">
                            <Smartphone className="h-4 w-4" aria-hidden="true" />
                            Abrir página QR
                        </a>
                    </div>
                </div>
            </div>
        </Panel>
    );
}
