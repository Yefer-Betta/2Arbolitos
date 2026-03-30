import React, { useState } from 'react';
import { useUser } from '../context/UserContext';
import { syncManager } from '../lib/syncManager.js';
import { Wifi, WifiOff } from 'lucide-react';

export function LoginScreen() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { login } = useUser();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        if (!syncManager.isOnline) {
            setError('El login requiere conexión a internet. Por favor verifica tu red.');
            setIsLoading(false);
            return;
        }

        const result = await login(username, password);
        
        if (!result.success) {
            setError(result.error || 'Usuario o contraseña incorrectos.');
        }
        
        setIsLoading(false);
    };

    return (
        <div className="flex items-center justify-center h-screen bg-gray-100">
            <div className="p-8 bg-white rounded-xl shadow-2xl w-full max-w-sm border-t-4 border-primary">
                <div className="flex justify-center mb-4">
                    {syncManager.isOnline ? (
                        <div className="flex items-center gap-2 text-green-600 bg-green-50 px-3 py-1 rounded-full">
                            <Wifi className="w-4 h-4" />
                            <span className="text-sm font-medium">Online</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 text-red-600 bg-red-50 px-3 py-1 rounded-full">
                            <WifiOff className="w-4 h-4" />
                            <span className="text-sm font-medium">Offline</span>
                        </div>
                    )}
                </div>
                
                <h1 className="text-3xl font-bold text-center text-primary mb-2">2Arbolitos</h1>
                <p className="text-center text-gray-500 mb-6">Inicio de Sesión</p>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Usuario</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="input-field"
                            autoFocus
                            disabled={isLoading}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Contraseña</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="input-field"
                            disabled={isLoading}
                        />
                    </div>
                    {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                    <button 
                        type="submit" 
                        className="w-full btn-primary py-3 mt-4 disabled:opacity-50"
                        disabled={isLoading}
                    >
                        {isLoading ? 'Ingresando...' : 'Ingresar'}
                    </button>
                </form>
            </div>
        </div>
    );
}
