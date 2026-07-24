import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Truck, Package, Receipt,
  Wallet, MapPin, Building2, Users, LogOut, Shield
} from 'lucide-react';
import { useAuthStore } from '../store';
import { roleLabels, roleColors, avatarGradients } from '../data/mockUsers';
import './Sidebar.css';

const navGroups = [
  {
    label: null,
    items: [
      { to: '/', icon: LayoutDashboard, label: 'Dashboard', exact: true },
    ],
  },
  {
    label: 'Transport',
    items: [
      { to: '/transport/orders', icon: Package, label: 'Delivery Orders' },
      { to: '/transport/assignments', icon: Truck, label: 'Penugasan' },
    ],
  },
  {
    label: 'Finance',
    items: [
      { to: '/finance/invoices', icon: Receipt, label: 'Invoice' },
      { to: '/finance/travel-funds', icon: Wallet, label: 'Biaya Operasional' },
    ],
  },
  {
    label: 'Master Data',
    items: [
      { to: '/master/locations', icon: MapPin, label: 'Lokasi' },
      { to: '/master/clients', icon: Building2, label: 'Klien' },
      { to: '/master/fleet', icon: Truck, label: 'Armada & Sopir' },
    ],
  },
  {
    label: 'Pengaturan',
    items: [
      { to: '/users', icon: Users, label: 'Akun Pengguna' },
    ],
  },
];

export default function Sidebar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const roleColor = user ? (roleColors[user.role]?.color || '#8892a4') : '#8892a4';
  const avatarGrad = user ? (avatarGradients[user.role] || avatarGradients.viewer) : avatarGradients.viewer;

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">🚛</div>
        <div>
          <div className="sidebar-logo-title">TMS</div>
          <div className="sidebar-logo-sub">Transport Manager</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {navGroups.map((group, gi) => (
          <div key={gi} className="sidebar-group">
            {group.label && (
              <span className="sidebar-group-label">{group.label}</span>
            )}
            {group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.exact}
                className={({ isActive }) =>
                  `sidebar-link ${isActive ? 'active' : ''}`
                }
              >
                <item.icon size={16} />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* User footer */}
      {user && (
        <div className="sidebar-user-section">
          {/* Role badge */}
          <div className="sidebar-role-badge" style={{ color: roleColor, borderColor: `${roleColor}44`, background: `${roleColor}12` }}>
            <Shield size={10} />
            {roleLabels[user.role] || user.role}
          </div>

          <div className="sidebar-user">
            <div className="sidebar-user-avatar" style={{ background: avatarGrad }}>
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="sidebar-user-name">{user.name}</div>
              <div className="sidebar-user-role" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.email}
              </div>
            </div>
            <button
              className="sidebar-logout-btn"
              onClick={handleLogout}
              title="Keluar"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
