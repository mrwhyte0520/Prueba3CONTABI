import { useState, useRef, useEffect } from 'react';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import { chartAccountsService } from '../../../services/database';
import { useAuth } from '../../../hooks/useAuth';

interface ChartAccount {
  id: string;
  code: string;
  name: string;
  type: 'asset' | 'liability' | 'equity' | 'income' | 'expense';
  parentId?: string;
  level: number;
  balance: number;
  isActive: boolean;
  description?: string;
  normalBalance: 'debit' | 'credit';
  allowPosting: boolean;
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

  const [newAccount, setNewAccount] = useState({
    code: '',
    name: '',
    type: 'asset' as const,
    parentId: '',
    description: '',
    allowPosting: true
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
      setAccounts(data);
    } catch (error) {
      console.error('Error loading accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const importFormats: ImportFormat[] = [
    {
      id: 'csv',
      name: 'CSV Estándar',
      description: 'Formato CSV compatible con Excel y sistemas contables básicos',
      fileTypes: ['.csv'],
      icon: 'ri-file-text-line',
      color: 'bg-green-100 text-green-800'
    },
    {
      id: 'quickbooks',
      name: 'QuickBooks',
      description: 'Formato IIF de QuickBooks Desktop y Online',
      fileTypes: ['.iif', '.qbx', '.csv'],
      icon: 'ri-file-chart-line',
      color: 'bg-blue-100 text-blue-800'
    },
    {
      id: 'excel',
      name: 'Microsoft Excel',
      description: 'Archivos Excel con formato estructurado (.xlsx, .xls)',
      fileTypes: ['.xlsx', '.xls'],
      icon: 'ri-file-excel-line',
      color: 'bg-green-100 text-green-800'
    },
    {
      id: 'sage',
      name: 'Sage 50/100/200',
      description: 'Formato de exportación de Sage Accounting',
      fileTypes: ['.csv', '.txt'],
      icon: 'ri-file-list-line',
      color: 'bg-purple-100 text-purple-800'
    },
    {
      id: 'sap',
      name: 'SAP Business One',
      description: 'Formato XML/CSV de SAP para plan de cuentas',
      fileTypes: ['.xml', '.csv'],
      icon: 'ri-file-code-line',
      color: 'bg-orange-100 text-orange-800'
    },
    {
      id: 'xero',
      name: 'Xero Accounting',
      description: 'Formato CSV de Xero para importación de cuentas',
      fileTypes: ['.csv'],
      icon: 'ri-cloud-line',
      color: 'bg-indigo-100 text-indigo-800'
    },
    {
      id: 'json',
      name: 'JSON Universal',
      description: 'Formato JSON para sistemas modernos y APIs',
      fileTypes: ['.json'],
      icon: 'ri-code-s-slash-line',
      color: 'bg-gray-100 text-gray-800'
    },
    {
      id: 'xml',
      name: 'XML Estándar',
      description: 'Formato XML compatible con múltiples sistemas ERP',
      fileTypes: ['.xml'],
      icon: 'ri-file-code-line',
      color: 'bg-yellow-100 text-yellow-800'
    }
  ];

  const accountTypes = [
    { value: 'all', label: 'Todos los Tipos' },
    { value: 'asset', label: 'Activos' },
    { value: 'liability', label: 'Pasivos' },
    { value: 'equity', label: 'Patrimonio' },
    { value: 'income', label: 'Ingresos' },
    { value: 'expense', label: 'Gastos' }
  ];

  const filteredAccounts = accounts.filter(account => {
    const matchesSearch = account.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         account.code.includes(searchTerm);
    const matchesType = selectedAccountType === 'all' || account.type === selectedAccountType;
    return matchesSearch && matchesType;
  });

  const getAccountTypeColor = (type: string) => {
    switch (type) {
      case 'asset': return 'bg-blue-100 text-blue-800';
      case 'liability': return 'bg-red-100 text-red-800';
      case 'equity': return 'bg-green-100 text-green-800';
      case 'income': return 'bg-purple-100 text-purple-800';
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
      case 'expense': return 'Gasto';
      default: return 'Otro';
    }
  };

  const getNormalBalance = (type: string): 'debit' | 'credit' => {
    return ['asset', 'expense'].includes(type) ? 'debit' : 'credit';
  };

  const getParentAccounts = (type: string) => {
    return accounts.filter(account => 
      account.type === type && 
      account.level < 4 && 
      !account.allowPosting
    );
  };

  const calculateLevel = (parentId: string): number => {
    if (!parentId) return 1;
    const parent = accounts.find(acc => acc.id === parentId);
    return parent ? parent.level + 1 : 1;
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

  const parseCSVContent = (content: string): ImportData[] => {
    const lines = content.split('\n');
    const importedData: ImportData[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const columns = line.split(',').map(col => col.trim().replace(/"/g, ''));
      if (columns.length >= 3) {
        importedData.push({
          code: columns[0],
          name: columns[1],
          type: columns[2].toLowerCase(),
          parentCode: columns[3] || undefined,
          description: columns[4] || undefined,
          balance: columns[5] ? parseFloat(columns[5]) : 0
        });
      }
    }

    return importedData;
  };

  const parseQuickBooksIIF = (content: string): ImportData[] => {
    const lines = content.split('\n');
    const importedData: ImportData[] = [];

    for (const line of lines) {
      if (line.startsWith('ACCNT')) {
        const parts = line.split('\t');
        if (parts.length >= 4) {
          const accountType = parts[2]?.toLowerCase();
          const mappedType = mapQuickBooksType(accountType);
          
          importedData.push({
            code: parts[1] || '',
            name: parts[1] || '',
            type: mappedType,
            description: parts[3] || '',
            balance: parts[4] ? parseFloat(parts[4]) : 0
          });
        }
      }
    }

    return importedData;
  };

  const parseExcelData = async (file: File): Promise<ImportData[]> => {
    const text = await file.text();
    return parseCSVContent(text);
  };

  const parseXMLContent = (content: string): ImportData[] => {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(content, 'text/xml');
    const accounts = xmlDoc.getElementsByTagName('account');
    const importedData: ImportData[] = [];

    for (let i = 0; i < accounts.length; i++) {
      const account = accounts[i];
      const code = account.getAttribute('code') || '';
      const name = account.getAttribute('name') || account.textContent || '';
      const type = account.getAttribute('type')?.toLowerCase() || 'asset';
      const parentCode = account.getAttribute('parent') || undefined;
      const description = account.getAttribute('description') || undefined;

      importedData.push({
        code,
        name,
        type,
        parentCode,
        description
      });
    }

    return importedData;
  };

  const parseJSONContent = (content: string): ImportData[] => {
    try {
      const data = JSON.parse(content);
      if (Array.isArray(data)) {
        return data.map(item => ({
          code: item.code || item.accountCode || '',
          name: item.name || item.accountName || '',
          type: (item.type || item.accountType || 'asset').toLowerCase(),
          parentCode: item.parentCode || item.parent || undefined,
          description: item.description || undefined,
          balance: item.balance || 0
        }));
      }
    } catch (error) {
      console.error('Error parsing JSON:', error);
    }
    return [];
  };

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

  const mapSageType = (sageType: string): string => {
    const typeMap: { [key: string]: string } = {
      'nominal': 'expense',
      'bank': 'asset',
      'customer': 'asset',
      'supplier': 'liability',
      'asset': 'asset',
      'liability': 'liability',
      'capital': 'equity',
      'sales': 'income',
      'purchase': 'expense'
    };
    
    return typeMap[sageType.toLowerCase()] || 'asset';
  };

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedFormat || !user) return;

    setIsImporting(true);
    setImportProgress(0);

    try {
      let importedData: ImportData[] = [];
      const fileExtension = file.name.toLowerCase().split('.').pop();

      setImportProgress(25);

      switch (selectedFormat.id) {
        case 'csv':
        case 'sage':
        case 'xero':
          const csvContent = await file.text();
          importedData = parseCSVContent(csvContent);
          break;

        case 'quickbooks':
          if (fileExtension === 'iif') {
            const iifContent = await file.text();
            importedData = parseQuickBooksIIF(iifContent);
          } else {
            const csvContent = await file.text();
            importedData = parseCSVContent(csvContent);
          }
          break;

        case 'excel':
          importedData = await parseExcelData(file);
          break;

        case 'xml':
        case 'sap':
          const xmlContent = await file.text();
          importedData = parseXMLContent(xmlContent);
          break;

        case 'json':
          const jsonContent = await file.text();
          importedData = parseJSONContent(jsonContent);
          break;

        default:
          throw new Error('Formato no soportado');
      }

      setImportProgress(75);

      await processImportedData(importedData);
      
      setImportProgress(100);
      setTimeout(() => {
        setIsImporting(false);
        setImportProgress(0);
        setShowImportModal(false);
        alert(`Se importaron ${importedData.length} cuentas exitosamente desde ${selectedFormat.name}.`);
      }, 500);

    } catch (error) {
      setIsImporting(false);
      setImportProgress(0);
      alert(`Error al procesar el archivo ${selectedFormat.name}. Verifique el formato.`);
      console.error('Import error:', error);
    }
  };

  const processImportedData = async (importedData: ImportData[]) => {
    if (!user) return;

    const codeToIdMap: { [key: string]: string } = {};

    for (const data of importedData) {
      if (!data.code || !data.name) continue;

      try {
        const account = {
          code: data.code,
          name: data.name,
          type: data.type as any || 'asset',
          level: 1,
          balance: data.balance || 0,
          is_active: true,
          description: data.description,
          normal_balance: getNormalBalance(data.type || 'asset'),
          allow_posting: true,
          parent_id: null
        };

        const createdAccount = await chartAccountsService.create(user.id, account);
        codeToIdMap[data.code] = createdAccount.id;
      } catch (error) {
        console.error('Error importing account:', data.code, error);
      }
    }

    await loadAccounts();
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

    const blob = new Blob([template], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleAddAccount = async () => {
    if (!user || !newAccount.code || !newAccount.name) {
      alert('Por favor complete todos los campos requeridos.');
      return;
    }

    try {
      const account = {
        code: newAccount.code,
        name: newAccount.name,
        type: newAccount.type,
        parent_id: newAccount.parentId || null,
        level: calculateLevel(newAccount.parentId),
        balance: 0,
        is_active: true,
        description: newAccount.description,
        normal_balance: getNormalBalance(newAccount.type),
        allow_posting: newAccount.allowPosting
      };

      await chartAccountsService.create(user.id, account);
      await loadAccounts();
      
      setNewAccount({
        code: '',
        name: '',
        type: 'asset',
        parentId: '',
        description: '',
        allowPosting: true
      });
      setShowAddModal(false);
      alert('Cuenta creada exitosamente.');
    } catch (error) {
      console.error('Error creating account:', error);
      alert('Error al crear la cuenta. Verifique que el código no esté duplicado.');
    }
  };

  const handleEditAccount = async () => {
    if (!editingAccount || !editingAccount.code || !editingAccount.name) {
      alert('Por favor complete todos los campos requeridos.');
      return;
    }

    try {
      const account = {
        code: editingAccount.code,
        name: editingAccount.name,
        description: editingAccount.description,
        allow_posting: editingAccount.allowPosting,
        is_active: editingAccount.isActive
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
    } catch (error) {
      console.error('Error deleting account:', error);
      alert('Error al eliminar la cuenta. Verifique que no tenga movimientos contables asociados.');
    }
  };

  const downloadExcel = () => {
    try {
      // Crear contenido CSV
      let csvContent = 'Catálogo de Cuentas\n';
      csvContent += `Generado: ${new Date().toLocaleDateString()}\n\n`;
      csvContent += 'Código,Nombre,Tipo,Nivel,Saldo,Estado,Descripción\n';
      
      filteredAccounts.forEach(account => {
        const row = [
          account.code,
          `"${account.name}"`,
          getAccountTypeName(account.type),
          account.level,
          Math.abs(account.balance).toLocaleString(),
          account.isActive ? 'Activa' : 'Inactiva',
          `"${account.description || ''}"`
        ].join(',');
        csvContent += row + '\n';
      });

      // Agregar resumen por tipo
      csvContent += '\nResumen por Tipo:\n';
      const accountsByType = filteredAccounts.reduce((acc, account) => {
        acc[account.type] = (acc[account.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      Object.entries(accountsByType).forEach(([type, count]) => {
        csvContent += `${getAccountTypeName(type)},${count}\n`;
      });

      // Crear y descargar archivo
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `catalogo_cuentas_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
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
            <div className="flex-1 grid grid-cols-7 gap-4 items-center">
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

  const topLevelAccounts = filteredAccounts.filter(account => account.level === 1);

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
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Catálogo de Cuentas</h1>
            <p className="text-gray-600 mt-1">Gestión completa del plan de cuentas contables</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={downloadExcel}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors whitespace-nowrap"
            >
              <i className="ri-file-excel-line mr-2"></i>
              Descargar Excel
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
            <div className="grid grid-cols-7 gap-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
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
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
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

        {/* Import Modal */}
        {showImportModal && selectedFormat && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-lg">
              <h3 className="text-lg font-semibold mb-4">Importar desde {selectedFormat.name}</h3>
              
              <div className="space-y-4">
                <div className={`border rounded-lg p-4 ${selectedFormat.color.replace('text-', 'border-').replace('100', '200')}`}>
                  <div className="flex items-center mb-2">
                    <i className={`${selectedFormat.icon} text-lg mr-2`}></i>
                    <h4 className="font-medium">{selectedFormat.name}</h4>
                  </div>
                  <p className="text-sm mb-2">{selectedFormat.description}</p>
                  <p className="text-xs">Formatos soportados: {selectedFormat.fileTypes.join(', ')}</p>
                </div>
                
                <div>
                  <button
                    onClick={() => downloadTemplate(selectedFormat.id)}
                    className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors whitespace-nowrap mb-4"
                  >
                    <i className="ri-download-line mr-2"></i>
                    Descargar Plantilla {selectedFormat.name}
                  </button>
                </div>

                {isImporting && (
                  <div className="mb-4">
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                      <span>Procesando archivo...</span>
                      <span>{importProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${importProgress}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Seleccionar archivo {selectedFormat.name}
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={selectedFormat.fileTypes.join(',')}
                    onChange={handleFileImport}
                    disabled={isImporting}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowImportModal(false);
                    setSelectedFormat(null);
                  }}
                  disabled={isImporting}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 whitespace-nowrap disabled:opacity-50"
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
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">Agregar Nueva Cuenta</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Código</label>
                  <input
                    type="text"
                    value={newAccount.code}
                    onChange={(e) => setNewAccount({...newAccount, code: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Ej: 1114"
                  />
                </div>
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
                    <option value="expense">Gasto</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cuenta Padre</label>
                  <select
                    value={newAccount.parentId}
                    onChange={(e) => setNewAccount({...newAccount, parentId: e.target.value})}
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
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="allowPosting"
                    checked={newAccount.allowPosting}
                    onChange={(e) => setNewAccount({...newAccount, allowPosting: e.target.checked})}
                    className="mr-2"
                  />
                  <label htmlFor="allowPosting" className="text-sm text-gray-700">
                    Permitir movimientos contables
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
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">Editar Cuenta</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Código</label>
                  <input
                    type="text"
                    value={editingAccount.code}
                    onChange={(e) => setEditingAccount({...editingAccount, code: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                  <input
                    type="text"
                    value={editingAccount.name}
                    onChange={(e) => setEditingAccount({...editingAccount, name: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                  <textarea
                    value={editingAccount.description || ''}
                    onChange={(e) => setEditingAccount({...editingAccount, description: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                  />
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="editAllowPosting"
                    checked={editingAccount.allowPosting}
                    onChange={(e) => setEditingAccount({...editingAccount, allowPosting: e.target.checked})}
                    className="mr-2"
                  />
                  <label htmlFor="editAllowPosting" className="text-sm text-gray-700">
                    Permitir movimientos contables
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="editIsActive"
                    checked={editingAccount.isActive}
                    onChange={(e) => setEditingAccount({...editingAccount, isActive: e.target.checked})}
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
