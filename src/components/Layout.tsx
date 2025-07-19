import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link, useLocation } from 'react-router-dom';
import LoadingSpinner from './LoadingSpinner';
import { 
  Menu, 
  X, 
  Home, 
  Package, 
  RotateCcw, 
  BookOpen, 
  Warehouse, 
  Receipt, 
  Users, 
  LogOut 
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
  loading?: boolean;
}

const navItems = [
  { title: 'Dashboard', path: '/', icon: Home },
  { title: 'Issue Rental', path: '/udhar', icon: Package },
  { title: 'Process Returns', path: '/jama', icon: RotateCcw },
  { title: 'Client Ledger', path: '/khata-wahi', icon: BookOpen },
  { title: 'Stock', path: '/stock', icon: Warehouse },
  { title: 'Billing', path: '/billing', icon: Receipt },
  { title: 'Clients', path: '/clients', icon: Users },
];

export default function Layout({ children, title, loading = false }: LayoutProps) {
  const { signOut, user } = useAuth();
  const [isOpen, setIsOpen] = React.useState(false);
  const location = useLocation();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (!user) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex overflow-hidden">
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 right-4 z-50 p-2 rounded-lg bg-white shadow-lg"
        aria-label="Toggle menu"
      >
        {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {/* Desktop Sidebar */}
      <nav className="hidden lg:flex flex-col fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 shadow-lg">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-800">Centering Plates</h1>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center px-6 py-3 text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-colors ${
                  isActive ? 'bg-orange-50 text-orange-600 border-r-4 border-orange-600' : ''
                }`}
              >
                <Icon className="h-5 w-5 mr-3 flex-shrink-0" />
                <span className="text-sm">{item.title}</span>
              </Link>
            );
          })}
        </div>
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={handleSignOut}
            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
          >
            <LogOut className="h-5 w-5 mr-3 flex-shrink-0" />
            <span>Logout</span>
          </button>
        </div>
      </nav>

      {/* Mobile Sidebar */}
      <nav
        className={`lg:hidden fixed inset-0 z-40 transform ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } transition-transform duration-300 ease-in-out`}
      >
        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setIsOpen(false)} />
        <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-xl">
          <div className="p-6 border-b border-gray-200">
            <h1 className="text-xl font-bold text-gray-800">Centering Plates</h1>
          </div>
          <div className="overflow-y-auto h-full">
            <div className="py-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center px-6 py-4 text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-colors ${
                      isActive ? 'bg-orange-50 text-orange-600 border-r-4 border-orange-600' : ''
                    }`}
                  >
                    <Icon className="h-6 w-6 mr-3 flex-shrink-0" />
                    <span className="text-base">{item.title}</span>
                  </Link>
                );
              })}
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-white">
              <button
                onClick={handleSignOut}
                className="flex items-center w-full px-4 py-3 text-gray-700 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
              >
                <LogOut className="h-6 w-6 mr-3 flex-shrink-0" />
                <span className="text-base">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 lg:ml-64 min-h-screen max-w-full">
        <div className="p-4 sm:p-6 lg:p-8">
          {/* Page Title */}
          {title && (
            <div className="mb-6">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{title}</h1>
            </div>
          )}

          {/* Content */}
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <LoadingSpinner />
            </div>
          ) : (
            <div className="w-full overflow-x-hidden">{children}</div>
          )}
        </div>
      </main>
    </div>
  );
}
