import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import type { ReactElement } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';

const STORAGE_PREFIX = 'contabi_rbac_';

async function fetchAllowedModules(userId: string | null, userEmail?: string | null): Promise<Set<string>> {
  try {
    if (!userId) {
      // local fallback
      const perms = JSON.parse(localStorage.getItem(STORAGE_PREFIX + 'permissions') || '[]');
      const rolePerms = JSON.parse(localStorage.getItem(STORAGE_PREFIX + 'role_permissions') || '[]');
      const userRoles = JSON.parse(localStorage.getItem(STORAGE_PREFIX + 'user_roles') || '[]');
      const myRoleIds = userRoles.filter((ur: any) => ur.user_id === 'local').map((ur: any) => ur.role_id);
      const permIds = rolePerms.filter((rp: any) => myRoleIds.includes(rp.role_id)).map((rp: any) => rp.permission_id);
      const modules = new Set<string>();
      perms.forEach((p: any) => { if (p.action === 'access' && permIds.includes(p.id)) modules.add(p.module); });
      return modules;
    }
    // Supabase
    // Resolver roles por user_id o por email (soportar subusuarios invitados por email)
    let roleIds: string[] = [];
    const { data: urById } = await supabase.from('user_roles').select('*').eq('user_id', userId);
    roleIds = (urById || []).map((r: any) => r.role_id);
    if (roleIds.length === 0 && userEmail) {
      const { data: urByEmail } = await supabase.from('user_roles').select('*').eq('user_id', userEmail);
      roleIds = (urByEmail || []).map((r: any) => r.role_id);
    }
    if (roleIds.length === 0) return new Set();
    const { data: rp } = await supabase.from('role_permissions').select('permission_id').in('role_id', roleIds);
    const permIds = (rp || []).map(r => r.permission_id);
    if (permIds.length === 0) return new Set();
    const { data: perms } = await supabase.from('permissions').select('*').in('id', permIds).eq('action', 'access');
    const modules = new Set<string>((perms || []).map(p => (p as any).module));
    return modules;
  } catch {
    return new Set();
  }
}

function mapPathToModule(pathname: string): string {
  const first = pathname.split('/').filter(Boolean)[0] || 'dashboard';
  return first;
}

export default function ProtectedRoute({ children }: { children: ReactElement }) {
  const { user } = useAuth();
  const [allowed, setAllowed] = useState<Set<string> | null>(null);

  useEffect(() => {
    fetchAllowedModules(user?.id || null).then(setAllowed);
  }, [user?.id]);

  if (allowed === null) return null; // could show a spinner

  const moduleName = mapPathToModule(window.location.pathname);

  // If no RBAC configured (no roles/permissions), allow by default
  if (allowed.size === 0) return children;

  if (allowed.has(moduleName)) return children;
  return <Navigate to="/dashboard" replace />;
}
