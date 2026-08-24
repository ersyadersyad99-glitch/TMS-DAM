import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Eye, CheckCircle, DollarSign, X, Download, RefreshCw } from 'lucide-react';
import { useInvoiceStore, useOrderStore, useVendorStore, useToastStore, syncAllStoresFromDatabase } from '../../store';
import {
  formatRupiah, formatDate,
  invoiceStatusLabel, invoiceStatusClass, exportToExcel
} from '../../utils/helpers';

const TYPE_FILTERS = [
  { key: 'all', label: 'Semua' },
  { key: 'dp', label: 'Invoice DP (70%)' },
  { key: 'pelunasan', label: 'Invoice Pelunasan (30%)' },
  { key: 'top_full', label: 'Invoice TOP (Full)' },
];

const STATUS_FILTERS = [
  { key: 'all', label: 'Semua Status' },
  { key: 'unpaid', label: 'Belum Dibayar' },
  { key: 'paid', label: 'Lunas' },
];

export default function InvoiceList() {
  const navigate = useNavigate();
  const { invoices, markPaid, fetchFromApi: fetchInvoices } = useInvoiceStore();
  const { orders, markVendorPayment, fetchFromApi: fetchOrders } = useOrderStore();
  const { vendors } = useVendorStore();
  const { addToast } = useToastStore();

  const [activeTab, setActiveTab] = useState('klien'); // 'klien' | 'vendor'
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Force-fetch from API every time the page mounts
  useEffect(() => {
    const fetchFresh = async () => {
      setIsRefreshing(true);
      try {
        await syncAllStoresFromDatabase();
      } finally {
        setIsRefreshing(false);
      }
    };
    fetchFresh();
  }, []);

  // Modal State for Vendor Payment
  const [payVendorModal, setPayVendorModal] = useState(null); // order object
  const [vendorPayForm, setVendorPayForm] = useState({
    bank: 'Bank Transfer (BCA)',
    account: '',
    refNo: '',
  });

  // Normalize raw invoices from store/API
  const normalizedInvoices = invoices.map(inv => {
    if (!inv) return null;
    const raw = inv.invoice ? { ...inv.invoice, date: inv.invoice.issueDate || inv.invoice.date, clientName: inv.invoice.clientName || inv.client?.name } : inv;
    return {
      ...raw,
      id: raw.id || '—',
      orderId: raw.orderId || '—',
      clientName: raw.clientName || '—',
      amount: raw.amount || 0,
      date: raw.date || raw.issueDate || raw.createdAt || '—',
      dueDate: raw.dueDate || '—',
      status: raw.status || 'unpaid',
      type: raw.type || 'dp',
    };
  }).filter(Boolean);

  // Client Invoices Filter
  const filteredInvoices = normalizedInvoices.filter(inv => {
    const matchType = typeFilter === 'all' || inv.type === typeFilter;
    const matchStatus = statusFilter === 'all' || inv.status === statusFilter;
    const matchSearch = !search
      || (inv.id && inv.id.toLowerCase().includes(search.toLowerCase()))
      || (inv.orderId && inv.orderId.toLowerCase().includes(search.toLowerCase()))
      || (inv.clientName && inv.clientName.toLowerCase().includes(search.toLowerCase()));
    return matchType && matchStatus && matchSearch;
  });

  const totalUnpaidClient = normalizedInvoices.filter(i => i.status === 'unpaid').reduce((s, i) => s + i.amount, 0);

  // Vendor Payments Filter (all assigned DOs with vendorName or buyingPrice)
  const vendorOrders = orders.filter(o => o.vendorName || o.driverName || o.buyingPrice);
  
  const filteredVendorOrders = vendorOrders.filter(o => {
    const vStatus = o.vendorPaymentStatus === 'paid' ? 'paid' : 'unpaid';
    const matchStatus = statusFilter === 'all' || vStatus === statusFilter;
    const matchSearch = !search
      || o.id.toLowerCase().includes(search.toLowerCase())
      || (o.vendorName && o.vendorName.toLowerCase().includes(search.toLowerCase()))
      || (o.driverName && o.driverName.toLowerCase().includes(search.toLowerCase()))
      || (o.fleetPlate && o.fleetPlate.toLowerCase().includes(search.toLowerCase()));
    return matchStatus && matchSearch;
  });

  const totalVendorDebt = vendorOrders.filter(o => o.vendorPaymentStatus !== 'paid').reduce((s, o) => s + (o.buyingPrice || o.costBreakdown?.buyingPrice || 0), 0);
  const totalVendorPaid = vendorOrders.filter(o => o.vendorPaymentStatus === 'paid').reduce((s, o) => s + (o.buyingPrice || o.costBreakdown?.buyingPrice || 0), 0);

  const handleOpenPayVendorModal = (o) => {
    const matchingVendor = vendors.find(v => (v.name || '').toLowerCase() === (o.vendorName || '').toLowerCase());
    const registeredAccount = matchingVendor?.bankAccount || '';
    setVendorPayForm({
      bank: 'Bank Transfer (BCA)',
      account: registeredAccount,
      refNo: '',
    });
    setPayVendorModal(o);
  };

  const handleConfirmPayVendor = (e) => {
    e.preventDefault();
    if (!payVendorModal) return;
    if (!vendorPayForm.account.trim()) {
      addToast('No. Rekening Tujuan Vendor wajib diisi!', 'error');
      return;
    }

    markVendorPayment(payVendorModal.id, vendorPayForm);
    addToast(`Pembayaran Rp ${formatRupiah(payVendorModal.buyingPrice || payVendorModal.costBreakdown?.buyingPrice || 0)} ke Vendor ${payVendorModal.vendorName} (Rek: ${vendorPayForm.account.trim()}) berhasil diproses!`, 'success');
    setPayVendorModal(null);
    setVendorPayForm({ bank: 'Bank Transfer (BCA)', account: '', refNo: '' });
  };

  const handleExportInvoice = () => {
    if (activeTab === 'klien') {
      if (filteredInvoices.length === 0) {
        addToast('Tidak ada data invoice piutang untuk diexport', 'error');
        return;
      }
      const headers = [
        'No. Invoice', 'No. DO', 'Klien', 'Tipe Penagihan', 'Skema Pembayaran',
        'Nominal Tagihan (Rp)', 'Tanggal Terbit', 'Jatuh Tempo', 'Status Invoice'
      ];
      const rows = filteredInvoices.map(inv => {
        const matchingOrder = orders.find(o => o.id === inv.orderId);
        const pType = inv.paymentType || matchingOrder?.paymentType || '70:30';
        return [
          inv.id,
          inv.orderId,
          inv.clientName,
          inv.type === 'dp' ? 'Down Payment (70%)' : inv.type === 'top_full' ? 'Full TOP' : 'Pelunasan (30%)',
          pType,
          inv.amount || 0,
          inv.date || '—',
          inv.dueDate || '—',
          invoiceStatusLabel[inv.status] || inv.status
        ];
      });
      exportToExcel(`Data_Invoice_Piutang_Klien_${new Date().toISOString().split('T')[0]}`, headers, rows);
      addToast(`Berhasil meng-export ${filteredInvoices.length} Invoice Klien ke format Excel!`, 'success');
    } else {
      if (filteredVendorOrders.length === 0) {
        addToast('Tidak ada data tagihan vendor untuk diexport', 'error');
        return;
      }
      const headers = [
        'No. DO', 'Vendor Armada', 'Sopir / Driver', 'Plat Armada',
        'Biaya Buying Modal (Rp)', 'No. Rekening Vendor', 'Status Pembayaran',
        'Tanggal Bayar', 'Bank / Metode', 'No. Referensi'
      ];
      const rows = filteredVendorOrders.map(o => {
        const matchingVendor = vendors.find(v => (v.name || '').toLowerCase() === (o.vendorName || '').toLowerCase());
        const bankAcc = matchingVendor?.bankAccount || o.vendorBankAcc || '—';
        return [
          o.id,
          o.vendorName || '—',
          o.driverName || '—',
          o.fleetPlate || '—',
          o.buyingPrice || o.costBreakdown?.buyingPrice || 0,
          bankAcc,
          o.vendorPaymentStatus === 'paid' ? 'Lunas' : 'Belum Dibayar',
          o.vendorPaymentDate || '—',
          o.vendorPaymentDetails?.bank || '—',
          o.vendorPaymentDetails?.refNo || '—'
        ];
      });
      exportToExcel(`Data_Pembayaran_Vendor_${new Date().toISOString().split('T')[0]}`, headers, rows);
      addToast(`Berhasil meng-export ${filteredVendorOrders.length} Pembayaran Vendor ke format Excel!`, 'success');
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Keuangan & Invoice</h1>
          <p className="page-subtitle">Kelola invoice piutang Klien dan pembayaran tagihan ke Vendor Armada</p>
        </div>
        <button className="btn btn-secondary btn-lg" onClick={handleExportInvoice}>
          <Download size={16} /> Export Excel / CSV ({activeTab === 'klien' ? 'Piutang Klien' : 'Utang Vendor'})
        </button>
      </div>

      {/* Main Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, borderBottom: '2px solid var(--color-border)', paddingBottom: 2 }}>
        <button
          className={`btn ${activeTab === 'klien' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ borderRadius: '8px 8px 0 0', fontWeight: 700 }}
          onClick={() => setActiveTab('klien')}
        >
          📄 Invoice Piutang Klien ({invoices.length})
        </button>
        <button
          className={`btn ${activeTab === 'vendor' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ borderRadius: '8px 8px 0 0', fontWeight: 700 }}
          onClick={() => setActiveTab('vendor')}
        >
          🏢 Pembayaran Ke Vendor Armada ({vendorOrders.length})
        </button>
      </div>

      {/* TAB 1: INVOICE PIUTANG KLIEN */}
      {activeTab === 'klien' && (
        <div>
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
            {filteredInvoices.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">🧾</div>
                <div className="empty-state-title">Tidak ada invoice piutang ditemukan</div>
              </div>
            ) : (
              <div className="table-container" style={{ border: 'none' }}>
                <table>
                  <thead>
                    <tr>
                      <th>No. Invoice</th>
                      <th>No. DO</th>
                      <th>Klien</th>
                      <th>Tipe Penagihan & Pembayaran</th>
                      <th>Nominal Tagihan</th>
                      <th>Tgl Terbit</th>
                      <th>Jatuh Tempo</th>
                      <th>Status</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInvoices.map(inv => {
                      const matchingOrder = orders.find(o => o.id === inv.orderId);
                      const pType = inv.paymentType || matchingOrder?.paymentType || '70:30';
                      const isTop = pType.startsWith('TOP');

                      return (
                        <tr key={inv.id}>
                          <td style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{inv.id}</td>
                          <td>
                            <span
                              style={{ color: 'var(--color-primary)', cursor: 'pointer', fontWeight: 500 }}
                              onClick={() => navigate(`/transport/orders/${inv.orderId}`)}
                            >{inv.orderId}</span>
                          </td>
                          <td style={{ fontWeight: 500 }}>{inv.clientName}</td>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'flex-start' }}>
                              <span className={`badge ${isTop ? 'badge-done' : inv.type === 'dp' ? 'badge-active' : 'badge-done'}`}>
                                💳 {pType}
                              </span>
                              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                {isTop ? 'Full Tagihan 100%' : inv.type === 'dp' ? 'Down Payment (70%)' : 'Pelunasan Akhir (30%)'}
                              </span>
                            </div>
                          </td>
                          <td style={{ fontWeight: 700, fontSize: 14 }}>{formatRupiah(inv.amount)}</td>
                          <td style={{ color: 'var(--text-secondary)' }}>{formatDate(inv.date)}</td>
                          <td style={{ color: 'var(--text-secondary)', fontWeight: isTop ? 600 : 400 }}>{formatDate(inv.dueDate)}</td>
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
                                  if (inv.type === 'pelunasan' || inv.type === 'top_full') {
                                    useOrderStore.getState().markOrderLunas(inv.orderId);
                                  }
                                }}>
                                  Tandai Lunas
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
      )}

      {/* TAB 2: PEMBAYARAN KE VENDOR ARMADA */}
      {activeTab === 'vendor' && (
        <div>
          {/* Summary Stat Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 20 }}>
            <div className="card" style={{ borderLeft: '4px solid var(--color-warning)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Belum Dibayar ke Vendor</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-warning)' }}>{formatRupiah(totalVendorDebt)}</div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>Tagihan modal vendor aktif</div>
            </div>

            <div className="card" style={{ borderLeft: '4px solid var(--color-success)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Sudah Dibayar (Lunas Vendor)</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-success)' }}>{formatRupiah(totalVendorPaid)}</div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>Pembayaran modal vendor lunas</div>
            </div>

            <div className="card" style={{ borderLeft: '4px solid var(--color-primary)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Total Transaksi Vendor</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-primary)' }}>{formatRupiah(totalVendorDebt + totalVendorPaid)}</div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>{vendorOrders.length} transaksi penugasan</div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="filter-bar">
            <div className="search-input-wrap">
              <Search className="search-icon" size={14} />
              <input className="form-input" placeholder="Cari Nama Vendor, DO, Sopir, Plat Armada..."
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="flex gap-2">
              {STATUS_FILTERS.map(f => (
                <button key={f.key} className={`btn btn-sm ${statusFilter === f.key ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setStatusFilter(f.key)}>{f.label}</button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="card" style={{ padding: 0 }}>
            {filteredVendorOrders.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">🏢</div>
                <div className="empty-state-title">Belum ada transaksi penugasan vendor</div>
                <div className="empty-state-text">Lakukan penugasan vendor armada di menu Penugasan untuk menerbitkan tagihan vendor.</div>
              </div>
            ) : (
              <div className="table-container" style={{ border: 'none' }}>
                <table>
                  <thead>
                    <tr>
                      <th>No. DO / Ref</th>
                      <th>Nama Vendor Armada</th>
                      <th>Driver & No. Polisi</th>
                      <th>Layanan & Rute</th>
                      <th>Harga Buying (Vendor)</th>
                      <th>Status Pembayaran</th>
                      <th>Aksi Pembayaran</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredVendorOrders.map(o => {
                      const buyingRate = o.buyingPrice || o.costBreakdown?.buyingPrice || 0;
                      const isVendorPaid = o.vendorPaymentStatus === 'paid';

                      return (
                        <tr key={o.id}>
                          <td>
                            <span
                              style={{ color: 'var(--color-primary)', cursor: 'pointer', fontWeight: 600 }}
                              onClick={() => navigate(`/transport/orders/${o.id}`)}
                            >
                              {o.id}
                            </span>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{o.clientName}</div>
                          </td>
                          <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                            🏢 {o.vendorName || 'Vendor Internal'}
                          </td>
                          <td>
                            <div style={{ fontWeight: 600, fontSize: 13 }}>{o.driverName || '—'}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>🚛 {o.fleetPlate || '—'}</div>
                          </td>
                          <td>
                            <span className="badge" style={{ background: 'var(--color-primary-dim)', color: 'var(--color-primary)', fontSize: 11 }}>
                              {o.serviceType || 'Charter'}
                            </span>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                              {o.origin?.city} → {o.drops?.map(d => d.city).join(', ')}
                            </div>
                          </td>
                          <td style={{ fontWeight: 800, fontSize: 14, color: 'var(--color-primary)' }}>
                            {formatRupiah(buyingRate)}
                          </td>
                          <td>
                            {isVendorPaid ? (
                              <span className="badge badge-done" style={{ fontSize: 11 }}>
                                <CheckCircle size={11} /> Lunas Vendor
                              </span>
                            ) : (
                              <span className="badge badge-active" style={{ fontSize: 11, background: 'rgba(234,179,8,0.15)', color: '#ca8a04' }}>
                                Belum Dibayar
                              </span>
                            )}
                          </td>
                          <td>
                            {isVendorPaid ? (
                              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                Paid: {formatDate(o.vendorPaymentDate || o.date)}
                              </div>
                            ) : (
                              <button
                                className="btn btn-primary btn-sm"
                                onClick={() => handleOpenPayVendorModal(o)}
                              >
                                <DollarSign size={13} /> Bayar Vendor
                              </button>
                            )}
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
      )}

      {/* Modal Pay Vendor */}
      {payVendorModal && (
        <div className="modal-overlay" onClick={() => setPayVendorModal(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 460 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                💳 Proses Pembayaran Ke Vendor Armada
              </h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setPayVendorModal(null)}>
                <X size={16} />
              </button>
            </div>

            <div style={{ background: 'var(--color-bg-base)', padding: '12px 14px', borderRadius: 8, marginBottom: 16, border: '1px solid var(--color-border)', fontSize: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ color: 'var(--text-muted)' }}>No. DO / Transaksi:</span>
                <strong style={{ color: 'var(--color-primary)' }}>{payVendorModal.id}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ color: 'var(--text-muted)' }}>Nama Vendor:</span>
                <strong>{payVendorModal.vendorName || 'Vendor Armada'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ color: 'var(--text-muted)' }}>Driver & Plat Armada:</span>
                <span>{payVendorModal.driverName} ({payVendorModal.fleetPlate})</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--color-border)', fontSize: 14 }}>
                <span style={{ fontWeight: 600 }}>Nominal Tagihan Modal Vendor:</span>
                <strong style={{ color: 'var(--color-primary)' }}>{formatRupiah(payVendorModal.buyingPrice || payVendorModal.costBreakdown?.buyingPrice || 0)}</strong>
              </div>
            </div>

            <form onSubmit={handleConfirmPayVendor}>
              <div className="form-group">
                <label className="form-label">Metode Pembayaran Transfer *</label>
                <select
                  className="form-input form-select"
                  value={vendorPayForm.bank}
                  onChange={e => setVendorPayForm(f => ({ ...f, bank: e.target.value }))}
                >
                  <option value="Bank Transfer (BCA)">Bank Transfer - BCA (PT Logistik TMS)</option>
                  <option value="Bank Transfer (Mandiri)">Bank Transfer - Mandiri</option>
                  <option value="Bank Transfer (BNI)">Bank Transfer - BNI</option>
                  <option value="Bank Transfer (BRI)">Bank Transfer - BRI</option>
                  <option value="Kas Tunai Ops">Kas Tunai Operasional</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
                  💳 No. Rekening Tujuan Vendor (Mandatory) *
                </label>
                <input
                  className="form-input"
                  placeholder="misal: BCA 8899221100 a/n PT Mitra Trans Logistik"
                  value={vendorPayForm.account}
                  onChange={e => setVendorPayForm(f => ({ ...f, account: e.target.value }))}
                  required
                />
                <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                  Otomatis terisi dari Database Armada Vendor atau ketik manual jika ada perubahan
                </span>
              </div>

              <div className="form-group">
                <label className="form-label">No. Referensi / Bukti Transfer</label>
                <input
                  className="form-input"
                  placeholder="misal: TRF-BCA-99210"
                  value={vendorPayForm.refNo}
                  onChange={e => setVendorPayForm(f => ({ ...f, refNo: e.target.value }))}
                />
              </div>

              <div className="divider" />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setPayVendorModal(null)}>Batal</button>
                <button type="submit" className="btn btn-success btn-lg">
                  <CheckCircle size={16} /> Konfirmasi Pembayaran Vendor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
