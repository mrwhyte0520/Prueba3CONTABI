# 🚀 Instrucciones para Aplicar Importación de Excel en Clientes

## ✅ Archivos Ya Creados

1. ✅ **`src/components/ImportExcelModal.tsx`** - Componente modal (YA EXISTE)
2. ✅ **`IMPORTACION_EXCEL.md`** - Documentación completa (YA EXISTE)
3. ✅ **`src/pages/accounts-receivable/customers/IMPORT_TEMPLATE.tsx`** - Código de referencia (RECIÉN CREADO)

## 📝 Pasos Para Aplicar los Cambios

### Opción 1: Aplicar Manualmente (Recomendado)

Abre el archivo:
```
src/pages/accounts-receivable/customers/page.tsx
```

#### Paso 1: Agregar Imports (línea 4-5)
```typescript
import ImportExcelModal from '../../../components/ImportExcelModal';
import { exportToExcelWithHeaders } from '../../../utils/exportImportUtils';
import { toast } from 'sonner';
```

#### Paso 2: Agregar Estado (alrededor de línea 44)
Después de `const formRef = useRef<HTMLFormElement | null>(null);`

```typescript
const [showImportModal, setShowImportModal] = useState(false);
```

#### Paso 3: Copiar las 2 Funciones
Copia todo el contenido de `handleDownloadTemplate` y `handleImportCustomers` desde:
```
src/pages/accounts-receivable/customers/IMPORT_TEMPLATE.tsx
```

Pégalas ANTES del `return (` del componente (alrededor de línea 240).

#### Paso 4: Modificar el Header
Busca (alrededor de línea 310):
```typescript
<button 
  onClick={handleNewCustomer}
  className="bg-blue-600..."
>
  <i className="ri-user-add-line mr-2"></i>
  Nuevo Cliente
</button>
```

Reemplaza por:
```typescript
<div className="flex space-x-2">
  <button 
    onClick={() => setShowImportModal(true)}
    className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors whitespace-nowrap"
  >
    <i className="ri-file-excel-line mr-2"></i>
    Importar Excel
  </button>
  <button 
    onClick={handleNewCustomer}
    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
  >
    <i className="ri-user-add-line mr-2"></i>
    Nuevo Cliente
  </button>
</div>
```

#### Paso 5: Agregar Modal
Al final del componente, ANTES del cierre `</DashboardLayout>`, agrega:

```typescript
{/* Import Modal */}
<ImportExcelModal
  isOpen={showImportModal}
  onClose={() => setShowImportModal(false)}
  onImport={handleImportCustomers}
  templateHeaders={[
    { key: 'name', title: 'Nombre/Razón Social' },
    { key: 'document', title: 'Documento' },
    { key: 'phone', title: 'Teléfono' },
    { key: 'email', title: 'Email' },
    { key: 'address', title: 'Dirección' },
    { key: 'creditLimit', title: 'Límite de Crédito' },
    { key: 'status', title: 'Estado' }
  ]}
  moduleName="Clientes"
  onDownloadTemplate={handleDownloadTemplate}
/>
```

### Opción 2: Usar Git Stash (Si quieres los cambios automáticos)

Si ya aplicaste cambios anteriormente y están en stash:
```bash
git stash list
git stash apply stash@{0}
```

## ✅ Verificar que Funciona

1. Abre la aplicación: http://localhost:5173
2. Ve a "Clientes"
3. Deberías ver un botón morado "Importar Excel"
4. Click → Se abre modal
5. Descarga plantilla → Funciona
6. Sube archivo → Importa correctamente

## 🎯 Qué Hace el Código Mejorado

### Validación de Filas Vacías
```typescript
// Filtra filas que tengan AL MENOS un campo principal
const validRows = data.filter(row => {
  const hasName = row.name && String(row.name).trim().length > 0;
  const hasDocument = row.document && String(row.document).trim().length > 0;
  const hasPhone = row.phone && String(row.phone).trim().length > 0;
  const hasEmail = row.email && String(row.email).trim().length > 0;
  
  return hasName || hasDocument || hasPhone || hasEmail;
});
```

### Mensajes de Error Mejorados
```
❌ Antes: "Fila con nombre sin nombre tiene campos obligatorios vacíos"
✅ Ahora: "Fila 5: Faltan campos obligatorios: Nombre, Email"
```

### Validación de Email
```typescript
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailPattern.test(String(row.email).trim())) {
  errors.push(`Fila ${rowNumber} (${row.name}): Email inválido "${row.email}"`);
}
```

## 📊 Resultado Final

- ✅ Filas vacías ignoradas automáticamente
- ✅ Errores con número de fila específico
- ✅ Validación de email
- ✅ Importación parcial funcional
- ✅ Mensajes claros en consola

## 🆘 Si Tienes Problemas

1. Revisa que NO haya errores de TypeScript
2. Verifica que todos los imports estén correctos
3. Asegúrate de que `ImportExcelModal.tsx` existe en `src/components/`
4. Limpia caché: `npm run dev` (reinicia el servidor)

---

**¡Listo!** El sistema de importación estará completamente funcional. 🎉
