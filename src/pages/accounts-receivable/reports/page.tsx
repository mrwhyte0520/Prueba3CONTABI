import { useEffect, useState } from 'react';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import { useAuth } from '../../../hooks/useAuth';
import { customersService, invoicesService, receiptsService, creditDebitNotesService, customerAdvancesService } from '../../../services/database';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface ReportCustomer {
  id: string;
  name: string;
  currentBalance: number;
  creditLimit: number;
  status: 'Activo' | 'Inactivo' | 'Bloqueado';
}

interface ReportInvoice {
  id: string;
  customerId: string;
  customerName: string;
  invoiceNumber: string;
  amount: number;
  balance: number;
  daysOverdue: number;
  dueDate: string;
}

interface ReportPayment {
  id: string;
  customerName: string;
  amount: number;
  paymentMethod: string;
  date: string;
}

interface ReportNote {
  id: string;
  customerId: string;
  customerName: string;
  type: 'credit' | 'debit';
  noteNumber: string;
  date: string;
  amount: number;
  appliedAmount: number;
  balance: number;
}

interface ReportAdvance {
  id: string;
  customerId: string;
  customerName: string;
  advanceNumber: string;
  date: string;
  amount: number;
  appliedAmount: number;
  balance: number;
}

export default function ReportsPage() {
  const { user } = useAuth();
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [customers, setCustomers] = useState<ReportCustomer[]>([]);
  const [invoices, setInvoices] = useState<ReportInvoice[]>([]);
  const [payments, setPayments] = useState<ReportPayment[]>([]);
   const [creditNotes, setCreditNotes] = useState<ReportNote[]>([]);
   const [debitNotes, setDebitNotes] = useState<ReportNote[]>([]);
   const [advances, setAdvances] = useState<ReportAdvance[]>([]);

  useEffect(() => {
    const loadData = async () => {
      if (!user?.id) return;
      try {
        const [customerRows, invoiceRows, receiptRows, creditRows, debitRows, advanceRows] = await Promise.all([
          customersService.getAll(user.id),
          invoicesService.getAll(user.id),
          receiptsService.getAll(user.id),
          creditDebitNotesService.getAll(user.id, 'credit'),
          creditDebitNotesService.getAll(user.id, 'debit'),
          customerAdvancesService.getAll(user.id),
        ]);

        const mappedCustomers: ReportCustomer[] = (customerRows || []).map((c: any) => ({
          id: c.id,
          name: c.name,
          currentBalance: Number(c.currentBalance ?? c.current_balance ?? 0),
          creditLimit: Number(c.creditLimit ?? c.credit_limit ?? 0),
          status: (c.status === 'inactive'
            ? 'Inactivo'
            : c.status === 'blocked'
              ? 'Bloqueado'
              : 'Activo') as ReportCustomer['status'],
        }));

        const mappedInvoices: ReportInvoice[] = (invoiceRows || []).map((inv: any) => {
          const total = Number(inv.total_amount) || 0;
          const paid = Number(inv.paid_amount) || 0;
          const balance = total - paid;
          const today = new Date();
          const due = inv.due_date ? new Date(inv.due_date) : null;
          let daysOverdue = 0;
          if (due && balance > 0) {
            const diff = Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
            daysOverdue = diff > 0 ? diff : 0;
          }
          return {
            id: String(inv.id),
            customerId: String(inv.customer_id),
            customerName: (inv.customers as any)?.name || 'Cliente',
            invoiceNumber: inv.invoice_number as string,
            amount: total,
            balance,
            daysOverdue,
            dueDate: (inv.due_date as string) || '',
          };
        });

        const mappedPayments: ReportPayment[] = (receiptRows || []).map((r: any) => ({
          id: String(r.id),
          customerName: (r.customers as any)?.name || 'Cliente',
          amount: Number(r.amount) || 0,
          paymentMethod: String(r.payment_method || 'cash'),
          date: (r.receipt_date as string) || '',
        }));

        const mapNoteRows = (rows: any[], type: 'credit' | 'debit'): ReportNote[] => {
          return (rows || []).map((n: any) => {
            const amount = Number(n.total_amount) || 0;
            const dbApplied = Number((n as any).applied_amount) || 0;
            const dbBalance = Number((n as any).balance_amount);
            let appliedAmount = dbApplied;
            let balance = Number.isFinite(dbBalance) ? dbBalance : amount - appliedAmount;
            if (n.status === 'cancelled') {
              appliedAmount = 0;
              balance = 0;
            }
            return {
              id: String(n.id),
              customerId: String(n.customer_id),
              customerName: (n.customers as any)?.name || 'Cliente',
              type,
              noteNumber: n.note_number as string,
              date: n.note_date as string,
              amount,
              appliedAmount,
              balance,
            };
          });
        };

        const mappedCreditNotes = mapNoteRows(creditRows as any[], 'credit');
        const mappedDebitNotes = mapNoteRows(debitRows as any[], 'debit');

        const mappedAdvances: ReportAdvance[] = (advanceRows || []).map((a: any) => {
          const amount = Number(a.amount) || 0;
          const applied = Number(a.applied_amount) || 0;
          const balance = Number(a.balance_amount);
          return {
            id: String(a.id),
            customerId: String(a.customer_id),
            customerName: (a.customers as any)?.name || 'Cliente',
            advanceNumber: a.advance_number as string,
            date: a.advance_date as string,
            amount,
            appliedAmount: applied,
            balance: Number.isFinite(balance) ? balance : amount - applied,
          };
        });

        setCustomers(mappedCustomers);
        setInvoices(mappedInvoices);
        setPayments(mappedPayments);
        setCreditNotes(mappedCreditNotes);
        setDebitNotes(mappedDebitNotes);
        setAdvances(mappedAdvances);
      } catch (error) {
        // Si hay error, dejar arrays vacíos; los reportes simplemente saldrán en blanco
        console.error('Error loading AR reports data:', error);
        setCustomers([]);
        setInvoices([]);
        setPayments([]);
        setCreditNotes([]);
        setDebitNotes([]);
        setAdvances([]);
      }
    };

    loadData();
  }, [user?.id]);

  const handleGenerateAgingReport = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text('Reporte de Antigüedad de Saldos', 20, 20);
    
    doc.setFontSize(12);
    doc.text(`Fecha de generación: ${new Date().toLocaleDateString()}`, 20, 40);
    
    // Análisis por períodos
    const agingData = customers.map(customer => {
      const customerInvoices = invoices.filter(inv => inv.customerId === customer.id && inv.balance > 0);
      const current = customerInvoices.filter(inv => inv.daysOverdue === 0).reduce((sum, inv) => sum + inv.balance, 0);
      const days1to30 = customerInvoices.filter(inv => inv.daysOverdue >= 1 && inv.daysOverdue <= 30).reduce((sum, inv) => sum + inv.balance, 0);
      const days31to60 = customerInvoices.filter(inv => inv.daysOverdue >= 31 && inv.daysOverdue <= 60).reduce((sum, inv) => sum + inv.balance, 0);
      const days61to90 = customerInvoices.filter(inv => inv.daysOverdue >= 61 && inv.daysOverdue <= 90).reduce((sum, inv) => sum + inv.balance, 0);
      const over90 = customerInvoices.filter(inv => inv.daysOverdue > 90).reduce((sum, inv) => sum + inv.balance, 0);
      
      return [
        customer.name,
        `RD$ ${current.toLocaleString()}`,
        `RD$ ${days1to30.toLocaleString()}`,
        `RD$ ${days31to60.toLocaleString()}`,
        `RD$ ${days61to90.toLocaleString()}`,
        `RD$ ${over90.toLocaleString()}`,
        `RD$ ${customer.currentBalance.toLocaleString()}`
      ];
    });
    
    (doc as any).autoTable({
      startY: 60,
      head: [['Cliente', 'Corriente', '1-30 días', '31-60 días', '61-90 días', '+90 días', 'Total']],
      body: agingData,
      theme: 'striped',
      headStyles: { fillColor: [239, 68, 68] },
      styles: { fontSize: 8 }
    });
    
    doc.save(`antiguedad-saldos-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handleGenerateStatementReport = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text('Estados de Cuenta por Cliente', 20, 20);
    
    doc.setFontSize(12);
    doc.text(`Fecha de generación: ${new Date().toLocaleDateString()}`, 20, 40);
    
    let currentY = 60;
    
    customers.forEach((customer, index) => {
      if (index > 0) {
        doc.addPage();
        currentY = 20;
      }
      
      doc.setFontSize(16);
      doc.text(`Estado de Cuenta - ${customer.name}`, 20, currentY);
      currentY += 20;
      
      const customerInvoices = invoices.filter(inv => inv.customerId === customer.id);
      const customerPayments = payments.filter(pay => pay.customerName === customer.name);
      const customerCreditNotes = creditNotes.filter(n => n.customerId === customer.id && n.balance > 0);
      const customerDebitNotes = debitNotes.filter(n => n.customerId === customer.id && n.balance > 0);
      const customerAdvances = advances.filter(a => a.customerId === customer.id && a.balance > 0);
      
      // Facturas
      if (customerInvoices.length > 0) {
        doc.setFontSize(14);
        doc.text('Facturas:', 20, currentY);
        currentY += 10;
        
        const invoiceData = customerInvoices.map(inv => [
          inv.invoiceNumber,
          `RD$ ${inv.amount.toLocaleString()}`,
          `RD$ ${inv.balance.toLocaleString()}`,
          inv.daysOverdue > 0 ? `${inv.daysOverdue} días` : 'Al día'
        ]);
        
        (doc as any).autoTable({
          startY: currentY,
          head: [['Factura', 'Monto', 'Saldo', 'Estado']],
          body: invoiceData,
          theme: 'grid',
          styles: { fontSize: 9 }
        });
        
        currentY = (doc as any).lastAutoTable.finalY + 20;
      }
      
      // Pagos
      if (customerPayments.length > 0) {
        doc.setFontSize(14);
        doc.text('Pagos Recibidos:', 20, currentY);
        currentY += 10;
        
        const paymentData = customerPayments.map(pay => [
          pay.date,
          `RD$ ${pay.amount.toLocaleString()}`,
          pay.paymentMethod === 'transfer' ? 'Transferencia' :
          pay.paymentMethod === 'check' ? 'Cheque' :
          pay.paymentMethod === 'cash' ? 'Efectivo' : 'Tarjeta'
        ]);
        
        (doc as any).autoTable({
          startY: currentY,
          head: [['Fecha', 'Monto', 'Método']],
          body: paymentData,
          theme: 'grid',
          styles: { fontSize: 9 }
        });

        currentY = (doc as any).lastAutoTable.finalY + 20;
      }

      // Notas de Crédito
      if (customerCreditNotes.length > 0) {
        doc.setFontSize(14);
        doc.text('Notas de Crédito:', 20, currentY);
        currentY += 10;

        const creditData = customerCreditNotes.map(n => [
          n.noteNumber,
          `RD$ ${n.amount.toLocaleString()}`,
          `RD$ ${n.appliedAmount.toLocaleString()}`,
          `RD$ ${n.balance.toLocaleString()}`,
        ]);

        (doc as any).autoTable({
          startY: currentY,
          head: [['Nota', 'Monto', 'Aplicado', 'Saldo']],
          body: creditData,
          theme: 'grid',
          styles: { fontSize: 9 }
        });

        currentY = (doc as any).lastAutoTable.finalY + 20;
      }

      // Notas de Débito
      if (customerDebitNotes.length > 0) {
        doc.setFontSize(14);
        doc.text('Notas de Débito:', 20, currentY);
        currentY += 10;

        const debitData = customerDebitNotes.map(n => [
          n.noteNumber,
          `RD$ ${n.amount.toLocaleString()}`,
          `RD$ ${n.appliedAmount.toLocaleString()}`,
          `RD$ ${n.balance.toLocaleString()}`,
        ]);

        (doc as any).autoTable({
          startY: currentY,
          head: [['Nota', 'Monto', 'Aplicado', 'Saldo']],
          body: debitData,
          theme: 'grid',
          styles: { fontSize: 9 }
        });

        currentY = (doc as any).lastAutoTable.finalY + 20;
      }

      // Anticipos
      if (customerAdvances.length > 0) {
        doc.setFontSize(14);
        doc.text('Anticipos de Cliente:', 20, currentY);
        currentY += 10;

        const advanceData = customerAdvances.map(a => [
          a.advanceNumber,
          `RD$ ${a.amount.toLocaleString()}`,
          `RD$ ${a.appliedAmount.toLocaleString()}`,
          `RD$ ${a.balance.toLocaleString()}`,
        ]);

        (doc as any).autoTable({
          startY: currentY,
          head: [['Anticipo', 'Monto', 'Aplicado', 'Saldo']],
          body: advanceData,
          theme: 'grid',
          styles: { fontSize: 9 }
        });
      }
      
      // Resumen
      doc.setFontSize(12);
      doc.text(`Saldo Actual: RD$ ${customer.currentBalance.toLocaleString()}`, 20, doc.internal.pageSize.height - 30);
    });
    
    doc.save(`estados-cuenta-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handleGenerateCollectionReport = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text('Reporte de Cobranza', 20, 20);
    
    doc.setFontSize(12);
    doc.text(`Fecha de generación: ${new Date().toLocaleDateString()}`, 20, 40);
    if (dateFrom && dateTo) {
      doc.text(`Período: ${dateFrom} al ${dateTo}`, 20, 50);
    }
    
    const totalPayments = payments.reduce((sum, p) => sum + p.amount, 0);
    const paymentsByMethod = payments.reduce((acc, payment) => {
      acc[payment.paymentMethod] = (acc[payment.paymentMethod] || 0) + payment.amount;
      return acc;
    }, {} as Record<string, number>);
    
    doc.setFontSize(14);
    doc.text('Resumen de Cobranza', 20, 70);
    
    const summaryData = [
      ['Concepto', 'Monto'],
      ['Total Cobrado', `RD$ ${totalPayments.toLocaleString()}`],
      ['Número de Pagos', payments.length.toString()],
      ['Efectivo', `RD$ ${(paymentsByMethod.cash || 0).toLocaleString()}`],
      ['Transferencias', `RD$ ${(paymentsByMethod.transfer || 0).toLocaleString()}`],
      ['Cheques', `RD$ ${(paymentsByMethod.check || 0).toLocaleString()}`],
      ['Tarjetas', `RD$ ${(paymentsByMethod.card || 0).toLocaleString()}`]
    ];
    
    (doc as any).autoTable({
      startY: 80,
      head: [summaryData[0]],
      body: summaryData.slice(1),
      theme: 'grid',
      headStyles: { fillColor: [34, 197, 94] }
    });
    
    doc.setFontSize(14);
    doc.text('Detalle de Pagos', 20, (doc as any).lastAutoTable.finalY + 20);
    
    const paymentData = payments.map(payment => [
      payment.date,
      payment.customerName,
      `RD$ ${payment.amount.toLocaleString()}`,
      payment.paymentMethod === 'transfer' ? 'Transferencia' :
      payment.paymentMethod === 'check' ? 'Cheque' :
      payment.paymentMethod === 'cash' ? 'Efectivo' : 'Tarjeta'
    ]);
    
    (doc as any).autoTable({
      startY: (doc as any).lastAutoTable.finalY + 30,
      head: [['Fecha', 'Cliente', 'Monto', 'Método']],
      body: paymentData,
      theme: 'striped',
      headStyles: { fillColor: [16, 185, 129] },
      styles: { fontSize: 9 }
    });
    
    doc.save(`reporte-cobranza-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handleGenerateCollectionExcel = () => {
    const totalPayments = payments.reduce((sum, p) => sum + p.amount, 0);
    const paymentsByMethod = payments.reduce((acc, payment) => {
      acc[payment.paymentMethod] = (acc[payment.paymentMethod] || 0) + payment.amount;
      return acc;
    }, {} as Record<string, number>);

    const fmt = (value: number) => value.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const rows: (string | number)[][] = [
      ['Reporte de Cobranza'],
      [`Fecha de generación: ${new Date().toLocaleDateString()}`],
      dateFrom && dateTo ? [`Período: ${dateFrom} al ${dateTo}`] : [],
      [''],
      ['RESUMEN DE COBRANZA'],
      ['Total Cobrado', `RD$ ${fmt(totalPayments)}`],
      ['Número de Pagos', payments.length.toString()],
      ['Efectivo', `RD$ ${fmt(paymentsByMethod.cash || 0)}`],
      ['Transferencias', `RD$ ${fmt(paymentsByMethod.transfer || 0)}`],
      ['Cheques', `RD$ ${fmt(paymentsByMethod.check || 0)}`],
      ['Tarjetas', `RD$ ${fmt(paymentsByMethod.card || 0)}`],
      [''],
      ['DETALLE DE PAGOS'],
      ['Fecha', 'Cliente', 'Monto', 'Método'],
      ...payments.map(payment => [
        payment.date,
        payment.customerName,
        `RD$ ${fmt(payment.amount)}`,
        payment.paymentMethod === 'transfer' ? 'Transferencia' :
        payment.paymentMethod === 'check' ? 'Cheque' :
        payment.paymentMethod === 'cash' ? 'Efectivo' : 'Tarjeta'
      ])
    ].filter(row => row.length > 0);

    // CSV amigable para Excel (UTF-8 BOM + saltos de línea Windows)
    const csvBody = rows
      .map(row => row.map(col => {
        const str = String(col ?? '');
        return /[",;\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
      }).join(','))
      .join('\r\n');

    const csvContent = '\uFEFF' + csvBody;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `reporte-cobranza-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const handleGenerateCustomerBalanceReport = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text('Reporte de Saldos por Cliente', 20, 20);
    
    doc.setFontSize(12);
    doc.text(`Fecha de generación: ${new Date().toLocaleDateString()}`, 20, 40);
    
    // Estadísticas generales
    const totalBalance = customers.reduce((sum, c) => sum + c.currentBalance, 0);
    const totalCreditLimit = customers.reduce((sum, c) => sum + c.creditLimit, 0);
    const activeCustomers = customers.filter(c => c.status === 'Activo').length;
    const customersWithBalance = customers.filter(c => c.currentBalance > 0).length;
    
    doc.setFontSize(14);
    doc.text('Resumen General', 20, 60);
    
    const summaryData = [
      ['Total Saldos por Cobrar', `RD$ ${totalBalance.toLocaleString()}`],
      ['Total Límites de Crédito', `RD$ ${totalCreditLimit.toLocaleString()}`],
      ['Clientes Activos', activeCustomers.toString()],
      ['Clientes con Saldo', customersWithBalance.toString()],
      ['Utilización de Crédito', `${((totalBalance / totalCreditLimit) * 100).toFixed(1)}%`]
    ];
    
    (doc as any).autoTable({
      startY: 70,
      head: [['Concepto', 'Valor']],
      body: summaryData,
      theme: 'grid',
      headStyles: { fillColor: [255, 152, 0] },
      styles: { fontSize: 10 }
    });
    
    doc.setFontSize(14);
    doc.text('Detalle por Cliente', 20, (doc as any).lastAutoTable.finalY + 20);
    
    const customerData = customers.map(customer => {
      const utilizationPercent = customer.creditLimit > 0 ? ((customer.currentBalance / customer.creditLimit) * 100).toFixed(1) : '0';
      const availableCredit = customer.creditLimit - customer.currentBalance;
      
      return [
        customer.name,
        `RD$ ${customer.currentBalance.toLocaleString()}`,
        `RD$ ${customer.creditLimit.toLocaleString()}`,
        `RD$ ${availableCredit.toLocaleString()}`,
        `${utilizationPercent}%`,
        customer.status
      ];
    });
    
    (doc as any).autoTable({
      startY: (doc as any).lastAutoTable.finalY + 30,
      head: [['Cliente', 'Saldo Actual', 'Límite Crédito', 'Crédito Disponible', 'Utilización', 'Estado']],
      body: customerData,
      theme: 'striped',
      headStyles: { fillColor: [255, 152, 0] },
      styles: { fontSize: 9 }
    });
    
    doc.save(`saldos-por-cliente-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handleGenerateOverdueReport = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text('Reporte de Facturas Vencidas', 20, 20);
    
    doc.setFontSize(12);
    doc.text(`Fecha de generación: ${new Date().toLocaleDateString()}`, 20, 40);
    
    // Filtrar facturas vencidas
    const overdueInvoices = invoices.filter(inv => inv.daysOverdue > 0 && inv.balance > 0);
    const totalOverdue = overdueInvoices.reduce((sum, inv) => sum + inv.balance, 0);
    
    // Análisis por períodos
    const overdue1to30 = overdueInvoices.filter(inv => inv.daysOverdue >= 1 && inv.daysOverdue <= 30);
    const overdue31to60 = overdueInvoices.filter(inv => inv.daysOverdue >= 31 && inv.daysOverdue <= 60);
    const overdue61to90 = overdueInvoices.filter(inv => inv.daysOverdue >= 61 && inv.daysOverdue <= 90);
    const overdueOver90 = overdueInvoices.filter(inv => inv.daysOverdue > 90);
    
    doc.setFontSize(14);
    doc.text('Resumen de Vencimientos', 20, 60);
    
    const summaryData = [
      ['Total Facturas Vencidas', overdueInvoices.length.toString()],
      ['Monto Total Vencido', `RD$ ${totalOverdue.toLocaleString()}`],
      ['1-30 días', `${overdue1to30.length} facturas - RD$ ${overdue1to30.reduce((sum, inv) => sum + inv.balance, 0).toLocaleString()}`],
      ['31-60 días', `${overdue31to60.length} facturas - RD$ ${overdue31to60.reduce((sum, inv) => sum + inv.balance, 0).toLocaleString()}`],
      ['61-90 días', `${overdue61to90.length} facturas - RD$ ${overdue61to90.reduce((sum, inv) => sum + inv.balance, 0).toLocaleString()}`],
      ['Más de 90 días', `${overdueOver90.length} facturas - RD$ ${overdueOver90.reduce((sum, inv) => sum + inv.balance, 0).toLocaleString()}`]
    ];
    
    (doc as any).autoTable({
      startY: 70,
      head: [['Concepto', 'Detalle']],
      body: summaryData,
      theme: 'grid',
      headStyles: { fillColor: [239, 68, 68] },
      styles: { fontSize: 10 }
    });
    
    if (overdueInvoices.length > 0) {
      doc.setFontSize(14);
      doc.text('Detalle de Facturas Vencidas', 20, (doc as any).lastAutoTable.finalY + 20);
      
      const overdueData = overdueInvoices.map(invoice => [
        invoice.invoiceNumber,
        invoice.customerName,
        invoice.dueDate,
        `${invoice.daysOverdue} días`,
        `RD$ ${invoice.amount.toLocaleString()}`,
        `RD$ ${invoice.balance.toLocaleString()}`
      ]);
      
      (doc as any).autoTable({
        startY: (doc as any).lastAutoTable.finalY + 30,
        head: [['Factura', 'Cliente', 'Vencimiento', 'Días Atraso', 'Monto Original', 'Saldo Pendiente']],
        body: overdueData,
        theme: 'striped',
        headStyles: { fillColor: [239, 68, 68] },
        styles: { fontSize: 9 }
      });
    }
    
    doc.save(`facturas-vencidas-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handleGeneratePaymentAnalysisReport = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text('Análisis de Patrones de Pago', 20, 20);
    
    doc.setFontSize(12);
    doc.text(`Fecha de generación: ${new Date().toLocaleDateString()}`, 20, 40);
    
    // Análisis por cliente
    const customerPaymentAnalysis = customers.map(customer => {
      const customerPayments = payments.filter(p => p.customerName === customer.name);
      const totalPaid = customerPayments.reduce((sum, p) => sum + p.amount, 0);
      const avgPayment = customerPayments.length > 0 ? totalPaid / customerPayments.length : 0;
      const paymentFrequency = customerPayments.length;
      
      // Método de pago preferido
      const methodCount = customerPayments.reduce((acc, p) => {
        acc[p.paymentMethod] = (acc[p.paymentMethod] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const preferredMethod = Object.entries(methodCount).reduce((a, b) => 
        methodCount[a[0]] > methodCount[b[0]] ? a : b, ['N/A', 0])[0];
      
      return {
        customer: customer.name,
        totalPaid,
        avgPayment,
        paymentFrequency,
        preferredMethod,
        currentBalance: customer.currentBalance
      };
    });
    
    // Estadísticas generales
    const totalPaymentsAmount = payments.reduce((sum, p) => sum + p.amount, 0);
    const avgPaymentAmount = payments.length > 0 ? totalPaymentsAmount / payments.length : 0;
    
    const methodStats = payments.reduce((acc, payment) => {
      acc[payment.paymentMethod] = (acc[payment.paymentMethod] || 0) + payment.amount;
      return acc;
    }, {} as Record<string, number>);
    
    doc.setFontSize(14);
    doc.text('Estadísticas Generales', 20, 60);
    
    const generalStats = [
      ['Total Pagos Recibidos', `RD$ ${totalPaymentsAmount.toLocaleString()}`],
      ['Número de Transacciones', payments.length.toString()],
      ['Pago Promedio', `RD$ ${avgPaymentAmount.toLocaleString()}`],
      ['Transferencias', `RD$ ${(methodStats.transfer || 0).toLocaleString()}`],
      ['Cheques', `RD$ ${(methodStats.check || 0).toLocaleString()}`],
      ['Efectivo', `RD$ ${(methodStats.cash || 0).toLocaleString()}`],
      ['Tarjetas', `RD$ ${(methodStats.card || 0).toLocaleString()}`]
    ];
    
    (doc as any).autoTable({
      startY: 70,
      head: [['Concepto', 'Valor']],
      body: generalStats,
      theme: 'grid',
      headStyles: { fillColor: [99, 102, 241] },
      styles: { fontSize: 10 }
    });
    
    doc.setFontSize(14);
    doc.text('Análisis por Cliente', 20, (doc as any).lastAutoTable.finalY + 20);
    
    const analysisData = customerPaymentAnalysis.map(analysis => {
      const methodName = analysis.preferredMethod === 'transfer' ? 'Transferencia' :
                        analysis.preferredMethod === 'check' ? 'Cheque' :
                        analysis.preferredMethod === 'cash' ? 'Efectivo' :
                        analysis.preferredMethod === 'card' ? 'Tarjeta' : 'N/A';
      
      return [
        analysis.customer,
        `RD$ ${analysis.totalPaid.toLocaleString()}`,
        analysis.paymentFrequency.toString(),
        `RD$ ${analysis.avgPayment.toLocaleString()}`,
        methodName,
        `RD$ ${analysis.currentBalance.toLocaleString()}`
      ];
    });
    
    (doc as any).autoTable({
      startY: (doc as any).lastAutoTable.finalY + 30,
      head: [['Cliente', 'Total Pagado', 'Frecuencia', 'Pago Promedio', 'Método Preferido', 'Saldo Actual']],
      body: analysisData,
      theme: 'striped',
      headStyles: { fillColor: [99, 102, 241] },
      styles: { fontSize: 9 }
    });
    
    doc.save(`analisis-pagos-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Reportes de Cuentas por Cobrar</h1>
        </div>

        {/* Date Filter */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Filtros de Fecha</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Fecha Desde</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Fecha Hasta</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Reports Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Aging Report */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Antigüedad de Saldos</h3>
              <i className="ri-calendar-line text-2xl text-blue-600"></i>
            </div>
            <p className="text-gray-600 mb-4">Análisis de vencimientos por cliente y períodos de antigüedad</p>
            <div className="flex space-x-2">
              <button 
                onClick={handleGenerateAgingReport}
                className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors whitespace-nowrap"
              >
                <i className="ri-file-pdf-line mr-2"></i>PDF
              </button>
            </div>
          </div>

          {/* Statement Report */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Estado de Cuenta</h3>
              <i className="ri-file-list-line text-2xl text-green-600"></i>
            </div>
            <p className="text-gray-600 mb-4">Movimientos detallados por cliente con facturas y pagos</p>
            <button 
              onClick={handleGenerateStatementReport}
              className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors whitespace-nowrap"
            >
              <i className="ri-file-pdf-line mr-2"></i>Generar PDF
            </button>
          </div>

          {/* Collection Report */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Reporte de Cobranza</h3>
              <i className="ri-money-dollar-circle-line text-2xl text-purple-600"></i>
            </div>
            <p className="text-gray-600 mb-4">Resumen de pagos recibidos por período y método de pago</p>
            <div className="flex space-x-2">
              <button 
                onClick={handleGenerateCollectionReport}
                className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors whitespace-nowrap"
              >
                <i className="ri-file-pdf-line mr-2"></i>PDF
              </button>
              <button 
                onClick={handleGenerateCollectionExcel}
                className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors whitespace-nowrap"
              >
                <i className="ri-file-excel-line mr-2"></i>Excel
              </button>
            </div>
          </div>

          {/* Customer Balance Report */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Saldos por Cliente</h3>
              <i className="ri-user-line text-2xl text-orange-600"></i>
            </div>
            <p className="text-gray-600 mb-4">Listado de saldos actuales por cliente con límites de crédito</p>
            <button 
              onClick={handleGenerateCustomerBalanceReport}
              className="w-full bg-orange-600 text-white py-2 rounded-lg hover:bg-orange-700 transition-colors whitespace-nowrap"
            >
              <i className="ri-file-pdf-line mr-2"></i>Generar PDF
            </button>
          </div>

          {/* Overdue Report */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Facturas Vencidas</h3>
              <i className="ri-alarm-warning-line text-2xl text-red-600"></i>
            </div>
            <p className="text-gray-600 mb-4">Listado de facturas vencidas con días de atraso</p>
            <button 
              onClick={handleGenerateOverdueReport}
              className="w-full bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition-colors whitespace-nowrap"
            >
              <i className="ri-file-pdf-line mr-2"></i>Generar PDF
            </button>
          </div>

          {/* Payment Analysis */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Análisis de Pagos</h3>
              <i className="ri-bar-chart-line text-2xl text-indigo-600"></i>
            </div>
            <p className="text-gray-600 mb-4">Análisis estadístico de patrones de pago por cliente</p>
            <button 
              onClick={handleGeneratePaymentAnalysisReport}
              className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition-colors whitespace-nowrap"
            >
              <i className="ri-file-pdf-line mr-2"></i>Generar PDF
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}