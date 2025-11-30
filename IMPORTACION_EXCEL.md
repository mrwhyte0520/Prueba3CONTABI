# 📊 Guía de Importación Masiva desde Excel

## ✨ Funcionalidad Implementada

Se ha implementado un sistema completo de importación masiva de datos desde archivos Excel (.xlsx) para facilitar la carga de grandes volúmenes de información.

## 🎯 Módulos con Importación Activa

### ✅ Clientes (Cuentas por Cobrar)
- **Ubicación**: `src/pages/accounts-receivable/customers/page.tsx`
- **Botón**: "Importar Excel" (morado)
- **Campos soportados**:
  - Nombre/Razón Social *
  - Documento *
  - Teléfono *
  - Email *
  - Dirección
  - Límite de Crédito
  - Estado (active/inactive/blocked)

## 📝 Cómo Usar la Importación

### Paso 1: Descargar Plantilla
1. Ir al módulo de Clientes
2. Click en el botón **"Importar Excel"**
3. Click en **"Descargar Plantilla de Excel"**
4. Se descargará un archivo `plantilla_clientes.xlsx` con:
   - Encabezados correctos
   - Fila de ejemplo
   - Formato adecuado

### Paso 2: Llenar Datos
1. Abrir la plantilla en Excel
2. **NO modificar los encabezados** (primera fila)
3. Completar los datos siguiendo el ejemplo
4. Campos obligatorios marcados con * deben llenarse
5. Guardar el archivo

### Paso 3: Importar
1. Click en **"Seleccionar Archivo Excel"**
2. Elegir el archivo completado
3. Revisar la **vista previa** de datos
4. Verificar que todo esté correcto
5. Click en **"Importar X Registros"**

### Paso 4: Verificación
- El sistema mostrará un mensaje de éxito
- Los registros aparecerán en la tabla
- Si hay errores, se mostrarán en consola

## 🔧 Cómo Implementar en Otros Módulos

### 1. Importar Dependencias

```tsx
import ImportExcelModal from '../../../components/ImportExcelModal';
import { exportToExcelWithHeaders } from '../../../utils/exportImportUtils';
import { toast } from 'sonner';
```

### 2. Agregar Estado

```tsx
const [showImportModal, setShowImportModal] = useState(false);
```

### 3. Crear Función de Plantilla

```tsx
const handleDownloadTemplate = () => {
  const headers = [
    { key: 'campo1', title: 'Nombre Campo 1' },
    { key: 'campo2', title: 'Nombre Campo 2' },
    // ... más campos
  ];
  
  const exampleData = [
    {
      campo1: 'Ejemplo 1',
      campo2: 'Ejemplo 2',
      // ... valores de ejemplo
    }
  ];
  
  exportToExcelWithHeaders(exampleData, headers, 'plantilla_nombre_modulo', 'Sheet1');
  toast.success('Plantilla descargada exitosamente');
};
```

### 4. Crear Función de Importación

```tsx
const handleImportData = async (data: any[]) => {
  if (!user?.id) {
    throw new Error('Usuario no autenticado');
  }

  let successCount = 0;
  let errorCount = 0;
  const errors: string[] = [];

  for (const row of data) {
    try {
      // Validar campos obligatorios
      if (!row.campo1 || !row.campo2) {
        errors.push(`Registro con nombre "${row.campo1 || 'sin nombre'}" incompleto`);
        errorCount++;
        continue;
      }

      // Preparar datos
      const itemData = {
        campo1: String(row.campo1).trim(),
        campo2: String(row.campo2).trim(),
        // ... más campos
      };

      // Crear registro usando el servicio correspondiente
      await tuServicio.create(user.id, itemData);
      successCount++;
    } catch (error: any) {
      errorCount++;
      errors.push(`Error: ${error.message}`);
    }
  }

  await recargarDatos();

  if (errorCount > 0) {
    console.error('Errores de importación:', errors);
    throw new Error(`Importación completada con errores: ${successCount} exitosos, ${errorCount} fallidos`);
  }
};
```

### 5. Agregar Botón en UI

```tsx
<button 
  onClick={() => setShowImportModal(true)}
  className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
>
  <i className="ri-file-excel-line mr-2"></i>
  Importar Excel
</button>
```

### 6. Renderizar Modal

```tsx
<ImportExcelModal
  isOpen={showImportModal}
  onClose={() => setShowImportModal(false)}
  onImport={handleImportData}
  templateHeaders={[
    { key: 'campo1', title: 'Nombre Campo 1' },
    { key: 'campo2', title: 'Nombre Campo 2' },
    // ... definir todos los campos
  ]}
  moduleName="Nombre del Módulo"
  onDownloadTemplate={handleDownloadTemplate}
/>
```

## 🎨 Características del Modal

### Interfaz Amigable
- ✅ Arrastrar y soltar archivos
- ✅ Vista previa de datos antes de importar
- ✅ Validación de formatos
- ✅ Mensajes de error descriptivos
- ✅ Contador de registros
- ✅ Instrucciones claras

### Validaciones Automáticas
- ✅ Verificación de campos obligatorios
- ✅ Validación de formato Excel (.xlsx, .xls)
- ✅ Detección de archivos vacíos
- ✅ Manejo de errores por fila

### Plantilla Descargable
- ✅ Encabezados predefinidos
- ✅ Datos de ejemplo
- ✅ Formato correcto
- ✅ Lista de columnas esperadas

## 📋 Módulos Recomendados para Implementar

### Alta Prioridad
1. ✅ **Clientes** - Implementado
2. ⏳ **Proveedores** - Pendiente
3. ⏳ **Productos/Inventario** - Pendiente
4. ⏳ **Empleados** - Pendiente

### Media Prioridad
5. ⏳ **Catálogo de Cuentas** - Pendiente
6. ⏳ **Facturas** - Pendiente
7. ⏳ **Asientos Contables** - Pendiente

### Baja Prioridad
8. ⏳ **Pagos** - Pendiente
9. ⏳ **Gastos** - Pendiente
10. ⏳ **Presupuestos** - Pendiente

## ⚠️ Consideraciones Importantes

### Rendimiento
- Para archivos con más de 1000 registros, considerar:
  - Procesar en lotes (chunks)
  - Mostrar barra de progreso
  - Implementar importación en background

### Seguridad
- Validar permisos de usuario antes de importar
- Sanitizar datos de entrada
- Evitar duplicados (verificar por documento/código único)

### Manejo de Errores
- Registrar errores en consola para debugging
- Mostrar resumen de importación al usuario
- Permitir descargar reporte de errores

## 🚀 Mejoras Futuras

- [ ] Importación con validación avanzada (regex, rangos)
- [ ] Soporte para actualización masiva (no solo creación)
- [ ] Importación de relaciones (ej: cliente con su vendedor)
- [ ] Programación de importaciones automáticas
- [ ] Historial de importaciones
- [ ] Rollback de importaciones fallidas
- [ ] Soporte para CSV además de Excel
- [ ] Mapeo dinámico de columnas
- [ ] Validación de datos contra catálogos existentes

## 📞 Soporte

Para dudas o problemas con la implementación:
1. Revisar la consola del navegador para errores
2. Verificar formato del archivo Excel
3. Asegurar que los datos obligatorios estén completos
4. Contactar al equipo de desarrollo

---

**Última actualización**: Noviembre 2024  
**Versión**: 1.0.0
