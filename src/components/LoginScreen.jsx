import React, { useState } from 'react';
import { useUser } from '../context/UserContext';

export function LoginScreen() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login } = useUser();

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!login(username, password)) {
            setError('Usuario o contraseña incorrectos.');
        } else {
            setError('');
        }
    };

    return (
        <div className="flex items-center justify-center h-screen bg-gray-100">
            <div className="p-8 bg-white rounded-xl shadow-2xl w-full max-w-sm border-t-4 border-primary">
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
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Contraseña</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="input-field"
                        />
                    </div>
                    {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                    <button type="submit" className="w-full btn-primary py-3 mt-4">
                        Ingresar
                    </button>
                </form>
            </div>
        </div>
    );
}