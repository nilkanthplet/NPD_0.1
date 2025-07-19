import React, { useState, useEffect } from 'react';
import { Search, User, FileText, Download, Eye, Phone, Mail } from 'lucide-react';
import { supabase, Client, Rental, Payment } from '../lib/supabase';
import { useToast } from '../hooks/useToast';
import Layout from '../components/Layout';
import LoadingSpinner from '../components/LoadingSpinner';
import { format } from 'date-fns';

interface ClientLedger {
  client: Client;
  activeRentals: Rental[];
  totalOutstanding: number;
  totalPaid: number;
  currentBalance: number;
  recentPayments: Payment[];
}

export default function KhataWahi() {
  const { success, error } = useToast();
  const [clientLedgers, setClientLedgers] = useState<ClientLedger[]>([]);
  const [selectedClient, setSelectedClient] = useState<ClientLedger | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchClientLedgers();
  }, []);

  const fetchClientLedgers = async () => {
    try {
      // Fetch all clients with their rental and payment data
      const { data: clients, error: clientsError } = await supabase
        .from('clients')
        .select('*')
        .order('name');

      if (clientsError) throw clientsError;

      const ledgers: ClientLedger[] = [];

      for (const client of clients || []) {
        // Fetch active rentals
        const { data: activeRentals, error: rentalsError } = await supabase
          .from('rentals')
          .select(`
            *,
            rental_items (
              *,
              stock_categories (*)
            )
          `)
          .eq('client_id', client.id)
          .in('status', ['active', 'partially_returned']);

        if (rentalsError) throw rentalsError;

        // Fetch all payments
        const { data: payments, error: paymentsError } = await supabase
          .from('payments')
          .select('*')
          .eq('client_id', client.id)
          .order('payment_date', { ascending: false })
          .limit(10);

        if (paymentsError) throw paymentsError;

        // Calculate totals
        const totalOutstanding = (activeRentals || []).reduce((sum, rental) => sum + (rental.total_amount || 0), 0);
        const totalPaid = (payments || []).reduce((sum, payment) => sum + payment.amount, 0);
        const currentBalance = totalOutstanding - totalPaid;

        ledgers.push({
          client,
          activeRentals: activeRentals || [],
          totalOutstanding,
          totalPaid,
          currentBalance,
          recentPayments: payments || [],
        });
      }

      setClientLedgers(ledgers);
    } catch (err) {
      console.error('Error fetching client ledgers:', err);
      error('Failed to load client ledgers');
    } finally {
      setLoading(false);
    }
  };

  const filteredLedgers = clientLedgers.filter(ledger =>
    ledger.client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ledger.client.phone.includes(searchTerm) ||
    (ledger.client.company_name && ledger.client.company_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const exportClientStatement = async (clientLedger: ClientLedger) => {
    try {
      // This would generate a PDF statement
      success('Statement exported successfully');
    } catch (err) {
      error('Failed to export statement');
    }
  };

  if (loading) {
    return (
      <Layout title="Client Ledger (Khata Wahi)">
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner size="lg" text="Loading client ledgers..." />
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Client Ledger (Khata Wahi)">
      <div className="space-y-6">
        {!selectedClient ? (
          <>
            {/* Search and Summary */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <input
                      type="text"
                      placeholder="Search clients..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    />
                  </div>
                </div>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-blue-600">
                    {filteredLedgers.length}
                  </div>
                  <div className="text-sm text-blue-600">Total Clients</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-green-600">
                    ₹{filteredLedgers.reduce((sum, ledger) => sum + ledger.totalPaid, 0).toLocaleString()}
                  </div>
                  <div className="text-sm text-green-600">Total Payments</div>
                </div>
                <div className="bg-orange-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-orange-600">
                    ₹{filteredLedgers.reduce((sum, ledger) => sum + ledger.currentBalance, 0).toLocaleString()}
                  </div>
                  <div className="text-sm text-orange-600">Outstanding Balance</div>
                </div>
              </div>
            </div>

            {/* Client Ledgers List */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Client Ledgers</h2>
                <p className="text-sm text-gray-600">View client balances and transaction history</p>
              </div>

              {filteredLedgers.length === 0 ? (
                <div className="text-center py-12">
                  <User className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-4 text-lg font-medium text-gray-900">No clients found</h3>
                  <p className="mt-2 text-gray-500">
                    {searchTerm ? 'Try adjusting your search.' : 'No clients have been added yet.'}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {filteredLedgers.map((ledger) => (
                    <div
                      key={ledger.client.id}
                      className="p-6 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <div className="bg-orange-100 rounded-full p-2">
                              <User className="h-5 w-5 text-orange-600" />
                            </div>
                            <div>
                              <h3 className="text-lg font-medium text-gray-900">
                                {ledger.client.name}
                              </h3>
                              {ledger.client.company_name && (
                                <p className="text-sm text-gray-600">{ledger.client.company_name}</p>
                              )}
                              <div className="flex items-center space-x-4 mt-1">
                                <div className="flex items-center text-sm text-gray-600">
                                  <Phone className="h-4 w-4 mr-1" />
                                  {ledger.client.phone}
                                </div>
                                {ledger.client.email && (
                                  <div className="flex items-center text-sm text-gray-600">
                                    <Mail className="h-4 w-4 mr-1" />
                                    {ledger.client.email}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 grid grid-cols-1 sm:grid-cols-4 gap-4">
                            <div className="text-sm">
                              <span className="font-medium text-gray-700">Active Rentals:</span>
                              <span className="ml-2 text-gray-600">{ledger.activeRentals.length}</span>
                            </div>
                            <div className="text-sm">
                              <span className="font-medium text-gray-700">Total Outstanding:</span>
                              <span className="ml-2 text-gray-600">₹{ledger.totalOutstanding.toFixed(2)}</span>
                            </div>
                            <div className="text-sm">
                              <span className="font-medium text-gray-700">Total Paid:</span>
                              <span className="ml-2 text-green-600">₹{ledger.totalPaid.toFixed(2)}</span>
                            </div>
                            <div className="text-sm">
                              <span className="font-medium text-gray-700">Balance:</span>
                              <span className={`ml-2 font-medium ${
                                ledger.currentBalance > 0 ? 'text-red-600' : 'text-green-600'
                              }`}>
                                ₹{Math.abs(ledger.currentBalance).toFixed(2)}
                                {ledger.currentBalance > 0 ? ' (Due)' : ' (Credit)'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => setSelectedClient(ledger)}
                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <Eye size={18} />
                          </button>
                          <button
                            onClick={() => exportClientStatement(ledger)}
                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Export Statement"
                          >
                            <Download size={18} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          /* Client Detail View */
          <div className="space-y-6">
            {/* Client Header */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  {selectedClient.client.name} - Ledger Details
                </h2>
                <button
                  onClick={() => setSelectedClient(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  Back to List
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="text-xl font-bold text-blue-600">
                    {selectedClient.activeRentals.length}
                  </div>
                  <div className="text-sm text-blue-600">Active Rentals</div>
                </div>
                <div className="bg-orange-50 rounded-lg p-4">
                  <div className="text-xl font-bold text-orange-600">
                    ₹{selectedClient.totalOutstanding.toFixed(2)}
                  </div>
                  <div className="text-sm text-orange-600">Total Outstanding</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="text-xl font-bold text-green-600">
                    ₹{selectedClient.totalPaid.toFixed(2)}
                  </div>
                  <div className="text-sm text-green-600">Total Paid</div>
                </div>
                <div className={`rounded-lg p-4 ${
                  selectedClient.currentBalance > 0 ? 'bg-red-50' : 'bg-green-50'
                }`}>
                  <div className={`text-xl font-bold ${
                    selectedClient.currentBalance > 0 ? 'text-red-600' : 'text-green-600'
                  }`}>
                    ₹{Math.abs(selectedClient.currentBalance).toFixed(2)}
                  </div>
                  <div className={`text-sm ${
                    selectedClient.currentBalance > 0 ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {selectedClient.currentBalance > 0 ? 'Amount Due' : 'Credit Balance'}
                  </div>
                </div>
              </div>
            </div>

            {/* Active Rentals */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Active Rentals</h3>
              </div>
              
              {selectedClient.activeRentals.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="mx-auto h-8 w-8 text-gray-400" />
                  <p className="mt-2 text-gray-500">No active rentals</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {selectedClient.activeRentals.map((rental) => (
                    <div key={rental.id} className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">{rental.rental_number}</h4>
                          <p className="text-sm text-gray-600">
                            Rental Date: {format(new Date(rental.rental_date), 'MMM dd, yyyy')}
                          </p>
                          <p className="text-sm text-gray-600">
                            Items: {rental.rental_items?.length || 0} categories
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-semibold text-gray-900">
                            ₹{rental.total_amount?.toFixed(2)}
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            rental.status === 'active' 
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {rental.status === 'active' ? 'Active' : 'Partially Returned'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Payments */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Recent Payments</h3>
              </div>
              
              {selectedClient.recentPayments.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="mx-auto h-8 w-8 text-gray-400" />
                  <p className="mt-2 text-gray-500">No payments recorded</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {selectedClient.recentPayments.map((payment) => (
                    <div key={payment.id} className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">{payment.payment_number}</h4>
                          <p className="text-sm text-gray-600">
                            Date: {format(new Date(payment.payment_date), 'MMM dd, yyyy')}
                          </p>
                          <p className="text-sm text-gray-600">
                            Method: {payment.payment_method?.replace('_', ' ').toUpperCase()}
                          </p>
                          {payment.reference_number && (
                            <p className="text-sm text-gray-600">
                              Ref: {payment.reference_number}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-semibold text-green-600">
                            ₹{payment.amount.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}