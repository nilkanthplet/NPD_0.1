import React, { useState, useEffect } from 'react';
import { Plus, Search, Package, AlertTriangle, TrendingUp, Edit, Trash2 } from 'lucide-react';
import { supabase, StockCategory, StockItem } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/useToast';
import { useRealtimeStock } from '../hooks/useRealtime';
import Layout from '../components/Layout';
import LoadingSpinner from '../components/LoadingSpinner';

interface StockWithCategory extends StockItem {
  stock_categories: StockCategory;
}

export default function Stock() {
  const { user } = useAuth();
  const { success, error } = useToast();
  const { stockUpdates } = useRealtimeStock();
  const [stockItems, setStockItems] = useState<StockWithCategory[]>([]);
  const [stockCategories, setStockCategories] = useState<StockCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<StockCategory | null>(null);
  const [editingStock, setEditingStock] = useState<StockWithCategory | null>(null);

  const [categoryFormData, setCategoryFormData] = useState({
    name: '',
    description: '',
    daily_rate: 0,
    size_specification: '',
    weight_kg: 0,
    material: 'Steel',
  });

  const [stockFormData, setStockFormData] = useState({
    category_id: '',
    total_quantity: 0,
    available_quantity: 0,
    minimum_stock_level: 10,
    location: 'Main Warehouse',
  });

  useEffect(() => {
    fetchStockData();
  }, []);

  useEffect(() => {
    // Refresh stock data when real-time updates occur
    if (stockUpdates.length > 0) {
      fetchStockData();
    }
  }, [stockUpdates]);

  const fetchStockData = async () => {
    try {
      const [stockResult, categoriesResult] = await Promise.all([
        supabase
          .from('stock_items')
          .select(`
            *,
            stock_categories (*)
          `)
          .order('created_at'),
        supabase
          .from('stock_categories')
          .select('*')
          .order('name')
      ]);

      if (stockResult.error) throw stockResult.error;
      if (categoriesResult.error) throw categoriesResult.error;

      setStockItems(stockResult.data || []);
      setStockCategories(categoriesResult.data || []);
    } catch (err) {
      console.error('Error fetching stock data:', err);
      error('Failed to load stock data');
    } finally {
      setLoading(false);
    }
  };

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      if (editingCategory) {
        const { error: updateError } = await supabase
          .from('stock_categories')
          .update(categoryFormData)
          .eq('id', editingCategory.id);

        if (updateError) throw updateError;
        success('Category updated successfully');
      } else {
        const { error: insertError } = await supabase
          .from('stock_categories')
          .insert([categoryFormData]);

        if (insertError) throw insertError;
        success('Category created successfully');
      }

      setShowCategoryModal(false);
      setEditingCategory(null);
      resetCategoryForm();
      fetchStockData();
    } catch (err) {
      console.error('Error saving category:', err);
      error('Failed to save category');
    }
  };

  const handleStockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      if (editingStock) {
        const { error: updateError } = await supabase
          .from('stock_items')
          .update({
            ...stockFormData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingStock.id);

        if (updateError) throw updateError;
        success('Stock updated successfully');
      } else {
        const { error: insertError } = await supabase
          .from('stock_items')
          .insert([stockFormData]);

        if (insertError) throw insertError;
        success('Stock added successfully');
      }

      setShowStockModal(false);
      setEditingStock(null);
      resetStockForm();
      fetchStockData();
    } catch (err) {
      console.error('Error saving stock:', err);
      error('Failed to save stock');
    }
  };

  const resetCategoryForm = () => {
    setCategoryFormData({
      name: '',
      description: '',
      daily_rate: 0,
      size_specification: '',
      weight_kg: 0,
      material: 'Steel',
    });
  };

  const resetStockForm = () => {
    setStockFormData({
      category_id: '',
      total_quantity: 0,
      available_quantity: 0,
      minimum_stock_level: 10,
      location: 'Main Warehouse',
    });
  };

  const openCategoryModal = (category?: StockCategory) => {
    if (category) {
      setEditingCategory(category);
      setCategoryFormData({
        name: category.name,
        description: category.description || '',
        daily_rate: category.daily_rate,
        size_specification: category.size_specification || '',
        weight_kg: category.weight_kg || 0,
        material: category.material || 'Steel',
      });
    } else {
      setEditingCategory(null);
      resetCategoryForm();
    }
    setShowCategoryModal(true);
  };

  const openStockModal = (stock?: StockWithCategory) => {
    if (stock) {
      setEditingStock(stock);
      setStockFormData({
        category_id: stock.category_id,
        total_quantity: stock.total_quantity,
        available_quantity: stock.available_quantity,
        minimum_stock_level: stock.minimum_stock_level || 10,
        location: stock.location || 'Main Warehouse',
      });
    } else {
      setEditingStock(null);
      resetStockForm();
    }
    setShowStockModal(true);
  };

  const filteredStockItems = stockItems.filter(item =>
    item.stock_categories.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.location?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const lowStockItems = stockItems.filter(item => 
    item.available_quantity <= (item.minimum_stock_level || 10)
  );

  const totalStockValue = stockItems.reduce((total, item) => 
    total + (item.total_quantity * item.stock_categories.daily_rate * 30), 0
  );

  if (loading) {
    return (
      <Layout title="Stock Management">
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner size="lg" text="Loading stock data..." />
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Stock Management">
      <div className="space-y-6">
        {/* Stock Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-blue-50">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Categories</p>
                <p className="text-2xl font-bold text-gray-900">{stockCategories.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-green-50">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Available Stock</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stockItems.reduce((sum, item) => sum + item.available_quantity, 0)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-orange-50">
                <Package className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Rented Out</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stockItems.reduce((sum, item) => sum + item.rented_quantity, 0)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-red-50">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Low Stock Alerts</p>
                <p className="text-2xl font-bold text-gray-900">{lowStockItems.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Low Stock Alerts */}
        {lowStockItems.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
              <h4 className="text-red-800 font-medium">Low Stock Alert</h4>
            </div>
            <p className="text-red-600 mt-1">
              {lowStockItems.length} item(s) are running low on stock. Consider restocking soon.
            </p>
            <div className="mt-2 space-y-1">
              {lowStockItems.map(item => (
                <p key={item.id} className="text-sm text-red-600">
                  • {item.stock_categories.name}: {item.available_quantity} remaining (min: {item.minimum_stock_level})
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Actions and Search */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  placeholder="Search stock items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => openCategoryModal()}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
              >
                <Plus size={20} />
                <span>Add Category</span>
              </button>
              <button
                onClick={() => openStockModal()}
                className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors flex items-center space-x-2"
              >
                <Plus size={20} />
                <span>Add Stock</span>
              </button>
            </div>
          </div>
        </div>

        {/* Stock Items Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Stock Inventory</h2>
          </div>

          {filteredStockItems.length === 0 ? (
            <div className="text-center py-12">
              <Package className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">No stock items found</h3>
              <p className="mt-2 text-gray-500">
                {searchTerm ? 'Try adjusting your search.' : 'Add your first stock category and items.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Available
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rented
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Damaged
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Daily Rate
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredStockItems.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {item.stock_categories.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {item.stock_categories.size_specification}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.total_quantity}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-sm font-medium ${
                          item.available_quantity <= (item.minimum_stock_level || 10)
                            ? 'text-red-600'
                            : 'text-green-600'
                        }`}>
                          {item.available_quantity}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.rented_quantity}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.damaged_quantity}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ₹{item.stock_categories.daily_rate.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.location}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => openStockModal(item)}
                            className="text-orange-600 hover:text-orange-900"
                          >
                            <Edit size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Category Modal */}
        {showCategoryModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={() => setShowCategoryModal(false)}></div>
              </div>

              <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                <form onSubmit={handleCategorySubmit}>
                  <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                    <div className="mb-4">
                      <h3 className="text-lg font-medium text-gray-900">
                        {editingCategory ? 'Edit Category' : 'Add New Category'}
                      </h3>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Name *</label>
                        <input
                          type="text"
                          required
                          value={categoryFormData.name}
                          onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
                          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">Description</label>
                        <textarea
                          rows={2}
                          value={categoryFormData.description}
                          onChange={(e) => setCategoryFormData({ ...categoryFormData, description: e.target.value })}
                          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Daily Rate (₹) *</label>
                          <input
                            type="number"
                            step="0.01"
                            required
                            value={categoryFormData.daily_rate}
                            onChange={(e) => setCategoryFormData({ ...categoryFormData, daily_rate: parseFloat(e.target.value) || 0 })}
                            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">Weight (kg)</label>
                          <input
                            type="number"
                            step="0.1"
                            value={categoryFormData.weight_kg}
                            onChange={(e) => setCategoryFormData({ ...categoryFormData, weight_kg: parseFloat(e.target.value) || 0 })}
                            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">Size Specification</label>
                        <input
                          type="text"
                          value={categoryFormData.size_specification}
                          onChange={(e) => setCategoryFormData({ ...categoryFormData, size_specification: e.target.value })}
                          placeholder="e.g., 300mm x 300mm"
                          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">Material</label>
                        <select
                          value={categoryFormData.material}
                          onChange={(e) => setCategoryFormData({ ...categoryFormData, material: e.target.value })}
                          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                        >
                          <option value="Steel">Steel</option>
                          <option value="Aluminum">Aluminum</option>
                          <option value="Reinforced Steel">Reinforced Steel</option>
                          <option value="Composite">Composite</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                    <button
                      type="submit"
                      className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-orange-600 text-base font-medium text-white hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 sm:ml-3 sm:w-auto sm:text-sm"
                    >
                      {editingCategory ? 'Update' : 'Add'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCategoryModal(false)}
                      className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Stock Modal */}
        {showStockModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={() => setShowStockModal(false)}></div>
              </div>

              <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                <form onSubmit={handleStockSubmit}>
                  <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                    <div className="mb-4">
                      <h3 className="text-lg font-medium text-gray-900">
                        {editingStock ? 'Edit Stock' : 'Add New Stock'}
                      </h3>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Category *</label>
                        <select
                          required
                          value={stockFormData.category_id}
                          onChange={(e) => setStockFormData({ ...stockFormData, category_id: e.target.value })}
                          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                        >
                          <option value="">Select a category...</option>
                          {stockCategories.map((category) => (
                            <option key={category.id} value={category.id}>
                              {category.name} - ₹{category.daily_rate}/day
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Total Quantity *</label>
                          <input
                            type="number"
                            min="0"
                            required
                            value={stockFormData.total_quantity}
                            onChange={(e) => setStockFormData({ ...stockFormData, total_quantity: parseInt(e.target.value) || 0 })}
                            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">Available Quantity *</label>
                          <input
                            type="number"
                            min="0"
                            max={stockFormData.total_quantity}
                            required
                            value={stockFormData.available_quantity}
                            onChange={(e) => setStockFormData({ ...stockFormData, available_quantity: parseInt(e.target.value) || 0 })}
                            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Minimum Stock Level</label>
                          <input
                            type="number"
                            min="0"
                            value={stockFormData.minimum_stock_level}
                            onChange={(e) => setStockFormData({ ...stockFormData, minimum_stock_level: parseInt(e.target.value) || 10 })}
                            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">Location</label>
                          <input
                            type="text"
                            value={stockFormData.location}
                            onChange={(e) => setStockFormData({ ...stockFormData, location: e.target.value })}
                            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                    <button
                      type="submit"
                      className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-orange-600 text-base font-medium text-white hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 sm:ml-3 sm:w-auto sm:text-sm"
                    >
                      {editingStock ? 'Update' : 'Add'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowStockModal(false)}
                      className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}