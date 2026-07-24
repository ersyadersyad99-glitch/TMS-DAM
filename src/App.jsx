import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from './store';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import Toast from './components/Toast';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import UsersPage from './pages/UsersPage';
import OrderList from './pages/transport/OrderList';
import OrderNew from './pages/transport/OrderNew';
import OrderDetail from './pages/transport/OrderDetail';
import Assignments from './pages/transport/Assignments';
import InvoiceList from './pages/finance/InvoiceList';
import InvoiceDetail from './pages/finance/InvoiceDetail';
import TravelFundList from './pages/finance/TravelFundList';
import TravelFundDetail from './pages/finance/TravelFundDetail';
import MasterLocations from './pages/master/MasterLocations';
import MasterClients from './pages/master/MasterClients';
import MasterFleet from './pages/master/MasterFleet';

// Route guard — redirect to /login if not authenticated
function RequireAuth({ children }) {
  const { isAuthenticated } = useAuthStore();
  const location = useLocation();
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return children;
}

// App shell wrapping authenticated pages
function AppShell({ children }) {
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <TopBar />
        <div className="page-content">
          {children}
        </div>
      </div>
      <Toast />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />

        {/* Protected routes — wrapped in AppShell */}
        <Route path="/" element={
          <RequireAuth>
            <AppShell><Dashboard /></AppShell>
          </RequireAuth>
        } />

        <Route path="/users" element={
          <RequireAuth>
            <AppShell><UsersPage /></AppShell>
          </RequireAuth>
        } />

        <Route path="/transport/orders" element={
          <RequireAuth>
            <AppShell><OrderList /></AppShell>
          </RequireAuth>
        } />
        <Route path="/transport/orders/new" element={
          <RequireAuth>
            <AppShell><OrderNew /></AppShell>
          </RequireAuth>
        } />
        <Route path="/transport/orders/:id" element={
          <RequireAuth>
            <AppShell><OrderDetail /></AppShell>
          </RequireAuth>
        } />
        <Route path="/transport/assignments" element={
          <RequireAuth>
            <AppShell><Assignments /></AppShell>
          </RequireAuth>
        } />

        <Route path="/finance/invoices" element={
          <RequireAuth>
            <AppShell><InvoiceList /></AppShell>
          </RequireAuth>
        } />
        <Route path="/finance/invoices/:id" element={
          <RequireAuth>
            <AppShell><InvoiceDetail /></AppShell>
          </RequireAuth>
        } />
        <Route path="/finance/travel-funds" element={
          <RequireAuth>
            <AppShell><TravelFundList /></AppShell>
          </RequireAuth>
        } />
        <Route path="/finance/travel-funds/:id" element={
          <RequireAuth>
            <AppShell><TravelFundDetail /></AppShell>
          </RequireAuth>
        } />

        <Route path="/master/locations" element={
          <RequireAuth>
            <AppShell><MasterLocations /></AppShell>
          </RequireAuth>
        } />
        <Route path="/master/clients" element={
          <RequireAuth>
            <AppShell><MasterClients /></AppShell>
          </RequireAuth>
        } />
        <Route path="/master/fleet" element={
          <RequireAuth>
            <AppShell><MasterFleet /></AppShell>
          </RequireAuth>
        } />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
