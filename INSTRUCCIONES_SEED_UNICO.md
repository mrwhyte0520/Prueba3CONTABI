# Control de Seed Único del Catálogo de Cuentas

## ✅ Cambios Implementados

Se ha implementado un sistema para que el catálogo de cuentas predeterminado se cargue **solo una vez** por usuario, y **no se vuelva a cargar automáticamente** si el usuario lo borra.

---

## 📋 Pasos para Activar

### Paso 1: Ejecutar la migración SQL en Supabase

1. Ve a tu proyecto en **Supabase**
2. Abre el **SQL Editor**
3. Pega y ejecuta este script:

```sql
-- Agregar columna chart_accounts_seeded a accounting_settings
ALTER TABLE public.accounting_settings 
ADD COLUMN IF NOT EXISTS chart_accounts_seeded boolean DEFAULT false;

-- Agregar comentario para documentación
COMMENT ON COLUMN public.accounting_settings.chart_accounts_seeded IS 
'Indica si el catálogo de cuentas predeterminado ya fue sembrado para este usuario. Una vez true, no se vuelve a cargar automáticamente.';

-- Marcar usuarios existentes como "ya sembrados"
UPDATE public.accounting_settings
SET chart_accounts_seeded = true
WHERE user_id IN (
  SELECT DISTINCT user_id 
  FROM public.chart_accounts
);
```

O ejecuta directamente el archivo:
```bash
supabase/migrations/add_chart_accounts_seeded_flag.sql
```

### Paso 2: Verificar en la consola del navegador

1. Abre la aplicación en el navegador (está corriendo en http://localhost:3002)
2. Presiona **F12** para abrir DevTools
3. Ve a la pestaña **Console**
4. Navega al módulo **Plan de Cuentas**

Verás estos mensajes de debug:
- `DEBUG cuentas cargadas: N` - cantidad de cuentas del usuario
- `DEBUG catálogo ya sembrado antes: true/false` - si ya recibió el catálogo
- `DEBUG seedFromTemplate result: { created: N }` - cuántas se crearon
- `DEBUG catálogo marcado como sembrado` - confirmación de marcado

---

## 🔄 Cómo Funciona

### Usuario Nuevo (Primera Vez)
1. Entra al Plan de Cuentas → `chart_accounts` está vacío
2. Verifica `chart_accounts_seeded` → es `false`
3. **Carga la plantilla automáticamente**
4. Marca `chart_accounts_seeded = true`
5. El usuario ve todas las cuentas predeterminadas

### Usuario que Borra Sus Cuentas
1. Usuario borra todas sus cuentas → `chart_accounts` queda vacío
2. Entra de nuevo al Plan de Cuentas
3. Verifica `chart_accounts_seeded` → es `true` (ya lo recibió antes)
4. **NO carga la plantilla**
5. El usuario ve la tabla vacía (como debe ser)

### Usuario que Ya Tenía Cuentas
- El script SQL marca `chart_accounts_seeded = true` para usuarios existentes
- No se les volverá a cargar la plantilla

---

## 🧪 Cómo Probar

### Probar Usuario Nuevo
```sql
-- En Supabase SQL Editor:
-- 1. Eliminar todas las cuentas de un usuario de prueba
DELETE FROM public.chart_accounts WHERE user_id = 'TU_USER_ID_AQUI';

-- 2. Marcar como "no sembrado" para simular usuario nuevo
UPDATE public.accounting_settings 
SET chart_accounts_seeded = false 
WHERE user_id = 'TU_USER_ID_AQUI';

-- 3. Ahora entra a la app con ese usuario
-- → Debe cargar automáticamente la plantilla
```

### Probar Usuario que Borra Sus Cuentas
```sql
-- En Supabase SQL Editor:
-- 1. Asegurarse que está marcado como "ya sembrado"
UPDATE public.accounting_settings 
SET chart_accounts_seeded = true 
WHERE user_id = 'TU_USER_ID_AQUI';

-- 2. Eliminar todas las cuentas
DELETE FROM public.chart_accounts WHERE user_id = 'TU_USER_ID_AQUI';

-- 3. Ahora entra a la app con ese usuario
-- → NO debe cargar la plantilla, debe ver la tabla vacía
```

---

## 📊 Consultas Útiles

### Ver estado del flag por usuario
```sql
SELECT 
  a.user_id,
  a.chart_accounts_seeded,
  COUNT(c.id) as cantidad_cuentas
FROM public.accounting_settings a
LEFT JOIN public.chart_accounts c ON c.user_id = a.user_id
GROUP BY a.user_id, a.chart_accounts_seeded
ORDER BY a.chart_accounts_seeded, cantidad_cuentas;
```

### Resetear el flag para un usuario (permitir re-seed)
```sql
UPDATE public.accounting_settings 
SET chart_accounts_seeded = false 
WHERE user_id = 'USER_ID_AQUI';
```

### Ver usuarios que nunca han recibido el catálogo
```sql
SELECT user_id
FROM public.accounting_settings
WHERE chart_accounts_seeded = false OR chart_accounts_seeded IS NULL;
```

---

## 🎯 Archivos Modificados

1. **`src/services/database.ts`**
   - ✅ Agregado `accountingSettingsService.hasChartAccountsSeeded(userId)`
   - ✅ Agregado `accountingSettingsService.markChartAccountsSeeded(userId)`

2. **`src/pages/accounting/chart-accounts/page.tsx`**
   - ✅ Modificado `loadAccounts()` para verificar el flag antes del seed
   - ✅ Marca el flag después del primer seed exitoso

3. **`supabase/migrations/add_chart_accounts_seeded_flag.sql`**
   - ✅ Script SQL para agregar la columna y migrar usuarios existentes

---

## ⚠️ Importante

- **Por usuario:** Cada usuario tiene su propio flag independiente
- **Permanente:** Una vez sembrado, no se vuelve a cargar nunca (a menos que resetees el flag manualmente en SQL)
- **Retroactivo:** Los usuarios que ya tienen cuentas quedan marcados como "ya sembrados" automáticamente
- **Sin interferencia:** Si un usuario crea cuentas manualmente (sin seed), esto no afecta nada

---

## 🔧 Soporte

Si necesitas que un usuario específico reciba de nuevo la plantilla:

```sql
-- 1. Resetear el flag
UPDATE public.accounting_settings 
SET chart_accounts_seeded = false 
WHERE user_id = 'USER_ID_AQUI';

-- 2. (Opcional) Borrar sus cuentas actuales
DELETE FROM public.chart_accounts WHERE user_id = 'USER_ID_AQUI';

-- 3. Usuario entra a la app → recibe plantilla de nuevo
```
