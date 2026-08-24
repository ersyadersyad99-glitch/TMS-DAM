import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, Search, X, Package, FileText, Users, Truck, ArrowRight, CheckCheck } from 'lucide-react';
import {
  useOrderStore,
  useInvoiceStore,
  useClientStore,
  useFleetStore,
  useTravelFundStore,
} from '../store';
import { formatRupiah } from '../utils/helpers';
import './TopBar.css';

const breadcrumbMap = {
  '/': 'Dashboard',
  '/transport/orders': 'Delivery Orders',
  '/transport/orders/new': 'Buat DO Baru',
  '/transport/orders/bulk': 'Bulk Booking',
  '/transport/assignments': 'Penugasan',
  '/finance/invoices': 'Invoice',
  '/finance/travel-funds': 'Uang Jalan',
  '/master/locations': 'Master Lokasi',
  '/master/clients': 'Master Klien',
  '/master/fleet': 'Armada & Sopir',
};

export default function TopBar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  // Stores for search & notification engine
  const { orders } = useOrderStore();
  const { invoices } = useInvoiceStore();
  const { clients } = useClientStore();
  const { fleet, drivers } = useFleetStore();
  const { funds } = useTravelFundStore();

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [readNotifications, setReadNotifications] = useState(false);

  const searchRef = useRef(null);
  const bellRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSearchDropdown(false);
      }
      if (bellRef.current && !bellRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ─── BREADCRUMBS ───
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

  // ─── SEARCH ENGINE RESULTS ───
  const query = searchQuery.trim().toLowerCase();
  const searchResults = {
    orders: [],
    invoices: [],
    clients: [],
    fleet: [],
  };

  if (query.length > 0) {
    searchResults.orders = (orders || []).filter(o =>
      (o.id && o.id.toLowerCase().includes(query)) ||
      (o.soNumber && o.soNumber.toLowerCase().includes(query)) ||
      (o.clientName && o.clientName.toLowerCase().includes(query)) ||
      (o.fleetPlate && o.fleetPlate.toLowerCase().includes(query)) ||
      (o.driverName && o.driverName.toLowerCase().includes(query))
    ).slice(0, 4);

    searchResults.invoices = (invoices || []).filter(i =>
      (i.id && i.id.toLowerCase().includes(query)) ||
      (i.clientName && i.clientName.toLowerCase().includes(query)) ||
      (i.orderId && i.orderId.toLowerCase().includes(query))
    ).slice(0, 4);

    searchResults.clients = (clients || []).filter(c =>
      (c.name && c.name.toLowerCase().includes(query)) ||
      (c.email && c.email.toLowerCase().includes(query)) ||
      (c.city && c.city.toLowerCase().includes(query))
    ).slice(0, 4);

    searchResults.fleet = (fleet || []).filter(f =>
      (f.plate && f.plate.toLowerCase().includes(query)) ||
      (f.type && f.type.toLowerCase().includes(query))
    ).slice(0, 3);
  }

  const totalResultsCount =
    searchResults.orders.length +
    searchResults.invoices.length +
    searchResults.clients.length +
    searchResults.fleet.length;

  const handleSelectResult = (path) => {
    setShowSearchDropdown(false);
    setSearchQuery('');
    navigate(path);
  };

  // ─── NOTIFICATION ENGINE ───
  const notificationList = [];

  // 1. Unpaid Invoices
  (invoices || []).forEach(inv => {
    if (inv.status === 'unpaid') {
      notificationList.push({
        id: `inv-${inv.id}`,
        type: 'invoice',
        title: `Invoice Belum Dibayar (${inv.id})`,
        desc: `Klien: ${inv.clientName || '—'} · Nominal: ${formatRupiah(inv.amount || 0)}`,
        badgeColor: '#ef4444',
        path: `/finance/invoices/${inv.id}`,
        time: 'Jatuh Tempo',
      });
    }
  });

  // 2. Orders waiting for DP or Assignment
  (orders || []).forEach(ord => {
    if (ord.status === 'menunggu_dp') {
      notificationList.push({
        id: `ord-dp-${ord.id}`,
        type: 'order',
        title: `Menunggu Pembayaran DP (${ord.id})`,
        desc: `Klien: ${ord.clientName || '—'} · Ref: ${ord.soNumber || '—'}`,
        badgeColor: '#f59e0b',
        path: `/transport/orders/${ord.id}`,
        time: 'Pending DP',
      });
    } else if (ord.status === 'aktif' && !ord.driverId) {
      notificationList.push({
        id: `ord-assign-${ord.id}`,
        type: 'order',
        title: `Perlu Penugasan Driver (${ord.id})`,
        desc: `Belum ada Driver/Armada ditugaskan.`,
        badgeColor: '#3b82f6',
        path: `/transport/assignments`,
        time: 'Butuh Driver',
      });
    }
  });

  // 3. Travel Funds waiting for disbursement
  (funds || []).forEach(f => {
    if (f.status === 'pengajuan') {
      notificationList.push({
        id: `fund-${f.id}`,
        type: 'fund',
        title: `Pengajuan Uang Jalan (${f.id})`,
        desc: `Nominal: ${formatRupiah(f.requestAmount || 0)}`,
        badgeColor: '#8b5cf6',
        path: `/finance/travel-funds/${f.id}`,
        time: 'Butuh Pencairan',
      });
    }
  });

  const unreadCount = readNotifications ? 0 : notificationList.length;

  return (
    <header className="topbar">
      {/* Breadcrumb */}
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

      {/* Topbar Actions */}
      <div className="topbar-actions">
        {/* GLOBAL SEARCH */}
        <div className="topbar-search-wrap" ref={searchRef}>
          <div className="topbar-search">
            <Search size={14} />
            <input
              type="text"
              placeholder="Cari DO, Klien, Invoice, Driver..."
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                setShowSearchDropdown(true);
              }}
              onFocus={() => setShowSearchDropdown(true)}
            />
            {searchQuery && (
              <button
                className="topbar-search-clear"
                onClick={() => {
                  setSearchQuery('');
                  setShowSearchDropdown(false);
                }}
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Search Dropdown Popover */}
          {showSearchDropdown && query.length > 0 && (
            <div className="topbar-search-results">
              {totalResultsCount === 0 ? (
                <div className="search-empty">
                  Tidak ditemukan hasil untuk <strong>"{searchQuery}"</strong>
                </div>
              ) : (
                <>
                  {/* Delivery Orders */}
                  {searchResults.orders.length > 0 && (
                    <div className="search-group">
                      <div className="search-group-title">
                        <Package size={12} /> Delivery Orders ({searchResults.orders.length})
                      </div>
                      {searchResults.orders.map(o => (
                        <div
                          key={o.id}
                          className="search-item"
                          onClick={() => handleSelectResult(`/transport/orders/${o.id}`)}
                        >
                          <div className="search-item-primary">{o.id} ({o.soNumber || 'No SO'})</div>
                          <div className="search-item-sub">Klien: {o.clientName || '—'} · Armada: {o.fleetPlate || 'Unassigned'}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Invoices */}
                  {searchResults.invoices.length > 0 && (
                    <div className="search-group">
                      <div className="search-group-title">
                        <FileText size={12} /> Invoices ({searchResults.invoices.length})
                      </div>
                      {searchResults.invoices.map(i => (
                        <div
                          key={i.id}
                          className="search-item"
                          onClick={() => handleSelectResult(`/finance/invoices/${i.id}`)}
                        >
                          <div className="search-item-primary">{i.id} ({formatRupiah(i.amount)})</div>
                          <div className="search-item-sub">Klien: {i.clientName || '—'} · DO: {i.orderId}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Clients */}
                  {searchResults.clients.length > 0 && (
                    <div className="search-group">
                      <div className="search-group-title">
                        <Users size={12} /> Master Klien ({searchResults.clients.length})
                      </div>
                      {searchResults.clients.map(c => (
                        <div
                          key={c.id || c.name}
                          className="search-item"
                          onClick={() => handleSelectResult('/master/clients')}
                        >
                          <div className="search-item-primary">{c.name}</div>
                          <div className="search-item-sub">{c.email || c.phone || 'Master Data Klien'}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Fleet */}
                  {searchResults.fleet.length > 0 && (
                    <div className="search-group">
                      <div className="search-group-title">
                        <Truck size={12} /> Armada ({searchResults.fleet.length})
                      </div>
                      {searchResults.fleet.map(f => (
                        <div
                          key={f.id || f.plate}
                          className="search-item"
                          onClick={() => handleSelectResult('/master/fleet')}
                        >
                          <div className="search-item-primary">{f.plate} ({f.type})</div>
                          <div className="search-item-sub">Status: {f.status || 'Aktif'}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* NOTIFICATIONS BELL */}
        <div className="topbar-bell-wrap" ref={bellRef}>
          <button
            className="topbar-bell btn-ghost"
            onClick={() => setShowNotifications(s => !s)}
          >
            <Bell size={16} />
            {unreadCount > 0 && <span className="topbar-badge">{unreadCount}</span>}
          </button>

          {/* Notifications Popover */}
          {showNotifications && (
            <div className="topbar-notifications-popover">
              <div className="notif-header">
                <div className="notif-title">
                  Notifikasi System {unreadCount > 0 && <span className="notif-count-pill">{unreadCount} baru</span>}
                </div>
                {unreadCount > 0 && (
                  <button
                    className="notif-read-btn"
                    onClick={() => setReadNotifications(true)}
                  >
                    <CheckCheck size={13} /> Tandai Dibaca
                  </button>
                )}
              </div>

              <div className="notif-body">
                {notificationList.length === 0 ? (
                  <div className="notif-empty">
                    <div className="notif-empty-icon">🔔</div>
                    <div>Semua sistem berjalan lancar. Tidak ada notifikasi baru.</div>
                  </div>
                ) : (
                  notificationList.map(n => (
                    <div
                      key={n.id}
                      className="notif-item"
                      onClick={() => {
                        setShowNotifications(false);
                        navigate(n.path);
                      }}
                    >
                      <div className="notif-dot" style={{ background: n.badgeColor }} />
                      <div className="notif-content">
                        <div className="notif-item-title">{n.title}</div>
                        <div className="notif-item-desc">{n.desc}</div>
                      </div>
                      <div className="notif-time">{n.time}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Date Display */}
        <div className="topbar-date">
          {new Date().toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
        </div>
      </div>
    </header>
  );
}
