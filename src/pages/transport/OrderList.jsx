import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Eye, UserCheck } from 'lucide-react';
import { useOrderStore } from '../../store';
import {
  formatRupiah, formatDate,
  statusLabels, statusBadgeClass,
  paymentLabels, paymentBadgeClass,
  getDropProgress
} from '../../utils/helpers';

const STATUS_FILTERS = [
  { key: 'all', label: 'Semua' },
  { key: 'menunggu_dp', label: 'Menunggu DP' },
  { key: 'aktif', label: 'Aktif' },
  { key: 'transit', label: 'Dalam Perjalanan' },
  { key: 'selesai', label: 'Selesai' },
];

export default function OrderList() {
  const navigate = useNavigate();
  const { orders } = useOrderStore();
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  const filtered = orders.filter(o => {
    const matchStatus = statusFilter === 'all' || o.status === statusFilter;
    const matchSearch = !search
      || o.id.toLowerCase().includes(search.toLowerCase())
      || o.clientName.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Delivery Orders</h1>
          <p className="page-subtitle">{orders.length} total order terdaftar</p>
        </div>
        <button className="btn btn-primary btn-lg" onClick={() => navigate('/transport/orders/new')}>
          <Plus size={16} /> Buat DO Baru
        </button>
      </div>

      {/* Filter Bar */}
      <div className="filter-bar">
        <div className="search-input-wrap">
          <Search className="search-icon" size={14} />
          <input
            className="form-input"
            placeholder="Cari No. DO atau nama klien..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          {STATUS_FILTERS.map(f => (
            <button
              key={f.key}
              className={`btn btn-sm ${statusFilter === f.key ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setStatusFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0 }}>
        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📦</div>
            <div className="empty-state-title">Tidak ada order ditemukan</div>
            <div className="empty-state-text">Coba ubah filter atau buat DO baru.</div>
          </div>
        ) : (
          <div className="table-container" style={{ border: 'none' }}>
            <table>
              <thead>
                <tr>
                  <th>No. DO</th>
                  <th>Klien</th>
                  <th>Layanan</th>
                  <th>Rute</th>
                  <th>Tanggal</th>
                  <th>Nilai Order</th>
                  <th>Status DO</th>
                  <th>Pembayaran</th>
                  <th>Progress POD</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(o => {
                  const { done, total, pct } = getDropProgress(o.drops);
                  const needsAssign = o.status === 'aktif' && !o.driverId;
                  return (
                    <tr key={o.id}>
                      <td>
                        <span style={{ fontWeight: 700, color: 'var(--color-primary)', cursor: 'pointer' }}
                          onClick={() => navigate(`/transport/orders/${o.id}`)}>
                          {o.id}
                        </span>
                      </td>
                      <td style={{ fontWeight: 500 }}>{o.clientName}</td>
                      <td>
                        <span className="badge" style={{ background: 'var(--color-primary-dim)', color: 'var(--color-primary)', fontSize: 11 }}>
                          {o.serviceType || 'Charter'}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                        <div>{o.origin.city}</div>
                        {o.drops.slice(0,2).map((d,i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ color: 'var(--text-muted)' }}>→</span> {d.city}
                          </div>
                        ))}
                        {o.drops.length > 2 && <div style={{ color: 'var(--text-muted)' }}>+{o.drops.length-2} lagi</div>}
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>{formatDate(o.date)}</td>
                      <td style={{ fontWeight: 600 }}>{formatRupiah(o.totalValue)}</td>
                      <td><span className={`badge ${statusBadgeClass[o.status]}`}>{statusLabels[o.status]}</span></td>
                      <td><span className={`badge ${paymentBadgeClass[o.paymentStatus]}`}>{paymentLabels[o.paymentStatus]}</span></td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 110 }}>
                          <div className="progress-bar" style={{ flex: 1 }}>
                            <div className={`progress-fill ${pct === 100 ? 'success' : ''}`} style={{ width: `${pct}%` }} />
                          </div>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{done}/{total}</span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/transport/orders/${o.id}`)}>
                            <Eye size={13} /> Detail
                          </button>
                          {needsAssign && (
                            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/transport/assignments')}>
                              <UserCheck size={13} /> Tugaskan
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
