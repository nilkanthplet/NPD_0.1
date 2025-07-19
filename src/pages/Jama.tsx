import React, { useState, useEffect } from 'react';
import { Search, Package, AlertTriangle, CheckCircle, Camera } from 'lucide-react';
import { supabase, Rental, RentalItem, ReturnItem } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/useToast';
import Layout from '../components/Layout';
import PhotoCapture from '../components/PhotoCapture';
import LoadingSpinner from '../components/LoadingSpinner';
import { format } from 'date-fns';

interface ReturnFormData {
  rental_id: string;
  return_date: string;
  notes: string;
  inspector_name: string;
}

interface ReturnItemFormData {
  rental_item_id: string;
  returned_quantity: number;
  condition: 'good' | 'damaged' | 'lost';
  damage_cost: number;
  damage_description: string;
  damage_photos: string[];
}

export default function Jama() {
  const { user } = useAuth();
  const { success, error } = useToast();
  const [activeRentals, setActiveRentals] = useState<Rental[]>([]);
  const [selectedRental, setSelectedRental] = useState<Rental | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [returnFormData, setReturnFormData] = useState<ReturnFormData>({
    rental_id: '',
    return_date: format(new Date(), 'yyyy-MM-dd'),
    notes: '',
    inspector_name: '',
  });

  const [returnItems, setReturnItems] = useState<ReturnItemFormData[]>([]);

  useEffect(() => {
    fetchActiveRentals();
  }, []);

  const fetchActiveRentals = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('rentals')
        .select(`
          *,
          clients (*),
          rental_items (
            *,
            stock_categories (*)
          )
        `)
        .in('status', ['active', 'partially_returned'])
        .order('rental_date', { ascending: false });

      if (fetchError) throw fetchError;
      setActiveRentals(data || []);
    } catch (err) {
      console.error('Error fetching active rentals:', err);
      error('Failed to load active rentals');
    } finally {
      setLoading(false);
    }
  };

  const selectRental = (rental: Rental) => {
    setSelectedRental(rental);
    setReturnFormData({
      rental_id: rental.id,
      return_date: format(new Date(), 'yyyy-MM-dd'),
      notes: '',
      inspector_name: '',
    });

    // Initialize return items
    const items = rental.rental_items?.map(item => ({
      rental_item_id: item.id,
      returned_quantity: Math.min(item.pending_quantity || 0, item.quantity),
      condition: 'good' as const,
      damage_cost: 0,
      damage_description: '',
      damage_photos: [],
    })) || [];

    setReturnItems(items);
  };

  const updateReturnItem = (index: number, field: keyof ReturnItemFormData, value: any) => {
    const updatedItems = [...returnItems];
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: value,
    };
    setReturnItems(updatedItems);
  };

  const calculateTotalDamageCost = () => {
    return returnItems.reduce((total, item) => total + item.damage_cost, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedRental) return;

    setProcessing(true);
    try {
      // Create return record
      const { data: returnRecord, error: returnError } = await supabase
        .from('returns')
        .insert([{
          rental_id: returnFormData.rental_id,
          return_date: returnFormData.return_date,
          total_damage_cost: calculateTotalDamageCost(),
          notes: returnFormData.notes,
          inspector_name: returnFormData.inspector_name,
          created_by: user.id,
        }])
        .select()
        .single();

      if (returnError) throw returnError;

      // Create return items
      const returnItemsData = returnItems
        .filter(item => item.returned_quantity > 0)
        .map(item => ({
          return_id: returnRecord.id,
          rental_item_id: item.rental_item_id,
          returned_quantity: item.returned_quantity,
          condition: item.condition,
          damage_cost: item.damage_cost,
          damage_description: item.damage_description,
          damage_photos: item.damage_photos,
        }));

      const { error: itemsError } = await supabase
        .from('return_items')
        .insert(returnItemsData);

      if (itemsError) throw itemsError;

      // Update rental status
      const allItemsReturned = selectedRental.rental_items?.every(rentalItem => {
        const returnItem = returnItems.find(ri => ri.rental_item_id === rentalItem.id);
        return returnItem && (rentalItem.returned_quantity + returnItem.returned_quantity) >= rentalItem.quantity;
      });

      const newStatus = allItemsReturned ? 'completed' : 'partially_returned';
      
      await supabase
        .from('rentals')
        .update({
          status: newStatus,
          actual_return_date: newStatus === 'completed' ? returnFormData.return_date : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedRental.id);

      success('Return processed successfully!');
      setSelectedRental(null);
      setReturnItems([]);
      fetchActiveRentals();
    } catch (err) {
      console.error('Error processing return:', err);
      error('Failed to process return');
    } finally {
      setProcessing(false);
    }
  };

  const filteredRentals = activeRentals.filter(rental =>
    rental.clients?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rental.clients?.phone.includes(searchTerm) ||
    rental.rental_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <Layout title="Process Returns (Jama)">
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner size="lg" text="Loading active rentals..." />
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Process Returns (Jama)">
      <div className="space-y-6">
        {!selectedRental ? (
          <>
            {/* Search and Filter */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <input
                      type="text"
                      placeholder="Search by client name, phone, or rental number..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Active Rentals List */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Active Rentals</h2>
                <p className="text-sm text-gray-600">Select a rental to process returns</p>
              </div>

              {filteredRentals.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-4 text-lg font-medium text-gray-900">No active rentals</h3>
                  <p className="mt-2 text-gray-500">
                    {searchTerm ? 'No rentals match your search.' : 'All rentals have been completed.'}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {filteredRentals.map((rental) => (
                    <div
                      key={rental.id}
                      className="p-6 hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => selectRental(rental)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <div className="bg-orange-100 rounded-full p-2">
                              <Package className="h-5 w-5 text-orange-600" />
                            </div>
                            <div>
                              <h3 className="text-lg font-medium text-gray-900">
                                {rental.clients?.name}
                              </h3>
                              <p className="text-sm text-gray-600">
                                {rental.rental_number} • {rental.clients?.phone}
                              </p>
                            </div>
                          </div>

                          <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="text-sm">
                              <span className="font-medium text-gray-700">Rental Date:</span>
                              <span className="ml-2 text-gray-600">
                                {format(new Date(rental.rental_date), 'MMM dd, yyyy')}
                              </span>
                            </div>
                            <div className="text-sm">
                              <span className="font-medium text-gray-700">Items:</span>
                              <span className="ml-2 text-gray-600">
                                {rental.rental_items?.length || 0} categories
                              </span>
                            </div>
                            <div className="text-sm">
                              <span className="font-medium text-gray-700">Status:</span>
                              <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                                rental.status === 'active' 
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {rental.status === 'active' ? 'Active' : 'Partially Returned'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-lg font-semibold text-gray-900">
                            ₹{rental.total_amount?.toFixed(2)}
                          </div>
                          <div className="text-sm text-gray-500">Total Amount</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          /* Return Processing Form */
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Rental Details */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  Processing Return for {selectedRental.clients?.name}
                </h2>
                <button
                  type="button"
                  onClick={() => setSelectedRental(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  Back to List
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Return Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={returnFormData.return_date}
                    onChange={(e) => setReturnFormData({ ...returnFormData, return_date: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Inspector Name
                  </label>
                  <input
                    type="text"
                    value={returnFormData.inspector_name}
                    onChange={(e) => setReturnFormData({ ...returnFormData, inspector_name: e.target.value })}
                    placeholder="Name of person inspecting returns"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Return Notes
                  </label>
                  <textarea
                    rows={3}
                    value={returnFormData.notes}
                    onChange={(e) => setReturnFormData({ ...returnFormData, notes: e.target.value })}
                    placeholder="Any notes about the return..."
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
              </div>
            </div>

            {/* Return Items */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Return Items</h3>
              
              <div className="space-y-6">
                {returnItems.map((returnItem, index) => {
                  const rentalItem = selectedRental.rental_items?.find(ri => ri.id === returnItem.rental_item_id);
                  if (!rentalItem) return null;

                  const pendingQuantity = rentalItem.quantity - rentalItem.returned_quantity;

                  return (
                    <div key={returnItem.rental_item_id} className="border border-gray-200 rounded-lg p-4">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">
                            {rentalItem.stock_categories?.name}
                          </h4>
                          <div className="text-sm text-gray-600 space-y-1">
                            <p>Rented Quantity: {rentalItem.quantity}</p>
                            <p>Already Returned: {rentalItem.returned_quantity}</p>
                            <p>Pending Return: {pendingQuantity}</p>
                          </div>

                          <div className="mt-4 grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Return Quantity *
                              </label>
                              <input
                                type="number"
                                min="0"
                                max={pendingQuantity}
                                value={returnItem.returned_quantity}
                                onChange={(e) => updateReturnItem(index, 'returned_quantity', parseInt(e.target.value) || 0)}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Condition *
                              </label>
                              <select
                                value={returnItem.condition}
                                onChange={(e) => updateReturnItem(index, 'condition', e.target.value)}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                              >
                                <option value="good">Good</option>
                                <option value="damaged">Damaged</option>
                                <option value="lost">Lost</option>
                              </select>
                            </div>
                          </div>

                          {returnItem.condition !== 'good' && (
                            <div className="mt-4 space-y-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Damage Cost (₹)
                                </label>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={returnItem.damage_cost}
                                  onChange={(e) => updateReturnItem(index, 'damage_cost', parseFloat(e.target.value) || 0)}
                                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                                />
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Damage Description
                                </label>
                                <textarea
                                  rows={2}
                                  value={returnItem.damage_description}
                                  onChange={(e) => updateReturnItem(index, 'damage_description', e.target.value)}
                                  placeholder="Describe the damage or loss..."
                                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                                />
                              </div>
                            </div>
                          )}
                        </div>

                        {returnItem.condition !== 'good' && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Damage Photos
                            </label>
                            <PhotoCapture
                              onPhotoCapture={(photos) => updateReturnItem(index, 'damage_photos', photos)}
                              existingPhotos={returnItem.damage_photos}
                              maxPhotos={3}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Total Damage Cost */}
              {calculateTotalDamageCost() > 0 && (
                <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
                      <span className="font-medium text-red-800">Total Damage Cost</span>
                    </div>
                    <span className="text-lg font-bold text-red-800">
                      ₹{calculateTotalDamageCost().toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => setSelectedRental(null)}
                className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={processing || returnItems.every(item => item.returned_quantity === 0)}
                className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
              >
                {processing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    <span>Process Return</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </Layout>
  );
}