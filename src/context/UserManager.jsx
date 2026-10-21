import React, { useState } from 'react';
import { useUser } from '../context/UserContext';
import { Plus, Pencil, Trash2, X, Check, Users } from 'lucide-react';
import { useConfirm, useToast } from '../components/ui/feedback-context';
import { Panel, PanelHeader } from '../components/ui/Panel';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';

const ROLE = {
    ADMIN: { label: 'Administrador', tone: 'brand' },
    MANAGER: { label: 'Gerente', tone: 'info' },
    CASHIER: { label: 'Cajero', tone: 'ok' },
    WAITER: { label: 'Mesero', tone: 'neutral' },
    COOK: { label: 'Cocinero', tone: 'warn' },
};

function roleOf(user) {
    const key = String(user.role || '').toUpperCase();
    return ROLE[key] || { label: key || 'Sin rol', tone: 'neutral' };
}

export function UserManager() {
    const { users, addUser, updateUser, deleteUser } = useUser();
    const toast = useToast();
    const confirm = useConfirm();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        username: '',
        password: '',
        role: 'WAITER',
    });

    const handleOpenForm = (user = null) => {
        if (user) {
            setEditingUser(user);
            setFormData({
                name: user.name,
                username: user.username,
                password: '', // Do not show existing password
                role: user.role.toUpperCase(),
            });
        } else {
            setEditingUser(null);
            setFormData({ name: '', username: '', password: '', role: 'WAITER' });
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
                toast.error('La contraseña es obligatoria para nuevos usuarios.');
                return;
            }
            addUser(userData);
            toast.success('Usuario creado');
        }
        handleCloseForm();
    };

    const handleDelete = async (user) => {
        const ok = await confirm({
            title: `¿Eliminar a ${user.name}?`,
            message: 'El usuario perderá el acceso al sistema.',
            confirmLabel: 'Eliminar',
            danger: true,
        });
        if (!ok) return;
        deleteUser(user.id);
        toast.success('Usuario eliminado');
    };

    return (
        <div className="space-y-3">
            {isFormOpen && (
                <Panel>
                    <PanelHeader
                        title={editingUser ? 'Editar usuario' : 'Nuevo usuario'}
                        subtitle={editingUser ? 'Deja la contraseña vacía para conservarla.' : 'Define credenciales y rol de acceso.'}
                        actions={
                            <button onClick={handleCloseForm} className="grid h-8 w-8 place-items-center rounded-lg text-ink-muted hover:bg-surface hover:text-ink" aria-label="Cerrar formulario">
                                <X className="h-4 w-4" />
                            </button>
                        }
                    />
                    <form onSubmit={handleSubmit} className="grid gap-3 p-4 sm:grid-cols-2">
                        <div>
                            <label className="mb-1 block text-2xs font-semibold text-ink-muted">Nombre completo</label>
                            <input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="input-field h-9" placeholder="Ej. Juan Pérez" />
                        </div>
                        <div>
                            <label className="mb-1 block text-2xs font-semibold text-ink-muted">Nombre de usuario</label>
                            <input required value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} className="input-field h-9" placeholder="Ej. juanp" />
                        </div>
                        <div>
                            <label className="mb-1 block text-2xs font-semibold text-ink-muted">Contraseña</label>
                            <input type="password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} className="input-field h-9" placeholder={editingUser ? 'Dejar en blanco para no cambiar' : 'Requerida'} />
                        </div>
                        <div>
                            <label className="mb-1 block text-2xs font-semibold text-ink-muted">Rol</label>
                            <select value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })} className="input-field h-9">
                                <option value="ADMIN">Administrador</option>
                                <option value="MANAGER">Gerente</option>
                                <option value="CASHIER">Cajero</option>
                                <option value="WAITER">Mesero</option>
                                <option value="COOK">Cocinero</option>
                            </select>
                        </div>
                        <div className="flex items-end justify-end gap-2 sm:col-span-2">
                            <button type="button" onClick={handleCloseForm} className="btn-secondary h-9 px-3 text-[13px]">Cancelar</button>
                            <button type="submit" className="btn-primary h-9 px-3.5 text-[13px]">
                                <Check className="h-4 w-4" aria-hidden="true" />
                                Guardar
                            </button>
                        </div>
                    </form>
                </Panel>
            )}

            <Panel>
                <PanelHeader
                    title="Usuarios"
                    subtitle={`${users.length} ${users.length === 1 ? 'cuenta' : 'cuentas'} con acceso al POS`}
                    actions={
                        !isFormOpen ? (
                            <button onClick={() => handleOpenForm()} className="btn-primary h-9 px-3.5 text-[13px]">
                                <Plus className="h-4 w-4" aria-hidden="true" />
                                Nuevo usuario
                            </button>
                        ) : null
                    }
                />

                {users.length === 0 ? (
                    <EmptyState
                        icon={Users}
                        title="No hay usuarios"
                        description="Crea la primera cuenta para que el equipo pueda iniciar sesión."
                    />
                ) : (
                    <>
                        <div className="divide-y divide-line-soft md:hidden">
                            {users.map(user => {
                                const role = roleOf(user);
                                return (
                                    <div key={user.id} className="flex items-start justify-between gap-3 px-4 py-3">
                                        <div className="flex min-w-0 items-center gap-2.5">
                                            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/10 text-[13px] font-semibold text-ink-brand">
                                                {user.name?.charAt(0)?.toUpperCase() || '?'}
                                            </span>
                                            <div className="min-w-0">
                                                <p className="truncate text-[13px] font-semibold text-ink">{user.name}</p>
                                                <p className="flex items-center gap-1.5 text-2xs text-ink-muted">
                                                    <span className="truncate">{user.username}</span>
                                                    <Badge tone={role.tone}>{role.label}</Badge>
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex shrink-0 items-center gap-1">
                                            <button onClick={() => handleOpenForm(user)} className="grid h-8 w-8 place-items-center rounded-lg text-ink-muted hover:bg-surface hover:text-ink" aria-label={`Editar a ${user.name}`}>
                                                <Pencil className="h-3.5 w-3.5" />
                                            </button>
                                            {String(user.role).toUpperCase() !== 'ADMIN' && (
                                                <button onClick={() => handleDelete(user)} className="grid h-8 w-8 place-items-center rounded-lg text-ink-soft hover:bg-danger-soft hover:text-danger" aria-label={`Eliminar a ${user.name}`}>
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="hidden overflow-x-auto md:block">
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>Nombre</th>
                                        <th>Usuario</th>
                                        <th>Rol</th>
                                        <th className="w-24 text-right"><span className="sr-only">Acciones</span></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map(user => {
                                        const role = roleOf(user);
                                        return (
                                            <tr key={user.id}>
                                                <td className="font-medium text-ink">{user.name}</td>
                                                <td className="text-ink-muted">{user.username}</td>
                                                <td><Badge tone={role.tone}>{role.label}</Badge></td>
                                                <td>
                                                    <div className="-mr-2 flex justify-end">
                                                        <button onClick={() => handleOpenForm(user)} className="grid h-8 w-8 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-surface hover:text-ink" aria-label={`Editar a ${user.name}`}>
                                                            <Pencil className="h-3.5 w-3.5" />
                                                        </button>
                                                        {String(user.role).toUpperCase() !== 'ADMIN' && (
                                                            <button onClick={() => handleDelete(user)} className="grid h-8 w-8 place-items-center rounded-lg text-ink-soft transition-colors hover:bg-danger-soft hover:text-danger" aria-label={`Eliminar a ${user.name}`}>
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
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
    );
}
