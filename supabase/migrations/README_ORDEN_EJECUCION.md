# Orden de Ejecución de Migraciones Multi-Tenant

Ejecuta estas migraciones **EN ORDEN** en Supabase SQL Editor:

## ✅ Ya ejecutadas (según checkpoint anterior)

1. `20251204_add_multitenant_accounting_rls.sql` - Contabilidad básica
2. `20251205_add_multitenant_payroll_rls.sql` - Nómina
3. `20251206_add_multitenant_bank_payments_rls.sql` - Pagos bancarios
4. `20251207_add_multitenant_pos_cash_closings_rls.sql` - POS y cierres de caja
5. `20251208_add_multitenant_accounting_extended_rls.sql` - Contabilidad extendida
6. `20251209_add_multitenant_petty_cash_rls.sql` - Caja chica
7. `20251205_add_multitenant_accounts_receivable_rls.sql` - CxC

## 🆕 Nuevas migraciones (ejecutar ahora)

8. `20251210_add_multitenant_quotes_and_credit_notes_rls.sql` - Cotizaciones y NC/ND
9. `20251211_create_users_table.sql` - **IMPORTANTE: Crear tabla users primero**
10. `20251211_add_multitenant_user_rbac_rls.sql` - RBAC (roles, permisos)
11. `20251212_add_multitenant_users_rls.sql` - RLS para tabla users
12. `20251213_add_multitenant_settings_rls.sql` - Configuraciones

## 📋 Después de ejecutar las migraciones

### Migrar usuarios existentes a public.users

```sql
-- Insertar usuarios de auth.users que no estén en public.users
INSERT INTO public.users (id, email, full_name, status, created_at, updated_at)
SELECT 
  id, 
  email, 
  COALESCE(raw_user_meta_data->>'full_name', email) as full_name,
  'active' as status,
  created_at,
  NOW() as updated_at
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.users)
ON CONFLICT (id) DO NOTHING;
```

### Limpiar user_roles con emails (si los hay)

```sql
-- Eliminar filas con emails en vez de UUIDs
DELETE FROM public.user_roles 
WHERE user_id::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
   OR owner_user_id::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
```

## 🎯 Resultado Final

Después de ejecutar todas las migraciones, tendrás:

✅ Multi-tenancy completo en todos los módulos
✅ RLS habilitado en todas las tablas críticas
✅ Usuarios y RBAC funcionando correctamente
✅ Aislamiento de datos por tenant (owner + subusuarios)

## ⚠️ Importante

- **Orden de ejecución**: Es crítico seguir el orden listado
- **Backups**: Haz backup antes de ejecutar en producción
- **Testing**: Prueba con usuarios de diferentes tenants después
