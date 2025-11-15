'use client';

import { useState } from 'react';
import { ImportExportButtons } from '@/components/common/ImportExportButtons';

interface Product {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export default function ExampleImportExportPage() {
  const [products, setProducts] = useState<Product[]>([
    { id: '1', name: 'Product 1', price: 10.99, quantity: 100 },
    { id: '2', name: 'Product 2', price: 19.99, quantity: 50 },
    { id: '3', name: 'Product 3', price: 5.99, quantity: 200 },
  ]);

  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Name' },
    { key: 'price', label: 'Price' },
    { key: 'quantity', label: 'Quantity' },
  ];

  const handleImport = (importedData: Product[]) => {
    // Validate and process imported data
    const validProducts = importedData.filter(
      item => item.name && !isNaN(Number(item.price)) && !isNaN(Number(item.quantity))
    );
    
    setProducts(validProducts);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Product Management</h1>
        <ImportExportButtons 
          data={products}
          columns={columns}
          fileName="products"
          onImport={handleImport}
        />
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200">
          <thead>
            <tr className="bg-gray-50">
              {columns.map((column) => (
                <th key={column.key} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {products.map((product) => (
              <tr key={product.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {product.id}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {product.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  ${product.price.toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {product.quantity}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
