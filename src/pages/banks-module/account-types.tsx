import DashboardLayout from '../../components/layout/DashboardLayout';

export default function BankAccountTypesPage() {
  return (
    <DashboardLayout>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Tipos de Cuenta</h1>
        <p className="text-gray-600 text-sm">Pantalla para administrar los tipos de cuenta bancaria.</p>
      </div>
    </DashboardLayout>
  );
}
