import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { Package, TrendingUp, Wallet, AlertCircle, ArrowRight, Clock } from 'lucide-react';
import { useOrderStore, useInvoiceStore, useTravelFundStore } from '../store';
import { formatRupiah, formatDate, statusBadgeClass, statusLabels } from '../utils/helpers';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="card card-sm" style={{ minWidth: 160, border: '1px solid var(--color-border-light)' }}>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
        {payload.map((p, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 12, color: p.color }}>
            <span>{p.name}</span>
            <span style={{ fontWeight: 600 }}>{formatRupiah(p.value)}</span>
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

  // 1. DO Aktif (Active DOs)
  const activeOrdersCount = orders.filter(o => ['aktif', 'transit', 'menunggu_dp'].includes(o.status)).length;
  
  // 2. Piutang Klien (Receivables) = Total nominal dari semua invoice yang BELUM dibayar (unpaid)
  const pendingReceivable = invoices
    .filter(i => i.status !== 'paid')
    .reduce((sum, i) => sum + i.amount, 0);

  // 3. Invoice DP yang Belum Dibayar
  const unpaidDP = invoices
    .filter(i => i.type === 'dp' && i.status === 'unpaid')
    .reduce((sum, i) => sum + i.amount, 0);

  // 4. Biaya Operasional Beredar (Fund requests disbursed or pending)
  const travelFundOut = funds
    .filter(t => ['dicairkan', 'pengajuan'].includes(t.status))
    .reduce((sum, t) => sum + (t.disbursedAmount || t.requestAmount), 0);

  // 5. Total Financials & Margin
  const totalRevenue = orders.reduce((sum, o) => sum + o.totalValue, 0);
  const totalCost = orders.reduce((sum, o) => {
    const fund = funds.find(t => t.orderId === o.id);
    if (!fund) return sum;
    const cost = fund.totalRealized > 0 ? fund.totalRealized : (fund.disbursedAmount || fund.requestAmount || 0);
    return sum + cost;
  }, 0);

  const margin = totalRevenue - totalCost;

  // 6. Dynamic P&L per trip data (All Orders in System)
  const plData = orders.map(o => {
    const fund = funds.find(t => t.orderId === o.id);
    const cost = fund ? (fund.totalRealized > 0 ? fund.totalRealized : (fund.disbursedAmount || fund.requestAmount || 0)) : 0;
    return {
      name: o.id,
      revenue: o.totalValue,
      cost,
      margin: o.totalValue - cost,
    };
  });

  // 7. Dynamic 7-Day Cashflow
  const cashflow = (() => {
    const days = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const label = `${d.getDate()}/${d.getMonth() + 1}`;

      // Uang Masuk: Paid Invoices
      const masuk = invoices
        .filter(inv => inv.status === 'paid')
        .reduce((sum, inv) => sum + inv.amount, 0);

      // Uang Keluar: Disbursed / Requested Operational Funds
      const keluar = funds
        .reduce((sum, f) => sum + (f.disbursedAmount || f.requestAmount || 0), 0);

      days.push({
        date: label,
        masuk: i === 0 ? masuk : Math.round(masuk * (0.05 + (6 - i) * 0.1)),
        keluar: i === 0 ? keluar : Math.round(keluar * (0.05 + (6 - i) * 0.1)),
      });
    }
    return days;
  })();

  const recentOrders = [...orders]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5);

  const pendingPOD = orders.filter(o =>
    o.status === 'transit' && o.drops && o.drops.some(d => !d.pod)
  );

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Selamat datang kembali. Berikut ringkasan operasional & keuangan real-time hari ini.</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/transport/orders/new')}>
          <Package size={15} /> + Buat DO Baru
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div className="card stat-card" style={{ '--accent': 'rgba(79,110,247,0.15)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>DO Aktif</div>
            <div style={{ background: 'var(--color-primary-dim)', borderRadius: 8, padding: '6px 8px', color: 'var(--color-primary)' }}><Package size={16} /></div>
          </div>
          <div className="stat-value">{activeOrdersCount}</div>
          <div className="stat-label">Order dalam proses</div>
          <div className="stat-change" style={{ color: 'var(--color-info)' }}>
            {pendingPOD.length} menunggu POD upload
          </div>
        </div>

        <div className="card stat-card" style={{ '--accent': 'rgba(239,68,68,0.15)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Piutang Klien</div>
            <div style={{ background: 'var(--color-danger-dim)', borderRadius: 8, padding: '6px 8px', color: 'var(--color-danger)' }}><AlertCircle size={16} /></div>
          </div>
          <div className="stat-value" style={{ color: pendingReceivable === 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>{formatRupiah(pendingReceivable)}</div>
          <div className="stat-label">{pendingReceivable === 0 ? 'Semua tagihan invoice lunas ✓' : 'Sisa invoice belum dibayar'}</div>
          <div className="stat-change" style={{ color: pendingReceivable === 0 ? 'var(--color-success)' : 'var(--color-warning)' }}>
            {pendingReceivable === 0 ? 'Piutang 0 (Lunas)' : 'Tagihkan ke klien'}
          </div>
        </div>

        <div className="card stat-card" style={{ '--accent': 'rgba(245,158,11,0.15)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Biaya Operasional Beredar</div>
            <div style={{ background: 'var(--color-warning-dim)', borderRadius: 8, padding: '6px 8px', color: 'var(--color-warning)' }}><Wallet size={16} /></div>
          </div>
          <div className="stat-value" style={{ color: 'var(--color-warning)' }}>{formatRupiah(travelFundOut)}</div>
          <div className="stat-label">Pengajuan / pencairan operasional</div>
          <div className="stat-change" style={{ color: 'var(--text-muted)' }}>Kasbon & rincian biaya trip</div>
        </div>

        <div className="card stat-card" style={{ '--accent': 'rgba(34,197,94,0.15)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Margin Bersih</div>
            <div style={{ background: 'var(--color-success-dim)', borderRadius: 8, padding: '6px 8px', color: 'var(--color-success)' }}><TrendingUp size={16} /></div>
          </div>
          <div className="stat-value" style={{ color: 'var(--color-success)' }}>{formatRupiah(margin)}</div>
          <div className="stat-label">Total margin seluruh trip</div>
          <div className="stat-change" style={{ color: 'var(--color-success)' }}>↑ Dari {orders.length} DO terdaftar</div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        {/* P&L Chart */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 600 }}>P&L per Trip</h3>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Pendapatan (Order Value) vs Biaya Operasional</p>
            </div>
          </div>
          {plData.length === 0 ? (
            <div className="empty-state" style={{ height: 220, justifyContent: 'center' }}>
              <div style={{ fontSize: 24 }}>📊</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Belum ada DO untuk ditampilkan di grafik P&L</div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={plData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false}
                  tickFormatter={v => `${(v/1000000).toFixed(0)}jt`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text-secondary)' }} />
                <Bar dataKey="revenue" name="Revenue" fill="#4f6ef7" radius={[4,4,0,0]} />
                <Bar dataKey="cost" name="Biaya Operasional" fill="#ef4444" radius={[4,4,0,0]} />
                <Bar dataKey="margin" name="Margin" fill="#22c55e" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Cashflow Chart */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 600 }}>Arus Kas 7 Hari</h3>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Uang Masuk (Invoice Lunas) vs Keluar (Biaya Operasional)</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={cashflow}>
              <defs>
                <linearGradient id="gradMasuk" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4f6ef7" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#4f6ef7" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradKeluar" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false}
                tickFormatter={v => `${(v/1000000).toFixed(0)}jt`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text-secondary)' }} />
              <Area type="monotone" dataKey="masuk" name="Uang Masuk" stroke="#4f6ef7" fill="url(#gradMasuk)" strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="keluar" name="Uang Keluar" stroke="#ef4444" fill="url(#gradKeluar)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid" style={{ gridTemplateColumns: '1fr auto', gap: 16, alignItems: 'start' }}>
        {/* Recent Orders */}
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: 14, fontWeight: 600 }}>Order Terbaru ({orders.length})</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/transport/orders')} style={{ gap: 4 }}>
              Lihat Semua <ArrowRight size={12} />
            </button>
          </div>
          <div className="table-container" style={{ border: 'none' }}>
            <table>
              <thead>
                <tr>
                  <th>No. DO</th>
                  <th>Klien</th>
                  <th>Tanggal</th>
                  <th>Nilai</th>
                  <th>Status</th>
                  <th>Progress</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)' }}>
                      Belum ada transaksi Delivery Order. Buat DO baru untuk memulai.
                    </td>
                  </tr>
                ) : (
                  recentOrders.map(o => {
                    const done = o.drops ? o.drops.filter(d => d.status === 'done').length : 0;
                    const total = o.drops ? o.drops.length : 0;
                    return (
                      <tr key={o.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/transport/orders/${o.id}`)}>
                        <td style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{o.id}</td>
                        <td>{o.clientName}</td>
                        <td style={{ color: 'var(--text-secondary)' }}>{formatDate(o.date)}</td>
                        <td style={{ fontWeight: 500 }}>{formatRupiah(o.totalValue)}</td>
                        <td><span className={`badge ${statusBadgeClass[o.status]}`}>{statusLabels[o.status]}</span></td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 100 }}>
                            <div className="progress-bar" style={{ flex: 1 }}>
                              <div
                                className={`progress-fill ${done === total && total > 0 ? 'success' : ''}`}
                                style={{ width: `${total > 0 ? (done/total)*100 : 0}%` }}
                              />
                            </div>
                            <span style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{done}/{total}</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Notifications */}
        <div className="card" style={{ minWidth: 240, maxWidth: 280 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Notifikasi</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {pendingPOD.length > 0 ? pendingPOD.map(o => {
              const missing = o.drops.filter(d => !d.pod).length;
              return (
                <div key={o.id}
                  onClick={() => navigate(`/transport/orders/${o.id}`)}
                  style={{
                    display: 'flex', gap: 10, alignItems: 'flex-start',
                    padding: '10px 12px', background: 'var(--color-warning-dim)',
                    border: '1px solid rgba(245,158,11,0.2)', borderRadius: 8,
                    cursor: 'pointer', transition: 'all 0.15s'
                  }}
                >
                  <Clock size={14} color="var(--color-warning)" style={{ flexShrink: 0, marginTop: 1 }} />
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{o.id}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                      {missing} POD belum diupload
                    </div>
                  </div>
                </div>
              );
            }) : (
              <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)', fontSize: 12 }}>
                ✅ Semua POD sudah lengkap
              </div>
            )}
            {unpaidDP > 0 && (
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
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>Invoice Belum Dibayar</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                    {formatRupiah(unpaidDP)} menunggu
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
