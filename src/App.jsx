import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore, syncAllStoresFromDatabase } from './store';
import { TenantProvider } from './context/TenantContext';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import Toast from './components/Toast';
import ModuleGuard from './components/ModuleGuard';
import PermissionGuard from './components/PermissionGuard';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import UsersPage from './pages/UsersPage';
import OrderList from './pages/transport/OrderList';
import OrderNew from './pages/transport/OrderNew';
import BulkBooking from './pages/transport/BulkBooking';
import OrderDetail from './pages/transport/OrderDetail';
import Assignments from './pages/transport/Assignments';
import InvoiceList from './pages/finance/InvoiceList';
import InvoiceDetail from './pages/finance/InvoiceDetail';
import TravelFundList from './pages/finance/TravelFundList';
import TravelFundDetail from './pages/finance/TravelFundDetail';
import MasterLocations from './pages/master/MasterLocations';
import MasterClients from './pages/master/MasterClients';
import MasterFleet from './pages/master/MasterFleet';
import MasterMaintenance from './pages/master/MasterMaintenance';

// Route guard — redirect to /login if not authenticated
function RequireAuth({ children }) {
  const { isAuthenticated, loading } = useAuthStore();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--color-bg-base)', color: 'var(--text-primary)' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="login-spinner" style={{ width: 32, height: 32, margin: '0 auto 12px auto', borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }} />
          <div style={{ fontWeight: 600 }}>Memverifikasi Sesi Server...</div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return children;
}

// App shell wrapping authenticated pages
function AppShell({ children }) {
  React.useEffect(() => {
    syncAllStoresFromDatabase();
  }, []);

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
  const { checkSession } = useAuthStore();

  React.useEffect(() => {
    checkSession();
  }, [checkSession]);

  return (
    <TenantProvider>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />

          {/* Protected routes — wrapped in AppShell + PermissionGuard */}
          <Route path="/" element={
            <RequireAuth>
              <PermissionGuard permission="orders.read">
                <AppShell><Dashboard /></AppShell>
              </PermissionGuard>
            </RequireAuth>
          } />

          <Route path="/users" element={
            <RequireAuth>
              <PermissionGuard permission="users.read">
                <AppShell><UsersPage /></AppShell>
              </PermissionGuard>
            </RequireAuth>
          } />

          <Route path="/transport/orders" element={
            <RequireAuth>
              <PermissionGuard permission="orders.read">
                <AppShell><OrderList /></AppShell>
              </PermissionGuard>
            </RequireAuth>
          } />
          <Route path="/transport/orders/new" element={
            <RequireAuth>
              <PermissionGuard permission="orders.create">
                <AppShell><OrderNew /></AppShell>
              </PermissionGuard>
            </RequireAuth>
          } />
          <Route path="/transport/orders/bulk" element={
            <RequireAuth>
              <PermissionGuard permission="orders.create">
                <AppShell><BulkBooking /></AppShell>
              </PermissionGuard>
            </RequireAuth>
          } />
          <Route path="/transport/orders/:id/*" element={
            <RequireAuth>
              <PermissionGuard permission="orders.read">
                <AppShell><OrderDetail /></AppShell>
              </PermissionGuard>
            </RequireAuth>
          } />

          <Route path="/transport/assignments" element={
            <RequireAuth>
              <ModuleGuard module="fleet">
                <PermissionGuard permission="assignments.read">
                  <AppShell><Assignments /></AppShell>
                </PermissionGuard>
              </ModuleGuard>
            </RequireAuth>
          } />

          <Route path="/finance/invoices" element={
            <RequireAuth>
              <ModuleGuard module="finance">
                <PermissionGuard permission="invoices.read">
                  <AppShell><InvoiceList /></AppShell>
                </PermissionGuard>
              </ModuleGuard>
            </RequireAuth>
          } />
          <Route path="/finance/invoices/:id" element={
            <RequireAuth>
              <ModuleGuard module="finance">
                <PermissionGuard permission="invoices.read">
                  <AppShell><InvoiceDetail /></AppShell>
                </PermissionGuard>
              </ModuleGuard>
            </RequireAuth>
          } />
          <Route path="/finance/travel-funds" element={
            <RequireAuth>
              <ModuleGuard module="finance">
                <PermissionGuard permission="travel_funds.read">
                  <AppShell><TravelFundList /></AppShell>
                </PermissionGuard>
              </ModuleGuard>
            </RequireAuth>
          } />
          <Route path="/finance/travel-funds/:id" element={
            <RequireAuth>
              <ModuleGuard module="finance">
                <PermissionGuard permission="travel_funds.read">
                  <AppShell><TravelFundDetail /></AppShell>
                </PermissionGuard>
              </ModuleGuard>
            </RequireAuth>
          } />

          <Route path="/master/locations" element={
            <RequireAuth>
              <PermissionGuard permission="locations.read">
                <AppShell><MasterLocations /></AppShell>
              </PermissionGuard>
            </RequireAuth>
          } />
          <Route path="/master/clients" element={
            <RequireAuth>
              <PermissionGuard permission="clients.read">
                <AppShell><MasterClients /></AppShell>
              </PermissionGuard>
            </RequireAuth>
          } />
          <Route path="/master/fleet" element={
            <RequireAuth>
              <ModuleGuard module="fleet">
                <PermissionGuard permission="fleet.read">
                  <AppShell><MasterFleet /></AppShell>
                </PermissionGuard>
              </ModuleGuard>
            </RequireAuth>
          } />
          <Route path="/master/maintenance" element={
            <RequireAuth>
              <ModuleGuard module="maintenance">
                <PermissionGuard permission="fleet.read">
                  <AppShell><MasterMaintenance /></AppShell>
                </PermissionGuard>
              </ModuleGuard>
            </RequireAuth>
          } />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </TenantProvider>
  );
}
