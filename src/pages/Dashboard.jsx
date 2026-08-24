import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { Package, TrendingUp, Wallet, AlertCircle, ArrowRight, Clock, Building2, CheckCircle } from 'lucide-react';
import { useOrderStore, useInvoiceStore, useTravelFundStore, useVendorStore } from '../store';
import { formatRupiah, formatDate, statusBadgeClass, statusLabels } from '../utils/helpers';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="card card-sm" style={{ minWidth: 170, border: '1px solid var(--color-border)' }}>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, fontWeight: 700 }}>{label}</div>
        {payload.map((p, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 12, color: p.color }}>
            <span>{p.name}:</span>
            <span style={{ fontWeight: 700 }}>{formatRupiah(p.value)}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  const navigate = useNavigate();

  // Dynamic state bound to Zustand stores
  const { orders } = useOrderStore();
  const { invoices } = useInvoiceStore();
  const { funds } = useTravelFundStore();
  const { vendors } = useVendorStore();

  // 1. DO Aktif (Active DOs) — includes all in-progress statuses
  const activeOrdersCount = orders.filter(o => ['aktif', 'menunggu_dp', 'picked_up', 'in_transit', 'en_route', 'delivered'].includes(o.status)).length;
  
  // 2. Piutang Klien (Receivables) = Total nominal dari semua invoice Klien yang BELUM dibayar (unpaid)
  const pendingReceivable = invoices
    .filter(i => i.status !== 'paid')
    .reduce((sum, i) => sum + i.amount, 0);

  // 3. Utang Vendor (Vendor Accounts Payable) = Total Buying Price DO yang belum dibayar ke Vendor
  const vendorOrders = orders.filter(o => o.vendorName || o.driverName || o.buyingPrice);
  const vendorDebt = vendorOrders
    .filter(o => o.vendorPaymentStatus !== 'paid')
    .reduce((sum, o) => sum + (o.buyingPrice || o.costBreakdown?.buyingPrice || 0), 0);

  // 4. Biaya Operasional / Travel Funds Beredar
  const travelFundOut = funds
    .filter(t => ['dicairkan', 'pengajuan'].includes(t.status))
    .reduce((sum, t) => sum + (t.disbursedAmount || t.requestAmount), 0);

  // 5. Total Financials & Net Profit Margin (Selling vs Buying)
  const totalRevenue = orders.reduce((sum, o) => sum + o.totalValue, 0);
  const totalBuying = orders.reduce((sum, o) => sum + (o.buyingPrice || o.costBreakdown?.buyingPrice || 0), 0);
  const netMargin = totalRevenue - totalBuying;

  // 6. Dynamic P&L per trip data (Selling vs Buying vs Net Profit)
  const plData = orders.map(o => {
    const buying = o.buyingPrice || o.costBreakdown?.buyingPrice || 0;
    const margin = o.totalValue - buying;
    return {
      name: o.id,
      revenue: o.totalValue,
      buying,
      margin,
    };
  });

  // 7. Dynamic 7-Day Cashflow (Exact Real Transaction Dates)
  const cashflow = (() => {
    const days = [];
    const today = new Date();

    const formatDateKey = (dt) => {
      if (!dt) return null;
      const d = new Date(dt);
      if (isNaN(d.getTime())) return String(dt).split('T')[0];
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    for (let i = 6; i >= 0; i--) {
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() - i);
      const targetKey = formatDateKey(targetDate);
      const label = `${targetDate.getDate()}/${targetDate.getMonth() + 1}`;

      // Kas Masuk: Real Client Payments on this exact date
      const masuk = invoices
        .filter(inv => {
          if (inv.status !== 'paid') return false;
          const pKey = formatDateKey(inv.paidAt || inv.date);
          return pKey === targetKey;
        })
        .reduce((sum, inv) => sum + (inv.amount || 0), 0);

      // Kas Keluar: Real Vendor Payments + Disbursed Travel Funds on this exact date
      const vendorKeluar = vendorOrders
        .filter(o => {
          if (o.vendorPaymentStatus !== 'paid') return false;
          const vpKey = formatDateKey(o.vendorPaymentDate || o.date);
          return vpKey === targetKey;
        })
        .reduce((sum, o) => sum + (o.buyingPrice || o.costBreakdown?.buyingPrice || 0), 0);

      const fundKeluar = (funds || [])
        .filter(t => {
          if (!['dicairkan', 'realisasi_selesai'].includes(t.status)) return false;
          const tfKey = formatDateKey(t.disbursedDate || t.disbursedAt || t.requestDate || t.date);
          return tfKey === targetKey;
        })
        .reduce((sum, t) => sum + (t.disbursedAmount || t.requestAmount || 0), 0);

      days.push({
        date: label,
        masuk: masuk,
        keluar: vendorKeluar + fundKeluar,
      });
    }
    return days;
  })();

  const recentOrders = [...orders]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5);

  const pendingPOD = orders.filter(o =>
    ['picked_up', 'in_transit', 'en_route'].includes(o.status) && o.drops && o.drops.some(d => !d.pod)
  );

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard Operasional & Keuangan</h1>
          <p className="page-subtitle">Ringkasan real-time transaksi Delivery Order, Piutang, Hutang & Gross Margin hari ini.</p>
        </div>
        <button className="btn btn-primary btn-lg" onClick={() => navigate('/transport/orders/new')}>
          <Package size={16} /> + Buat DO Baru
        </button>
      </div>

      {/* KPI Cards (4 Main Cards) */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
        {/* Card 1: DO Aktif */}
        <div className="card stat-card" style={{ borderLeft: '4px solid var(--color-primary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>DO Aktif</div>
            <div style={{ background: 'var(--color-primary-dim)', borderRadius: 8, padding: '6px 8px', color: 'var(--color-primary)' }}><Package size={16} /></div>
          </div>
          <div className="stat-value">{activeOrdersCount}</div>
          <div className="stat-label">Order aktif ({orders.length} total DO)</div>
          <div className="stat-change" style={{ color: 'var(--color-info)' }}>
            {pendingPOD.length} DO dalam pengiriman
          </div>
        </div>

        {/* Card 2: Piutang */}
        <div className="card stat-card" style={{ borderLeft: '4px solid var(--color-danger)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>PIUTANG</div>
            <div style={{ background: 'var(--color-danger-dim)', borderRadius: 8, padding: '6px 8px', color: 'var(--color-danger)' }}><AlertCircle size={16} /></div>
          </div>
          <div className="stat-value" style={{ color: pendingReceivable === 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
            {formatRupiah(pendingReceivable)}
          </div>
          <div className="stat-label">{pendingReceivable === 0 ? 'Semua tagihan Klien lunas ✓' : 'Invoice Klien belum dibayar'}</div>
          <div className="stat-change" style={{ color: 'var(--color-danger)' }}>
            {invoices.filter(i => i.status === 'unpaid').length} invoice pending
          </div>
        </div>

        {/* Card 3: Hutang */}
        <div className="card stat-card" style={{ borderLeft: '4px solid var(--color-warning)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>HUTANG</div>
            <div style={{ background: 'var(--color-warning-dim)', borderRadius: 8, padding: '6px 8px', color: '#ca8a04' }}><Building2 size={16} /></div>
          </div>
          <div className="stat-value" style={{ color: '#ca8a04' }}>
            {formatRupiah(vendorDebt)}
          </div>
          <div className="stat-label">Tagihan modal vendor aktif</div>
          <div className="stat-change" style={{ color: 'var(--color-primary)' }}>
            {vendors.length} vendor armada terdaftar
          </div>
        </div>

        {/* Card 4: Gross Margin */}
        <div className="card stat-card" style={{ borderLeft: '4px solid var(--color-success)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>GROSS MARGIN</div>
            <div style={{ background: 'var(--color-success-dim)', borderRadius: 8, padding: '6px 8px', color: 'var(--color-success)' }}><TrendingUp size={16} /></div>
          </div>
          <div className="stat-value" style={{ color: netMargin >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
            {formatRupiah(netMargin)}
          </div>
          <div className="stat-label">Selling - Buying Rate</div>
          <div className="stat-change" style={{ color: 'var(--color-success)' }}>
            Total Revenue: {formatRupiah(totalRevenue)}
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        {/* P&L Chart */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 700 }}>Analisis P&L per Trip DO</h3>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Total Selling Rate (Klien) vs Buying Rate (Vendor) vs Profit Margin</p>
            </div>
          </div>
          {plData.length === 0 ? (
            <div className="empty-state" style={{ height: 220, justifyContent: 'center' }}>
              <div style={{ fontSize: 24 }}>📊</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Belum ada transaksi DO untuk grafik P&L</div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={plData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false}
                  tickFormatter={v => `${(v/1000000).toFixed(1)}jt`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text-secondary)' }} />
                <Bar dataKey="revenue" name="Selling (Klien)" fill="#3d7a7a" radius={[4,4,0,0]} />
                <Bar dataKey="buying" name="Buying (Vendor)" fill="#eab308" radius={[4,4,0,0]} />
                <Bar dataKey="margin" name="Profit Margin" fill="#22c55e" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Cashflow Chart */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 700 }}>Arus Kas 7 Hari</h3>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Uang Masuk (Invoice Klien Lunas) vs Uang Keluar (Pembayaran Vendor Lunas)</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={cashflow}>
              <defs>
                <linearGradient id="gradMasuk" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3d7a7a" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3d7a7a" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradKeluar" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false}
                tickFormatter={v => `${(v/1000000).toFixed(1)}jt`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text-secondary)' }} />
              <Area type="monotone" dataKey="masuk" name="Uang Masuk (Klien)" stroke="#3d7a7a" fill="url(#gradMasuk)" strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="keluar" name="Uang Keluar (Vendor)" stroke="#ef4444" fill="url(#gradKeluar)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid" style={{ gridTemplateColumns: '1fr 300px', gap: 16, alignItems: 'start' }}>
        {/* Recent Orders */}
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: 14, fontWeight: 700 }}>Transaksi Delivery Order Terbaru ({orders.length})</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/transport/orders')} style={{ gap: 4 }}>
              Lihat Semua <ArrowRight size={12} />
            </button>
          </div>
          <div className="table-container" style={{ border: 'none' }}>
            <table>
              <thead>
                <tr>
                  <th>No. DO</th>
                  <th>Klien & Vendor</th>
                  <th>Driver / Armada</th>
                  <th>Selling / Buying</th>
                  <th>Status DO</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)' }}>
                      Belum ada transaksi Delivery Order. Buat DO baru untuk memulai.
                    </td>
                  </tr>
                ) : (
                  recentOrders.map(o => {
                    const buying = o.buyingPrice || o.costBreakdown?.buyingPrice || 0;
                    return (
                      <tr key={o.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/transport/orders/${o.id}`)}>
                        <td style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{o.id}</td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{o.clientName}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Vendor: {o.vendorName || 'Internal'}</div>
                        </td>
                        <td>
                          <div style={{ fontSize: 12, fontWeight: 500 }}>{o.driverName || 'Belum ditugaskan'}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{o.fleetPlate || '—'}</div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Selling: {formatRupiah(o.totalValue)}</div>
                          <div style={{ fontSize: 11, color: 'var(--color-primary)' }}>Buying: {formatRupiah(buying)}</div>
                        </td>
                        <td><span className={`badge ${statusBadgeClass[o.status]}`}>{statusLabels[o.status]}</span></td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Notifications & Status Widget */}
        <div className="card">
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Notifikasi Real-Time</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {pendingReceivable > 0 && (
              <div
                onClick={() => navigate('/finance/invoices')}
                style={{
                  display: 'flex', gap: 10, alignItems: 'flex-start',
                  padding: '10px 12px', background: 'var(--color-danger-dim)',
                  border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8,
                  cursor: 'pointer'
                }}
              >
                <AlertCircle size={14} color="var(--color-danger)" style={{ flexShrink: 0, marginTop: 1 }} />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>Piutang Klien</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                    {formatRupiah(pendingReceivable)} belum ditagih
                  </div>
                </div>
              </div>
            )}

            {vendorDebt > 0 && (
              <div
                onClick={() => navigate('/finance/invoices')}
                style={{
                  display: 'flex', gap: 10, alignItems: 'flex-start',
                  padding: '10px 12px', background: 'rgba(234,179,8,0.12)',
                  border: '1px solid rgba(234,179,8,0.25)', borderRadius: 8,
                  cursor: 'pointer'
                }}
              >
                <Building2 size={14} color="#ca8a04" style={{ flexShrink: 0, marginTop: 1 }} />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>Utang Vendor Armada</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                    {formatRupiah(vendorDebt)} belum dibayar
                  </div>
                </div>
              </div>
            )}

            {pendingPOD.length > 0 && pendingPOD.map(o => (
              <div key={o.id}
                onClick={() => navigate(`/transport/orders/${o.id}`)}
                style={{
                  display: 'flex', gap: 10, alignItems: 'flex-start',
                  padding: '10px 12px', background: 'var(--color-primary-dim)',
                  border: '1px solid var(--color-primary-glow)', borderRadius: 8,
                  cursor: 'pointer'
                }}
              >
                <Clock size={14} color="var(--color-primary)" style={{ flexShrink: 0, marginTop: 1 }} />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{o.id} dalam Transit</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                    Selesai pengiriman & upload POD
                  </div>
                </div>
              </div>
            ))}

            {pendingReceivable === 0 && vendorDebt === 0 && pendingPOD.length === 0 && (
              <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)', fontSize: 12 }}>
                <CheckCircle size={24} color="var(--color-success)" style={{ margin: '0 auto 6px auto', display: 'block' }} />
                Semua transaksi & keuangan lancar
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
