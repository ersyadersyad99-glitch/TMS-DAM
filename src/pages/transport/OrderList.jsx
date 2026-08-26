import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Search, Eye, UserCheck, Download } from 'lucide-react';
import { useOrderStore, useToastStore } from '../../store';
import { getUploadUrl } from '../../services/api';
import {
  formatRupiah, formatDate,
  statusLabels, statusBadgeClass,
  paymentLabels, paymentBadgeClass,
  getDropProgress, exportToExcel
} from '../../utils/helpers';

const STATUS_FILTERS = [
  { key: 'all', label: 'Semua' },
  { key: 'menunggu_dp', label: 'Menunggu DP' },
  { key: 'aktif', label: 'Aktif' },
  { key: 'picked_up', label: '📦 Picked Up' },
  { key: 'in_transit', label: '🚛 In Transit' },
  { key: 'en_route', label: '📍 En Route' },
  { key: 'delivered', label: '✅ Delivered' },
  { key: 'selesai', label: 'Selesai' },
];

export default function OrderList() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { orders } = useOrderStore();
  const { addToast } = useToastStore();

  const queryStatus = searchParams.get('status');
  const [statusFilter, setStatusFilter] = useState(queryStatus || 'all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const qStatus = searchParams.get('status');
    if (qStatus) {
      setStatusFilter(qStatus);
    }
  }, [searchParams]);

  const filtered = orders.filter(o => {
    let matchStatus = statusFilter === 'all' || o.status === statusFilter;
    if (statusFilter === 'delivered') {
      matchStatus = o.status === 'delivered' || o.status === 'selesai';
    } else if (statusFilter === 'selesai') {
      matchStatus = o.status === 'selesai' || o.status === 'delivered';
    }
    const matchSearch = !search
      || (o.id && o.id.toLowerCase().includes(search.toLowerCase()))
      || (o.soNumber && o.soNumber.toLowerCase().includes(search.toLowerCase()))
      || (o.clientName && o.clientName.toLowerCase().includes(search.toLowerCase()));
    return matchStatus && matchSearch;
  });

  const handleExportExcel = () => {
    if (filtered.length === 0) {
      addToast('Tidak ada data order untuk diexport', 'error');
      return;
    }
    const headers = [
      'No. DO', 'No. SO', 'Klien', 'Tipe Layanan', 'Tipe Pembayaran',
      'Unit/Armada', 'Kubikasi', 'Tonase', 'Kota Asal', 'Kota Tujuan',
      'Tgl Pickup', 'Nilai Order (Rp)', 'Harga Buying (Rp)', 'Status DO', 'Status Pembayaran',
      'Progress POD', 'File Surat Jalan (POD)'
    ];
    const rows = filtered.map(o => {
      const { done, total, pct } = getDropProgress(o.drops);
      const podFiles = (o.drops || []).map(d => d.pod || d.podFile).filter(Boolean);
      const podLinksHtml = podFiles.length > 0
        ? podFiles.map(f => {
            const fileUrl = getUploadUrl(f);
            return `<a href="${fileUrl}" target="_blank">${f}</a>`;
          }).join('<br/>')
        : 'Belum Ada POD';

      return [
        o.id,
        o.soNumber || '—',
        o.clientName,
        o.serviceType || 'FTL',
        o.paymentType || '70:30',
        o.unitType || '—',
        o.kubikasi || '—',
        o.tonase || o.weight || '—',
        o.origin?.city || o.originCity || '—',
        (o.drops || []).map(d => d.city || d.store).join(' ; ') || '—',
        o.pickupDate || o.date || '—',
        o.totalValue || 0,
        o.buyingPrice || o.costBreakdown?.buyingPrice || 0,
        statusLabels[o.status] || o.status,
        paymentLabels[o.paymentStatus] || o.paymentStatus,
        `${done}/${total} Drop (${pct}%)`,
        podLinksHtml
      ];
    });
    exportToExcel(`Data_Delivery_Orders_${new Date().toISOString().split('T')[0]}`, headers, rows);
    addToast(`Berhasil meng-export ${filtered.length} Delivery Order (termasuk POD) ke format Excel!`, 'success');
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Delivery Orders</h1>
          <p className="page-subtitle">{orders.length} total order terdaftar</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary btn-lg" onClick={handleExportExcel}>
            <Download size={16} /> Export Excel / CSV
          </button>
          <button className="btn btn-primary btn-lg" onClick={() => navigate('/transport/orders/new')}>
            <Plus size={16} /> Buat DO Baru
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="filter-bar">
        <div className="search-input-wrap">
          <Search className="search-icon" size={14} />
          <input
            className="form-input"
            placeholder="Cari No. DO, No. SO, atau klien..."
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
                  <th>No. DO / No. SO</th>
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
                  const needsAssign = ['menunggu_dp', 'aktif'].includes(o.status) && (!o.driverId || o.driverId === '' || o.driverId === 'null');
                  return (
                    <tr key={o.id}>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 700, color: 'var(--color-primary)', cursor: 'pointer' }}
                            onClick={() => navigate(`/transport/orders/${o.id}`)}>
                            {o.id}
                          </span>
                          {o.soNumber && (
                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                              SO: <strong style={{ color: 'var(--text-secondary)' }}>{o.soNumber}</strong>
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ fontWeight: 500 }}>{o.clientName}</td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'flex-start' }}>
                          <span className="badge" style={{ background: 'var(--color-primary-dim)', color: 'var(--color-primary)', fontSize: 11 }}>
                            {o.serviceType || 'FTL'}
                          </span>
                          {o.unitType && (
                            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)' }}>
                              🚛 {o.unitType}
                            </span>
                          )}
                          <span className="badge badge-done" style={{ fontSize: 10, padding: '2px 6px' }}>
                            💳 {o.paymentType || '70:30'}
                          </span>
                          {(o.kubikasi || o.tonase || o.weight) && (
                            <span style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 500 }}>
                              {o.kubikasi && `📦 ${o.kubikasi} `}
                              {(o.tonase || o.weight) && `⚖️ ${o.tonase || o.weight}`}
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                        <div>{o.origin?.city || o.originCity || '—'}</div>
                        {(o.drops || []).slice(0,2).map((d,i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ color: 'var(--text-muted)' }}>→</span> {d.city || d.store || '—'}
                          </div>
                        ))}
                        {(o.drops || []).length > 2 && <div style={{ color: 'var(--text-muted)' }}>+{(o.drops || []).length-2} lagi</div>}
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                        <div><strong style={{ color: 'var(--text-primary)' }}>Pickup:</strong> {formatDate(o.pickupDate || o.date)}</div>
                        {(o.etdDate || o.etaDate) && (
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            ETD: {o.etdDate ? formatDate(o.etdDate) : '—'} | ETA: {o.etaDate ? formatDate(o.etaDate) : '—'}
                          </div>
                        )}
                      </td>
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
