import { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';

interface Role { id: string; name: string; description?: string }
interface Permission { id: string; module: string; action: string }
interface RolePermission { role_id: string; permission_id: string }
interface UserRole { id: string; user_id: string; role_id: string }

const APP_MODULES = [
  'dashboard','accounting','banks-module','pos','sales','products','inventory','fixed-assets','accounts-receivable','accounts-payable','billing','taxes','plans','settings','customers','users'
];

export default function UsersPage() {
  const { user } = useAuth();

  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [rolePerms, setRolePerms] = useState<RolePermission[]>([]);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);

  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');

  const [assignEmail, setAssignEmail] = useState('');
  const [assignRoleId, setAssignRoleId] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRoleId, setNewUserRoleId] = useState('');
  const [creatingUser, setCreatingUser] = useState(false);

  const storageKey = (key: string) => `contabi_rbac_${key}`;

  const loadLocal = () => {
    setRoles(JSON.parse(localStorage.getItem(storageKey('roles')) || '[]'));
    setPermissions(JSON.parse(localStorage.getItem(storageKey('permissions')) || '[]'));
    setRolePerms(JSON.parse(localStorage.getItem(storageKey('role_permissions')) || '[]'));
    setUserRoles(JSON.parse(localStorage.getItem(storageKey('user_roles')) || '[]'));
  };

  const createUser = async () => {
    const email = newUserEmail.trim().toLowerCase();
    if (!email || !newUserPassword || !newUserRoleId) return;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      alert('Email inválido. Verifique el formato (ej. usuario@correo.com).');
      return;
    }
    if (newUserPassword.length < 6) {
      alert('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    try {
      setCreatingUser(true);

      // Crear usuario en Supabase Auth con email + contraseña
      const { data, error } = await supabase.auth.signUp({
        email,
        password: newUserPassword,
      });

      if (error) {
        console.error('Error al crear usuario:', error);
        alert(error.message || 'Error al crear usuario');
        return;
      }

      const createdUser = data.user;

      // Si tenemos user.id real, registrar rol en user_roles
      if (user?.id && createdUser?.id) {
        try {
          await supabase
            .from('user_roles')
            .insert({ user_id: createdUser.id, role_id: newUserRoleId, owner_user_id: user.id });
        } catch (err) {
          console.error('Error al asignar rol al nuevo usuario:', err);
        }
      } else {
        // Fallback local usando email como identificador legible
        const localUr = [...userRoles, { id: `ur-${Date.now()}`, user_id: email, role_id: newUserRoleId }];
        setUserRoles(localUr); saveLocal('user_roles', localUr);
      }

      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserRoleId('');
      await load();
      alert('Usuario creado correctamente. Verifique el correo para activar su cuenta si es necesario.');
    } finally {
      setCreatingUser(false);
    }
  };
  const saveLocal = (key: string, data: any) => localStorage.setItem(storageKey(key), JSON.stringify(data));

  const load = async () => {
    try {
      if (!user?.id) { loadLocal(); return; }
      const ownerId = user.id;

      const { data: r } = await supabase
        .from('roles')
        .select('*')
        .eq('owner_user_id', ownerId)
        .order('name');

      const { data: p } = await supabase
        .from('permissions')
        .select('*'); // permisos son globales, no por tenant

      const { data: rp } = await supabase
        .from('role_permissions')
        .select('*')
        .eq('owner_user_id', ownerId);

      const { data: ur } = await supabase
        .from('user_roles')
        .select('*')
        .eq('owner_user_id', ownerId);
      if (r && p && ur) {
        // Combinar permisos: si Supabase devuelve role_permissions, usarlos; si no, usar los de localStorage
        const localRp: RolePermission[] = JSON.parse(localStorage.getItem(storageKey('role_permissions')) || '[]');
        const effectiveRp = rp && rp.length > 0 ? (rp as any as RolePermission[]) : localRp;

        setRoles(r as any);
        setPermissions(p as any);
        setRolePerms(effectiveRp);
        setUserRoles(ur as any);
        return;
      }
      loadLocal();
    } catch {
      loadLocal();
    }
  };

  useEffect(() => { load(); }, [user]);

  // Ensure base permissions for modules exist (view access per module)
  useEffect(() => {
    if (permissions.length === 0) {
      const base: Permission[] = APP_MODULES.map((m) => ({ id: `perm-${m}`, module: m, action: 'access' }));
      setPermissions(base);
      saveLocal('permissions', base);
    }
  }, [permissions.length]);

  const toggleRolePerm = async (roleId: string, permId: string, checked: boolean) => {
    // Actualización optimista en memoria y en localStorage (siempre)
    const next = checked
      ? [...rolePerms, { role_id: roleId, permission_id: permId }]
      : rolePerms.filter(rp => !(rp.role_id === roleId && rp.permission_id === permId));
    setRolePerms(next);
    saveLocal('role_permissions', next);

    // Sincronizar con Supabase si hay usuario propietario
    if (user?.id) {
      try {
        if (checked) {
          await supabase
            .from('role_permissions')
            .upsert(
              { role_id: roleId, permission_id: permId, owner_user_id: user.id },
              { onConflict: 'role_id,permission_id,owner_user_id' }
            );
        } else {
          await supabase
            .from('role_permissions')
            .delete()
            .match({ role_id: roleId, permission_id: permId, owner_user_id: user.id });
        }
      } catch (error) {
        console.error('Error al actualizar permisos de rol:', error);
      }
    }
  };

  const addRole = async () => {
    if (!newRoleName.trim()) return;
    if (user?.id) {
      try {
        const { data } = await supabase
          .from('roles')
          .insert({
            name: newRoleName.trim(),
            description: newRoleDesc,
            owner_user_id: user.id,
          })
          .select()
          .single();
        if (data) { setNewRoleName(''); setNewRoleDesc(''); await load(); return; }
      } catch {}
    }
    const local: Role = { id: `role-${Date.now()}`, name: newRoleName.trim(), description: newRoleDesc };
    const next = [local, ...roles];
    setRoles(next); saveLocal('roles', next); setNewRoleName(''); setNewRoleDesc('');
  };

  const deleteRole = async (roleId: string) => {
    if (!confirm('¿Eliminar rol?')) return;
    if (user?.id) {
      try {
        await supabase
          .from('role_permissions')
          .delete()
          .eq('role_id', roleId)
          .eq('owner_user_id', user.id);

        await supabase
          .from('user_roles')
          .delete()
          .eq('role_id', roleId)
          .eq('owner_user_id', user.id);

        await supabase
          .from('roles')
          .delete()
          .eq('id', roleId)
          .eq('owner_user_id', user.id);
        await load();
        return;
      } catch {}
    }
    const next = roles.filter(r => r.id !== roleId);
    setRoles(next); saveLocal('roles', next);
    const rp = rolePerms.filter(rp => rp.role_id !== roleId); setRolePerms(rp); saveLocal('role_permissions', rp);
    const ur = userRoles.filter(ur => ur.role_id !== roleId); setUserRoles(ur); saveLocal('user_roles', ur);
  };

  const assignRole = async () => {
    if (!assignEmail || !assignRoleId) return;
    try {
      // In Supabase, you should map email -> user_id from your profiles table if available
      if (user?.id) {
        try {
          const { data: profile } = await supabase.from('profiles').select('id,email').eq('email', assignEmail).single();
          const uid = (profile as any)?.id;
          if (uid) {
            await supabase
              .from('user_roles')
              .insert({ user_id: uid, role_id: assignRoleId, owner_user_id: user.id });
            setAssignEmail(''); setAssignRoleId(''); await load();
            return;
          }
        } catch (error) {
          console.error('Error al asignar rol en Supabase:', error);
        }
      }
      // local fallback with email as pseudo user_id
      const localUr = [...userRoles, { id: `ur-${Date.now()}`, user_id: assignEmail, role_id: assignRoleId }];
      setUserRoles(localUr); saveLocal('user_roles', localUr);
    } finally {
      setAssignEmail('');
      setAssignRoleId('');
    }
  };

  const grid = useMemo(() => roles.map(r => ({
    role: r,
    perms: permissions.map(p => ({ perm: p, checked: rolePerms.some(rp => rp.role_id === r.id && rp.permission_id === p.id) }))
  })), [roles, permissions, rolePerms]);

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Usuarios y Roles</h1>
            <p className="text-gray-600">Gestiona roles y permisos por módulo</p>
          </div>
        </div>

        {/* Roles */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex flex-col md:flex-row md:items-end gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Rol</label>
              <input value={newRoleName} onChange={e => setNewRoleName(e.target.value)} className="w-full p-2 border rounded" placeholder="Ej. Supervisor" />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
              <input value={newRoleDesc} onChange={e => setNewRoleDesc(e.target.value)} className="w-full p-2 border rounded" placeholder="Opcional" />
            </div>
            <button onClick={addRole} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 whitespace-nowrap">Crear Rol</button>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Rol</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Permisos por módulo</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {grid.map(row => (
                  <tr key={row.role.id}>
                    <td className="px-4 py-2 align-top">
                      <div className="font-medium text-gray-900">{row.role.name}</div>
                      <div className="text-xs text-gray-500">{row.role.description || '—'}</div>
                    </td>
                    <td className="px-4 py-2">
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                        {row.perms.map(({ perm, checked }) => (
                          <label key={perm.id} className="inline-flex items-center gap-2 text-sm">
                            <input type="checkbox" checked={checked} onChange={(e) => toggleRolePerm(row.role.id, perm.id, e.target.checked)} />
                            <span>{perm.module}</span>
                          </label>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <button onClick={() => deleteRole(row.role.id)} className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700">Eliminar</button>
                    </td>
                  </tr>
                ))}
                {roles.length === 0 && (
                  <tr><td colSpan={3} className="px-4 py-6 text-center text-sm text-gray-500">No hay roles</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Crear Usuario */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4">Crear Usuario</h3>
          <div className="flex flex-col md:flex-row gap-3 md:items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={newUserEmail}
                onChange={e => setNewUserEmail(e.target.value)}
                className="w-full p-2 border rounded"
                placeholder="usuario@gmail.com"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
              <input
                type="password"
                value={newUserPassword}
                onChange={e => setNewUserPassword(e.target.value)}
                className="w-full p-2 border rounded"
                placeholder="Mínimo 6 caracteres"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
              <select
                value={newUserRoleId}
                onChange={e => setNewUserRoleId(e.target.value)}
                className="w-full p-2 border rounded"
              >
                <option value="">Seleccionar...</option>
                {roles.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
            <button
              onClick={createUser}
              disabled={creatingUser || !newUserEmail || !newUserPassword || !newUserRoleId}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 whitespace-nowrap disabled:opacity-50"
            >
              {creatingUser ? 'Creando…' : 'Crear Usuario'}
            </button>
          </div>
        </div>

        {/* Asignación de roles a usuarios */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4">Asignar Rol a Usuario</h3>
          <div className="flex flex-col md:flex-row gap-3 md:items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Email del usuario</label>
              <input value={assignEmail} onChange={e => setAssignEmail(e.target.value)} className="w-full p-2 border rounded" placeholder="usuario@correo.com" />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
              <select value={assignRoleId} onChange={e => setAssignRoleId(e.target.value)} className="w-full p-2 border rounded">
                <option value="">Seleccionar...</option>
                {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <button onClick={assignRole} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 whitespace-nowrap">Asignar Rol</button>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Usuario</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Rol</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {userRoles.map(ur => (
                  <tr key={ur.id}>
                    <td className="px-4 py-2 text-sm text-gray-700">{ur.user_id}</td>
                    <td className="px-4 py-2 text-sm text-gray-700">{roles.find(r => r.id === ur.role_id)?.name || '—'}</td>
                  </tr>
                ))}
                {userRoles.length === 0 && (
                  <tr><td colSpan={2} className="px-4 py-6 text-center text-sm text-gray-500">Sin asignaciones</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
