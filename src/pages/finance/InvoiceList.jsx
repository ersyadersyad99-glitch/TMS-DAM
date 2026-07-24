import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Eye } from 'lucide-react';
import { useInvoiceStore, useOrderStore } from '../../store';
import {
  formatRupiah, formatDate,
  invoiceTypeLabel, invoiceStatusLabel, invoiceStatusClass
} from '../../utils/helpers';

const TYPE_FILTERS = [
  { key: 'all', label: 'Semua' },
  { key: 'dp', label: 'Invoice DP' },
  { key: 'pelunasan', label: 'Invoice Pelunasan' },
];

const STATUS_FILTERS = [
  { key: 'all', label: 'Semua Status' },
  { key: 'unpaid', label: 'Belum Dibayar' },
  { key: 'paid', label: 'Lunas' },
];

export default function InvoiceList() {
  const navigate = useNavigate();
  const { invoices, markPaid } = useInvoiceStore();
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  const filtered = invoices.filter(inv => {
    const matchType = typeFilter === 'all' || inv.type === typeFilter;
    const matchStatus = statusFilter === 'all' || inv.status === statusFilter;
    const matchSearch = !search
      || inv.id.toLowerCase().includes(search.toLowerCase())
      || inv.orderId.toLowerCase().includes(search.toLowerCase())
      || inv.clientName.toLowerCase().includes(search.toLowerCase());
    return matchType && matchStatus && matchSearch;
  });

  const totalUnpaid = invoices.filter(i => i.status === 'unpaid').reduce((s, i) => s + i.amount, 0);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Invoice</h1>
          <p className="page-subtitle">{invoices.length} invoice · Piutang: {formatRupiah(totalUnpaid)}</p>
        </div>
      </div>

      <div className="filter-bar">
        <div className="search-input-wrap">
          <Search className="search-icon" size={14} />
          <input className="form-input" placeholder="Cari No. Invoice, DO, atau klien..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2">
          {TYPE_FILTERS.map(f => (
            <button key={f.key} className={`btn btn-sm ${typeFilter === f.key ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setTypeFilter(f.key)}>{f.label}</button>
          ))}
        </div>
        <div className="flex gap-2">
          {STATUS_FILTERS.map(f => (
            <button key={f.key} className={`btn btn-sm ${statusFilter === f.key ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setStatusFilter(f.key)}>{f.label}</button>
          ))}
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🧾</div>
            <div className="empty-state-title">Tidak ada invoice ditemukan</div>
          </div>
        ) : (
          <div className="table-container" style={{ border: 'none' }}>
            <table>
              <thead>
                <tr>
                  <th>No. Invoice</th>
                  <th>No. DO</th>
                  <th>Klien</th>
                  <th>Tipe</th>
                  <th>Nominal</th>
                  <th>Tgl Terbit</th>
                  <th>Jatuh Tempo</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(inv => (
                  <tr key={inv.id}>
                    <td style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{inv.id}</td>
                    <td>
                      <span
                        style={{ color: 'var(--color-primary)', cursor: 'pointer', fontWeight: 500 }}
                        onClick={() => navigate(`/transport/orders/${inv.orderId}`)}
                      >{inv.orderId}</span>
                    </td>
                    <td>{inv.clientName}</td>
                    <td>
                      <span className={`badge ${inv.type === 'dp' ? 'badge-active' : 'badge-done'}`}>
                        {inv.type === 'dp' ? 'DP 70%' : 'Pelunasan 30%'}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700, fontSize: 14 }}>{formatRupiah(inv.amount)}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{formatDate(inv.date)}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{formatDate(inv.dueDate)}</td>
                    <td>
                      <span className={`badge ${invoiceStatusClass[inv.status]}`}>
                        {invoiceStatusLabel[inv.status]}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-ghost btn-sm"
                          onClick={() => navigate(`/finance/invoices/${inv.id}`)}>
                          <Eye size={13} /> Detail
                        </button>
                        {inv.status === 'unpaid' && (
                          <button className="btn btn-success btn-sm" onClick={() => {
                            markPaid(inv.id);
                            if (inv.type === 'pelunasan') {
                              useOrderStore.getState().markOrderLunas(inv.orderId);
                            }
                          }}>
                            Tandai Lunas
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
