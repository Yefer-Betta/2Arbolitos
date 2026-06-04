import React, { useState, useEffect } from 'react';
import { useSettings } from '../context/SettingsContext';
import { Smartphone, QrCode, RefreshCw, Download } from 'lucide-react';

export function SettingsMovil() {
    const { serverUrl } = useSettings();
    const [qrSvg, setQrSvg] = useState('');
    const [qrLoading, setQrLoading] = useState(false);

    const loadQr = async () => {
        if (qrLoading) return;
        setQrLoading(true);
        try {
            const res = await fetch('/api/settings/qr');
            const data = await res.json();
            setQrSvg(data.qrSvg);
        } catch {}
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
            alert('URL copiada al portapapeles');
        } catch {
            const input = document.createElement('input');
            input.value = serverUrl;
            document.body.appendChild(input);
            input.select();
            document.execCommand('copy');
            document.body.removeChild(input);
            alert('URL copiada al portapapeles');
        }
    };

    useEffect(() => {
        loadQr();
    }, []);

    return (
        <div className="card p-6 sm:p-8 bg-gradient-to-br from-purple-50 to-violet-50 border-2 border-purple-200">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-purple-100 rounded-xl text-purple-600">
                    <Smartphone className="w-6 h-6" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-gray-800">Acceso Móvil</h2>
                    <p className="text-sm text-purple-600 font-medium">Conecta celulares y tablets</p>
                </div>
            </div>

            <div className="bg-white rounded-xl p-6 border border-purple-100 text-center">
                <p className="text-sm text-gray-600 mb-6">
                    Escanea este código QR con tu <strong>celular</strong> o <strong>tablet</strong> para abrir la app.
                    Todos los dispositivos deben estar en la <strong>misma red WiFi</strong>.
                </p>

                <div className="bg-gray-50 rounded-xl p-4 inline-block mb-4 max-w-full">
                    {qrLoading ? (
                        <div className="w-full max-w-[300px] h-[300px] flex items-center justify-center text-gray-400">
                            <RefreshCw className="w-10 h-10 animate-spin" />
                        </div>
                    ) : qrSvg ? (
                        <div className="w-full max-w-[300px] mx-auto" dangerouslySetInnerHTML={{ __html: qrSvg }} />
                    ) : (
                        <div className="w-full max-w-[300px] h-[300px] flex items-center justify-center text-gray-400">
                            Sin conexión al servidor
                        </div>
                    )}
                </div>

                <p className="text-sm text-gray-500 font-mono break-all bg-gray-100 rounded-lg p-3 mb-4 select-all">
                    {serverUrl}
                </p>

                <div className="flex flex-wrap gap-3 justify-center">
                    <button
                        onClick={downloadQr}
                        disabled={!qrSvg}
                        className="btn-primary bg-purple-600 hover:bg-purple-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Download className="w-4 h-4" />
                        Descargar QR
                    </button>
                    <button
                        onClick={copyUrl}
                        disabled={!serverUrl}
                        className="btn-secondary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <QrCode className="w-4 h-4" />
                        Copiar URL
                    </button>
                    <a
                        href="/qr"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-secondary inline-flex items-center gap-2"
                    >
                        <Smartphone className="w-4 h-4" />
                        Abrir página QR
                    </a>
                </div>
            </div>
        </div>
    );
}
