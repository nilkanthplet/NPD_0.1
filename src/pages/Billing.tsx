import React, { useState, useEffect } from 'react';
import { Search, FileText, Download, Eye, Plus, Calendar } from 'lucide-react';
import { supabase, Client, Rental, Invoice } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/useToast';
import Layout from '../components/Layout';
import LoadingSpinner from '../components/LoadingSpinner';
import { PDFGenerator, InvoiceData, CompanyInfo } from '../utils/pdfGenerator';
import { format, differenceInDays } from 'date-fns';

export default function Billing() {
  const { user } = useAuth();
  const { success, error } = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [selectedRental, setSelectedRental] = useState<Rental | null>(null);
  const [generatingPDF, setGeneratingPDF] = useState(false);

  const [invoiceFormData, setInvoiceFormData] = useState({
    client_id: '',
    rental_id: '',
    issue_date: format(new Date(), 'yyyy-MM-dd'),
    due_date: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    tax_rate: 18.0,
    notes: '',
  });

  const companyInfo: CompanyInfo = {
    name: 'Centering Plates Rental Co.',
    address: '123 Construction Street, Industrial Area, City - 123456',
    phone: '+91 98765 43210',
    email: 'info@centeringplates.com',
    gst: '27ABCDE1234F1Z5',
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [invoicesResult, clientsResult, rentalsResult] = await Promise.all([
        supabase
          .from('invoices')
          .select(`
            *,
            clients (*),
            rentals (*)
          `)
          .order('created_at', { ascending: false }),
        supabase
          .from('clients')
          .select('*')
          .order('name'),
        supabase
          .from('rentals')
          .select(`
            *,
            clients (*),
            rental_items (
              *,
              stock_categories (*)
            )
          `)
          .in('status', ['active', 'partially_returned', 'completed'])
          .order('rental_date', { ascending: false })
      ]);

      if (invoicesResult.error) throw invoicesResult.error;
      if (clientsResult.error) throw clientsResult.error;
      if (rentalsResult.error) throw rentalsResult.error;

      setInvoices(invoicesResult.data || []);
      setClients(clientsResult.data || []);
      setRentals(rentalsResult.data || []);
    } catch (err) {
      console.error('Error fetching data:', err);
      error('Failed to load billing data');
    } finally {
      setLoading(false);
    }
  };

  const calculateRentalAmount = (rental: Rental) => {
    if (!rental.rental_items) return 0;

    const today = new Date();
    const rentalDate = new Date(rental.rental_date);
    const returnDate = rental.actual_return_date 
      ? new Date(rental.actual_return_date)
      : today;

    const days = Math.max(1, differenceInDays(returnDate, rentalDate) + 1);

    return rental.rental_items.reduce((total, item) => {
      return total + (item.quantity * item.daily_rate * days);
    }, 0);
  };

  const generateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedRental) return;

    try {
      const subtotal = calculateRentalAmount(selectedRental);
      
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert([{
          client_id: invoiceFormData.client_id,
          rental_id: invoiceFormData.rental_id,
          issue_date: invoiceFormData.issue_date,
          due_date: invoiceFormData.due_date,
          subtotal,
          tax_rate: invoiceFormData.tax_rate,
          created_by: user.id,
        }])
        .select(`
          *,
          clients (*),
          rentals (
            *,
            rental_items (
              *,
              stock_categories (*)
            )
          )
        `)
        .single();

      if (invoiceError) throw invoiceError;

      success('Invoice generated successfully');
      setShowInvoiceModal(false);
      setSelectedRental(null);
      resetForm();
      fetchData();

      // Generate PDF
      await generatePDF(invoice);
    } catch (err) {
      console.error('Error generating invoice:', err);
      error('Failed to generate invoice');
    }
  };

  const generatePDF = async (invoice: Invoice) => {
    if (!invoice.clients || !invoice.rentals) return;

    setGeneratingPDF(true);
    try {
      const rental = invoice.rentals;
      const client = invoice.clients;

      const today = new Date();
      const rentalDate = new Date(rental.rental_date);
      const returnDate = rental.actual_return_date 
        ? new Date(rental.actual_return_date)
        : today;

      const days = Math.max(1, differenceInDays(returnDate, rentalDate) + 1);

      const items = rental.rental_items?.map(item => ({
        description: `${item.stock_categories?.name} (${days} days)`,
        quantity: item.quantity,
        rate: item.daily_rate * days,
        amount: item.quantity * item.daily_rate * days,
      })) || [];

      const invoiceData: InvoiceData = {
        invoiceNumber: invoice.invoice_number,
        clientName: client.name,
        clientAddress: client.address,
        clientPhone: client.phone,
        clientGST: client.gst_number,
        issueDate: format(new Date(invoice.issue_date), 'MMM dd, yyyy'),
        dueDate: invoice.due_date ? format(new Date(invoice.due_date), 'MMM dd, yyyy') : undefined,
        items,
        subtotal: invoice.subtotal,
        taxRate: invoice.tax_rate || 18,
        taxAmount: invoice.tax_amount || 0,
        total: invoice.total_amount || 0,
        notes: `Rental Period: ${format(rentalDate, 'MMM dd, yyyy')} to ${format(returnDate, 'MMM dd, yyyy')} (${days} days)`,
      };

      const pdfGenerator = new PDFGenerator();
      const pdf = pdfGenerator.generateInvoice(invoiceData, companyInfo);
      
      // Save PDF
      pdf.save(`Invoice-${invoice.invoice_number}.pdf`);

      success('PDF generated and downloaded successfully');
    } catch (err) {
      console.error('Error generating PDF:', err);
      error('Failed to generate PDF');
    } finally {
      setGeneratingPDF(false);
    }
  };

  const resetForm = () => {
    setInvoiceFormData({
      client_id: '',
      rental_id: '',
      issue_date: format(new Date(), 'yyyy-MM-dd'),
      due_date: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
      tax_rate: 18.0,
      notes: '',
    });
  };

  const openInvoiceModal = (rental?: Rental) => {
    if (rental) {
      setSelectedRental(rental);
      setInvoiceFormData({
        client_id: rental.client_id,
        rental_id: rental.id,
        issue_date: format(new Date(), 'yyyy-MM-dd'),
        due_date: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
        tax_rate: 18.0,
        notes: '',
      });
    } else {
      setSelectedRental(null);
      resetForm();
    }
    setShowInvoiceModal(true);
  };

  const filteredInvoices = invoices.filter(invoice =>
    invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    invoice.clients?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    invoice.clients?.phone.includes(searchTerm)
  );

  const filteredRentals = rentals.filter(rental =>
    !invoices.some(invoice => invoice.rental_id === rental.id)
  );

  if (loading) {
    return (
      <Layout title="Billing & Invoices">
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner size="lg" text="Loading billing data..." />
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Billing & Invoices">
      <div className="space-y-6">
        {/* Billing Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-blue-50">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Invoices</p>
                <p className="text-2xl font-bold text-gray-900">{invoices.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-green-50">
                <FileText className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Paid Invoices</p>
                <p className="text-2xl font-bold text-gray-900">
                  {invoices.filter(inv => inv.status === 'paid').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-orange-50">
                <FileText className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending Invoices</p>
                <p className="text-2xl font-bold text-gray-900">
                  {invoices.filter(inv => inv.status === 'pending').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-purple-50">
                <FileText className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900">
                  ₹{invoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions and Search */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  placeholder="Search invoices..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
            </div>
            <button
              onClick={() => openInvoiceModal()}
              className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors flex items-center space-x-2"
            >
              <Plus size={20} />
              <span>Generate Invoice</span>
            </button>
          </div>
        </div>

        {/* Unbilled Rentals */}
        {filteredRentals.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Unbilled Rentals</h2>
              <p className="text-sm text-gray-600">Rentals that haven't been invoiced yet</p>
            </div>

            <div className="divide-y divide-gray-200">
              {filteredRentals.slice(0, 5).map((rental) => (
                <div key={rental.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-gray-900">
                        {rental.clients?.name}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {rental.rental_number} • {format(new Date(rental.rental_date), 'MMM dd, yyyy')}
                      </p>
                      <p className="text-sm text-gray-600">
                        Items: {rental.rental_items?.length || 0} categories
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold text-gray-900">
                        ₹{calculateRentalAmount(rental).toFixed(2)}
                      </div>
                      <button
                        onClick={() => openInvoiceModal(rental)}
                        className="mt-2 bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors"
                      >
                        Generate Invoice
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Invoices List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Generated Invoices</h2>
          </div>

          {filteredInvoices.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">No invoices found</h3>
              <p className="mt-2 text-gray-500">
                {searchTerm ? 'Try adjusting your search.' : 'Generate your first invoice.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Invoice
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Client
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Issue Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Due Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredInvoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {invoice.invoice_number}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{invoice.clients?.name}</div>
                        <div className="text-sm text-gray-500">{invoice.clients?.phone}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {format(new Date(invoice.issue_date), 'MMM dd, yyyy')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {invoice.due_date ? format(new Date(invoice.due_date), 'MMM dd, yyyy') : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ₹{invoice.total_amount?.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          invoice.status === 'paid' 
                            ? 'bg-green-100 text-green-800'
                            : invoice.status === 'overdue'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {invoice.status?.charAt(0).toUpperCase() + invoice.status?.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => generatePDF(invoice)}
                            disabled={generatingPDF}
                            className="text-blue-600 hover:text-blue-900 disabled:opacity-50"
                            title="Download PDF"
                          >
                            <Download size={16} />
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

        {/* Invoice Generation Modal */}
        {showInvoiceModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={() => setShowInvoiceModal(false)}></div>
              </div>

              <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                <form onSubmit={generateInvoice}>
                  <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                    <div className="mb-4">
                      <h3 className="text-lg font-medium text-gray-900">Generate Invoice</h3>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Client *</label>
                        <select
                          required
                          value={invoiceFormData.client_id}
                          onChange={(e) => setInvoiceFormData({ ...invoiceFormData, client_id: e.target.value })}
                          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                        >
                          <option value="">Select a client...</option>
                          {clients.map((client) => (
                            <option key={client.id} value={client.id}>
                              {client.name} - {client.phone}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">Rental *</label>
                        <select
                          required
                          value={invoiceFormData.rental_id}
                          onChange={(e) => {
                            const rental = rentals.find(r => r.id === e.target.value);
                            setSelectedRental(rental || null);
                            setInvoiceFormData({ 
                              ...invoiceFormData, 
                              rental_id: e.target.value,
                              client_id: rental?.client_id || ''
                            });
                          }}
                          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                        >
                          <option value="">Select a rental...</option>
                          {filteredRentals
                            .filter(rental => !invoiceFormData.client_id || rental.client_id === invoiceFormData.client_id)
                            .map((rental) => (
                            <option key={rental.id} value={rental.id}>
                              {rental.rental_number} - {rental.clients?.name} - ₹{calculateRentalAmount(rental).toFixed(2)}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Issue Date *</label>
                          <input
                            type="date"
                            required
                            value={invoiceFormData.issue_date}
                            onChange={(e) => setInvoiceFormData({ ...invoiceFormData, issue_date: e.target.value })}
                            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">Due Date</label>
                          <input
                            type="date"
                            value={invoiceFormData.due_date}
                            onChange={(e) => setInvoiceFormData({ ...invoiceFormData, due_date: e.target.value })}
                            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">Tax Rate (%)</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={invoiceFormData.tax_rate}
                          onChange={(e) => setInvoiceFormData({ ...invoiceFormData, tax_rate: parseFloat(e.target.value) || 0 })}
                          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                        />
                      </div>

                      {selectedRental && (
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <h4 className="font-medium text-gray-900 mb-2">Invoice Preview</h4>
                          <div className="text-sm text-gray-600 space-y-1">
                            <p>Subtotal: ₹{calculateRentalAmount(selectedRental).toFixed(2)}</p>
                            <p>Tax ({invoiceFormData.tax_rate}%): ₹{(calculateRentalAmount(selectedRental) * invoiceFormData.tax_rate / 100).toFixed(2)}</p>
                            <p className="font-medium text-gray-900">
                              Total: ₹{(calculateRentalAmount(selectedRental) * (1 + invoiceFormData.tax_rate / 100)).toFixed(2)}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                    <button
                      type="submit"
                      disabled={!selectedRental}
                      className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-orange-600 text-base font-medium text-white hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed sm:ml-3 sm:w-auto sm:text-sm"
                    >
                      Generate Invoice
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowInvoiceModal(false)}
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