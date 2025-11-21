import { useState, useRef, useEffect } from 'react';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import { chartAccountsService } from '../../../services/database';
import { useAuth } from '../../../hooks/useAuth';
import * as XLSX from 'xlsx';

interface ChartAccount {
  id: string;
  code: string;
  name: string;
  type: 'asset' | 'liability' | 'equity' | 'income' | 'cost' | 'expense';
  parentId?: string;
  level: number;
  balance: number;
  isActive: boolean;
  description?: string;
  normalBalance: 'debit' | 'credit';
  allowPosting: boolean;
  isBankAccount?: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ImportData {
  code: string;
  name: string;
  type: string;
  parentCode?: string;
  description?: string;
  balance?: number;
  category?: string;
  subCategory?: string;
}

interface ImportFormat {
  id: string;
  name: string;
  description: string;
  fileTypes: string[];
  icon: string;
  color: string;
}

export default function ChartAccountsPage() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<ChartAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAccountType, setSelectedAccountType] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showFormatModal, setShowFormatModal] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<ImportFormat | null>(null);
  const [editingAccount, setEditingAccount] = useState<ChartAccount | null>(null);
  const [expandedAccounts, setExpandedAccounts] = useState<string[]>([]);
  const [importProgress, setImportProgress] = useState(0);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [newAccount, setNewAccount] = useState<{
    code: string;
    name: string;
    type: ChartAccount['type'];
    parentId: string;
    level: number;
    description: string;
    allowPosting: boolean;
    isBankAccount: boolean;
  }>({
    code: '',
    name: '',
    type: 'asset',
    parentId: '',
    level: 1,
    description: '',
    allowPosting: true,
    isBankAccount: false,
  });

  // Load accounts from database
  useEffect(() => {
    if (user) {
      loadAccounts();
    }
  }, [user]);

  const loadAccounts = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const data = await chartAccountsService.getAll(user.id);
      console.log('DEBUG cuentas cargadas:', data.length);
      setAccounts(data);
    } catch (error) {
      console.error('Error loading accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const importFormats: ImportFormat[] = [
    {
      id: 'excel',
      name: 'Microsoft Excel',
      description: 'Archivos Excel con formato estructurado (.xlsx, .xls)',
      fileTypes: ['.xlsx', '.xls'],
      icon: 'ri-file-excel-line',
      color: 'bg-green-100 text-green-800'
    }
  ];

  const accountTypes = [
    { value: 'all', label: 'Todos los Tipos' },
    { value: 'asset', label: 'Activos' },
    { value: 'liability', label: 'Pasivos' },
    { value: 'equity', label: 'Patrimonio' },
    { value: 'income', label: 'Ingresos' },
    { value: 'cost', label: 'Costos' },
    { value: 'expense', label: 'Gastos' }
  ];

  const filteredAccounts = accounts.filter(account => {
    const matchesSearch = account.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         account.code.includes(searchTerm);
    const matchesType = selectedAccountType === 'all' || account.type === selectedAccountType;
    return matchesSearch && matchesType;
  });

  const allDisplayedIds = filteredAccounts.map(acc => acc.id);
  const isAllSelected = allDisplayedIds.length > 0 && allDisplayedIds.every(id => selectedIds.includes(id));
  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(prev => prev.filter(id => !allDisplayedIds.includes(id)));
    } else {
      const merged = Array.from(new Set([...selectedIds, ...allDisplayedIds]));
      setSelectedIds(merged);
    }
  };
  const toggleSelectOne = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };
  const clearSelection = () => setSelectedIds([]);

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    const confirmMsg = `¿Eliminar ${selectedIds.length} cuenta(s)?\nLas cuentas con saldo o con subcuentas no podrán eliminarse.`;
    if (!confirm(confirmMsg)) return;
    let deleted = 0;
    const failed: Array<{ code: string; reason: string }> = [];
    try {
      for (const id of selectedIds) {
        const acc = accounts.find(a => a.id === id);
        if (!acc) continue;
        const hasChildren = accounts.some(a => a.parentId === id);
        if (hasChildren) {
          failed.push({ code: acc.code, reason: 'Tiene subcuentas' });
          continue;
        }
        if (acc.balance !== 0) {
          failed.push({ code: acc.code, reason: 'Tiene saldo distinto de 0' });
          continue;
        }
        try {
          await chartAccountsService.delete(id);
          deleted++;
        } catch (e) {
          failed.push({ code: acc.code, reason: 'Error al eliminar' });
        }
      }
      await loadAccounts();
      clearSelection();
      const lines = [
        `Eliminadas: ${deleted}`,
        `Fallidas: ${failed.length}`
      ];
      if (failed.length > 0) {
        const sample = failed.slice(0, 5).map(f => `- ${f.code}: ${f.reason}`).join('\n');
        lines.push('Detalles (muestra):');
        lines.push(sample);
        if (failed.length > 5) lines.push(`... y ${failed.length - 5} más`);
      }
      alert(lines.join('\n'));
    } catch (err) {
      console.error('Bulk delete error:', err);
      alert('Error al eliminar las cuentas seleccionadas.');
    }
  };

  const getAccountTypeColor = (type: string) => {
    switch (type) {
      case 'asset': return 'bg-blue-100 text-blue-800';
      case 'liability': return 'bg-red-100 text-red-800';
      case 'equity': return 'bg-green-100 text-green-800';
      case 'income': return 'bg-purple-100 text-purple-800';
      case 'cost': return 'bg-yellow-100 text-yellow-800';
      case 'expense': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getAccountTypeName = (type: string) => {
    switch (type) {
      case 'asset': return 'Activo';
      case 'liability': return 'Pasivo';
      case 'equity': return 'Patrimonio';
      case 'income': return 'Ingreso';
      case 'cost': return 'Costo';
      case 'expense': return 'Gasto';
      default: return 'Otro';
    }
  };

  const getNormalBalance = (type: string): 'debit' | 'credit' => {
    return ['asset', 'cost', 'expense'].includes(type) ? 'debit' : 'credit';
  };

  const getParentAccounts = (type: string) => {
    // Permitir cualquier cuenta del mismo tipo como posible padre, sin restringir nivel ni allowPosting
    return accounts.filter(account => account.type === type);
  };

  const calculateLevel = (parentId: string): number => {
    if (!parentId) return 1;
    const parent = accounts.find(acc => acc.id === parentId);
    return parent ? parent.level + 1 : 1;
  };

  const generateNextCode = () => {
    if (accounts.length === 0) return '1000';

    // Tomar todos los códigos numéricos, ordenar y sumar 1 al mayor
    const numericCodes = accounts
      .map(acc => acc.code.trim())
      .filter(code => /^\d+$/.test(code))
      .map(code => parseInt(code, 10))
      .sort((a, b) => a - b);

    if (numericCodes.length === 0) return '1000';

    const last = numericCodes[numericCodes.length - 1];
    return String(last + 1);
  };

  const toggleExpanded = (accountId: string) => {
    setExpandedAccounts(prev =>
      prev.includes(accountId)
        ? prev.filter(id => id !== accountId)
        : [...prev, accountId]
    );
  };

  const getChildAccounts = (parentId: string) => {
    return filteredAccounts.filter(account => account.parentId === parentId);
  };

  const handleFormatSelection = (format: ImportFormat) => {
    setSelectedFormat(format);
    setShowFormatModal(false);
    setShowImportModal(true);
  };

  const mapSpanishTypeToInternal = (type: string): string => {
    const normalized = type.trim().toLowerCase();
    switch (normalized) {
      case 'activo':
        return 'asset';
      case 'pasivo':
        return 'liability';
      case 'patrimonio':
        return 'equity';
      case 'ingreso':
        return 'income';
      case 'costo':
      case 'costos':
        return 'cost';
      case 'gasto':
      case 'gastos':
        return 'expense';
      default:
        return normalized || 'asset';
    }
  };

  // const parseCSVContent = (content: string): ImportData[] => {
  //   const lines = content.split('\n');
  //   const importedData: ImportData[] = [];

  //   const cleanText = (value: string) =>
  //     value.replace(/[\u0000-\u001F\u007F]/g, '').trim();

  //   for (let i = 1; i < lines.length; i++) {
  //     const line = lines[i].trim();
  //     if (!line) continue;

  //     // Detect separator: comma or semicolon
  //     const sep = (line.match(/;/g)?.length || 0) > (line.match(/,/g)?.length || 0) ? ';' : ',';
  //     const columns = line.split(sep).map(col => cleanText(col.replace(/"/g, '')));
  //     if (columns.length >= 3) {
  //       const rawType = columns[2];
  //       const mappedType = mapSpanishTypeToInternal(rawType);

  //       // Reconstruir balance en caso de tener separadores de miles con coma (ej: 35,000)
  //       let balance = 0;
  //       if (columns.length >= 6) {
  //         const rawBalanceJoined = columns.slice(5).join('');
  //         // Normalizar separadores: quitar miles y usar punto como decimal
  //         // 1) quitar espacios
  //         let s = rawBalanceJoined.replace(/\s/g, '');
  //         // 2) si contiene ambos '.' y ',', asumir '.' miles y ',' decimal => quitar '.' y convertir ',' a '.'
  //         if (s.includes('.') && s.includes(',')) {
  //           s = s.replace(/\./g, '').replace(/,/g, '.');
  //         } else if (s.includes(',')) {
  //           // Solo comas: considerar coma decimal
  //           s = s.replace(/,/g, '.');
  //         } else {
  //           // Solo puntos o dígitos: eliminar separadores no numéricos salvo '.' y '-'
  //           s = s.replace(/[^0-9.\-]/g, '');
  //         }
  //         // Finalmente, mantener solo dígitos, punto y signo
  //         s = s.replace(/[^0-9.\-]/g, '');
  //         balance = s ? parseFloat(s) : 0;
  //       }

  //       importedData.push({
  //         code: columns[0],
  //         name: columns[1],
  //         type: mappedType.toLowerCase(),
  //         parentCode: columns[3] || undefined,
  //         description: columns[4] || undefined,
  //         balance
  //       });
  //     }
  //   }

  //   return importedData;
  // };

  // const parseQuickBooksIIF = (content: string): ImportData[] => {
  //   const lines = content.split('\n');
  //   const importedData: ImportData[] = [];

  //   for (const line of lines) {
  //     if (line.startsWith('ACCNT')) {
  //       const parts = line.split('\t');
  //       if (parts.length >= 4) {
  //         const accountType = parts[2]?.toLowerCase();
  //         const mappedType = mapQuickBooksType(accountType);
          
  //         importedData.push({
  //           code: parts[1] || '',
  //           name: parts[1] || '',
  //           type: mappedType,
  //           description: parts[3] || '',
  //           balance: parts[4] ? parseFloat(parts[4]) : 0
  //         });
  //       }
  //     }
  //   }

  //   return importedData;
  // };

  const parseExcelData = async (file: File): Promise<ImportData[]> => {
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      const importedData: ImportData[] = [];

      if (!rows || rows.length === 0) return importedData;

      // Buscar la fila de encabezados donde la primera columna sea "Codigo" o "Código"
      let headerRowIndex = rows.findIndex((row) => {
        const first = String((row && row[0]) ?? '').trim().toLowerCase();
        return first === 'codigo' || first === 'código';
      });

      if (headerRowIndex === -1) {
        headerRowIndex = 0; // fallback
      }

      // Datos a partir de la fila siguiente al encabezado
      for (let i = headerRowIndex + 1; i < rows.length; i++) {
        const row = rows[i] || [];
        // Formato esperado:
        // [Codigo, Nombre, Grupo, Tipo, Nivel, Cuenta Madre, Descripcion]
        const code = String(row[0] ?? '').trim();
        const name = String(row[1] ?? '').trim();
        const group = String(row[2] ?? '').trim(); // Activo, Pasivo, etc.
        // const detailType = String(row[3] ?? '').trim(); // General / Detalle (por ahora no se usa)
        // const levelRaw = row[4]; // Nivel (podemos recalcular por la jerarquía)
        const parentCode = String(row[5] ?? '').trim();
        const description = String(row[6] ?? '').trim();

        if (!code || !name) continue;

        const mappedType = mapSpanishTypeToInternal(group).toLowerCase();

        importedData.push({
          code,
          name,
          type: mappedType,
          parentCode: parentCode || undefined,
          description: description || undefined,
        });
      }

      return importedData;
    } catch (err) {
      console.error('Error parsing Excel:', err);
      return [];
    }
  };

  // const parseXMLContent = (content: string): ImportData[] => {
  //   const parser = new DOMParser();
  //   const xmlDoc = parser.parseFromString(content, 'text/xml');
  //   const accounts = xmlDoc.getElementsByTagName('account');
  //   const importedData: ImportData[] = [];

  //   for (let i = 0; i < accounts.length; i++) {
  //     const account = accounts[i];
  //     const code = account.getAttribute('code') || '';
  //     const name = account.getAttribute('name') || account.textContent || '';
  //     const type = account.getAttribute('type')?.toLowerCase() || 'asset';
  //     const parentCode = account.getAttribute('parent') || undefined;
  //     const description = account.getAttribute('description') || undefined;

  //     importedData.push({
  //       code,
  //       name,
  //       type,
  //       parentCode,
  //       description
  //     });
  //   }

  //   return importedData;
  // };

  // const parseJSONContent = (content: string): ImportData[] => {
  //   try {
  //     const data = JSON.parse(content);
  //     if (Array.isArray(data)) {
  //       return data.map(item => ({
  //         code: item.code || item.accountCode || '',
  //         name: item.name || item.accountName || '',
  //         type: (item.type || item.accountType || 'asset').toLowerCase(),
  //         parentCode: item.parentCode || item.parent || undefined,
  //         description: item.description || undefined,
  //         balance: item.balance || 0
  //       }));
  //     }
  //   } catch (error) {
  //     console.error('Error parsing JSON:', error);
  //   }
  //   return [];
  // };

  const mapQuickBooksType = (qbType: string): string => {
    const typeMap: { [key: string]: string } = {
      'bank': 'asset',
      'accounts receivable': 'asset',
      'other current asset': 'asset',
      'fixed asset': 'asset',
      'accounts payable': 'liability',
      'credit card': 'liability',
      'other current liability': 'liability',
      'long term liability': 'liability',
      'equity': 'equity',
      'income': 'income',
      'expense': 'expense',
      'cost of goods sold': 'expense'
    };
    
    return typeMap[qbType] || 'asset';
  };

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user || !selectedFormat) return;

    setIsImporting(true);
    setImportProgress(0);

    try {
      let importedData: ImportData[] = [];
      setImportProgress(25);
      importedData = await parseExcelData(file);

      setImportProgress(75);

      const result = await processImportedData(importedData);

      setImportProgress(100);
      setTimeout(() => {
        setIsImporting(false);
        setImportProgress(0);
        setShowImportModal(false);
        const { created, updated, skippedDuplicates, failed } = result as any;
        const messageLines = [
          `Creado: ${created}`,
          `Actualizado: ${updated}`,
          `Duplicados omitidos: ${skippedDuplicates}`,
          `Errores: ${failed.length}`
        ];
        if (failed.length > 0) {
          const sample = failed
            .slice(0, 5)
            .map((f: { code: string; errorMessage: string }) => `- Código ${f.code}: ${f.errorMessage || 'Error'}`)
            .join('\n');
          messageLines.push('Detalles (muestra):');
          messageLines.push(sample);
          if (failed.length > 5) messageLines.push(`... y ${failed.length - 5} más`);
        }
        alert(`Importación finalizada (${selectedFormat.name})\n\n${messageLines.join('\n')}`);
      }, 400);
    } catch (error) {
      setIsImporting(false);
      setImportProgress(0);
      alert(`Error al procesar el archivo ${selectedFormat.name}. Verifique el formato.`);
      console.error('Import error:', error);
    }
  };

  const processImportedData = async (
    importedData: ImportData[]
  ): Promise<{ created: number; updated: number; skippedDuplicates: number; failed: { code: string; errorMessage: string }[] }> => {
    if (!user) return { created: 0, updated: 0, skippedDuplicates: 0, failed: [] };

    const codeToIdMap: { [key: string]: string } = {};
    // Traer cuentas existentes para evitar duplicados por (user_id, code)
    const existing = await chartAccountsService.getAll(user.id);
    const existingCodes = new Set(existing.map(acc => acc.code));
    const existingByCode: Record<string, typeof existing[number]> = {};
    existing.forEach(acc => { existingByCode[acc.code] = acc; });

    let created = 0;
    let updated = 0;
    let skippedDuplicates = 0;
    const failed: Array<{ code: string; errorMessage: string }> = [];

    for (const data of importedData) {
      if (!data.code || !data.name) continue;
      if (existingCodes.has(data.code)) {
        // Actualizar saldo y descripción de la cuenta existente
        try {
          const existingAcc = existingByCode[data.code];
          if (existingAcc) {
            await chartAccountsService.update(existingAcc.id, {
              balance: data.balance || 0,
              description: data.description ?? existingAcc.description
            });
            updated++;
          } else {
            skippedDuplicates++;
          }
        } catch (err) {
          console.error('Error updating existing account:', data.code, err);
          failed.push({ code: data.code, errorMessage: (err as any)?.message || 'Error al actualizar' });
        }
        continue;
      }

      try {
        const rawType = (data.type || '').toLowerCase();
        const validTypes = new Set(['asset', 'liability', 'equity', 'income', 'cost', 'expense']);
        const safeType = (validTypes.has(rawType) ? rawType : mapSpanishTypeToInternal(rawType)) as any;

        const account = {
          code: data.code,
          name: data.name,
          type: (safeType || 'asset') as any,
          level: 1,
          balance: data.balance || 0,
          is_active: true,
          description: data.description,
          normal_balance: getNormalBalance(safeType || 'asset'),
          allow_posting: true,
          parent_id: null
        };

        const createdAcc = await chartAccountsService.create(user.id, account);
        codeToIdMap[data.code] = createdAcc.id;
        existingCodes.add(data.code);
        created++;
      } catch (error) {
        console.error('Error importing account:', data.code, error);
        failed.push({ code: data.code, errorMessage: (error as any)?.message || 'Error al crear' });
      }
    }
    // Segunda pasada: asignar parent_id y nivel usando parentCode
    try {
      const refreshed = await chartAccountsService.getAll(user.id);
      const refreshedByCode: Record<string, typeof refreshed[number]> = {};
      refreshed.forEach(acc => { refreshedByCode[acc.code] = acc; });

      for (const data of importedData) {
        if (!data.code || !data.parentCode) continue;
        const child = refreshedByCode[data.code];
        const parent = refreshedByCode[data.parentCode];
        if (!child || !parent) continue;

        const desiredLevel = (parent.level || 1) + 1;

        // Solo actualizar si cambian parent o nivel
        if (child.parentId !== parent.id || child.level !== desiredLevel) {
          try {
            await chartAccountsService.update(child.id, {
              parent_id: parent.id,
              level: desiredLevel,
            });
          } catch (err) {
            console.error('Error updating parent/level for', data.code, err);
            failed.push({ code: data.code, errorMessage: (err as any)?.message || 'Error al asignar cuenta madre' });
          }
        }
      }
    } catch (err) {
      console.error('Error refreshing accounts after import:', err);
    }

    await loadAccounts();
    return { created, updated, skippedDuplicates, failed };
  };

  const downloadTemplate = (formatId: string) => {
    let template = '';
    let filename = '';

    switch (formatId) {
      case 'csv':
        template = `Código,Nombre,Tipo,Código Padre,Descripción,Saldo
1000,ACTIVOS,asset,,Activos totales de la empresa,0
1100,ACTIVOS CORRIENTES,asset,1000,Activos de corto plazo,0
1110,Efectivo y Equivalentes,asset,1100,Dinero en efectivo y equivalentes,0
1111,Caja General,asset,1110,Dinero en caja,25000
2000,PASIVOS,liability,,Pasivos totales de la empresa,0
2100,PASIVOS CORRIENTES,liability,2000,Pasivos de corto plazo,0
3000,PATRIMONIO,equity,,Patrimonio de la empresa,0
4000,INGRESOS,income,,Ingresos totales,0
5000,GASTOS,expense,,Gastos totales,0`;
        filename = 'plantilla_catalogo_cuentas.csv';
        break;

      case 'quickbooks':
        template = `!ACCNT	NAME	ACCNTTYPE	DESC	ACCNUM
ACCNT	Caja General	Bank	Cuenta de caja principal	1111
ACCNT	Banco Popular	Bank	Cuenta bancaria principal	1112
ACCNT	Cuentas por Cobrar	Accounts Receivable	Cuentas por cobrar clientes	1120
ACCNT	Inventarios	Other Current Asset	Inventario de productos	1130
ACCNT	Cuentas por Pagar	Accounts Payable	Cuentas por pagar proveedores	2110
ACCNT	Capital Social	Equity	Capital social de la empresa	3100
ACCNT	Ventas	Income	Ingresos por ventas	4100
ACCNT	Gastos Operativos	Expense	Gastos operativos generales	5100`;
        filename = 'plantilla_quickbooks.iif';
        break;

      case 'xml':
        template = `<?xml version="1.0" encoding="UTF-8"?>
<chart_of_accounts>
  <account code="1000" name="ACTIVOS" type="asset" description="Activos totales"/>
  <account code="1100" name="ACTIVOS CORRIENTES" type="asset" parent="1000" description="Activos corrientes"/>
  <account code="1111" name="Caja General" type="asset" parent="1100" description="Caja principal"/>
  <account code="2000" name="PASIVOS" type="liability" description="Pasivos totales"/>
  <account code="2110" name="Cuentas por Pagar" type="liability" parent="2000" description="Cuentas por pagar"/>
  <account code="3000" name="PATRIMONIO" type="equity" description="Patrimonio total"/>
  <account code="4000" name="INGRESOS" type="income" description="Ingresos totales"/>
  <account code="5000" name="GASTOS" type="expense" description="Gastos totales"/>
</chart_of_accounts>`;
        filename = 'plantilla_catalogo.xml';
        break;

      case 'json':
        template = JSON.stringify([
          { code: "1000", name: "ACTIVOS", type: "asset", description: "Activos totales" },
          { code: "1100", name: "ACTIVOS CORRIENTES", type: "asset", parentCode: "1000", description: "Activos corrientes" },
          { code: "1111", name: "Caja General", type: "asset", parentCode: "1100", description: "Caja principal", balance: 25000 },
          { code: "2000", name: "PASIVOS", type: "liability", description: "Pasivos totales" },
          { code: "2110", name: "Cuentas por Pagar", type: "liability", parentCode: "2000", description: "Cuentas por pagar" },
          { code: "3000", name: "PATRIMONIO", type: "equity", description: "Patrimonio total" },
          { code: "4000", name: "INGRESOS", type: "income", description: "Ingresos totales" },
          { code: "5000", name: "GASTOS", type: "expense", description: "Gastos totales" }
        ], null, 2);
        filename = 'plantilla_catalogo.json';
        break;

      default:
        return;
    }

    // Ajustar tipo y codificación para Excel cuando sea CSV
    let dataForDownload = template;
    let mime = 'text/plain';
    if (formatId === 'csv') {
      dataForDownload = '\uFEFF' + template.replace(/\n/g, '\r\n');
      mime = 'text/csv;charset=utf-8;';
    }
    const blob = new Blob([dataForDownload], { type: mime });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };
  const handleAddAccount = async () => {
    if (!user || !newAccount.code || !newAccount.name) {
      alert('Por favor complete código y nombre.');
      return;
    }

    // Validar que no exista otra cuenta con el mismo código
    const trimmedCode = newAccount.code.trim();
    const exists = accounts.some(acc => acc.code === trimmedCode);
    if (exists) {
      alert(`Ya existe una cuenta con el código ${trimmedCode}. Use un código único.`);
      return;
    }
    try {
      const isControlLevel = newAccount.level <= 2;
      const account = {
        code: trimmedCode,
        name: newAccount.name,
        type: newAccount.type,
        parent_id: newAccount.parentId || null,
        level: newAccount.level,
        balance: 0,
        is_active: true,
        description: newAccount.description,
        normal_balance: getNormalBalance(newAccount.type),
        allow_posting: isControlLevel ? false : newAccount.allowPosting,
        is_bank_account: newAccount.isBankAccount
      };

      console.log('DEBUG account to create:', account);

      await chartAccountsService.create(user.id, account);
      await loadAccounts();

      setNewAccount({
        code: '',
        name: '',
        type: 'asset',
        parentId: '',
        level: 1,
        description: '',
        allowPosting: true,
        isBankAccount: false
      });
      setShowAddModal(false);
      alert('Cuenta creada exitosamente.');
    } catch (error: any) {
      console.error('Error creating account:', error);
      alert(`Error al crear la cuenta: ${error?.message || 'Error desconocido'}`);
    }
  };

  const handleEditAccount = async () => {
    if (!editingAccount || !editingAccount.code || !editingAccount.name) {
      alert('Por favor complete todos los campos requeridos.');
      return;
    }

    // Validar que no exista otra cuenta con el mismo código
    const trimmedCode = editingAccount.code.trim();
    const exists = accounts.some(acc => acc.code === trimmedCode && acc.id !== editingAccount.id);
    if (exists) {
      alert(`Ya existe otra cuenta con el código ${trimmedCode}. Use un código único.`);
      return;
    }

    // Si se cambia el tipo, obligar a cambiar también el código para que corresponda al nuevo tipo
    const originalAccount = accounts.find(acc => acc.id === editingAccount.id);
    if (originalAccount) {
      const originalType = originalAccount.type;
      const originalCode = originalAccount.code;
      if (editingAccount.type !== originalType && trimmedCode === originalCode) {
        alert('Ha cambiado el tipo de la cuenta. Debe generar o modificar el código para que corresponda con el nuevo tipo antes de guardar.');
        return;
      }
    }

    try {
      const isControlLevel = editingAccount.level <= 2;
      const account = {
        code: trimmedCode,
        name: editingAccount.name,
        type: editingAccount.type,
        level: editingAccount.level,
        description: editingAccount.description,
        allow_posting: isControlLevel ? false : editingAccount.allowPosting,
        is_active: editingAccount.isActive,
        normal_balance: getNormalBalance(editingAccount.type),
        is_bank_account: editingAccount.isBankAccount
      };

      await chartAccountsService.update(editingAccount.id, account);
      await loadAccounts();
      
      setEditingAccount(null);
      setShowEditModal(false);
      alert('Cuenta actualizada exitosamente.');
    } catch (error) {
      console.error('Error updating account:', error);
      alert('Error al actualizar la cuenta.');
    }
  };

  const handleDeleteAccount = async (accountId: string) => {
    if (!confirm('¿Está seguro de que desea eliminar esta cuenta? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      // Verificar si la cuenta tiene movimientos
      const account = accounts.find(acc => acc.id === accountId);
      if (account && account.balance !== 0) {
        alert('No se puede eliminar una cuenta con saldo. Primero debe transferir el saldo a otra cuenta.');
        return;
      }

      // Verificar si tiene cuentas hijas
      const hasChildren = accounts.some(acc => acc.parentId === accountId);
      if (hasChildren) {
        alert('No se puede eliminar una cuenta que tiene subcuentas. Primero elimine o reasigne las subcuentas.');
        return;
      }

      await chartAccountsService.delete(accountId);
      await loadAccounts();
      alert('Cuenta eliminada exitosamente.');
    } catch (error: any) {
      console.error('Error deleting account:', error);
      const code = error?.code;
      const details: string | undefined = error?.details;

      if (code === '23503' && details?.includes('"bank_accounts"')) {
        alert('No se puede eliminar esta cuenta porque está asociada a uno o más bancos.\nPrimero quite o cambie la cuenta contable en el módulo de Bancos.');
      } else {
        alert('Error al eliminar la cuenta. Verifique que no tenga movimientos ni relaciones asociadas.');
      }
    }
  };

  const downloadExcel = () => {
    try {
      // Construir datos en formato similar al ejemplo:
      // Codigo | Nombre | Grupo | Tipo | Nivel | Cuenta Madre | Descripcion

      // Mapa para obtener código padre rápidamente
      const idToCode: Record<string, string> = {};
      accounts.forEach((acc) => {
        idToCode[acc.id] = acc.code;
      });

      const header = ['Codigo', 'Nombre', 'Grupo', 'Tipo', 'Nivel', 'Cuenta Madre', 'Descripcion'];
      const rows = filteredAccounts.map(acc => {
        const parentCode = acc.parentId ? idToCode[acc.parentId] || '' : '';
        const group = getAccountTypeName(acc.type); // Activo, Pasivo, etc.
        const tipo = acc.allowPosting ? 'Detalle' : 'General';

        return [
          acc.code,
          acc.name,
          group,
          tipo,
          acc.level,
          parentCode,
          acc.description || '',
        ];
      });

      // Fila de título + fila en blanco + encabezados + datos
      const aoa = [
        ['Catálogo de Cuentas'],
        [],
        header,
        ...rows,
      ];

      const ws = XLSX.utils.aoa_to_sheet(aoa);

      // Anchos de columnas para legibilidad en Excel
      ws['!cols'] = [
        { wch: 12 }, // Codigo
        { wch: 40 }, // Nombre
        { wch: 12 }, // Grupo
        { wch: 12 }, // Tipo (General/Detalle)
        { wch: 8 },  // Nivel
        { wch: 14 }, // Cuenta Madre
        { wch: 40 }, // Descripcion
      ];

      // Dar formato al título en A1 (negrita y subrayado) y combinar columnas A1:G1
      const titleCellRef = 'A1';
      if (!ws[titleCellRef]) {
        ws[titleCellRef] = { t: 's', v: 'Catálogo de Cuentas' } as any;
      }
      (ws[titleCellRef] as any).s = {
        font: { bold: true, underline: true, sz: 14 },
        alignment: { horizontal: 'center' },
      };
      (ws as any)['!merges'] = (ws as any)['!merges'] || [];
      (ws as any)['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 6 } });

      // Congelar fila de encabezados de columnas (tercera fila)
      (ws as any)['!freeze'] = { rows: 3, columns: 0 };

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Catalogo');
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.href = url;
      link.download = `catalogo_cuentas_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading Excel:', error);
      alert('Error al descargar el archivo');
    }
  };

  const renderAccountRow = (account: ChartAccount) => {
    const hasChildren = accounts.some(acc => acc.parentId === account.id);
    const isExpanded = expandedAccounts.includes(account.id);
    const children = getChildAccounts(account.id);

    return (
      <div key={account.id}>
        <div className="flex items-center py-3 px-4 border-b border-gray-100 hover:bg-gray-50">
          <div className="flex items-center flex-1" style={{ paddingLeft: `${(account.level - 1) * 20}px` }}>
            {hasChildren && (
              <button
                onClick={() => toggleExpanded(account.id)}
                className="mr-2 text-gray-400 hover:text-gray-600"
              >
                <i className={`ri-arrow-${isExpanded ? 'down' : 'right'}-s-line`}></i>
              </button>
            )}
            <div className="flex-1 grid grid-cols-8 gap-4 items-center">
              <div>
                <input
                  type="checkbox"
                  checked={selectedIds.includes(account.id)}
                  onChange={() => toggleSelectOne(account.id)}
                />
              </div>
              <div className="font-medium text-gray-900">{account.code}</div>
              <div className="text-gray-900">{account.name}</div>
              <div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getAccountTypeColor(account.type)}`}>
                  {getAccountTypeName(account.type)}
                </span>
              </div>
              <div className="text-sm text-gray-600">{account.level}</div>
              <div className="text-sm text-gray-900">
                RD${Math.abs(account.balance).toLocaleString()}
                {account.balance < 0 && ' (Cr)'}
              </div>
              <div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  account.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {account.isActive ? 'Activa' : 'Inactiva'}
                </span>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    setEditingAccount(account);
                    setShowEditModal(true);
                  }}
                  className="text-blue-600 hover:text-blue-900"
                >
                  <i className="ri-edit-line"></i>
                </button>
                <button
                  onClick={() => handleDeleteAccount(account.id)}
                  className="text-red-600 hover:text-red-900"
                >
                  <i className="ri-delete-bin-line"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
        {hasChildren && isExpanded && children.map(child => renderAccountRow(child))}
      </div>
    );
  };

  // Mostrar todas las cuentas filtradas sin limitar por nivel,
  // para que las cuentas con nivel 2-5 también aparezcan en el listado.
  const topLevelAccounts = filteredAccounts;

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-6 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Cargando catálogo de cuentas...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div className="flex-1">
            <p className="text-sm text-gray-600 mb-1">Gestión completa del plan de cuentas contables</p>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Catálogo de Cuentas</h1>
          </div>
          <div className="flex flex-wrap gap-3 justify-start md:justify-end">
            <button
              onClick={downloadExcel}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors whitespace-nowrap"
            >
              <i className="ri-file-excel-line mr-2"></i>
              Descargar plantilla (sistema)
            </button>
            <button
              onClick={() => setShowFormatModal(true)}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors whitespace-nowrap"
            >
              <i className="ri-upload-line mr-2"></i>
              Importar Catálogo
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
            >
              <i className="ri-add-line mr-2"></i>
              Nueva Cuenta
            </button>
            <button
              onClick={handleDeleteSelected}
              disabled={selectedIds.length === 0}
              className={`px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${selectedIds.length === 0 ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-red-600 text-white hover:bg-red-700'}`}
            >
              <i className="ri-delete-bin-line mr-2"></i>
              Eliminar seleccionadas
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <i className="ri-search-line text-gray-400"></i>
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                placeholder="Buscar cuentas por código o nombre..."
              />
            </div>
          </div>
          <div className="w-full md:w-48">
            <select
              value={selectedAccountType}
              onChange={(e) => setSelectedAccountType(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm pr-8"
            >
              {accountTypes.map((type) => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Chart of Accounts */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <div className="grid grid-cols-8 gap-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
              <div>
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={toggleSelectAll}
                />
              </div>
              <div>Código</div>
              <div>Nombre de la Cuenta</div>
              <div>Tipo</div>
              <div>Nivel</div>
              <div>Saldo</div>
              <div>Estado</div>
              <div>Acciones</div>
            </div>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {topLevelAccounts.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <i className="ri-file-list-line text-4xl mb-4 block"></i>
                <p className="text-lg font-medium mb-2">No hay cuentas registradas</p>
                <p className="text-sm">Comience agregando su primera cuenta contable o importe un catálogo existente.</p>
              </div>
            ) : (
              topLevelAccounts.map(account => renderAccountRow(account))
            )}
          </div>
        </div>

        {/* Format Selection Modal */}
        {showFormatModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[80vh] overflow-y-auto">
              <h3 className="text-lg font-semibold mb-4">Seleccionar Formato de Importación</h3>
              <p className="text-gray-600 mb-6">Elija el formato del sistema contable desde el cual desea importar el catálogo de cuentas:</p>
              <div className="grid grid-cols-1 gap-4 mb-6 max-w-md mx-auto">
                {importFormats.map((format) => (
                  <div
                    key={format.id}
                    onClick={() => handleFormatSelection(format)}
                    className="border border-gray-200 rounded-lg p-4 hover:border-blue-500 hover:shadow-md transition-all cursor-pointer"
                  >
                    <div className="flex items-center mb-2">
                      <div className={`w-10 h-10 rounded-lg ${format.color} flex items-center justify-center mr-3`}>
                        <i className={`${format.icon} text-lg`}></i>
                      </div>
                      <div>
                        <h4 className="font-medium">{format.name}</h4>
                        <p className="text-xs text-gray-500">{format.fileTypes.join(', ')}</p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600">{format.description}</p>
                  </div>
                ))}
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => setShowFormatModal(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 whitespace-nowrap"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Import File Modal */}
        {showImportModal && selectedFormat && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-semibold mb-4">Importar Catálogo desde {selectedFormat.name}</h3>
              <p className="text-gray-600 mb-4">
                Seleccione un archivo {selectedFormat.fileTypes.join(', ')} con el catálogo de cuentas.
              </p>

              <input
                ref={fileInputRef}
                type="file"
                accept={selectedFormat.fileTypes.join(',')}
                onChange={handleFileImport}
                className="w-full mb-4"
              />

              <div className="flex justify-end space-x-3 mt-4">
                <button
                  onClick={() => {
                    setShowImportModal(false);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 whitespace-nowrap"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Account Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-semibold mb-4">Agregar Nueva Cuenta</h3>
              <div className="space-y-4">
                {/* Tipo primero */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                  <select
                    value={newAccount.type}
                    onChange={(e) => setNewAccount({...newAccount, type: e.target.value as any})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-8"
                  >
                    <option value="asset">Activo</option>
                    <option value="liability">Pasivo</option>
                    <option value="equity">Patrimonio</option>
                    <option value="income">Ingreso</option>
                    <option value="cost">Costo</option>
                    <option value="expense">Gasto</option>
                  </select>
                </div>

                {/* Código + Generar */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Código</label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={newAccount.code}
                      onChange={(e) => {
                        const value = e.target.value;
                        setNewAccount({ ...newAccount, code: value });
                      }}
                      className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Ej: 1114"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const typeFirstDigitMap: Record<ChartAccount['type'], string> = {
                          asset: '1',
                          liability: '2',
                          equity: '3',
                          income: '4',
                          cost: '5',
                          expense: '6',
                        };
                        const firstDigit = typeFirstDigitMap[newAccount.type] || '1';

                        const numericCodes = accounts
                          .map(acc => acc.code.trim())
                          .filter(code => code.startsWith(firstDigit) && /^\d+$/.test(code))
                          .map(code => parseInt(code, 10))
                          .sort((a, b) => a - b);

                        const base = parseInt(`${firstDigit}000`, 10);
                        const last = numericCodes.length > 0 ? numericCodes[numericCodes.length - 1] : base - 1;
                        const next = Math.max(last + 1, base);

                        setNewAccount(prev => ({ ...prev, code: String(next) }));
                      }}
                      className="px-3 py-2 text-sm bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 whitespace-nowrap"
                    >
                      Generar
                    </button>
                  </div>
                </div>

                {/* Nombre */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                  <input
                    type="text"
                    value={newAccount.name}
                    onChange={(e) => setNewAccount({...newAccount, name: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Nombre de la cuenta"
                  />
                </div>

                {/* Cuenta Padre */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cuenta Padre</label>
                  <select
                    value={newAccount.parentId}
                    onChange={(e) => {
                      const parentId = e.target.value;
                      const level = parentId ? calculateLevel(parentId) : 1;
                      setNewAccount({
                        ...newAccount,
                        parentId,
                        level: Math.min(5, level),
                      });
                    }}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-8"
                  >
                    <option value="">Cuenta Principal</option>
                    {getParentAccounts(newAccount.type).map(account => (
                      <option key={account.id} value={account.id}>
                        {account.code} - {account.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Nivel */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nivel</label>
                  <select
                    value={String(newAccount.level)}
                    onChange={(e) => {
                      const selected = Number(e.target.value);
                      const clamped = Math.min(5, Math.max(1, selected || 1));
                      setNewAccount({
                        ...newAccount,
                        level: clamped,
                      });
                    }}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-8"
                  >
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="4">4</option>
                    <option value="5">5</option>
                  </select>
                </div>

                {/* Descripción */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                  <textarea
                    value={newAccount.description}
                    onChange={(e) => setNewAccount({...newAccount, description: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                    placeholder="Descripción opcional"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                  <select
                    value={newAccount.allowPosting ? 'detail' : 'control'}
                    onChange={(e) =>
                      setNewAccount({
                        ...newAccount,
                        allowPosting: e.target.value === 'detail',
                      })
                    }
                    disabled={newAccount.level <= 2}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-8"
                  >
                    <option value="control">Control (no permite movimientos)</option>
                    <option value="detail">Detalle (permite movimientos)</option>
                  </select>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="newIsBankAccount"
                    checked={newAccount.isBankAccount}
                    onChange={(e) =>
                      setNewAccount({
                        ...newAccount,
                        isBankAccount: e.target.checked,
                      })
                    }
                    className="mr-2"
                  />
                  <label htmlFor="newIsBankAccount" className="text-sm text-gray-700">
                    Cuenta bancaria (para módulo de Bancos)
                  </label>
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 whitespace-nowrap"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAddAccount}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 whitespace-nowrap"
                >
                  Agregar Cuenta
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Account Modal */}
        {showEditModal && editingAccount && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-semibold mb-4">Editar Cuenta</h3>
              <div className="space-y-4">
                {/* Tipo */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                  <select
                    value={editingAccount.type}
                    onChange={(e) => setEditingAccount({ ...editingAccount, type: e.target.value as any })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-8"
                  >
                    <option value="asset">Activo</option>
                    <option value="liability">Pasivo</option>
                    <option value="equity">Patrimonio</option>
                    <option value="income">Ingreso</option>
                    <option value="cost">Costo</option>
                    <option value="expense">Gasto</option>
                  </select>
                </div>

                {/* Código + Generar */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Código</label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={editingAccount.code}
                      onChange={(e) => setEditingAccount({ ...editingAccount, code: e.target.value })}
                      className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const typeFirstDigitMap: Record<ChartAccount['type'], string> = {
                          asset: '1',
                          liability: '2',
                          equity: '3',
                          income: '4',
                          cost: '5',
                          expense: '6',
                        };
                        const firstDigit = typeFirstDigitMap[editingAccount.type] || '1';

                        const numericCodes = accounts
                          .map(acc => acc.code.trim())
                          .filter(code => code.startsWith(firstDigit) && /^\d+$/.test(code))
                          .map(code => parseInt(code, 10))
                          .sort((a, b) => a - b);

                        const base = parseInt(`${firstDigit}000`, 10);
                        const last = numericCodes.length > 0 ? numericCodes[numericCodes.length - 1] : base - 1;
                        const next = Math.max(last + 1, base);

                        setEditingAccount(prev => ({ ...prev, code: String(next) }));
                      }}
                      className="px-3 py-2 text-sm bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 whitespace-nowrap"
                    >
                      Generar
                    </button>
                  </div>
                </div>

                {/* Nombre */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                  <input
                    type="text"
                    value={editingAccount.name}
                    onChange={(e) => setEditingAccount({ ...editingAccount, name: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Cuenta Padre */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cuenta Padre</label>
                  <select
                    value={editingAccount.parentId || ''}
                    onChange={(e) => {
                      const parentId = e.target.value;
                      const level = parentId ? calculateLevel(parentId) : 1;
                      setEditingAccount({
                        ...editingAccount,
                        parentId,
                        level: Math.min(5, level),
                      });
                    }}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-8"
                  >
                    <option value="">Cuenta Principal</option>
                    {getParentAccounts(editingAccount.type).map(account => (
                      <option key={account.id} value={account.id}>
                        {account.code} - {account.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Nivel */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nivel</label>
                  <select
                    value={String(editingAccount.level)}
                    onChange={(e) => {
                      const level = Math.min(5, Math.max(1, Number(e.target.value) || 1));
                      setEditingAccount({
                        ...editingAccount,
                        level,
                      });
                    }}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-8"
                  >
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="4">4</option>
                    <option value="5">5</option>
                  </select>
                </div>

                {/* Descripción */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                  <textarea
                    value={editingAccount.description || ''}
                    onChange={(e) => setEditingAccount({ ...editingAccount, description: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                  />
                </div>

                {/* Categoría */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                  <select
                    value={editingAccount.allowPosting ? 'detail' : 'control'}
                    onChange={(e) =>
                      setEditingAccount({
                        ...editingAccount,
                        allowPosting: e.target.value === 'detail',
                      })
                    }
                    disabled={editingAccount.level <= 2}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-8"
                  >
                    <option value="control">Control (no permite movimientos)</option>
                    <option value="detail">Detalle (permite movimientos)</option>
                  </select>
                </div>

                {/* Marca de cuenta bancaria */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="editIsBankAccount"
                    checked={!!editingAccount.isBankAccount}
                    onChange={(e) =>
                      setEditingAccount({
                        ...editingAccount,
                        isBankAccount: e.target.checked,
                      })
                    }
                    className="mr-2"
                  />
                  <label htmlFor="editIsBankAccount" className="text-sm text-gray-700">
                    Cuenta bancaria (para módulo de Bancos)
                  </label>
                </div>

                {/* Estado */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="editIsActive"
                    checked={editingAccount.isActive}
                    onChange={(e) => setEditingAccount({ ...editingAccount, isActive: e.target.checked })}
                    className="mr-2"
                  />
                  <label htmlFor="editIsActive" className="text-sm text-gray-700">
                    Cuenta activa
                  </label>
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 whitespace-nowrap"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleEditAccount}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 whitespace-nowrap"
                >
                  Guardar Cambios
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
