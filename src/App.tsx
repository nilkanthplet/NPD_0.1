import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import Udhar from './pages/Udhar';
import Jama from './pages/Jama';
import KhataWahi from './pages/KhataWahi';
import Stock from './pages/Stock';
import Billing from './pages/Billing';
import ToastContainer from './components/ToastContainer';
import { useToast } from './hooks/useToast';
import SignIn from './pages/SignIn';

function App() {
  const { toasts } = useToast();

  return (
    <AuthProvider>
      <Router>
        <ToastContainer toasts={toasts} />
        <Routes>
          <Route path="/signin" element={<SignIn />} />
          <Route path="/" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          <Route path="/clients" element={
            <ProtectedRoute>
              <Clients />
            </ProtectedRoute>
          } />
          <Route path="/udhar" element={
            <ProtectedRoute>
              <Udhar />
            </ProtectedRoute>
          } />
          <Route path="/jama" element={
            <ProtectedRoute>
              <Jama />
            </ProtectedRoute>
          } />
          <Route path="/khata-wahi" element={
            <ProtectedRoute>
              <KhataWahi />
            </ProtectedRoute>
          } />
          <Route path="/stock" element={
            <ProtectedRoute>
              <Stock />
            </ProtectedRoute>
          } />
          <Route path="/billing" element={
            <ProtectedRoute>
              <Billing />
            </ProtectedRoute>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;