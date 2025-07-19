import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Package, 
  Users, 
  FileText, 
  RotateCcw, 
  BookOpen, 
  Warehouse,
  Receipt,
  TrendingUp,
  TrendingDown,
  AlertTriangle
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import Layout from '../components/Layout';

interface DashboardStats {
  activeRentals: number;
  totalClients: number;
  availableStock: number;
  pendingReturns: number;
  totalRevenue: number;
  overdueRentals: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    activeRentals: 0,
    totalClients: 0,
    availableStock: 0,
    pendingReturns: 0,
    totalRevenue: 0,
    overdueRentals: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      // Fetch active rentals count
      const { count: activeRentals } = await supabase
        .from('rentals')
        .select('*', { count: 'exact', head: true })
        .in('status', ['active', 'partially_returned']);

      // Fetch total clients count
      const { count: totalClients } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true });

      // Fetch available stock
      const { data: stockData } = await supabase
        .from('stock_items')
        .select('available_quantity');
      
      const availableStock = stockData?.reduce((sum, item) => sum + item.available_quantity, 0) || 0;

      // Fetch pending returns (active rentals)
      const pendingReturns = activeRentals || 0;

      // Fetch total revenue from payments
      const { data: paymentsData } = await supabase
        .from('payments')
        .select('amount');
      
      const totalRevenue = paymentsData?.reduce((sum, payment) => sum + Number(payment.amount), 0) || 0;

      // Fetch overdue rentals (rentals past expected return date)
      const today = new Date().toISOString().split('T')[0];
      const { count: overdueRentals } = await supabase
        .from('rentals')
        .select('*', { count: 'exact', head: true })
        .in('status', ['active', 'partially_returned'])
        .lt('expected_return_date', today);

      setStats({
        activeRentals: activeRentals || 0,
        totalClients: totalClients || 0,
        availableStock,
        pendingReturns,
        totalRevenue,
        overdueRentals: overdueRentals || 0,
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const navigationCards = [
    {
      title: 'Issue Rental',
      description: 'Create new rental orders',
      icon: Package,
      link: '/udhar',
      color: 'bg-blue-500',
      hoverColor: 'hover:bg-blue-600',
    },
    {
      title: 'Process Returns',
      description: 'Handle equipment returns',
      icon: RotateCcw,
      link: '/jama',
      color: 'bg-green-500',
      hoverColor: 'hover:bg-green-600',
    },
    {
      title: 'Client Ledger',
      description: 'View client balances',
      icon: BookOpen,
      link: '/khata-wahi',
      color: 'bg-purple-500',
      hoverColor: 'hover:bg-purple-600',
    },
    {
      title: 'Stock Management',
      description: 'Manage inventory',
      icon: Warehouse,
      link: '/stock',
      color: 'bg-orange-500',
      hoverColor: 'hover:bg-orange-600',
    },
    {
      title: 'Generate Bills',
      description: 'Create invoices',
      icon: Receipt,
      link: '/billing',
      color: 'bg-indigo-500',
      hoverColor: 'hover:bg-indigo-600',
    },
    {
      title: 'Manage Clients',
      description: 'Client information',
      icon: Users,
      link: '/clients',
      color: 'bg-teal-500',
      hoverColor: 'hover:bg-teal-600',
    },
  ];

  const statCards = [
    {
      title: 'Active Rentals',
      value: stats.activeRentals,
      icon: FileText,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Total Clients',
      value: stats.totalClients,
      icon: Users,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Available Stock',
      value: stats.availableStock,
      icon: Package,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      title: 'Pending Returns',
      value: stats.pendingReturns,
      icon: RotateCcw,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
    {
      title: 'Total Revenue',
      value: `₹${stats.totalRevenue.toLocaleString()}`,
      icon: TrendingUp,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
    },
    {
      title: 'Overdue Rentals',
      value: stats.overdueRentals,
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    },
  ];

  if (loading) {
    return (
      <Layout title="Dashboard">
        <div className="animate-pulse space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-gray-200 h-24 rounded-lg"></div>
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Dashboard">
      <div className="space-y-6 md:space-y-8">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-orange-500 to-blue-600 rounded-lg p-4 sm:p-6 text-white">
          <h2 className="text-xl sm:text-2xl font-bold mb-2">Welcome to Centering Plates Rental</h2>
          <p className="text-orange-100 text-sm sm:text-base">Manage your construction equipment rental business efficiently</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {statCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
                <div className="flex items-center">
                  <div className={`p-2 sm:p-3 rounded-lg ${stat.bgColor}`}>
                    <Icon className={`h-5 w-5 sm:h-6 sm:w-6 ${stat.color}`} />
                  </div>
                  <div className="ml-3 sm:ml-4">
                    <p className="text-xs sm:text-sm font-medium text-gray-600">{stat.title}</p>
                    <p className="text-lg sm:text-2xl font-bold text-gray-900">{stat.value}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div>
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {navigationCards.map((card, index) => {
              const Icon = card.icon;
              return (
                <Link
                  key={index}
                  to={card.link}
                  className={`${card.color} ${card.hoverColor} text-white rounded-lg p-4 sm:p-6 transition-all duration-200 hover:scale-102 sm:hover:scale-105 hover:shadow-lg touch-manipulation`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-base sm:text-lg font-semibold mb-1 sm:mb-2">{card.title}</h4>
                      <p className="text-xs sm:text-sm opacity-90">{card.description}</p>
                    </div>
                    <Icon className="h-6 w-6 sm:h-8 sm:w-8 opacity-80" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Alerts Section */}
        {stats.overdueRentals > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4">
            <div className="flex items-center">
              <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-red-600 mr-2" />
              <h4 className="text-red-800 font-medium text-sm sm:text-base">Attention Required</h4>
            </div>
            <p className="text-red-600 mt-1 text-xs sm:text-sm">
              You have {stats.overdueRentals} overdue rental(s). Please follow up with clients for returns.
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
}