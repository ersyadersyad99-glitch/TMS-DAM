// Mock user accounts

export const mockUsers = [
  {
    id: 'u1',
    name: 'Admin Utama',
    email: 'admin@tms.id',
    password: 'admin123',
    role: 'admin',
    status: 'active',
    avatar: 'A',
    createdAt: '2025-01-01',
    lastLogin: '2025-07-24',
  },
  {
    id: 'u2',
    name: 'Rudi Dispatcher',
    email: 'dispatcher@tms.id',
    password: 'rudi123',
    role: 'dispatcher',
    status: 'active',
    avatar: 'R',
    createdAt: '2025-02-15',
    lastLogin: '2025-07-23',
  },
  {
    id: 'u3',
    name: 'Siti Finance',
    email: 'finance@tms.id',
    password: 'siti123',
    role: 'finance',
    status: 'active',
    avatar: 'S',
    createdAt: '2025-03-01',
    lastLogin: '2025-07-22',
  },
  {
    id: 'u4',
    name: 'Andi Viewer',
    email: 'viewer@tms.id',
    password: 'andi123',
    role: 'viewer',
    status: 'active',
    avatar: 'A',
    createdAt: '2025-04-10',
    lastLogin: '2025-07-20',
  },
  {
    id: 'u5',
    name: 'Bima (Non-aktif)',
    email: 'bima@tms.id',
    password: 'bima123',
    role: 'dispatcher',
    status: 'inactive',
    avatar: 'B',
    createdAt: '2025-01-20',
    lastLogin: '2025-05-01',
  },
];

export const roleLabels = {
  admin: 'Super Admin',
  dispatcher: 'Dispatcher',
  finance: 'Finance',
  viewer: 'Viewer',
};

export const roleColors = {
  admin: { color: '#a78bfa', bg: 'rgba(167,139,250,0.12)', border: 'rgba(167,139,250,0.3)' },
  dispatcher: { color: '#4f6ef7', bg: 'rgba(79,110,247,0.12)', border: 'rgba(79,110,247,0.3)' },
  finance: { color: '#22c55e', bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.3)' },
  viewer: { color: '#8892a4', bg: 'rgba(136,146,164,0.1)', border: 'rgba(136,146,164,0.25)' },
};

export const avatarGradients = {
  admin: 'linear-gradient(135deg, #a78bfa, #7c3aed)',
  dispatcher: 'linear-gradient(135deg, #4f6ef7, #818cf8)',
  finance: 'linear-gradient(135deg, #22c55e, #16a34a)',
  viewer: 'linear-gradient(135deg, #64748b, #475569)',
};
