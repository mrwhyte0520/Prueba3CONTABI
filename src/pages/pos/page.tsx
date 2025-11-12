
import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';

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
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    document: '',
    phone: '',
    email: '',
    address: '',
    type: 'regular' as 'regular' | 'vip'
  });

  // Load data from localStorage
  useEffect(() => {
    loadProducts();
    loadSales();
    loadCustomers();
  }, []);

  const loadProducts = () => {
    const savedProducts = localStorage.getItem('contabi_products');
    if (savedProducts) {
      const parsedProducts = JSON.parse(savedProducts);
      const activeProducts = parsedProducts.filter((product: Product) => product.status === 'active');
      setProducts(activeProducts);
    } else {
      const defaultProducts: Product[] = [
        { 
          id: '1', 
          name: 'Laptop Dell Inspiron', 
          price: 45000, 
          stock: 15, 
          category: 'Electrónicos', 
          barcode: '123456789',
          imageUrl: 'https://readdy.ai/api/search-image?query=modern%20silver%20laptop%20computer%20Dell%20Inspiron%20on%20clean%20white%20background%2C%20professional%20product%20photography%2C%20high%20quality%2C%20detailed%20view%2C%20technology%20device&width=300&height=300&seq=laptop001&orientation=squarish',
          sku: 'DELL-INS-15-001',
          cost: 35000,
          minStock: 5,
          maxStock: 50,
          description: 'Laptop Dell Inspiron 15 with 8GB RAM and 256GB SSD',
          supplier: 'Dell Technologies',
          status: 'active'
        },
        { 
          id: '2', 
          name: 'Mouse Logitech', 
          price: 1200, 
          stock: 50, 
          category: 'Accesorios', 
          barcode: '987654321',
          imageUrl: 'https://readdy.ai/api/search-image?query=black%20wireless%20computer%20mouse%20Logitech%20on%20clean%20white%20background%2C%20professional%20product%20photography%2C%20high%20quality%2C%20detailed%20view%2C%20technology%20accessory&width=300&height=300&seq=mouse001&orientation=squarish',
          sku: 'LOG-MX-MST-001',
          cost: 800,
          minStock: 10,
          maxStock: 100,
          description: 'Wireless mouse Logitech MX Master with precision tracking',
          supplier: 'Logitech',
          status: 'active'
        },
        { 
          id: '3', 
          name: 'Teclado Mecánico', 
          price: 3500, 
          stock: 25, 
          category: 'Accesorios', 
          barcode: '456789123',
          imageUrl: 'https://readdy.ai/api/search-image?query=black%20mechanical%20keyboard%20with%20RGB%20lighting%20on%20clean%20white%20background%2C%20professional%20product%20photography%2C%20high%20quality%2C%20detailed%20view%2C%20gaming%20accessory&width=300&height=300&seq=keyboard001&orientation=squarish',
          sku: 'KEY-MECH-001',
          cost: 2500,
          minStock: 5,
          maxStock: 50,
          description: 'Mechanical keyboard with RGB lighting',
          supplier: 'Gaming Tech',
          status: 'active'
        },
        { 
          id: '4', 
          name: 'Monitor 24"', 
          price: 18000, 
          stock: 8, 
          category: 'Electrónicos', 
          barcode: '789123456',
          imageUrl: 'https://readdy.ai/api/search-image?query=24%20inch%20computer%20monitor%20display%20screen%20on%20clean%20white%20background%2C%20professional%20product%20photography%2C%20high%20quality%2C%20detailed%20view%2C%20technology%20device&width=300&height=300&seq=monitor001&orientation=squarish',
          sku: 'MON-24-001',
          cost: 14000,
          minStock: 3,
          maxStock: 20,
          description: '24 inch Full HD monitor',
          supplier: 'Display Corp',
          status: 'active'
        },
        { 
          id: '5', 
          name: 'Impresora HP', 
          price: 8500, 
          stock: 12, 
          category: 'Oficina', 
          barcode: '321654987',
          imageUrl: 'https://readdy.ai/api/search-image?query=white%20HP%20inkjet%20printer%20on%20clean%20white%20background%2C%20professional%20product%20photography%2C%20high%20quality%2C%20detailed%20view%2C%20office%20equipment&width=300&height=300&seq=printer001&orientation=squarish',
          sku: 'HP-PRT-001',
          cost: 6500,
          minStock: 2,
          maxStock: 15,
          description: 'HP Inkjet printer with wireless connectivity',
          supplier: 'HP Inc',
          status: 'active'
        },
        { 
          id: '6', 
          name: 'Cable HDMI', 
          price: 800, 
          stock: 100, 
          category: 'Accesorios', 
          barcode: '654987321',
          imageUrl: 'https://readdy.ai/api/search-image?query=black%20HDMI%20cable%20connector%20on%20clean%20white%20background%2C%20professional%20product%20photography%2C%20high%20quality%2C%20detailed%20view%2C%20technology%20accessory&width=300&height=300&seq=hdmi001&orientation=squarish',
          sku: 'HDMI-CBL-001',
          cost: 500,
          minStock: 20,
          maxStock: 200,
          description: 'High-speed HDMI cable 2 meters',
          supplier: 'Cable Solutions',
          status: 'active'
        },
        { 
          id: '7', 
          name: 'Auriculares Bluetooth', 
          price: 2500, 
          stock: 30, 
          category: 'Accesorios', 
          barcode: '789456123',
          imageUrl: 'https://readdy.ai/api/search-image?query=black%20wireless%20bluetooth%20headphones%20on%20clean%20white%20background%2C%20professional%20product%20photography%2C%20high%20quality%2C%20detailed%20view%2C%20audio%20accessory&width=300&height=300&seq=headphones001&orientation=squarish',
          sku: 'BT-HEAD-001',
          cost: 1800,
          minStock: 5,
          maxStock: 60,
          description: 'Wireless Bluetooth headphones with noise cancellation',
          supplier: 'Audio Tech',
          status: 'active'
        },
        { 
          id: '8', 
          name: 'Webcam HD', 
          price: 3200, 
          stock: 18, 
          category: 'Electrónicos', 
          barcode: '147258369',
          imageUrl: 'https://readdy.ai/api/search-image?query=black%20HD%20webcam%20camera%20on%20clean%20white%20background%2C%20professional%20product%20photography%2C%20high%20quality%2C%20detailed%20view%2C%20technology%20device&width=300&height=300&seq=webcam001&orientation=squarish',
          sku: 'WEB-HD-001',
          cost: 2400,
          minStock: 3,
          maxStock: 40,
          description: 'HD webcam with auto-focus and built-in microphone',
          supplier: 'Video Solutions',
          status: 'active'
        }
      ];
      setProducts(defaultProducts);
      localStorage.setItem('contabi_products', JSON.stringify(defaultProducts));
    }
  };

  const loadSales = () => {
    const savedSales = localStorage.getItem('contabi_pos_sales');
    if (savedSales) {
      setSales(JSON.parse(savedSales));
    } else {
      // Generate sample sales data
      const sampleSales: Sale[] = [
        {
          id: 'SALE-001',
          date: '2024-01-15',
          time: '10:30:00',
          customer: null,
          items: [
            { id: '1', name: 'Laptop Dell Inspiron', price: 45000, stock: 15, category: 'Electrónicos', barcode: '123456789', imageUrl: '', sku: 'DELL-INS-15-001', cost: 35000, minStock: 5, maxStock: 50, description: '', supplier: 'Dell', status: 'active', quantity: 1, total: 45000 }
          ],
          subtotal: 45000,
          tax: 8100,
          total: 53100,
          paymentMethod: 'card',
          amountReceived: 53100,
          change: 0,
          status: 'completed',
          cashier: 'Admin'
        },
        {
          id: 'SALE-002',
          date: '2024-01-15',
          time: '11:45:00',
          customer: { id: '1', name: 'Juan Pérez', document: '001-1234567-8', phone: '809-123-4567', email: 'juan@email.com', address: 'Av. Principal 123', type: 'regular' },
          items: [
            { id: '2', name: 'Mouse Logitech', price: 1200, stock: 50, category: 'Accesorios', barcode: '987654321', imageUrl: '', sku: 'LOG-MX-MST-001', cost: 800, minStock: 10, maxStock: 100, description: '', supplier: 'Logitech', status: 'active', quantity: 2, total: 2400 },
            { id: '3', name: 'Teclado Mecánico', price: 3500, stock: 25, category: 'Accesorios', barcode: '456789123', imageUrl: '', sku: 'KEY-MECH-001', cost: 2500, minStock: 5, maxStock: 50, description: '', supplier: 'Gaming Tech', status: 'active', quantity: 1, total: 3500 }
          ],
          subtotal: 5900,
          tax: 1062,
          total: 6962,
          paymentMethod: 'cash',
          amountReceived: 7000,
          change: 38,
          status: 'completed',
          cashier: 'Admin'
        },
        {
          id: 'SALE-003',
          date: '2024-01-15',
          time: '14:20:00',
          customer: { id: '2', name: 'María García', document: '001-2345678-9', phone: '809-234-5678', email: 'maria@email.com', address: 'Calle Secundaria 456', type: 'vip' },
          items: [
            { id: '4', name: 'Monitor 24"', price: 18000, stock: 8, category: 'Electrónicos', barcode: '789123456', imageUrl: '', sku: 'MON-24-001', cost: 14000, minStock: 3, maxStock: 20, description: '', supplier: 'Display Corp', status: 'active', quantity: 1, total: 18000 }
          ],
          subtotal: 18000,
          tax: 3240,
          total: 21240,
          paymentMethod: 'transfer',
          amountReceived: 21240,
          change: 0,
          status: 'completed',
          cashier: 'Admin'
        }
      ];
      setSales(sampleSales);
      localStorage.setItem('contabi_pos_sales', JSON.stringify(sampleSales));
    }
  };

  const loadCustomers = () => {
    const savedCustomers = localStorage.getItem('contabi_pos_customers');
    if (savedCustomers) {
      setCustomers(JSON.parse(savedCustomers));
    } else {
      const defaultCustomers: Customer[] = [
        { id: '1', name: 'Juan Pérez', document: '001-1234567-8', phone: '809-123-4567', email: 'juan@email.com', address: 'Av. Principal 123, Santo Domingo', type: 'regular' },
        { id: '2', name: 'María García', document: '001-2345678-9', phone: '809-234-5678', email: 'maria@email.com', address: 'Calle Secundaria 456, Santiago', type: 'vip' },
        { id: '3', name: 'Carlos Rodríguez', document: '001-3456789-0', phone: '809-345-6789', email: 'carlos@email.com', address: 'Av. Libertad 789, La Romana', type: 'regular' },
        { id: '4', name: 'Ana Martínez', document: '001-4567890-1', phone: '809-456-7890', email: 'ana@email.com', address: 'Calle Central 321, Puerto Plata', type: 'vip' },
        { id: '5', name: 'Luis Fernández', document: '001-5678901-2', phone: '809-567-8901', email: 'luis@email.com', address: 'Av. Norte 654, San Pedro', type: 'regular' }
      ];
      setCustomers(defaultCustomers);
      localStorage.setItem('contabi_pos_customers', JSON.stringify(defaultCustomers));
    }
  };

  const categories = ['all', 'Electrónicos', 'Accesorios', 'Oficina', 'Hogar'];

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

  const getSubtotal = () => cart.reduce((sum, item) => sum + item.total, 0);
  const getTax = () => getSubtotal() * 0.18; // 18% ITBIS
  const getTotal = () => getSubtotal() + getTax();

  const processPayment = () => {
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

      // Update sales
      const updatedSales = [newSale, ...sales];
      setSales(updatedSales);
      localStorage.setItem('contabi_pos_sales', JSON.stringify(updatedSales));

      // Update product stock
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

  const addNewCustomer = () => {
    if (!newCustomer.name || !newCustomer.document) {
      alert('Nombre y documento son requeridos');
      return;
    }

    const customer: Customer = {
      id: Date.now().toString(),
      ...newCustomer
    };

    const updatedCustomers = [...customers, customer];
    setCustomers(updatedCustomers);
    localStorage.setItem('contabi_pos_customers', JSON.stringify(updatedCustomers));
    
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

  const exportSalesReport = () => {
    const csvContent = [
      ['ID Venta', 'Fecha', 'Hora', 'Cliente', 'Subtotal', 'Impuesto', 'Total', 'Método Pago', 'Estado'].join(','),
      ...sales.map(sale => [
        sale.id,
        sale.date,
        sale.time,
        sale.customer?.name || 'Cliente General',
        sale.subtotal.toFixed(2),
        sale.tax.toFixed(2),
        sale.total.toFixed(2),
        sale.paymentMethod,
        sale.status
      ].join(','))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `reporte_ventas_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
                <i className="ri-box-line text-orange-600 text-xl"></i>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => addToCart(product)}
            >
              <div className="w-full h-32 mb-3 bg-gray-100 rounded-lg overflow-hidden">
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="w-full h-full object-cover object-top"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDMwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xNTAgMTAwQzE2MS4wNDYgMTAwIDE3MCA5MC45NTQzIDE3MCA4MEM1NyA2OS4wNDU3IDE0Ny45NTQgNjAgMTM2IDYwQzEyNC45NTQgNjAgMTE2IDY5LjA0NTcgMTE2IDgwQzExNiA5MC45NTQzIDEyNC45NTQgMTAwIDEzNiAxMDBIMTUwWiIgZmlsbD0iIzlDQTNBRiIvPgo8cGF0aCBkPSJNMTg2IDEyMEgxMTRDMTA3LjM3MyAxMjAgMTAyIDEyNS4zNzMgMTAyIDEzMlYyMDBDMTAyIDIwNi2MjcgMTA3LjM3MyAyMTIgMTE0IDIxMkgxODZDMTkyLjYyNyAyMTIgMTk4IDIwNi4yMjJgMTk0IDIwMFYxMzJDMTk0IDEyNS4zNzMgMTkyLjYyNyAxMjAgMTg2IDEyMFoiIGZpbGw9IiM5Q0EzQUYiLz4KPC9zdmc+';
                  }}
                />
              </div>

              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500">{product.category}</span>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  product.stock > 10 ? 'bg-green-100 text-green-800' :
                  product.stock > 0 ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  Stock: {product.stock}
                </span>
              </div>
              <h3 className="font-medium text-gray-900 mb-2 text-sm">{product.name}</h3>
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-blue-600">
                  RD${product.price.toLocaleString()}
                </span>
                <button className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors">
                  <i className="ri-add-line"></i>
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
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-full h-full object-cover object-top"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQ4IiBoZWlnaHQ9IjQ4IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0yNCAyMEMyNi4yMDkxIDIwIDI4IDE4LjIwOTEgMjggMTZDMjggMTMuNzkwOSAyNi4yMDkxIDEyIDI0IDEyQzIxLjc5MDkgMTIgMjAgMTMuNzkwOSAyMCAxNkMyMCAxOC4yMDkxIDIxLjc5MDkgMjAgMjQgMjBaIiBmaWxsPSIjOUNBM0FGIi8+CjxwYXRoIGQ9Ik0zMiAyNEgxNkMxNC44OTU0IDI0IDE0IDI0Ljg5NTQgMTQgMjZWMzRDMTQgMzUuMTA0NiAxNC44OTU0IDM2IDE2IDM2SDMyQzMzLjEwNDYgMzYgMzQgMzUuMTA0NiAzNCAzNFYyNkMzNCAyNC44OTU0IDMzLjEwNDYgMjQgMzIgMjRaIiBmaWxsPSIjOUNBM0FGIi8+Cjwvc3ZnPg==';
                      }}
                    />
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

  const renderCustomers = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-900">Gestión de Clientes</h2>
        <button
          onClick={() => setShowNewCustomerModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
        >
          <i className="ri-add-line mr-2"></i>
          Nuevo Cliente
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {customers.map((customer) => (
          <div key={customer.id} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  customer.type === 'vip' ? 'bg-yellow-100' : 'bg-gray-100'
                }`}>
                  <i className={`${customer.type === 'vip' ? 'ri-vip-crown-line text-yellow-600' : 'ri-user-line text-gray-600'}`}></i>
                </div>
                <div className="ml-3">
                  <h3 className="font-medium text-gray-900">{customer.name}</h3>
                  <p className="text-sm text-gray-500">{customer.document}</p>
                </div>
              </div>
              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                customer.type === 'vip' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {customer.type === 'vip' ? 'VIP' : 'Regular'}
              </span>
            </div>
            
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-center">
                <i className="ri-phone-line mr-2"></i>
                <span>{customer.phone}</span>
              </div>
              <div className="flex items-center">
                <i className="ri-mail-line mr-2"></i>
                <span>{customer.email}</span>
              </div>
              <div className="flex items-center">
                <i className="ri-map-pin-line mr-2"></i>
                <span className="truncate">{customer.address}</span>
              </div>
            </div>
          </div>
        ))}
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
              { id: 'customers', name: 'Clientes', icon: 'ri-user-line' },
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
        {activeTab === 'customers' && renderCustomers()}
        {activeTab === 'reports' && renderReports()}

        {/* Customer Selection Modal */}
        {showCustomerModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
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
          </div>
        )}

        {/* Payment Modal */}
        {showPaymentModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
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
                      type="number"
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
          </div>
        )}

        {/* New Customer Modal */}
        {showNewCustomerModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
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
                    onChange={(e) => setNewCustomer({...newCustomer, name: e.target.value})}
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
                    onChange={(e) => setNewCustomer({...newCustomer, document: e.target.value})}
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
                    onChange={(e) => setNewCustomer({...newCustomer, phone: e.target.value})}
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
                    onChange={(e) => setNewCustomer({...newCustomer, email: e.target.value})}
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
                    onChange={(e) => setNewCustomer({...newCustomer, address: e.target.value})}
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
                    onChange={(e) => setNewCustomer({...newCustomer, type: e.target.value as 'regular' | 'vip'})}
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
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
