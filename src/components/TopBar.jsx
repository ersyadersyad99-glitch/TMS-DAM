import React from 'react';
import { useLocation } from 'react-router-dom';
import { Bell, Search } from 'lucide-react';
import './TopBar.css';

const breadcrumbMap = {
  '/': 'Dashboard',
  '/transport/orders': 'Delivery Orders',
  '/transport/orders/new': 'Buat DO Baru',
  '/transport/assignments': 'Penugasan',
  '/finance/invoices': 'Invoice',
  '/finance/travel-funds': 'Uang Jalan',
  '/master/locations': 'Master Lokasi',
  '/master/clients': 'Master Klien',
  '/master/fleet': 'Armada & Sopir',
};

export default function TopBar() {
  const { pathname } = useLocation();

  const crumbs = [];
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length === 0) {
    crumbs.push('Dashboard');
  } else {
    let path = '';
    parts.forEach((p, i) => {
      path += '/' + p;
      const label = breadcrumbMap[path];
      if (label) crumbs.push(label);
      else if (i === parts.length - 1 && !label) crumbs.push(`#${p}`);
    });
  }

  return (
    <header className="topbar">
      <div className="topbar-breadcrumb">
        {crumbs.map((c, i) => (
          <React.Fragment key={i}>
            {i > 0 && <span className="topbar-sep">/</span>}
            <span className={i === crumbs.length - 1 ? 'topbar-crumb-active' : 'topbar-crumb'}>
              {c}
            </span>
          </React.Fragment>
        ))}
      </div>

      <div className="topbar-actions">
        <div className="topbar-search">
          <Search size={14} />
          <input placeholder="Cari DO, klien..." />
        </div>
        <button className="topbar-bell btn-ghost">
          <Bell size={16} />
          <span className="topbar-badge">3</span>
        </button>
        <div className="topbar-date">
          {new Date().toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
        </div>
      </div>
    </header>
  );
}
