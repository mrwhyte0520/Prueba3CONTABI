import { useState } from 'react';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import { toast } from 'sonner';

interface Bank {
  id: string;
  name: string;
  account_number: string;
  account_type: string;
  balance: number;
  currency: string;
  is_active: boolean;
  bank_code: string;
  swift_code?: string;
  contact_info?: string;
  created_at: string;
}

export default function BanksPage() {
  // Datos de ejemplo
  const [banks, setBanks] = useState<Bank[]>([
    {
      id: '1',
      name: 'Banco Popular',
      account_number: '1234567890',
      account_type: 'checking',
      balance: 50000,
      currency: 'DOP',
      is_active: true,
      bank_code: 'BPDO',
      swift_code: 'BPDODOSX',
      contact_info: 'contacto@bancopopular.com',
      created_at: new Date().toISOString()
    }
  ]);
  
  const [showBankModal, setShowBankModal] = useState(false);

  // Función para formatear moneda
  const formatCurrency = (value: number, currency: string = 'DOP') => {
    return new Intl.NumberFormat('es-DO', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2
    }).format(value);
  };

  // Función para manejar el envío del formulario
  const handleSubmitBank = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    
    const newBank: Bank = {
      id: Date.now().toString(),
      name: formData.get('name') as string,
      account_number: formData.get('account_number') as string,
      account_type: formData.get('account_type') as string,
      balance: parseFloat(formData.get('balance') as string) || 0,
      currency: formData.get('currency') as string || 'DOP',
      is_active: true,
      bank_code: formData.get('bank_code') as string,
      swift_code: formData.get('swift_code') as string || '',
      contact_info: formData.get('contact_info') as string || '',
      created_at: new Date().toISOString()
    };

    // Agregar el nuevo banco al estado local
    setBanks(prev => [newBank, ...prev]);
    setShowBankModal(false);
    form.reset();
    toast.success('Banco agregado correctamente (modo demo)');
  };

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gestión Bancaria</h1>
            <p className="text-gray-600 mt-1">Bancos registrados</p>
          </div>
          <button
            onClick={() => setShowBankModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Agregar Banco
          </button>
        </div>

        {/* Lista de Bancos */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Banco</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Número de Cuenta</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Saldo</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {banks.map((bank) => (
                  <tr key={bank.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 font-medium">{bank.name.charAt(0)}</span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{bank.name}</div>
                          <div className="text-sm text-gray-500">{bank.bank_code}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{bank.account_number}</div>
                      <div className="text-sm text-gray-500">{bank.swift_code || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        bank.account_type === 'checking' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {bank.account_type === 'checking' ? 'Corriente' : 'Ahorros'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="text-gray-900">{formatCurrency(bank.balance, bank.currency)}</div>
                      <div className="text-gray-500 text-xs">{bank.currency}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal para agregar banco */}
        {showBankModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">Nuevo Banco</h2>
                  <button
                    onClick={() => setShowBankModal(false)}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <span className="sr-only">Cerrar</span>
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <form onSubmit={handleSubmitBank} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nombre del Banco *
                      </label>
                      <input
                        type="text"
                        name="name"
                        required
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Ej: Banco Popular"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Número de Cuenta *
                      </label>
                      <input
                        type="text"
                        name="account_number"
                        required
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Ej: 1234567890"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tipo de Cuenta *
                      </label>
                      <select
                        name="account_type"
                        required
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-8"
                        defaultValue="checking"
                      >
                        <option value="checking">Cuenta Corriente</option>
                        <option value="savings">Cuenta de Ahorros</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Moneda *
                      </label>
                      <select
                        name="currency"
                        required
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-8"
                        defaultValue="DOP"
                      >
                        <option value="DOP">Peso Dominicano (DOP)</option>
                        <option value="USD">Dólar Estadounidense (USD)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Saldo Inicial *
                      </label>
                      <input
                        type="number"
                        name="balance"
                        step="0.01"
                        min="0"
                        required
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Código del Banco *
                      </label>
                      <input
                        type="text"
                        name="bank_code"
                        required
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Ej: BPDO"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Código SWIFT/BIC
                      </label>
                      <input
                        type="text"
                        name="swift_code"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Ej: BPDODOSX"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Información de Contacto
                      </label>
                      <input
                        type="email"
                        name="contact_info"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Ej: contacto@bancopopular.com"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3 pt-6">
                    <button
                      type="button"
                      onClick={() => setShowBankModal(false)}
                      className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Guardar Banco
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
