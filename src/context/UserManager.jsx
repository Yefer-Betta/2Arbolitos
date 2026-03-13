import React, { useState } from 'react';
import { useUser } from '../context/UserContext';
import { Plus, Edit2, Trash2, X, Check, Users } from 'lucide-react';

export function UserManager() {
    const { users, addUser, updateUser, deleteUser } = useUser();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        username: '',
        password: '',
        role: 'waiter',
    });

    const handleOpenForm = (user = null) => {
        if (user) {
            setEditingUser(user);
            setFormData({
                name: user.name,
                username: user.username,
                password: '', // Do not show existing password
                role: user.role,
            });
        } else {
            setEditingUser(null);
            setFormData({ name: '', username: '', password: '', role: 'waiter' });
        }
        setIsFormOpen(true);
    };

    const handleCloseForm = () => {
        setIsFormOpen(false);
        setEditingUser(null);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const userData = { ...formData };
        // In a real app, you'd hash the password here.
        // For this local app, we'll only update the password if a new one is entered.
        if (editingUser && !userData.password) {
            delete userData.password;
        }

        if (editingUser) {
            updateUser(editingUser.id, userData);
        } else {
            if (!userData.password) {
                alert('La contraseña es obligatoria para nuevos usuarios.');
                return;
            }
            addUser(userData);
        }
        handleCloseForm();
    };

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Gestión de Usuarios</h2>
                    <p className="text-gray-500 text-sm">Añade, edita o elimina usuarios y sus roles.</p>
                </div>
                <button onClick={() => handleOpenForm()} className="btn-primary flex items-center gap-2">
                    <Plus className="w-5 h-5" />
                    Nuevo Usuario
                </button>
            </div>

            {isFormOpen && (
                <div className="card p-8 bg-white border border-primary/10">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold text-primary">{editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}</h3>
                        <button onClick={handleCloseForm} className="text-gray-400 hover:text-red-500"><X /></button>
                    </div>
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Nombre Completo</label>
                            <input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="input-field" placeholder="Ej. Juan Pérez" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Nombre de Usuario</label>
                            <input required value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} className="input-field" placeholder="Ej. juanp" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Contraseña</label>
                            <input type="password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} className="input-field" placeholder={editingUser ? 'Dejar en blanco para no cambiar' : 'Requerida'} />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Rol</label>
                            <select value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })} className="input-field">
                                <option value="admin">Administrador</option>
                                <option value="waiter">Mesero</option>
                                <option value="cook">Cocinero</option>
                            </select>
                        </div>
                        <div className="col-span-2 flex justify-end gap-3 mt-4 pt-4 border-t">
                            <button type="button" onClick={handleCloseForm} className="btn-secondary">Cancelar</button>
                            <button type="submit" className="btn-primary flex items-center gap-2"><Check className="w-5 h-5" /> Guardar</button>
                        </div>
                    </form>
                </div>
            )}

            <div className="card overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-surface">
                        <tr>
                            <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">Nombre</th>
                            <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">Usuario</th>
                            <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">Rol</th>
                            <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {users.map(user => (
                            <tr key={user.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 font-medium">{user.name}</td>
                                <td className="px-6 py-4 text-gray-600">{user.username}</td>
                                <td className="px-6 py-4">
                                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-primary/10 text-primary">{user.role}</span>
                                </td>
                                <td className="px-6 py-4 text-right space-x-2">
                                    <button onClick={() => handleOpenForm(user)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 className="w-4 h-4" /></button>
                                    {user.role !== 'admin' && (
                                        <button onClick={() => { if (confirm(`¿Seguro que quieres eliminar a ${user.name}?`)) deleteUser(user.id) }} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}