import React, { useState, useEffect } from 'react';
import { Calendar, User, Package, FileText } from 'lucide-react';
import { supabase, Client, StockCategory, StockItem } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/useToast';
import { useRealtimeStock } from '../hooks/useRealtime';
import Layout from '../components/Layout';
import SignatureCapture from '../components/SignatureCapture';
import LoadingSpinner from '../components/LoadingSpinner';
import { format } from 'date-fns';

interface RentalItemForm {
  category_id: string;
  quantity: number;
  daily_rate: number;
}

export default function Udhar() {
  const { user } = useAuth();
  const { success, error } = useToast();
  const { stockUpdates } = useRealtimeStock();
  const [clients, setClients] = useState<Client[]>([]);
  const [stockCategories, setStockCategories] = useState<StockCategory[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    client_id: '',
    rental_date: format(new Date(), 'yyyy-MM-dd'),
    expected_return_date: '',
    notes: '',
  });

  const [rentalItems, setRentalItems] = useState<RentalItemForm[]>([]);
  const [signatureData, setSignatureData] = useState('');

  useEffect(() => {
    fetchClients();
    fetchStockData();
  }, []);

  useEffect(() => {
    // Refresh stock data when real-time updates occur
    if (stockUpdates.length > 0) {
      fetchStockData();
    }
  }, [stockUpdates]);

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('name');

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
      error('Failed to load clients');
    }
  };

  const fetchStockData = async () => {
    try {
      const [categoriesResult, itemsResult] = await Promise.all([
        supabase.from('stock_categories').select('*').order('name'),
        supabase.from('stock_items').select(`
          *,
          stock_categories (*)
        `).order('created_at')
      ]);

      if (categoriesResult.error) throw categoriesResult.error;
      if (itemsResult.error) throw itemsResult.error;

      setStockCategories(categoriesResult.data || []);
      setStockItems(itemsResult.data || []);
    } catch (err) {
      console.error('Error fetching stock data:', err);
      error('Failed to load stock data');
    } finally {
      setLoading(false);
    }
  };

  const addRentalItem = () => {
    if (stockCategories.length > 0) {
      setRentalItems([...rentalItems, {
        category_id: stockCategories[0].id,
        quantity: 1,
        daily_rate: stockCategories[0].daily_rate,
      }]);
    }
  };

  const updateRentalItem = (index: number, field: keyof RentalItemForm, value: string | number) => {
    const updatedItems = [...rentalItems];
    
    if (field === 'category_id' && typeof value === 'string') {
      const category = stockCategories.find(c => c.id === value);
      if (category) {
        updatedItems[index] = {
          ...updatedItems[index],
          category_id: value,
          daily_rate: category.daily_rate,
        };
      }
    } else {
      updatedItems[index] = {
        ...updatedItems[index],
        [field]: value,
      };
    }
    
    setRentalItems(updatedItems);
  };

  const removeRentalItem = (index: number) => {
    setRentalItems(rentalItems.filter((_, i) => i !== index));
  };

  const calculateTotal = () => {
    return rentalItems.reduce((total, item) => {
      return total + (item.quantity * item.daily_rate);
    }, 0);
  };

  const getAvailableQuantity = (categoryId: string) => {
    const stockItem = stockItems.find(item => item.category_id === categoryId);
    return stockItem ? stockItem.available_quantity : 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || rentalItems.length === 0) return;

    setSubmitting(true);
    try {
      // Check stock availability
      for (const item of rentalItems) {
        const availableQty = getAvailableQuantity(item.category_id);
        if (item.quantity > availableQty) {
          error(`Insufficient stock for selected category. Available: ${availableQty}`);
          setSubmitting(false);
          return;
        }
      }

      // Create rental
      const { data: rental, error: rentalError } = await supabase
        .from('rentals')
        .insert([{
          client_id: formData.client_id,
          rental_date: formData.rental_date,
          expected_return_date: formData.expected_return_date || null,
          notes: formData.notes,
          total_amount: calculateTotal(),
          signature_data: signatureData,
          created_by: user.id,
        }])
        .select()
        .single();

      if (rentalError) throw rentalError;

      // Create rental items
      const rentalItemsData = rentalItems.map(item => ({
        rental_id: rental.id,
        category_id: item.category_id,
        quantity: item.quantity,
        daily_rate: item.daily_rate,
      }));

      const { error: itemsError } = await supabase
        .from('rental_items')
        .insert(rentalItemsData);

      if (itemsError) throw itemsError;

      // Update stock quantities
      for (const item of rentalItems) {
        const stockItem = stockItems.find(si => si.category_id === item.category_id);
        if (stockItem) {
          await supabase
            .from('stock_items')
            .update({
              available_quantity: stockItem.available_quantity - item.quantity,
              rented_quantity: stockItem.rented_quantity + item.quantity,
              updated_at: new Date().toISOString(),
            })
            .eq('id', stockItem.id);
        }
      }

      success('Rental created successfully!');
      
      // Reset form
      setFormData({
        client_id: '',
        rental_date: format(new Date(), 'yyyy-MM-dd'),
        expected_return_date: '',
        notes: '',
      });
      setRentalItems([]);
      setSignatureData('');
      
      // Refresh stock data
      fetchStockData();
    } catch (error) {
      console.error('Error creating rental:', error);
      error('Failed to create rental. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Layout title="Issue Rental (Udhar)">
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner size="lg" text="Loading rental form..." />
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Issue Rental (Udhar)">
      <div className="max-w-4xl mx-auto">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Client & Date Selection */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <User className="h-5 w-5 mr-2 text-orange-500" />
              Client Information
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Client *
                </label>
                <select
                  required
                  value={formData.client_id}
                  onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="">Choose a client...</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name} - {client.phone}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rental Date *
                </label>
                <input
                  type="date"
                  required
                  value={formData.rental_date}
                  onChange={(e) => setFormData({ ...formData, rental_date: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expected Return Date
                </label>
                <input
                  type="date"
                  value={formData.expected_return_date}
                  onChange={(e) => setFormData({ ...formData, expected_return_date: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Optional notes..."
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
            </div>
          </div>

          {/* Rental Items */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <Package className="h-5 w-5 mr-2 text-orange-500" />
                Rental Items
              </h2>
              <button
                type="button"
                onClick={addRentalItem}
                className="bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700 transition-colors text-sm"
              >
                Add Item
              </button>
            </div>

            {rentalItems.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No items added yet. Click "Add Item" to start.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {rentalItems.map((item, index) => {
                  const availableQty = getAvailableQuantity(item.category_id);
                  const category = stockCategories.find(c => c.id === item.category_id);
                  
                  return (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Category
                          </label>
                          <select
                            value={item.category_id}
                            onChange={(e) => updateRentalItem(index, 'category_id', e.target.value)}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                          >
                            {stockCategories.map((category) => (
                              <option key={category.id} value={category.id}>
                                {category.name} - ₹{category.daily_rate}/day
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Quantity
                          </label>
                          <input
                            type="number"
                            min="1"
                            max={availableQty}
                            value={item.quantity}
                            onChange={(e) => updateRentalItem(index, 'quantity', parseInt(e.target.value))}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                          />
                          <p className="text-xs text-gray-500 mt-1">Available: {availableQty}</p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Daily Rate (₹)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={item.daily_rate}
                            onChange={(e) => updateRentalItem(index, 'daily_rate', parseFloat(e.target.value))}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="text-sm">
                            <span className="font-medium">Total: ₹{(item.quantity * item.daily_rate).toFixed(2)}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeRentalItem(index)}
                            className="text-red-600 hover:text-red-700 text-sm"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                <div className="border-t pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold">Total Amount:</span>
                    <span className="text-xl font-bold text-orange-600">₹{calculateTotal().toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Digital Signature */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <SignatureCapture
              onSignatureChange={setSignatureData}
              existingSignature={signatureData}
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => window.history.back()}
              className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !formData.client_id || rentalItems.length === 0}
              className="px-6 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4" />
                  <span>Create Rental</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}