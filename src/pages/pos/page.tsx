
import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useAuth } from '../../hooks/useAuth';
import { customersService, invoicesService, receiptsService, inventoryService } from '../../services/database';
import { exportToExcelStyled } from '../../utils/exportImportUtils';

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  category: string;
  barcode: string;
  imageUrl: string;
  sku: string;
  cost: number;
  minStock: number;
  maxStock: number;
  description: string;
  supplier: string;
  status: 'active' | 'inactive';
}

interface CartItem extends Product {
  quantity: number;
  total: number;
}

interface Customer {
  id: string;
  name: string;
  document: string;
  phone: string;
  email: string;
  address: string;
  type: 'regular' | 'vip';
}

interface Sale {
  id: string;
  date: string;
  time: string;
  customer: Customer | null;
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: string;
  amountReceived: number;
  change: number;
  status: 'completed' | 'cancelled' | 'refunded';
  cashier: string;
}

export default function POSPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [amountReceived, setAmountReceived] = useState('');
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [categories, setCategories] = useState<string[]>(['all']);
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    document: '',
    phone: '',
    email: '',
    address: '',
    type: 'regular' as 'regular' | 'vip'
  });
  const [showEditCustomerModal, setShowEditCustomerModal] = useState(false);
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const isUuid = (val: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val);

  // Helpers: input masks
  const formatDocument = (raw: string) => {
    const digits = (raw || '').replace(/\D/g, '').slice(0, 11);
    // Pattern: ###-#######-#
    const parts: string[] = [];
    if (digits.length <= 3) return digits;
    parts.push(digits.slice(0, 3));
    if (digits.length <= 10) {
      parts.push(digits.slice(3));
      return parts.join('-');
    }
    parts.push(digits.slice(3, 10));
    parts.push(digits.slice(10));
    return parts.join('-');
  };

  const formatPhone = (raw: string) => {
    const digits = (raw || '').replace(/\D/g, '').slice(0, 10);
    // Pattern: ###-###-####
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0,3)}-${digits.slice(3)}`;
    return `${digits.slice(0,3)}-${digits.slice(3,6)}-${digits.slice(6)}`;
  };

  const anyModalOpen =
    showCustomerModal ||
    showPaymentModal ||
    showNewCustomerModal ||
    showEditCustomerModal;

  useEffect(() => {
    document.body.style.overflow = anyModalOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [anyModalOpen]);

  // Close Customers modals when navigating away from Customers tab
  useEffect(() => {
    if (activeTab !== 'customers') {
      setShowEditCustomerModal(false);
      setShowNewCustomerModal(false);
    }
  }, [activeTab]);

  const Modal = ({ children }: { children: ReactNode }) =>
    createPortal(
      <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative w-full max-w-lg">{children}</div>
      </div>,
      document.body
    );

  // Load data (productos desde Supabase si hay usuario; si no, desde localStorage)
  useEffect(() => {
    loadProducts();
    loadSales();
    loadCustomers();

    const onProductsUpdated = () => {
      loadProducts();
    };
    window.addEventListener('productsUpdated', onProductsUpdated);
    return () => {
      window.removeEventListener('productsUpdated', onProductsUpdated);
    };
  }, []);

  // When auth user becomes available, recargar datos desde Supabase
  useEffect(() => {
    if (user?.id) {
      loadProducts();
      loadSales();
      loadCustomers();
    }
  }, [user?.id]);

  const loadProducts = async () => {
    try {
      if (user?.id) {
        // Cargar productos reales desde inventario (Supabase)
        const items: any[] = await inventoryService.getItems(user.id);
        const mapped: Product[] = (items || []).map((it: any) => ({
          id: it.id,
          name: it.name || '',
          price: Number(it.selling_price) || 0,
          stock: Number(it.current_stock) || 0,
          category: it.category || '',
          barcode: it.barcode || '',
          imageUrl: it.image_url || '',
          sku: it.sku || '',
          cost: Number(it.cost_price) || 0,
          minStock: Number(it.minimum_stock) || 0,
          maxStock: Number(it.maximum_stock) || 0,
          description: it.description || '',
          supplier: it.supplier || '',
          status: it.is_active === false ? 'inactive' : 'active',
        }));

        const activeProducts = mapped.filter(p => p.status === 'active');
        setProducts(activeProducts);

        // Derivar categorías desde los productos activos
        const names = Array.from(new Set(activeProducts.map(p => p.category).filter(Boolean)));
        setCategories(['all', ...names]);
      } else {
        // Sin usuario: mantener comportamiento anterior basado en localStorage
        const savedProducts = localStorage.getItem('contabi_products');
        if (savedProducts) {
          const parsedProducts = JSON.parse(savedProducts) as Product[];
          const activeProducts = parsedProducts.filter((product) => product.status === 'active');
          setProducts(activeProducts);
          const names = Array.from(new Set(activeProducts.map(p => p.category).filter(Boolean)));
          setCategories(['all', ...names]);
        } else {
          setProducts([]);
          setCategories(['all']);
        }
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[POS] Error loading products, falling back to localStorage', error);
      const savedProducts = localStorage.getItem('contabi_products');
      if (savedProducts) {
        const parsedProducts = JSON.parse(savedProducts) as Product[];
        const activeProducts = parsedProducts.filter((product) => product.status === 'active');
        setProducts(activeProducts);
        const names = Array.from(new Set(activeProducts.map(p => p.category).filter(Boolean)));
        setCategories(['all', ...names]);
      } else {
        setProducts([]);
        setCategories(['all']);
      }
    }
  };

  const loadSales = async () => {
    try {
      if (user?.id) {
        const invoices: any[] = await invoicesService.getAll(user.id);
        const posInvoices = (invoices || []).filter((inv: any) =>
          (inv.invoice_number || '').startsWith('POS-')
        );

        const mappedSales: Sale[] = posInvoices.map((inv: any) => {
          const createdAt: string | undefined = inv.created_at || undefined;
          const date = inv.invoice_date || (createdAt ? createdAt.split('T')[0] : '');
          const time = createdAt ? createdAt.split('T')[1]?.slice(0, 8) || '00:00:00' : '00:00:00';

          const customer: Customer | null = inv.customers
            ? {
                id: inv.customers.id,
                name: inv.customers.name || 'Cliente',
                document: inv.customers.document || '',
                phone: inv.customers.phone || '',
                email: inv.customers.email || '',
                address: inv.customers.address || '',
                type: 'regular',
              }
            : null;

          const items: CartItem[] = (inv.invoice_lines || []).map((line: any) => ({
            id: line.inventory_items?.id || line.inventory_item_id || line.id,
            name: line.inventory_items?.name || line.description || 'Producto',
            price: line.unit_price || line.price || 0,
            stock: 0,
            category: '',
            barcode: '',
            imageUrl: '',
            sku: '',
            cost: 0,
            minStock: 0,
            maxStock: 0,
            description: '',
            supplier: '',
            status: 'active',
            quantity: line.quantity || 1,
            total: line.line_total || (line.quantity || 1) * (line.unit_price || 0),
          }));

          return {
            id: inv.invoice_number || inv.id,
            date,
            time,
            customer,
            items,
            subtotal: inv.subtotal ?? 0,
            tax: inv.tax_amount ?? 0,
            total: inv.total_amount ?? 0,
            paymentMethod: 'cash',
            amountReceived: inv.total_amount ?? 0,
            change: 0,
            status: inv.status === 'cancelled' ? 'cancelled' : 'completed',
            cashier: 'POS',
          } as Sale;
        });

        setSales(mappedSales);
        return;
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[POS] Error loading sales from invoices, falling back to localStorage', error);
    }

    const savedSales = localStorage.getItem('contabi_pos_sales');
    if (savedSales) {
      setSales(JSON.parse(savedSales));
    } else {
      setSales([]);
    }
  };

  const loadCustomers = async () => {
    try {
      if (user?.id) {
        const rows = await customersService.getAll(user.id);
        const mapped: Customer[] = (rows || []).map((c: any) => ({
          id: c.id,
          name: c.name || c.customer_name || 'Cliente',
          document: c.document || c.tax_id || '',
          phone: c.phone || c.contact_phone || '',
          email: c.email || c.contact_email || '',
          address: c.address || '',
          type: (c.type === 'vip' ? 'vip' : 'regular') as 'regular' | 'vip'
        }));
        setCustomers(mapped);
      } else {
        const savedCustomers = localStorage.getItem('contabi_pos_customers');
        if (savedCustomers) {
          setCustomers(JSON.parse(savedCustomers));
        } else {
          setCustomers([]);
        }
      }
    } catch (e) {
      console.warn('loadCustomers failed, using localStorage fallback');
      const savedCustomers = localStorage.getItem('contabi_pos_customers');
      setCustomers(savedCustomers ? JSON.parse(savedCustomers) : []);
    }
  };

  // categories now managed via state from real data

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.barcode.includes(searchTerm) ||
                         product.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const addToCart = (product: Product) => {
    const existingItem = cart.find(item => item.id === product.id);
    
    if (existingItem) {
      if (existingItem.quantity < product.stock) {
        setCart(cart.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.price }
            : item
        ));
      }
    } else {
      setCart([...cart, { ...product, quantity: 1, total: product.price }]);
    }
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(id);
      return;
    }

    const product = products.find(p => p.id === id);
    if (product && quantity <= product.stock) {
      setCart(cart.map(item =>
        item.id === id
          ? { ...item, quantity, total: quantity * item.price }
          : item
      ));
    }
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const deleteProduct = (productId: string) => {
    if (!confirm('¿Eliminar este producto del Punto de Venta? Esta acción sólo afecta los productos guardados en este dispositivo.')) {
      return;
    }
    try {
      const savedProducts = JSON.parse(localStorage.getItem('contabi_products') || '[]') as Product[];
      const next = savedProducts.filter(p => p.id !== productId);
      localStorage.setItem('contabi_products', JSON.stringify(next));
      setProducts(prev => prev.filter(p => p.id !== productId));
      window.dispatchEvent(new CustomEvent('productsUpdated'));
      alert('Producto eliminado del Punto de Venta.');
    } catch (error) {
      console.error('Error deleting POS product:', error);
      alert('No se pudo eliminar el producto.');
    }
  };

  const getSubtotal = () => cart.reduce((sum, item) => sum + item.total, 0);
  const getTax = () => getSubtotal() * 0.18; // 18% ITBIS
  const getTotal = () => getSubtotal() + getTax();

  const processPayment = async () => {
    const total = getTotal();
    const received = parseFloat(amountReceived) || total;
    
    if (received >= total || paymentMethod !== 'cash') {
      const newSale: Sale = {
        id: `SALE-${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        time: new Date().toTimeString().split(' ')[0],
        customer: selectedCustomer,
        items: [...cart],
        subtotal: getSubtotal(),
        tax: getTax(),
        total: total,
        paymentMethod,
        amountReceived: received,
        change: paymentMethod === 'cash' ? received - total : 0,
        status: 'completed',
        cashier: 'Admin'
      };

      // Update sales locally (sólo como historial rápido en este dispositivo)
      // Guardamos máximo 500 ventas y protegemos contra QuotaExceededError
      const updatedSales = [newSale, ...sales].slice(0, 500);
      setSales(updatedSales);
      try {
        localStorage.setItem('contabi_pos_sales', JSON.stringify(updatedSales));
      } catch (error) {
        // Si el storage está lleno, no interrumpir el flujo del POS
        // eslint-disable-next-line no-console
        console.error('[POS] Error saving contabi_pos_sales to localStorage (ignorado):', error);
      }

      // If logged in and a concrete customer is selected, create AR invoice/receipt in Supabase
      if (user?.id && selectedCustomer) {
        try {
          const todayStr = newSale.date;
          const invoiceNumber = `POS-${Date.now()}`;

          const isImmediatePayment = ['cash', 'card', 'transfer'].includes(newSale.paymentMethod);

          const invoicePayload = {
            customer_id: selectedCustomer.id,
            invoice_number: invoiceNumber,
            invoice_date: todayStr,
            due_date: todayStr,
            currency: 'DOP',
            subtotal: newSale.subtotal,
            tax_amount: newSale.tax,
            total_amount: newSale.total,
            paid_amount: isImmediatePayment ? newSale.total : 0,
            status: isImmediatePayment ? 'paid' : 'pending',
            notes: `Venta POS ${newSale.id}`,
          };

          const linesPayload = newSale.items.map((item) => ({
            description: item.name,
            quantity: item.quantity,
            unit_price: item.price,
            line_total: item.total,
          }));

          const created = await invoicesService.create(user.id, invoicePayload, linesPayload);

          // Create receipt only when sale is fully paid (which is the only case permitido ahora)
          const receiptNumber = `REC-${Date.now()}`;
          await receiptsService.create(user.id, {
            customer_id: selectedCustomer.id,
            receipt_number: receiptNumber,
            receipt_date: todayStr,
            amount: newSale.total,
            payment_method: newSale.paymentMethod,
            reference: newSale.id,
            concept: `Cobro venta POS ${created.invoice.invoice_number}`,
            status: 'active',
          });
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error('[POS] Error creando factura/recibo en CxC', error);
          alert('La venta se guardó en el POS, pero hubo un problema al registrar la factura/recibo en Cuentas por Cobrar. Revisa la consola.');
        }
      }

      // Update product stock in local POS cache
      const updatedProducts = products.map(product => {
        const cartItem = cart.find(item => item.id === product.id);
        if (cartItem) {
          return { ...product, stock: product.stock - cartItem.quantity };
        }
        return product;
      });
      
      const allProducts = JSON.parse(localStorage.getItem('contabi_products') || '[]');
      const finalProducts = allProducts.map((product: Product) => {
        const updatedProduct = updatedProducts.find(p => p.id === product.id);
        return updatedProduct || product;
      });
      
      localStorage.setItem('contabi_products', JSON.stringify(finalProducts));
      window.dispatchEvent(new CustomEvent('productsUpdated'));

      // If logged in, also sync stock and movements with Inventory module in Supabase
      if (user?.id) {
        try {
          for (const cartItem of cart) {
            const current = products.find(p => p.id === cartItem.id);
            // Solo sincronizar con Supabase cuando el id del producto sea un UUID válido
            if (!current || !isUuid(current.id)) {
              // eslint-disable-next-line no-console
              console.warn('[POS] Skipping inventory sync for non-UUID product id', current?.id ?? cartItem.id);
              continue;
            }

            // 1) Update inventory item stock
            const newStock = (current.stock ?? 0) - cartItem.quantity;
            await inventoryService.updateItem(current.id, {
              current_stock: newStock < 0 ? 0 : newStock,
            });

            // 2) Create inventory movement (exit)
            await inventoryService.createMovement(user.id, {
              item_id: current.id,
              movement_type: 'exit',
              quantity: cartItem.quantity,
              unit_cost: cartItem.cost ?? 0,
              movement_date: newSale.date,
              reference: newSale.id,
              total_cost: (cartItem.quantity || 0) * (cartItem.cost ?? 0),
              notes: `Salida por venta POS ${newSale.id}`,
            });
          }
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error('[POS] Error syncing inventory from POS sale', error);
          alert('La venta se registró, pero hubo un problema al actualizar el inventario en la base de datos. Revisa el módulo de Inventario.');
        }
      }
      
      alert(`Venta procesada exitosamente. ${paymentMethod === 'cash' ? `Cambio: RD$${(received - total).toFixed(2)}` : ''}`);
      setCart([]);
      setSelectedCustomer(null);
      setAmountReceived('');
      setShowPaymentModal(false);
      loadProducts();
    } else {
      alert('Monto insuficiente');
    }
  };

  const addNewCustomer = async () => {
    if (!newCustomer.name || !newCustomer.document) {
      alert('Nombre y documento son requeridos');
      return;
    }

    // Basic validation (allow phone empty)
    const docOk = /^\d{3}-\d{7}-\d$/.test(newCustomer.document);
    const phoneOk = !newCustomer.phone || /^\d{3}-\d{3}-\d{4}$/.test(newCustomer.phone);
    if (!docOk) {
      alert('Documento inválido. Formato esperado: 000-0000000-0');
      return;
    }
    if (!phoneOk) {
      alert('Teléfono inválido. Formato esperado: 000-000-0000');
      return;
    }

    if (user?.id) {
      try {
        await customersService.create(user.id, {
          name: newCustomer.name,
          document: newCustomer.document,
          phone: newCustomer.phone,
          email: newCustomer.email,
          address: newCustomer.address,
          creditLimit: 0,
          status: 'active',
        });
        await loadCustomers();
      } catch (error) {
        console.error('Error creating customer in DB, falling back to localStorage:', error);
        const customer: Customer = { id: Date.now().toString(), ...newCustomer };
        const updatedCustomers = [...customers, customer];
        setCustomers(updatedCustomers);
        localStorage.setItem('contabi_pos_customers', JSON.stringify(updatedCustomers));
      }
    } else {
      const customer: Customer = { id: Date.now().toString(), ...newCustomer };
      const updatedCustomers = [...customers, customer];
      setCustomers(updatedCustomers);
      localStorage.setItem('contabi_pos_customers', JSON.stringify(updatedCustomers));
    }
    
    setNewCustomer({
      name: '',
      document: '',
      phone: '',
      email: '',
      address: '',
      type: 'regular'
    });
    setShowNewCustomerModal(false);
    alert('Cliente agregado exitosamente');
  };


  const saveEditedCustomer = async () => {
    if (!editCustomer) return;
    if (!editCustomer.name || !editCustomer.document) {
      alert('Nombre y documento son requeridos');
      return;
    }
    try {
      if (user?.id && isUuid(editCustomer.id)) {
        await customersService.update(editCustomer.id, {
          name: editCustomer.name,
          document: editCustomer.document,
          phone: editCustomer.phone,
          email: editCustomer.email,
          address: editCustomer.address,
          creditLimit: 0,
          status: 'active',
        });
        await loadCustomers();
      } else {
        const savedCustomers = JSON.parse(localStorage.getItem('contabi_pos_customers') || '[]') as Customer[];
        const next = savedCustomers.map(c => (c.id === editCustomer.id ? editCustomer : c));
        localStorage.setItem('contabi_pos_customers', JSON.stringify(next));
        setCustomers(next);
      }
      if (selectedCustomer?.id === editCustomer.id) setSelectedCustomer(editCustomer);
      setShowEditCustomerModal(false);
      alert('Cliente actualizado');
    } catch (error) {
      console.error('Error updating POS customer:', error);
      // Fallback local even if logged in
      try {
        const savedCustomers = JSON.parse(localStorage.getItem('contabi_pos_customers') || '[]') as Customer[];
        const next = savedCustomers.map(c => (c.id === (editCustomer as Customer).id ? (editCustomer as Customer) : c));
        localStorage.setItem('contabi_pos_customers', JSON.stringify(next));
        setCustomers(next);
        if (selectedCustomer?.id === (editCustomer as Customer).id) setSelectedCustomer(editCustomer as Customer);
        setShowEditCustomerModal(false);
        alert('Cliente actualizado (modo local)');
      } catch (e2) {
        alert('No se pudo actualizar el cliente.');
      }
    }
  };

  const getTodayStats = () => {
    const today = new Date().toISOString().split('T')[0];
    const todaySales = sales.filter(sale => sale.date === today && sale.status === 'completed');
    
    return {
      totalSales: todaySales.length,
      totalAmount: todaySales.reduce((sum, sale) => sum + sale.total, 0),
      cashSales: todaySales.filter(sale => sale.paymentMethod === 'cash').length,
      cardSales: todaySales.filter(sale => sale.paymentMethod === 'card').length,
      transferSales: todaySales.filter(sale => sale.paymentMethod === 'transfer').length
    };
  };

  const getTopProducts = () => {
    const productSales: { [key: string]: { name: string; quantity: number; revenue: number } } = {};
    
    sales.forEach(sale => {
      if (sale.status === 'completed') {
        sale.items.forEach(item => {
          if (productSales[item.id]) {
            productSales[item.id].quantity += item.quantity;
            productSales[item.id].revenue += item.total;
          } else {
            productSales[item.id] = {
              name: item.name,
              quantity: item.quantity,
              revenue: item.total
            };
          }
        });
      }
    });

    return Object.values(productSales)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);
  };

  const exportSalesReport = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const rows = sales.map(sale => ({
        id: sale.id,
        date: sale.date,
        time: sale.time,
        customer: sale.customer?.name || 'Cliente General',
        subtotal: sale.subtotal || 0,
        tax: sale.tax || 0,
        total: sale.total || 0,
        paymentMethod: sale.paymentMethod,
        status: sale.status,
        cashier: sale.cashier || '—',
      }));
      await exportToExcelStyled(
        rows,
        [
          { key: 'id', title: 'ID Venta', width: 20 },
          { key: 'date', title: 'Fecha', width: 12 },
          { key: 'time', title: 'Hora', width: 10 },
          { key: 'customer', title: 'Cliente', width: 28 },
          { key: 'subtotal', title: 'Subtotal', width: 14, numFmt: '#,##0.00' },
          { key: 'tax', title: 'Impuesto', width: 14, numFmt: '#,##0.00' },
          { key: 'total', title: 'Total', width: 14, numFmt: '#,##0.00' },
          { key: 'paymentMethod', title: 'Método Pago', width: 16 },
          { key: 'status', title: 'Estado', width: 12 },
          { key: 'cashier', title: 'Cajero', width: 14 },
        ],
        `reporte_ventas_${today}`,
        'Ventas'
      );
    } catch (error) {
      console.error('Error exporting POS sales report:', error);
      alert('Error al exportar el reporte a Excel');
    }
  };

  const renderDashboard = () => {
    const todayStats = getTodayStats();
    const topProducts = getTopProducts();

    return (
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <i className="ri-shopping-cart-line text-blue-600 text-xl"></i>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Ventas Hoy</p>
                <p className="text-2xl font-bold text-gray-900">{todayStats.totalSales}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <i className="ri-money-dollar-circle-line text-green-600 text-xl"></i>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Ingresos Hoy</p>
                <p className="text-2xl font-bold text-gray-900">RD${todayStats.totalAmount.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <i className="ri-user-line text-purple-600 text-xl"></i>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Clientes</p>
                <p className="text-2xl font-bold text-gray-900">{customers.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <i className="ri-shopping-bag-3-line text-orange-600 text-xl"></i>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Productos</p>
                <p className="text-2xl font-bold text-gray-900">{products.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Charts and Recent Sales */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Payment Methods */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Métodos de Pago Hoy</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                  <span className="text-sm text-gray-600">Efectivo</span>
                </div>
                <span className="text-sm font-medium">{todayStats.cashSales} ventas</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
                  <span className="text-sm text-gray-600">Tarjeta</span>
                </div>
                <span className="text-sm font-medium">{todayStats.cardSales} ventas</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-purple-500 rounded-full mr-3"></div>
                  <span className="text-sm text-gray-600">Transferencia</span>
                </div>
                <span className="text-sm font-medium">{todayStats.transferSales} ventas</span>
              </div>
            </div>
          </div>

          {/* Top Products */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Productos Más Vendidos</h3>
            <div className="space-y-3">
              {topProducts.map((product, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-xs font-medium mr-3">
                      {index + 1}
                    </span>
                    <span className="text-sm text-gray-900 truncate">{product.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">{product.quantity} unidades</div>
                    <div className="text-xs text-gray-500">RD${product.revenue.toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Sales */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Ventas Recientes</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Método</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sales.slice(0, 5).map((sale) => (
                  <tr key={sale.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{sale.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {sale.customer?.name || 'Cliente General'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">RD${sale.total.toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{sale.paymentMethod}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        sale.status === 'completed' ? 'bg-green-100 text-green-800' :
                        sale.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {sale.status === 'completed' ? 'Completada' : 
                         sale.status === 'cancelled' ? 'Cancelada' : 'Reembolsada'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderPOS = () => (
    <div className="flex h-screen bg-gray-50">
      {/* Products Section */}
      <div className="flex-1 p-6">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Productos</h2>
          
          {/* Search and Filters */}
          <div className="flex space-x-4 mb-4">
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <i className="ri-search-line text-gray-400"></i>
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                placeholder="Buscar productos..."
              />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm pr-8"
            >
              {categories.map(category => (
                <option key={category} value={category}>
                  {category === 'all' ? 'Todas las categorías' : category}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              className="relative bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer flex flex-col h-full overflow-hidden"
              onClick={() => addToCart(product)}
            >

              {/* Imagen */}
              <div className="w-full h-32 mb-2 bg-gray-50 rounded-lg overflow-hidden flex items-center justify-center">
                {product.imageUrl && (
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="max-h-full w-auto object-contain"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDMwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xNTAgMTAwQzE2MS4wNDYgMTAwIDE3MCA5MC45NTQzIDE3MCA4MEM1NyA2OS4wNDU3IDE0Ny45NTQgNjAgMTM2IDYwQzEyNC45NTQgNjAgMTE2IDY5LjA0NTcgMTE2IDgwQzExNiA5MC45NTQzIDEyNC45NTQgMTAwIDEzNiAxMDBIMTUwWiIgZmlsbD0iIzlDQTNBRiIvPgo8cGF0aCBkPSJNMTg2IDEyMEgxMTRDMTA3LjM3MyAxMjAgMTAyIDEyNS4zNzMgMTAyIDEzMlYyMDBDMTAyIDIwNi2MjcgMTA3LjM3MyAyMTIgMTE0IDIxMkgxODZDMTkyLjYyNyAyMTIgMTk4IDIwNi4yMjJgMTk0IDIwMFYxMzJDMTk0IDEyNS4zNzMgMTkyLjYyNyAxMjAgMTg2IDEyMFoiIGZpbGw9IiM5Q0EzQUYiLz4KPC9zdmc+';
                    }}
                  />
                )}
              </div>

              {/* Categoría + Stock */}
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] uppercase tracking-wide text-gray-400 truncate max-w-[60%]">
                  {product.category}
                </span>
                <span
                  className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                    product.stock > 10
                      ? 'bg-emerald-50 text-emerald-700'
                      : product.stock > 0
                      ? 'bg-amber-50 text-amber-700'
                      : 'bg-red-50 text-red-700'
                  }`}
                >
                  Stock: {product.stock}
                </span>
              </div>

              {/* Nombre */}
              <h3 className="font-semibold text-gray-900 text-sm mb-2 line-clamp-2 min-h-[2.5rem]">
                {product.name}
              </h3>

              {/* Precio + botón agregar */}
              <div className="mt-auto flex items-center justify-between pt-2">
                <span className="text-base font-extrabold text-blue-600 max-w-[70%] truncate leading-tight">
                  RD${product.price.toLocaleString()}
                </span>
                <button
                  className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors shadow-sm flex-shrink-0"
                >
                  <i className="ri-add-line text-sm"></i>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cart Section */}
      <div className="w-96 bg-white border-l border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Carrito de Compras</h2>
          
          <div className="mt-4">
            <button
              onClick={() => setShowCustomerModal(true)}
              className="w-full flex items-center justify-between p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center">
                <i className="ri-user-line text-gray-400 mr-2"></i>
                <span className="text-sm text-gray-600">
                  {selectedCustomer ? selectedCustomer.name : 'Seleccionar Cliente'}
                </span>
              </div>
              <i className="ri-arrow-down-s-line text-gray-400"></i>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {cart.length === 0 ? (
            <div className="text-center text-gray-500 mt-8">
              <i className="ri-shopping-cart-line text-4xl mb-2"></i>
              <p>Carrito vacío</p>
            </div>
          ) : (
            <div className="space-y-4">
              {cart.map((item) => (
                <div key={item.id} className="flex items-center p-3 bg-gray-50 rounded-lg">
                  <div className="w-12 h-12 bg-gray-200 rounded-lg overflow-hidden mr-3 flex-shrink-0">
                    {item.imageUrl && (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-full h-full object-cover object-top"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQ4IiBoZWlnaHQ9IjQ4IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0yNCAyMEMyNi4yMDkxIDIwIDI4IDE4LjIwOTEgMjggMTZDMjggMTMuNzkwOSAyNi4yMDkxIDEyIDI0IDEyQzIxLjc5MDkgMTIgMjAgMTMuNzkwOSAyMCAxNkMyMCAxOC4yMDkxIDIxLjc5MDkgMjAgMjQgMjBaIiBmaWxsPSIjOUNBM0FGIi8+CjxwYXRoIGQ9Ik0zMiAyNEgxNkMxNC44OTU0IDI0IDE0IDI0Ljg5NTQgMTQgMjZWMzRDMTQgMzUuMTA0NiAxNC44OTU0IDM2IDE2IDM2SDMyQzMzLjEwNDYgMzYgMzQgMzUuMTA0NiAzNCAzNFYyNkMzNCAyNC44OTU0IDMzLjEwNDYgMjQgMzIgMjRaIiBmaWxsPSIjOUNBM0FGIi8+Cjwvc3ZnPg==';
                        }}
                      />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 text-sm truncate">{item.name}</h4>
                    <p className="text-xs text-gray-500">RD${item.price.toLocaleString()} c/u</p>
                    <p className="text-sm font-semibold text-gray-900">RD${item.total.toLocaleString()}</p>
                  </div>

                  <div className="flex items-center space-x-2 ml-3">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="w-6 h-6 bg-gray-200 text-gray-600 rounded-full flex items-center justify-center hover:bg-gray-300 transition-colors"
                    >
                      <i className="ri-subtract-line text-xs"></i>
                    </button>
                    <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="w-6 h-6 bg-gray-200 text-gray-600 rounded-full flex items-center justify-center hover:bg-gray-300 transition-colors"
                    >
                      <i className="ri-add-line text-xs"></i>
                    </button>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="w-6 h-6 bg-red-100 text-red-600 rounded-full flex items-center justify-center hover:bg-red-200 transition-colors ml-2"
                    >
                      <i className="ri-delete-bin-line text-xs"></i>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}


        {/* Edit Customer Modal (root level) */}
        {showEditCustomerModal && editCustomer && (
          <Modal>
            <div className="bg-white rounded-lg p-6 w-96 max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Editar Cliente</h3>
                <button onClick={() => setShowEditCustomerModal(false)} className="text-gray-400 hover:text-gray-600">
                  <i className="ri-close-line"></i>
                </button>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); saveEditedCustomer(); }} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                  <input
                    type="text"
                    value={editCustomer.name}
                    onChange={(e) => setEditCustomer(prev => ({ ...(prev as Customer), name: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Documento *</label>
                  <input
                    type="text"
                    value={editCustomer.document}
                    onChange={(e) => setEditCustomer(prev => ({ ...(prev as Customer), document: formatDocument(e.target.value) }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                  <input
                    type="tel"
                    value={editCustomer.phone}
                    onChange={(e) => setEditCustomer(prev => ({ ...(prev as Customer), phone: formatPhone(e.target.value) }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={editCustomer.email}
                    onChange={(e) => setEditCustomer(prev => ({ ...(prev as Customer), email: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                  <textarea
                    value={editCustomer.address}
                    onChange={(e) => setEditCustomer(prev => ({ ...(prev as Customer), address: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={2}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Cliente</label>
                  <select
                    value={editCustomer.type}
                    onChange={(e) => setEditCustomer(prev => ({ ...(prev as Customer), type: e.target.value as 'regular' | 'vip' }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-8"
                  >
                    <option value="regular">Regular</option>
                    <option value="vip">VIP</option>
                  </select>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button type="button" onClick={() => setShowEditCustomerModal(false)} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">Cancelar</button>
                  <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">Guardar Cambios</button>
                </div>
              </form>
            </div>
          </Modal>
        )}

        </div>

        {cart.length > 0 && (
          <div className="p-6 border-t border-gray-200">
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span>RD${getSubtotal().toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>ITBIS (18%):</span>
                <span>RD${getTax().toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>Total:</span>
                <span>RD${getTotal().toFixed(2)}</span>
              </div>
            </div>
            
            <button
              onClick={() => setShowPaymentModal(true)}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors whitespace-nowrap"
            >
              Procesar Pago
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const renderSales = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-900">Historial de Ventas</h2>
        <button
          onClick={exportSalesReport}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors whitespace-nowrap"
        >
          <i className="ri-download-line mr-2"></i>
          Exportar Reporte
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID Venta</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Método</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sales.map((sale) => (
                <tr key={sale.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{sale.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {sale.date} {sale.time}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {sale.customer?.name || 'Cliente General'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {sale.items.length} productos
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    RD${sale.total.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                    {sale.paymentMethod === 'cash' ? 'Efectivo' : 
                     sale.paymentMethod === 'card' ? 'Tarjeta' : 'Transferencia'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      sale.status === 'completed' ? 'bg-green-100 text-green-800' :
                      sale.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {sale.status === 'completed' ? 'Completada' : 
                       sale.status === 'cancelled' ? 'Cancelada' : 'Reembolsada'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );


  const renderReports = () => {
    const todayStats = getTodayStats();
    const topProducts = getTopProducts();
    
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-gray-900">Reportes y Análisis</h2>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Resumen del Día</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Ventas:</span>
                <span className="font-medium">{todayStats.totalSales}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Ingresos:</span>
                <span className="font-medium">RD${todayStats.totalAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Promedio por Venta:</span>
                <span className="font-medium">
                  RD${todayStats.totalSales > 0 ? (todayStats.totalAmount / todayStats.totalSales).toFixed(0) : '0'}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Métodos de Pago</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Efectivo:</span>
                <span className="font-medium">{todayStats.cashSales} ventas</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Tarjeta:</span>
                <span className="font-medium">{todayStats.cardSales} ventas</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Transferencia:</span>
                <span className="font-medium">{todayStats.transferSales} ventas</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Estadísticas Generales</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Clientes:</span>
                <span className="font-medium">{customers.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Clientes VIP:</span>
                <span className="font-medium">{customers.filter(c => c.type === 'vip').length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Productos Activos:</span>
                <span className="font-medium">{products.length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Top Products Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Productos Más Vendidos</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Posición</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Producto</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cantidad Vendida</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ingresos</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {topProducts.map((product, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{product.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.quantity} unidades</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      RD${product.revenue.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Punto de Ventas</h1>
            <p className="text-gray-600">Sistema completo de ventas y gestión</p>
          </div>
          <button
            onClick={() => window.location.href = '/dashboard'}
            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors whitespace-nowrap"
          >
            <i className="ri-arrow-left-line mr-2"></i>
            Volver al Inicio
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'dashboard', name: 'Dashboard', icon: 'ri-dashboard-line' },
              { id: 'pos', name: 'Punto de Venta', icon: 'ri-shopping-cart-line' },
              { id: 'sales', name: 'Ventas', icon: 'ri-file-list-line' },
              { id: 'reports', name: 'Reportes', icon: 'ri-bar-chart-line' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <i className={`${tab.icon} mr-2`}></i>
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'pos' && renderPOS()}
        {activeTab === 'sales' && renderSales()}
        {activeTab === 'reports' && renderReports()}

        {/* Customer Selection Modal */}
        {showCustomerModal && (
          <Modal>
            <div className="bg-white rounded-lg p-6 w-96 max-h-96 overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Seleccionar Cliente</h3>
                <button
                  onClick={() => setShowCustomerModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <i className="ri-close-line"></i>
                </button>
              </div>
              
              <div className="space-y-2">
                <button
                  onClick={() => {
                    setSelectedCustomer(null);
                    setShowCustomerModal(false);
                  }}
                  className="w-full text-left p-3 hover:bg-gray-50 rounded-lg border"
                >
                  <div className="font-medium">Cliente General</div>
                  <div className="text-sm text-gray-500">Sin información específica</div>
                </button>
                
                {customers.map((customer) => (
                  <button
                    key={customer.id}
                    onClick={() => {
                      setSelectedCustomer(customer);
                      setShowCustomerModal(false);
                    }}
                    className="w-full text-left p-3 hover:bg-gray-50 rounded-lg border"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{customer.name}</div>
                        <div className="text-sm text-gray-500">{customer.document}</div>
                      </div>
                      {customer.type === 'vip' && (
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                          VIP
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </Modal>
        )}

        {/* Payment Modal */}
        {showPaymentModal && (
          <Modal>
            <div className="bg-white rounded-lg p-6 w-96">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Procesar Pago</h3>
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <i className="ri-close-line"></i>
                </button>
              </div>
              
              <div className="mb-4">
                <div className="text-2xl font-bold text-center mb-4">
                  Total: RD${getTotal().toFixed(2)}
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Método de Pago
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-8"
                  >
                    <option value="cash">Efectivo</option>
                    <option value="card">Tarjeta</option>
                    <option value="transfer">Transferencia</option>
                  </select>
                </div>
                
                {paymentMethod === 'cash' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Monto Recibido
                    </label>
                    <input
                      type="text"
                      value={amountReceived}
                      onChange={(e) => setAmountReceived(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0.00"
                    />
                    {amountReceived && (
                      <div className="mt-2 text-sm">
                        Cambio: RD${Math.max(0, parseFloat(amountReceived) - getTotal()).toFixed(2)}
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <button
                onClick={processPayment}
                className="w-full bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 transition-colors whitespace-nowrap"
              >
                Confirmar Pago
              </button>
            </div>
          </Modal>
        )}

        {/* New Customer Modal */}
        {showNewCustomerModal && (
          <Modal>
            <div className="bg-white rounded-lg p-6 w-96 max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Nuevo Cliente</h3>
                <button
                  onClick={() => setShowNewCustomerModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <i className="ri-close-line"></i>
                </button>
              </div>
              
              <form onSubmit={(e) => { e.preventDefault(); addNewCustomer(); }} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre *
                  </label>
                  <input
                    type="text"
                    value={newCustomer.name}
                    onChange={(e) => setNewCustomer(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Documento *
                  </label>
                  <input
                    type="text"
                    value={newCustomer.document}
                    onChange={(e) => setNewCustomer(prev => ({ ...prev, document: formatDocument(e.target.value) }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="001-1234567-8"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    value={newCustomer.phone}
                    onChange={(e) => setNewCustomer(prev => ({ ...prev, phone: formatPhone(e.target.value) }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="809-123-4567"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={newCustomer.email}
                    onChange={(e) => setNewCustomer(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="cliente@email.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Dirección
                  </label>
                  <textarea
                    value={newCustomer.address}
                    onChange={(e) => setNewCustomer(prev => ({ ...prev, address: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={2}
                    placeholder="Dirección completa"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo de Cliente
                  </label>
                  <select
                    value={newCustomer.type}
                    onChange={(e) => setNewCustomer(prev => ({ ...prev, type: e.target.value as 'regular' | 'vip' }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-8"
                  >
                    <option value="regular">Regular</option>
                    <option value="vip">VIP</option>
                  </select>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowNewCustomerModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
                  >
                    Guardar Cliente
                  </button>
                </div>
              </form>
            </div>
          </Modal>
        )}
      </div>
    </DashboardLayout>
  );
}
