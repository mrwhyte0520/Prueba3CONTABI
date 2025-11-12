import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { supabase } from '../../../lib/supabase';
import { useNavigate } from 'react-router-dom';

interface AccountingPeriod {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: 'open' | 'closed' | 'locked';
  fiscal_year: string;
  created_at: string;
  closed_at?: string;
  closed_by?: string;
  entries_count?: number;
  total_debits?: number;
  total_credits?: number;
}

const AccountingPeriodsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [periods, setPeriods] = useState<AccountingPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<AccountingPeriod | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState('');

  // Formulario para nuevo período
  const [formData, setFormData] = useState({
    name: '',
    start_date: '',
    end_date: '',
    fiscal_year: new Date().getFullYear().toString()
  });

  useEffect(() => {
    loadPeriods();
  }, [user]);

  const loadPeriods = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Intentar cargar desde Supabase
      const { data: periodsData, error } = await supabase
        .from('accounting_periods')
        .select('*')
        .eq('user_id', user.id)
        .order('start_date', { ascending: false });

      if (!error && periodsData) {
        setPeriods(periodsData);
      } else {
        throw new Error('Error loading from Supabase');
      }
    } catch (error) {
      console.error('Error loading periods:', error);
      // Cargar datos de ejemplo
      loadMockPeriods();
    } finally {
      setLoading(false);
    }
  };

  const loadMockPeriods = () => {
    const mockPeriods: AccountingPeriod[] = [
      {
        id: '1',
        name: 'Enero 2024',
        start_date: '2024-01-01',
        end_date: '2024-01-31',
        status: 'closed',
        fiscal_year: '2024',
        created_at: '2024-01-01T00:00:00Z',
        closed_at: '2024-02-05T10:30:00Z',
        closed_by: 'Admin',
        entries_count: 45,
        total_debits: 1250000,
        total_credits: 1250000
      },
      {
        id: '2',
        name: 'Febrero 2024',
        start_date: '2024-02-01',
        end_date: '2024-02-29',
        status: 'closed',
        fiscal_year: '2024',
        created_at: '2024-02-01T00:00:00Z',
        closed_at: '2024-03-05T09:15:00Z',
        closed_by: 'Admin',
        entries_count: 52,
        total_debits: 1380000,
        total_credits: 1380000
      },
      {
        id: '3',
        name: 'Marzo 2024',
        start_date: '2024-03-01',
        end_date: '2024-03-31',
        status: 'closed',
        fiscal_year: '2024',
        created_at: '2024-03-01T00:00:00Z',
        closed_at: '2024-04-03T14:20:00Z',
        closed_by: 'Admin',
        entries_count: 67,
        total_debits: 1520000,
        total_credits: 1520000
      },
      {
        id: '4',
        name: 'Abril 2024',
        start_date: '2024-04-01',
        end_date: '2024-04-30',
        status: 'closed',
        fiscal_year: '2024',
        created_at: '2024-04-01T00:00:00Z',
        closed_at: '2024-05-02T11:45:00Z',
        closed_by: 'Admin',
        entries_count: 58,
        total_debits: 1420000,
        total_credits: 1420000
      },
      {
        id: '5',
        name: 'Mayo 2024',
        start_date: '2024-05-01',
        end_date: '2024-05-31',
        status: 'closed',
        fiscal_year: '2024',
        created_at: '2024-05-01T00:00:00Z',
        closed_at: '2024-06-04T16:30:00Z',
        closed_by: 'Admin',
        entries_count: 73,
        total_debits: 1680000,
        total_credits: 1680000
      },
      {
        id: '6',
        name: 'Junio 2024',
        start_date: '2024-06-01',
        end_date: '2024-06-30',
        status: 'closed',
        fiscal_year: '2024',
        created_at: '2024-06-01T00:00:00Z',
        closed_at: '2024-07-03T13:15:00Z',
        closed_by: 'Admin',
        entries_count: 61,
        total_debits: 1550000,
        total_credits: 1550000
      },
      {
        id: '7',
        name: 'Julio 2024',
        start_date: '2024-07-01',
        end_date: '2024-07-31',
        status: 'closed',
        fiscal_year: '2024',
        created_at: '2024-07-01T00:00:00Z',
        closed_at: '2024-08-02T10:00:00Z',
        closed_by: 'Admin',
        entries_count: 69,
        total_debits: 1620000,
        total_credits: 1620000
      },
      {
        id: '8',
        name: 'Agosto 2024',
        start_date: '2024-08-01',
        end_date: '2024-08-31',
        status: 'closed',
        fiscal_year: '2024',
        created_at: '2024-08-01T00:00:00Z',
        closed_at: '2024-09-03T15:45:00Z',
        closed_by: 'Admin',
        entries_count: 76,
        total_debits: 1750000,
        total_credits: 1750000
      },
      {
        id: '9',
        name: 'Septiembre 2024',
        start_date: '2024-09-01',
        end_date: '2024-09-30',
        status: 'closed',
        fiscal_year: '2024',
        created_at: '2024-09-01T00:00:00Z',
        closed_at: '2024-10-04T12:20:00Z',
        closed_by: 'Admin',
        entries_count: 64,
        total_debits: 1480000,
        total_credits: 1480000
      },
      {
        id: '10',
        name: 'Octubre 2024',
        start_date: '2024-10-01',
        end_date: '2024-10-31',
        status: 'closed',
        fiscal_year: '2024',
        created_at: '2024-10-01T00:00:00Z',
        closed_at: '2024-11-05T09:30:00Z',
        closed_by: 'Admin',
        entries_count: 71,
        total_debits: 1650000,
        total_credits: 1650000
      },
      {
        id: '11',
        name: 'Noviembre 2024',
        start_date: '2024-11-01',
        end_date: '2024-11-30',
        status: 'closed',
        fiscal_year: '2024',
        created_at: '2024-11-01T00:00:00Z',
        closed_at: '2024-12-03T14:15:00Z',
        closed_by: 'Admin',
        entries_count: 68,
        total_debits: 1580000,
        total_credits: 1580000
      },
      {
        id: '12',
        name: 'Diciembre 2024',
        start_date: '2024-12-01',
        end_date: '2024-12-31',
        status: 'open',
        fiscal_year: '2024',
        created_at: '2024-12-01T00:00:00Z',
        entries_count: 23,
        total_debits: 850000,
        total_credits: 850000
      },
      {
        id: '13',
        name: 'Enero 2025',
        start_date: '2025-01-01',
        end_date: '2025-01-31',
        status: 'open',
        fiscal_year: '2025',
        created_at: '2025-01-01T00:00:00Z',
        entries_count: 0,
        total_debits: 0,
        total_credits: 0
      }
    ];
    
    setPeriods(mockPeriods);
  };

  const downloadExcel = () => {
    try {
      // Crear contenido CSV
      let csvContent = 'Períodos Contables\n';
      csvContent += `Generado: ${new Date().toLocaleDateString()}\n\n`;
      csvContent += 'Período,Fecha Inicio,Fecha Fin,Año Fiscal,Estado,Asientos,Total Débitos,Total Créditos,Fecha Cierre,Cerrado Por\n';
      
      filteredPeriods.forEach(period => {
        const row = [
          `"${period.name}"`,
          new Date(period.start_date).toLocaleDateString(),
          new Date(period.end_date).toLocaleDateString(),
          period.fiscal_year,
          period.status === 'open' ? 'Abierto' : period.status === 'closed' ? 'Cerrado' : 'Bloqueado',
          period.entries_count || 0,
          `RD$${(period.total_debits || 0).toLocaleString()}`,
          `RD$${(period.total_credits || 0).toLocaleString()}`,
          period.closed_at ? new Date(period.closed_at).toLocaleDateString() : '',
          period.closed_by || ''
        ].join(',');
        csvContent += row + '\n';
      });

      // Agregar resumen
      csvContent += '\nResumen:\n';
      csvContent += `Total Períodos:,${filteredPeriods.length}\n`;
      csvContent += `Períodos Abiertos:,${filteredPeriods.filter(p => p.status === 'open').length}\n`;
      csvContent += `Períodos Cerrados:,${filteredPeriods.filter(p => p.status === 'closed').length}\n`;
      csvContent += `Períodos Bloqueados:,${filteredPeriods.filter(p => p.status === 'locked').length}\n`;
      csvContent += `Total Asientos:,${filteredPeriods.reduce((sum, p) => sum + (p.entries_count || 0), 0)}\n`;
      csvContent += `Total Débitos:,RD$${filteredPeriods.reduce((sum, p) => sum + (p.total_debits || 0), 0).toLocaleString()}\n`;
      csvContent += `Total Créditos:,RD$${filteredPeriods.reduce((sum, p) => sum + (p.total_credits || 0), 0).toLocaleString()}\n`;

      // Crear y descargar archivo
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `periodos_contables_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading Excel:', error);
      alert('Error al descargar el archivo');
    }
  };

  const validatePeriodDates = (startDate: string, endDate: string): string | null => {
    if (!startDate || !endDate) {
      return 'Debe especificar fecha de inicio y fin';
    }

    if (new Date(startDate) >= new Date(endDate)) {
      return 'La fecha de inicio debe ser anterior a la fecha de fin';
    }

    // Verificar solapamiento con períodos existentes
    const hasOverlap = periods.some(period => {
      const periodStart = new Date(period.start_date);
      const periodEnd = new Date(period.end_date);
      const newStart = new Date(startDate);
      const newEnd = new Date(endDate);

      return (newStart <= periodEnd && newEnd >= periodStart);
    });

    if (hasOverlap) {
      return 'El período se solapa con un período existente';
    }

    return null;
  };

  const handleCreatePeriod = async () => {
    if (!user) return;

    try {
      // Validar fechas
      const validationError = validatePeriodDates(formData.start_date, formData.end_date);
      if (validationError) {
        alert(validationError);
        return;
      }

      if (!formData.name.trim()) {
        alert('Debe especificar un nombre para el período');
        return;
      }

      const newPeriod: AccountingPeriod = {
        id: Date.now().toString(),
        name: formData.name,
        start_date: formData.start_date,
        end_date: formData.end_date,
        status: 'open',
        fiscal_year: formData.fiscal_year,
        created_at: new Date().toISOString(),
        entries_count: 0,
        total_debits: 0,
        total_credits: 0
      };

      try {
        const { data, error } = await supabase
          .from('accounting_periods')
          .insert([{
            user_id: user.id,
            name: newPeriod.name,
            start_date: newPeriod.start_date,
            end_date: newPeriod.end_date,
            status: newPeriod.status,
            fiscal_year: newPeriod.fiscal_year
          }])
          .select()
          .single();

        if (error) throw error;
        
        setPeriods(prev => [{ ...newPeriod, id: data.id }, ...prev]);
      } catch (supabaseError) {
        console.error('Supabase error:', supabaseError);
        // Crear localmente si Supabase falla
        setPeriods(prev => [newPeriod, ...prev]);
      }
      
      // Resetear formulario
      setFormData({
        name: '',
        start_date: '',
        end_date: '',
        fiscal_year: new Date().getFullYear().toString()
      });
      
      setShowCreateModal(false);
      alert('Período contable creado exitosamente');
    } catch (error) {
      console.error('Error creating period:', error);
      alert('Error al crear el período contable');
    }
  };

  const handleClosePeriod = async (periodId: string) => {
    if (!confirm('¿Está seguro de que desea cerrar este período? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      const updatedPeriod = {
        status: 'closed' as const,
        closed_at: new Date().toISOString(),
        closed_by: 'Admin'
      };

      try {
        const { error } = await supabase
          .from('accounting_periods')
          .update(updatedPeriod)
          .eq('id', periodId);

        if (error) throw error;
      } catch (supabaseError) {
        console.error('Supabase error:', supabaseError);
      }

      setPeriods(prev => prev.map(period => 
        period.id === periodId 
          ? { ...period, ...updatedPeriod }
          : period
      ));
      alert('Período cerrado exitosamente');
    } catch (error) {
      console.error('Error closing period:', error);
      alert('Error al cerrar el período');
    }
  };

  const handleLockPeriod = async (periodId: string) => {
    if (!confirm('¿Está seguro de que desea bloquear este período? No se podrán realizar más cambios.')) {
      return;
    }

    try {
      const updatedPeriod = { status: 'locked' as const };

      try {
        const { error } = await supabase
          .from('accounting_periods')
          .update(updatedPeriod)
          .eq('id', periodId);

        if (error) throw error;
      } catch (supabaseError) {
        console.error('Supabase error:', supabaseError);
      }

      setPeriods(prev => prev.map(period => 
        period.id === periodId 
          ? { ...period, ...updatedPeriod }
          : period
      ));
      alert('Período bloqueado exitosamente');
    } catch (error) {
      console.error('Error locking period:', error);
      alert('Error al bloquear el período');
    }
  };

  const handleReopenPeriod = async (periodId: string) => {
    if (!confirm('¿Está seguro de que desea reabrir este período?')) {
      return;
    }

    try {
      const updatedPeriod = { 
        status: 'open' as const,
        closed_at: null,
        closed_by: null
      };

      try {
        const { error } = await supabase
          .from('accounting_periods')
          .update(updatedPeriod)
          .eq('id', periodId);

        if (error) throw error;
      } catch (supabaseError) {
        console.error('Supabase error:', supabaseError);
      }

      setPeriods(prev => prev.map(period => 
        period.id === periodId 
          ? { ...period, ...updatedPeriod }
          : period
      ));
      alert('Período reabierto exitosamente');
    } catch (error) {
      console.error('Error reopening period:', error);
      alert('Error al reabrir el período');
    }
  };

  const filteredPeriods = periods.filter(period => {
    const matchesSearch = period.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || period.status === statusFilter;
    const matchesYear = !yearFilter || period.fiscal_year === yearFilter;
    
    return matchesSearch && matchesStatus && matchesYear;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-green-100 text-green-800';
      case 'closed':
        return 'bg-yellow-100 text-yellow-800';
      case 'locked':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'open':
        return 'Abierto';
      case 'closed':
        return 'Cerrado';
      case 'locked':
        return 'Bloqueado';
      default:
        return 'Desconocido';
    }
  };

  const uniqueYears = [...new Set(periods.map(p => p.fiscal_year))].sort().reverse();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header con botón de regreso */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/accounting')}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <i className="ri-arrow-left-line"></i>
            Volver a Contabilidad
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Períodos Contables</h1>
            <p className="text-gray-600">Gestión de períodos fiscales</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <i className="ri-add-line"></i>
          Nuevo Período
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <i className="ri-calendar-check-line text-2xl text-green-600"></i>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Períodos Abiertos</p>
              <p className="text-2xl font-bold text-gray-900">
                {periods.filter(p => p.status === 'open').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <i className="ri-calendar-close-line text-2xl text-yellow-600"></i>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Períodos Cerrados</p>
              <p className="text-2xl font-bold text-gray-900">
                {periods.filter(p => p.status === 'closed').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <i className="ri-lock-line text-2xl text-red-600"></i>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Períodos Bloqueados</p>
              <p className="text-2xl font-bold text-gray-900">
                {periods.filter(p => p.status === 'locked').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <i className="ri-file-list-3-line text-2xl text-blue-600"></i>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Asientos</p>
              <p className="text-2xl font-bold text-gray-900">
                {periods.reduce((sum, p) => sum + (p.entries_count || 0), 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <i className="ri-calendar-line text-2xl text-purple-600"></i>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Año Fiscal Actual</p>
              <p className="text-2xl font-bold text-gray-900">
                {new Date().getFullYear()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative">
                <i className="ri-search-line absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                <input
                  type="text"
                  placeholder="Buscar períodos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-8"
              >
                <option value="all">Todos los estados</option>
                <option value="open">Abiertos</option>
                <option value="closed">Cerrados</option>
                <option value="locked">Bloqueados</option>
              </select>
              
              <select
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-8"
              >
                <option value="">Todos los años</option>
                {uniqueYears.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Periods Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Período
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha Inicio
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha Fin
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Año Fiscal
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Asientos
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Movimientos
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPeriods.map((period) => (
                <tr key={period.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {period.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(period.start_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(period.end_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {period.fiscal_year}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(period.status)}`}>
                      {getStatusText(period.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {period.entries_count || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    RD${((period.total_debits || 0) + (period.total_credits || 0)).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setSelectedPeriod(period)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Ver detalles"
                      >
                        <i className="ri-eye-line"></i>
                      </button>
                      
                      {period.status === 'open' && (
                        <button
                          onClick={() => handleClosePeriod(period.id)}
                          className="text-yellow-600 hover:text-yellow-900"
                          title="Cerrar período"
                        >
                          <i className="ri-calendar-close-line"></i>
                        </button>
                      )}
                      
                      {period.status === 'closed' && (
                        <>
                          <button
                            onClick={() => handleLockPeriod(period.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Bloquear período"
                          >
                            <i className="ri-lock-line"></i>
                          </button>
                          <button
                            onClick={() => handleReopenPeriod(period.id)}
                            className="text-green-600 hover:text-green-900"
                            title="Reabrir período"
                          >
                            <i className="ri-calendar-check-line"></i>
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Period Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Nuevo Período Contable</h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <i className="ri-close-line text-2xl"></i>
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre del Período
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ej: Enero 2025"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fecha de Inicio
                  </label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fecha de Fin
                  </label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Año Fiscal
                  </label>
                  <input
                    type="number"
                    value={formData.fiscal_year}
                    onChange={(e) => setFormData(prev => ({ ...prev, fiscal_year: e.target.value }))}
                    min="2020"
                    max="2030"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-4 mt-6">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreatePeriod}
                  disabled={!formData.name || !formData.start_date || !formData.end_date}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  Crear Período
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Period Detail Modal */}
      {selectedPeriod && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  Detalles del Período: {selectedPeriod.name}
                </h2>
                <button
                  onClick={() => setSelectedPeriod(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <i className="ri-close-line text-2xl"></i>
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Información General</h3>
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm font-medium text-gray-500">Período:</span>
                      <span className="ml-2 text-sm text-gray-900">{selectedPeriod.name}</span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Fecha Inicio:</span>
                      <span className="ml-2 text-sm text-gray-900">
                        {new Date(selectedPeriod.start_date).toLocaleDateString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Fecha Fin:</span>
                      <span className="ml-2 text-sm text-gray-900">
                        {new Date(selectedPeriod.end_date).toLocaleDateString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Año Fiscal:</span>
                      <span className="ml-2 text-sm text-gray-900">{selectedPeriod.fiscal_year}</span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Estado:</span>
                      <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedPeriod.status)}`}>
                        {getStatusText(selectedPeriod.status)}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Estadísticas del Período</h3>
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm font-medium text-gray-500">Total Asientos:</span>
                      <span className="ml-2 text-sm font-bold text-gray-900">
                        {selectedPeriod.entries_count || 0}
                      </span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Total Débitos:</span>
                      <span className="ml-2 text-sm font-bold text-green-600">
                        RD${(selectedPeriod.total_debits || 0).toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Total Créditos:</span>
                      <span className="ml-2 text-sm font-bold text-red-600">
                        RD${(selectedPeriod.total_credits || 0).toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Creado:</span>
                      <span className="ml-2 text-sm text-gray-900">
                        {new Date(selectedPeriod.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    {selectedPeriod.closed_at && (
                      <>
                        <div>
                          <span className="text-sm font-medium text-gray-500">Cerrado:</span>
                          <span className="ml-2 text-sm text-gray-900">
                            {new Date(selectedPeriod.closed_at).toLocaleDateString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-500">Cerrado por:</span>
                          <span className="ml-2 text-sm text-gray-900">{selectedPeriod.closed_by}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <div className="flex justify-between">
                  <div className="space-x-2">
                    {selectedPeriod.status === 'open' && (
                      <button
                        onClick={() => {
                          handleClosePeriod(selectedPeriod.id);
                          setSelectedPeriod(null);
                        }}
                        className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                      >
                        <i className="ri-calendar-close-line mr-2"></i>
                        Cerrar Período
                      </button>
                    )}
                    
                    {selectedPeriod.status === 'closed' && (
                      <>
                        <button
                          onClick={() => {
                            handleLockPeriod(selectedPeriod.id);
                            setSelectedPeriod(null);
                          }}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                        >
                          <i className="ri-lock-line mr-2"></i>
                          Bloquear Período
                        </button>
                        <button
                          onClick={() => {
                            handleReopenPeriod(selectedPeriod.id);
                            setSelectedPeriod(null);
                          }}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                          <i className="ri-calendar-check-line mr-2"></i>
                          Reabrir Período
                        </button>
                      </>
                    )}
                  </div>
                  
                  <button
                    onClick={() => setSelectedPeriod(null)}
                    className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountingPeriodsPage;
