// Fragmento de código para agregar al archivo customers/page.tsx

// 1. AGREGAR IMPORTS (después de la línea 4)
import ImportExcelModal from '../../../components/ImportExcelModal';
import { exportToExcelWithHeaders } from '../../../utils/exportImportUtils';
import { toast } from 'sonner';

// 2. AGREGAR ESTADO (después de la línea 44)
const [showImportModal, setShowImportModal] = useState(false);

// 3. AGREGAR ESTAS FUNCIONES (después de handleSaveCustomer, antes del return)

const handleDownloadTemplate = () => {
  const headers = [
    { key: 'name', title: 'Nombre/Razón Social' },
    { key: 'document', title: 'Documento' },
    { key: 'phone', title: 'Teléfono' },
    { key: 'email', title: 'Email' },
    { key: 'address', title: 'Dirección' },
    { key: 'creditLimit', title: 'Límite de Crédito' },
    { key: 'status', title: 'Estado (active/inactive/blocked)' }
  ];
  
  const exampleData = [
    {
      name: 'Ejemplo Cliente S.A.',
      document: '000-0000000-0',
      phone: '809-000-0000',
      email: 'cliente@ejemplo.com',
      address: 'Calle Principal #123, Santo Domingo',
      creditLimit: 50000,
      status: 'active'
    }
  ];
  
  exportToExcelWithHeaders(exampleData, headers, 'plantilla_clientes', 'Clientes');
  toast.success('Plantilla descargada exitosamente');
};

const handleImportCustomers = async (data: any[]) => {
  if (!user?.id) {
    throw new Error('Usuario no autenticado');
  }

  // Filtrar filas completamente vacías - VERIFICAR CAMPOS CLAVE
  const validRows = data.filter(row => {
    const hasName = row.name && String(row.name).trim().length > 0;
    const hasDocument = row.document && String(row.document).trim().length > 0;
    const hasPhone = row.phone && String(row.phone).trim().length > 0;
    const hasEmail = row.email && String(row.email).trim().length > 0;
    
    // Una fila válida debe tener al menos uno de estos campos principales
    return hasName || hasDocument || hasPhone || hasEmail;
  });

  if (validRows.length === 0) {
    throw new Error('No se encontraron datos válidos en el archivo. Asegúrate de que el archivo tenga datos además de los encabezados.');
  }

  let successCount = 0;
  let errorCount = 0;
  const errors: string[] = [];

  for (let i = 0; i < validRows.length; i++) {
    const row = validRows[i];
    const rowNumber = i + 2; // +2 porque Excel empieza en 1 y hay una fila de encabezado

    try {
      // Validar campos obligatorios
      const missingFields: string[] = [];
      if (!row.name || String(row.name).trim() === '') missingFields.push('Nombre');
      if (!row.document || String(row.document).trim() === '') missingFields.push('Documento');
      if (!row.phone || String(row.phone).trim() === '') missingFields.push('Teléfono');
      if (!row.email || String(row.email).trim() === '') missingFields.push('Email');

      if (missingFields.length > 0) {
        errors.push(`Fila ${rowNumber}: Faltan campos obligatorios: ${missingFields.join(', ')}`);
        errorCount++;
        continue;
      }

      // Validar formato de email básico
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(String(row.email).trim())) {
        errors.push(`Fila ${rowNumber} (${row.name}): Email inválido "${row.email}"`);
        errorCount++;
        continue;
      }

      // Preparar datos del cliente
      const customerData = {
        name: String(row.name).trim(),
        document: String(row.document).trim(),
        phone: String(row.phone).trim(),
        email: String(row.email).trim(),
        address: String(row.address || '').trim(),
        creditLimit: Number(row.creditLimit) || 0,
        status: (row.status || 'active') as 'active' | 'inactive' | 'blocked',
        currentBalance: 0
      };

      // Crear cliente
      await customersService.create(user.id, customerData);
      successCount++;
    } catch (error: any) {
      errorCount++;
      const errorMsg = error.message || 'Error desconocido';
      errors.push(`Fila ${rowNumber} (${row.name || 'sin nombre'}): ${errorMsg}`);
    }
  }

  await loadCustomers();

  if (errorCount > 0) {
    console.error('=== ERRORES DE IMPORTACIÓN ===');
    errors.forEach((error, idx) => console.error(`${idx + 1}. ${error}`));
    console.error('================================');
    
    if (successCount > 0) {
      toast.warning(`Importación parcial: ${successCount} exitosos, ${errorCount} con errores. Revisa la consola para detalles.`);
    } else {
      throw new Error(`Ningún registro fue importado. ${errorCount} errores encontrados.`);
    }
  }
};

// 4. MODIFICAR EL HEADER (reemplazar el botón "Nuevo Cliente")
// ANTES:
/*
<button 
  onClick={handleNewCustomer}
  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
>
  <i className="ri-user-add-line mr-2"></i>
  Nuevo Cliente
</button>
*/

// DESPUÉS:
/*
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
*/

// 5. AGREGAR EL MODAL (antes del cierre de </DashboardLayout>)
/*
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
*/
