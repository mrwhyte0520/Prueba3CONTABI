
import { RouteObject } from 'react-router-dom';
import { lazy } from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';

import TaxConfigurationPage from '../pages/taxes/configuration/page';
import NcfManagementPage from '../pages/taxes/ncf/page';
import FiscalSeriesPage from '../pages/taxes/fiscal-series/page';
import Report606Page from '../pages/taxes/report-606/page';
import Report607Page from '../pages/taxes/report-607/page';
import Report608Page from '../pages/taxes/report-608/page';
import Report623Page from '../pages/taxes/report-623/page';
import ReportIT1Page from '../pages/taxes/report-it1/page';
import ReportIR17Page from '../pages/taxes/report-ir17/page';
import Formulario607Page from '../pages/taxes/formulario-607/page';

// Payroll routes
import PayrollPage from '../pages/payroll/page';
import PayrollConfigurationPage from '../pages/payroll/configuration/page';
import PayrollEmployeesPage from '../pages/payroll/employees/page';
import PayrollEmployeeTypesPage from '../pages/payroll/employee-types/page';
import PayrollDepartmentsPage from '../pages/payroll/departments/page';
import PayrollPositionsPage from '../pages/payroll/positions/page';
import PayrollSalaryTypesPage from '../pages/payroll/salary-types/page';
import PayrollConceptsPage from '../pages/payroll/concepts/page';
import PayrollPeriodsPage from '../pages/payroll/periods/page';
import PayrollCommissionTypesPage from '../pages/payroll/commission-types/page';
import PayrollVacationsPage from '../pages/payroll/vacations/page';
import PayrollOvertimePage from '../pages/payroll/overtime/page';
import PayrollHolidaysPage from '../pages/payroll/holidays/page';
import PayrollBonusesPage from '../pages/payroll/bonuses/page';
import PayrollRoyaltiesPage from '../pages/payroll/royalties/page';

const HomePage = lazy(() => import('../pages/home/page'));
const DashboardPage = lazy(() => import('../pages/dashboard/page'));
const AccountingPage = lazy(() => import('../pages/accounting/page'));
const ChartAccountsPage = lazy(() => import('../pages/accounting/chart-accounts/page'));

// Accounting Sub-pages
const BanksPage = lazy(() => import('../pages/accounting/banks/page'));
const BankReconciliationPage = lazy(() => import('../pages/accounting/bank-reconciliation/page'));
const PettyCashPage = lazy(() => import('../pages/accounting/petty-cash/page'));
const FinancialStatementsPage = lazy(() => import('../pages/accounting/financial-statements/page'));
const GeneralJournalPage = lazy(() => import('../pages/accounting/general-journal/page'));
const GeneralLedgerPage = lazy(() => import('../pages/accounting/general-ledger/page'));
const AccountingPeriodsPage = lazy(() => import('../pages/accounting/periods/page'));

const POSPage = lazy(() => import('../pages/pos/page'));
const ProductsPage = lazy(() => import('../pages/products/page'));
const InventoryPage = lazy(() => import('../pages/inventory/page'));
const FixedAssetsPage = lazy(() => import('../pages/fixed-assets/page'));
const AccountsReceivablePage = lazy(() => import('../pages/accounts-receivable/page'));
const AccountsPayablePage = lazy(() => import('../pages/accounts-payable/page'));
const BillingPage = lazy(() => import('../pages/billing/page'));
const TaxesPage = lazy(() => import('../pages/taxes/page'));
const PlansPage = lazy(() => import('../pages/plans/page'));
const ProfilePage = lazy(() => import('../pages/profile/page'));
const LoginPage = lazy(() => import('../pages/auth/login'));
const RegisterPage = lazy(() => import('../pages/auth/register'));
const ResetPasswordPage = lazy(() => import('../pages/auth/reset-password'));
const NotFoundPage = lazy(() => import('../pages/NotFound'));

// Settings Pages
const SettingsPage = lazy(() => import('../pages/settings/page'));
const CompanySettingsPage = lazy(() => import('../pages/settings/company/page'));
const UsersSettingsPage = lazy(() => import('../pages/settings/users/page'));
const AccountingSettingsPage = lazy(() => import('../pages/settings/accounting/page'));
const TaxSettingsPage = lazy(() => import('../pages/settings/taxes/page'));
const InventorySettingsPage = lazy(() => import('../pages/settings/inventory/page'));
const PayrollSettingsPage = lazy(() => import('../pages/settings/payroll/page'));
const BackupSettingsPage = lazy(() => import('../pages/settings/backup/page'));
const IntegrationsSettingsPage = lazy(() => import('../pages/settings/integrations/page'));

// Billing Pages
const SalesReportsPage = lazy(() => import('../pages/billing/sales-reports/page'));
const InvoicingPage = lazy(() => import('../pages/billing/invoicing/page'));
const PreInvoicingPage = lazy(() => import('../pages/billing/pre-invoicing/page'));
const RecurringBillingPage = lazy(() => import('../pages/billing/recurring/page'));
const CashClosingPage = lazy(() => import('../pages/billing/cash-closing/page'));
const QuotesPage = lazy(() => import('../pages/billing/quotes/page'));

// Accounts Payable Pages
const APReportsPage = lazy(() => import('../pages/accounts-payable/reports/page'));
const SuppliersPage = lazy(() => import('../pages/accounts-payable/suppliers/page'));
const PaymentsPage = lazy(() => import('../pages/accounts-payable/payments/page'));
const PurchaseOrdersPage = lazy(() => import('../pages/accounts-payable/purchase-orders/page'));
const APQuotesPage = lazy(() => import('../pages/accounts-payable/quotes/page'));
const AdvancesPage = lazy(() => import('../pages/accounts-payable/advances/page'));

// Accounts Receivable Pages
const ARInvoicesPage = lazy(() => import('../pages/accounts-receivable/invoices/page'));
const ARCustomersPage = lazy(() => import('../pages/accounts-receivable/customers/page'));
const ARPaymentsPage = lazy(() => import('../pages/accounts-receivable/payments/page'));
const ARReportsPage = lazy(() => import('../pages/accounts-receivable/reports/page'));
const ARReceiptsPage = lazy(() => import('../pages/accounts-receivable/receipts/page'));
const ARAdvancesPage = lazy(() => import('../pages/accounts-receivable/advances/page'));
const ARCreditNotesPage = lazy(() => import('../pages/accounts-receivable/credit-notes/page'));
const ARDebitNotesPage = lazy(() => import('../pages/accounts-receivable/debit-notes/page'));

// Fixed Assets Pages
const AssetRegisterPage = lazy(() => import('../pages/fixed-assets/register/page'));
const AssetTypesPage = lazy(() => import('../pages/fixed-assets/types/page'));
const DepreciationPage = lazy(() => import('../pages/fixed-assets/depreciation/page'));
const RevaluationPage = lazy(() => import('../pages/fixed-assets/revaluation/page'));
const AssetDisposalPage = lazy(() => import('../pages/fixed-assets/disposal/page'));

const routes: RouteObject[] = [
  {
    path: '/',
    element: <HomePage />
  },
  {
    path: '/dashboard',
    element: <DashboardPage />
  },
  {
    path: '/profile',
    element: <ProfilePage />
  },
  {
    path: '/accounting',
    element: <AccountingPage />
  },
  {
    path: '/accounting/chart-accounts',
    element: <ChartAccountsPage />
  },
  // Accounting Sub-routes
  {
    path: '/accounting/banks',
    element: <BanksPage />
  },
  {
    path: '/accounting/bank-reconciliation',
    element: <BankReconciliationPage />
  },
  {
    path: '/accounting/petty-cash',
    element: <PettyCashPage />
  },
  {
    path: '/accounting/financial-statements',
    element: <FinancialStatementsPage />
  },
  {
    path: '/accounting/general-journal',
    element: <GeneralJournalPage />
  },
  {
    path: '/accounting/general-ledger',
    element: <GeneralLedgerPage />
  },
  {
    path: '/accounting/periods',
    element: <AccountingPeriodsPage />
  },
  {
    path: '/payroll',
    element: <PayrollPage />
  },
  {
    path: '/payroll/configuration',
    element: <PayrollConfigurationPage />
  },
  {
    path: '/payroll/employees',
    element: <PayrollEmployeesPage />
  },
  {
    path: '/payroll/employee-types',
    element: <PayrollEmployeeTypesPage />
  },
  {
    path: '/payroll/departments',
    element: <PayrollDepartmentsPage />
  },
  {
    path: '/payroll/positions',
    element: <PayrollPositionsPage />
  },
  {
    path: '/payroll/salary-types',
    element: <PayrollSalaryTypesPage />
  },
  {
    path: '/payroll/concepts',
    element: <PayrollConceptsPage />
  },
  {
    path: '/payroll/periods',
    element: <PayrollPeriodsPage />
  },
  {
    path: '/payroll/commission-types',
    element: <PayrollCommissionTypesPage />
  },
  {
    path: '/payroll/vacations',
    element: <PayrollVacationsPage />
  },
  {
    path: '/payroll/overtime',
    element: <PayrollOvertimePage />
  },
  {
    path: '/payroll/holidays',
    element: <PayrollHolidaysPage />
  },
  {
    path: '/payroll/bonuses',
    element: <PayrollBonusesPage />
  },
  {
    path: '/payroll/royalties',
    element: <PayrollRoyaltiesPage />
  },
  {
    path: '/pos',
    element: <POSPage />
  },
  {
    path: '/products',
    element: <ProductsPage />
  },
  {
    path: '/inventory',
    element: <InventoryPage />
  },
  {
    path: '/fixed-assets',
    element: <FixedAssetsPage />
  },
  // Fixed Assets Sub-routes
  {
    path: '/fixed-assets/register',
    element: <AssetRegisterPage />
  },
  {
    path: '/fixed-assets/types',
    element: <AssetTypesPage />
  },
  {
    path: '/fixed-assets/depreciation',
    element: <DepreciationPage />
  },
  {
    path: '/fixed-assets/revaluation',
    element: <RevaluationPage />
  },
  {
    path: '/fixed-assets/disposal',
    element: <AssetDisposalPage />
  },
  {
    path: '/accounts-receivable',
    element: <AccountsReceivablePage />
  },
  // Accounts Receivable Sub-routes
  {
    path: '/accounts-receivable/invoices',
    element: <ARInvoicesPage />
  },
  {
    path: '/accounts-receivable/customers',
    element: <ARCustomersPage />
  },
  {
    path: '/accounts-receivable/payments',
    element: <ARPaymentsPage />
  },
  {
    path: '/accounts-receivable/reports',
    element: <ARReportsPage />
  },
  {
    path: '/accounts-receivable/receipts',
    element: <ARReceiptsPage />
  },
  {
    path: '/accounts-receivable/advances',
    element: <ARAdvancesPage />
  },
  {
    path: '/accounts-receivable/credit-notes',
    element: <ARCreditNotesPage />
  },
  {
    path: '/accounts-receivable/debit-notes',
    element: <ARDebitNotesPage />
  },
  {
    path: '/accounts-payable',
    element: <AccountsPayablePage />
  },
  // Accounts Payable Sub-routes
  {
    path: '/accounts-payable/reports',
    element: <APReportsPage />
  },
  {
    path: '/accounts-payable/suppliers',
    element: <SuppliersPage />
  },
  {
    path: '/accounts-payable/payments',
    element: <PaymentsPage />
  },
  {
    path: '/accounts-payable/purchase-orders',
    element: <PurchaseOrdersPage />
  },
  {
    path: '/accounts-payable/quotes',
    element: <APQuotesPage />
  },
  {
    path: '/accounts-payable/advances',
    element: <AdvancesPage />
  },
  {
    path: '/billing',
    element: <BillingPage />
  },
  // Billing Sub-routes
  {
    path: '/billing/sales-reports',
    element: <SalesReportsPage />
  },
  {
    path: '/billing/invoicing',
    element: <InvoicingPage />
  },
  {
    path: '/billing/pre-invoicing',
    element: <PreInvoicingPage />
  },
  {
    path: '/billing/recurring',
    element: <RecurringBillingPage />
  },
  {
    path: '/billing/cash-closing',
    element: <CashClosingPage />
  },
  {
    path: '/billing/quotes',
    element: <QuotesPage />
  },
  {
    path: '/taxes',
    element: <TaxesPage />
  },
  {
    path: '/taxes/configuration',
    element: <TaxConfigurationPage />
  },
  {
    path: '/taxes/ncf',
    element: <NcfManagementPage />
  },
  {
    path: '/taxes/fiscal-series',
    element: <FiscalSeriesPage />
  },
  {
    path: '/taxes/report-606',
    element: <Report606Page />
  },
  {
    path: '/taxes/report-607',
    element: <Report607Page />
  },
  {
    path: '/taxes/report-608',
    element: <Report608Page />
  },
  {
    path: '/taxes/report-623',
    element: <Report623Page />
  },
  {
    path: '/taxes/report-it1',
    element: <ReportIT1Page />
  },
  {
    path: '/taxes/report-ir17',
    element: <ReportIR17Page />
  },
  {
    path: '/taxes/formulario-607',
    element: <DashboardLayout><Formulario607Page /></DashboardLayout>
  },
  {
    path: '/plans',
    element: <PlansPage />
  },
  // Settings Routes
  {
    path: '/settings',
    element: <SettingsPage />
  },
  {
    path: '/settings/company',
    element: <CompanySettingsPage />
  },
  {
    path: '/settings/users',
    element: <UsersSettingsPage />
  },
  {
    path: '/settings/accounting',
    element: <AccountingSettingsPage />
  },
  {
    path: '/settings/taxes',
    element: <TaxSettingsPage />
  },
  {
    path: '/settings/inventory',
    element: <InventorySettingsPage />
  },
  {
    path: '/settings/payroll',
    element: <PayrollSettingsPage />
  },
  {
    path: '/settings/backup',
    element: <BackupSettingsPage />
  },
  {
    path: '/settings/integrations',
    element: <IntegrationsSettingsPage />
  },
  // Auth Routes
  {
    path: '/auth/login',
    element: <LoginPage />
  },
  {
    path: '/auth/register',
    element: <RegisterPage />
  },
  {
    path: '/auth/reset-password',
    element: <ResetPasswordPage />
  },
  {
    path: '*',
    element: <NotFoundPage />
  }
];

export default routes;
