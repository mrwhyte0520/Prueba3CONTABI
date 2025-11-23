import DashboardLayout from '../../components/layout/DashboardLayout';

export default function BanksModuleHome() {
  return (
    <DashboardLayout>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Módulo de Bancos</h1>
        <p className="text-gray-600 text-sm">
          Seleccione una opción del submenú de Bancos en la barra lateral para comenzar.
        </p>
      </div>
    </DashboardLayout>
  );
}
