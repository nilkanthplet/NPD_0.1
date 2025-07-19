import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Home, Package, RotateCcw, BookOpen, Warehouse, Receipt, Users, LogOut } from 'lucide-react';

interface NavItem {
  title: string;
  path: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { title: 'Dashboard', path: '/', icon: Home },
  { title: 'Issue Rental', path: '/udhar', icon: Package },
  { title: 'Process Returns', path: '/jama', icon: RotateCcw },
  { title: 'Client Ledger', path: '/khata-wahi', icon: BookOpen },
  { title: 'Stock', path: '/stock', icon: Warehouse },
  { title: 'Billing', path: '/billing', icon: Receipt },
  { title: 'Clients', path: '/clients', icon: Users },
];

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={toggleMenu}
        className="lg:hidden fixed top-4 right-4 z-50 p-2 rounded-lg bg-white shadow-lg"
        aria-label="Toggle menu"
      >
        {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {/* Desktop Sidebar */}
      <nav className="hidden lg:flex flex-col fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 shadow-lg">
        <div className="p-6">
          <h1 className="text-xl font-bold text-gray-800">Centering Plates</h1>
        </div>
        <div className="flex-1 overflow-y-auto">
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
                <Icon className="h-5 w-5 mr-3" />
                <span>{item.title}</span>
              </Link>
            );
          })}
        </div>
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={() => {/* Add logout logic */}}
            className="flex items-center w-full px-4 py-2 text-gray-700 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
          >
            <LogOut className="h-5 w-5 mr-3" />
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
        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={toggleMenu} />
        <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-xl">
          <div className="p-6">
            <h1 className="text-xl font-bold text-gray-800">Centering Plates</h1>
          </div>
          <div className="overflow-y-auto h-full pb-32">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={toggleMenu}
                  className={`flex items-center px-6 py-4 text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-colors ${
                    isActive ? 'bg-orange-50 text-orange-600 border-r-4 border-orange-600' : ''
                  }`}
                >
                  <Icon className="h-6 w-6 mr-3" />
                  <span className="text-base">{item.title}</span>
                </Link>
              );
            })}
            <div className="p-4 border-t border-gray-200">
              <button
                onClick={() => {/* Add logout logic */}}
                className="flex items-center w-full px-4 py-3 text-gray-700 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
              >
                <LogOut className="h-6 w-6 mr-3" />
                <span className="text-base">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}
