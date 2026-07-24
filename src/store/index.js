import { create } from 'zustand';
import { mockOrders, mockInvoices, mockTravelFunds } from '../data/mockData';
import { mockUsers } from '../data/mockUsers';

// ---- Auth Store ----
export const useAuthStore = create((set) => ({
  user: null,          // logged-in user object
  isAuthenticated: false,

  login: (email, password) => {
    const found = mockUsers.find(
      u => u.email === email && u.password === password && u.status === 'active'
    );
    if (found) {
      set({ user: found, isAuthenticated: true });
      return { ok: true };
    }
    return { ok: false, error: 'Email atau password salah, atau akun tidak aktif.' };
  },

  logout: () => set({ user: null, isAuthenticated: false }),
}));

// ---- User Management Store ----
export const useUserStore = create((set) => ({
  users: mockUsers,

  addUser: (user) => set(s => ({ users: [...s.users, user] })),

  updateUser: (id, updates) =>
    set(s => ({ users: s.users.map(u => u.id === id ? { ...u, ...updates } : u) })),

  deleteUser: (id) =>
    set(s => ({ users: s.users.filter(u => u.id !== id) })),

  toggleStatus: (id) =>
    set(s => ({
      users: s.users.map(u =>
        u.id === id ? { ...u, status: u.status === 'active' ? 'inactive' : 'active' } : u
      ),
    })),
}));



// ---- Toast Store ----
export const useToastStore = create((set) => ({
  toasts: [],
  addToast: (message, type = 'info') => {
    const id = Date.now();
    set(s => ({ toasts: [...s.toasts, { id, message, type }] }));
    setTimeout(() => {
      set(s => ({ toasts: s.toasts.filter(t => t.id !== id) }));
    }, 3500);
  },
  removeToast: (id) => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })),
}));

// ---- Orders Store ----
export const useOrderStore = create((set, get) => ({
  orders: mockOrders,

  addOrder: (order) => set(s => ({ orders: [order, ...s.orders] })),

  updateOrderStatus: (id, status) =>
    set(s => ({ orders: s.orders.map(o => o.id === id ? { ...o, status } : o) })),

  updateDropPOD: (orderId, dropId, filename) =>
    set(s => ({
      orders: s.orders.map(o =>
        o.id === orderId
          ? {
              ...o,
              drops: o.drops.map(d =>
                d.id === dropId ? { ...d, pod: filename, status: 'done' } : d
              ),
            }
          : o
      ),
    })),

  assignDriver: (orderId, driverId, driverName, fleetId, fleetPlate, serviceType = 'Charter') =>
    set(s => ({
      orders: s.orders.map(o =>
        o.id === orderId
          ? { ...o, driverId, driverName, fleetId, fleetPlate, serviceType, status: 'transit' }
          : o
      ),
    })),

  closeOrder: (orderId) =>
    set(s => ({
      orders: s.orders.map(o =>
        o.id === orderId ? { ...o, status: 'selesai', paymentStatus: 'dp_lunas' } : o
      ),
    })),

  markDPPaid: (orderId) =>
    set(s => ({
      orders: s.orders.map(o =>
        o.id === orderId ? { ...o, paymentStatus: 'dp_lunas', status: o.status === 'menunggu_dp' ? 'aktif' : o.status } : o
      ),
    })),

  markOrderLunas: (orderId) =>
    set(s => ({
      orders: s.orders.map(o =>
        o.id === orderId ? { ...o, paymentStatus: 'lunas' } : o
      ),
    })),
}));

// ---- Invoice Store ----
export const useInvoiceStore = create((set) => ({
  invoices: mockInvoices,
  markPaid: (id) =>
    set(s => ({
      invoices: s.invoices.map(inv => inv.id === id ? { ...inv, status: 'paid' } : inv),
    })),
  addInvoice: (inv) => set(s => ({ invoices: [inv, ...s.invoices] })),
}));

// ---- Travel Fund Store ----
export const useTravelFundStore = create((set) => ({
  funds: mockTravelFunds,
  addFund: (fund) => set(s => ({ funds: [fund, ...s.funds] })),
  updateStatus: (id, status) =>
    set(s => ({ funds: s.funds.map(f => f.id === id ? { ...f, status } : f) })),
  addRealization: (fundId, item) =>
    set(s => ({
      funds: s.funds.map(f => {
        if (f.id !== fundId) return f;
        const realizations = [...f.realizations, item];
        const totalRealized = realizations.reduce((sum, r) => sum + r.amount, 0);
        return { ...f, realizations, totalRealized, balance: f.disbursedAmount - totalRealized };
      }),
    })),
  finalizeRealization: (fundId) =>
    set(s => ({
      funds: s.funds.map(f =>
        f.id === fundId ? { ...f, status: 'realisasi_selesai' } : f
      ),
    })),
  disburse: (fundId) =>
    set(s => ({
      funds: s.funds.map(f =>
        f.id === fundId ? { ...f, status: 'dicairkan', disbursedAmount: f.requestAmount, balance: f.requestAmount } : f
      ),
    })),
}));
