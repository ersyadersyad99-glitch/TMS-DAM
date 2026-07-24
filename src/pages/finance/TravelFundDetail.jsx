import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Trash2, Receipt, Tag } from 'lucide-react';
import { useTravelFundStore, useToastStore } from '../../store';
import { formatRupiah, formatDate } from '../../utils/helpers';

const EXPENSE_CATEGORIES = [
  'Uang Jalan Driver',
  'Biaya Tambahan',
  'BBM',
  'Toll',
  'Parkir',
  'Biaya Inap Driver',
  'Bongkaran',
  'Langsir',
];

export default function TravelFundDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { funds, addRealization, finalizeRealization, disburse } = useTravelFundStore();
  const { addToast } = useToastStore();
  const [newItem, setNewItem] = useState({ category: 'Uang Jalan Driver', desc: '', amount: '' });
  const [showForm, setShowForm] = useState(false);

  const fund = funds.find(f => f.id === id);
  if (!fund) return (
    <div className="empty-state">
      <div className="empty-state-icon">🔍</div>
      <div className="empty-state-title">Biaya Operasional tidak ditemukan</div>
      <button className="btn btn-secondary" onClick={() => navigate(-1)}>Kembali</button>
    </div>
  );

  const balance = fund.disbursedAmount - fund.totalRealized;
  const isPositive = balance >= 0;

  const handleAddItem = () => {
    if (!newItem.desc || !newItem.amount) return;
    addRealization(id, {
      id: `r-${Date.now()}`,
      category: newItem.category,
      desc: newItem.desc,
      amount: Number(newItem.amount),
      receipt: false,
    });
    setNewItem({ category: 'Uang Jalan Driver', desc: '', amount: '' });
    setShowForm(false);
    addToast('Item rincian biaya ditambahkan!', 'success');
  };

  const handleFinalize = () => {
    finalizeRealization(id);
    addToast(`Realisasi selesai. Saldo ${isPositive ? 'kembali' : 'kurang'}: ${formatRupiah(Math.abs(balance))}`, isPositive ? 'success' : 'warning');
  };

  const handleDisburse = () => {
    disburse(id);
    addToast('Biaya Operasional dicairkan!', 'success');
  };

  const statusColors = {
    pengajuan: { color: 'var(--color-warning)', bg: 'var(--color-warning-dim)', label: 'Pengajuan' },
    dicairkan: { color: 'var(--color-info)', bg: 'var(--color-info-dim)', label: 'Dicairkan' },
    realisasi_selesai: { color: 'var(--color-success)', bg: 'var(--color-success-dim)', label: 'Realisasi Selesai' },
  };
  const sc = statusColors[fund.status];

  return (
    <div>
      <div className="page-header">
        <div>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)} style={{ marginBottom: 8 }}>← Kembali</button>
          <h1 className="page-title">{fund.id}</h1>
          <div style={{ marginTop: 6 }}>
            <span className="badge" style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.color}44` }}>
              {sc.label}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {fund.status === 'dicairkan' && fund.disbursedAmount > 0 && fund.realizations.length > 0 && fund.status !== 'realisasi_selesai' && (
            <button className="btn btn-success" onClick={handleFinalize}>
              ✅ Selesaikan Realisasi
            </button>
          )}
          {fund.status === 'pengajuan' && (
            <button className="btn btn-primary" onClick={handleDisburse}>
              💸 Cairkan Biaya Operasional
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16, alignItems: 'start' }}>
        {/* Left — Realizations */}
        <div>
          {/* Summary */}
          <div className="card" style={{ marginBottom: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Jumlah Dicairkan</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-info)' }}>{formatRupiah(fund.disbursedAmount)}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Total Realisasi</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-warning)' }}>{formatRupiah(fund.totalRealized)}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
                  {isPositive ? 'Sisa Kembali' : 'Kekurangan'}
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, color: isPositive ? 'var(--color-success)' : 'var(--color-danger)' }}>
                  {isPositive ? '+' : '−'}{formatRupiah(Math.abs(balance))}
                </div>
              </div>
            </div>

            {/* Visual balance bar */}
            {fund.disbursedAmount > 0 && (
              <div style={{ marginTop: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
                  <span>Realisasi ({Math.round((fund.totalRealized / fund.disbursedAmount) * 100)}%)</span>
                  <span>{formatRupiah(fund.totalRealized)} / {formatRupiah(fund.disbursedAmount)}</span>
                </div>
                <div className="progress-bar" style={{ height: 10 }}>
                  <div
                    className="progress-fill"
                    style={{
                      width: `${Math.min(100, Math.round((fund.totalRealized / fund.disbursedAmount) * 100))}%`,
                      background: fund.totalRealized > fund.disbursedAmount ? 'var(--color-danger)' : 'var(--color-warning)',
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Realization Items */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 600 }}>Rincian Biaya Operasional</h3>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                  Kategori: Uang Jalan Driver, BBM, Toll, Parkir, Inap, Bongkaran, Langsir, Biaya Tambahan
                </p>
              </div>
              {fund.status === 'dicairkan' && (
                <button className="btn btn-secondary btn-sm" onClick={() => setShowForm(s => !s)}>
                  <Plus size={13} /> Tambah Item
                </button>
              )}
            </div>

            {/* Add form */}
            {showForm && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16, padding: '14px 16px', background: 'var(--color-bg-base)', borderRadius: 8, border: '1px solid var(--color-border)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr 140px', gap: 8 }}>
                  <select className="form-input form-select" value={newItem.category}
                    onChange={e => setNewItem(v => ({ ...v, category: e.target.value }))}>
                    {EXPENSE_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  <input className="form-input" placeholder="Deskripsi (misal: Tol Cipali, BBM Solar, Parkir)" value={newItem.desc}
                    onChange={e => setNewItem(v => ({ ...v, desc: e.target.value }))} />
                  <input className="form-input" type="number" placeholder="Nominal (Rp)" value={newItem.amount}
                    onChange={e => setNewItem(v => ({ ...v, amount: e.target.value }))} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                  <button className="btn btn-primary btn-sm" onClick={handleAddItem}>Tambah</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setShowForm(false)}>Batal</button>
                </div>
              </div>
            )}

            {fund.realizations.length === 0 ? (
              <div className="empty-state" style={{ padding: '20px 0' }}>
                <div style={{ fontSize: 28 }}>🧾</div>
                <div className="empty-state-title">Belum ada rincian biaya</div>
                {fund.status === 'dicairkan' && (
                  <div className="empty-state-text">Klik "Tambah Item" untuk input pengeluaran riil per kategori.</div>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {fund.realizations.map((r, i) => (
                  <div key={r.id} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 0',
                    borderBottom: i < fund.realizations.length - 1 ? '1px solid var(--color-border)' : 'none',
                  }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--color-bg-base)', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Receipt size={14} color="var(--text-muted)" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 600, fontSize: 13 }}>{r.desc}</span>
                        <span className="badge" style={{ fontSize: 10, background: 'var(--color-primary-dim)', color: 'var(--color-primary)' }}>
                          <Tag size={9} style={{ marginRight: 3, display: 'inline' }} />
                          {r.category || 'Biaya Operasional'}
                        </span>
                      </div>
                      {r.receipt && <div style={{ fontSize: 11, color: 'var(--color-success)', marginTop: 2 }}>📎 Bon/Struk</div>}
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{formatRupiah(r.amount)}</div>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0 0', fontWeight: 700, fontSize: 14, borderTop: '2px solid var(--color-border)', marginTop: 4 }}>
                  <span>Total</span>
                  <span>{formatRupiah(fund.totalRealized)}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Info */}
        <div className="card" style={{ position: 'sticky', top: 80 }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 14, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Informasi</h3>
          {[
            { label: 'No. Biaya Operasional', value: fund.id },
            { label: 'No. DO', value: fund.orderId },
            { label: 'Sopir', value: fund.driverName || '—' },
            { label: 'Tanggal Pengajuan', value: formatDate(fund.requestDate) },
            { label: 'Jumlah Pengajuan', value: formatRupiah(fund.requestAmount) },
          ].map(({ label, value }) => (
            <div key={label} style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>{label}</div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{value}</div>
            </div>
          ))}

          <div className="divider" />

          {/* Stage tracker */}
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>Alur Proses</div>
          {['Pengajuan', 'Pencairan', 'Realisasi'].map((stage, i) => {
            const stageKeys = ['pengajuan', 'dicairkan', 'realisasi_selesai'];
            const currentIdx = stageKeys.indexOf(fund.status);
            const done = i <= currentIdx;
            const active = i === currentIdx;
            return (
              <div key={stage} style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: i < 2 ? 4 : 0 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                    background: done ? (active ? 'var(--color-primary)' : 'var(--color-success-dim)') : 'var(--color-bg-input)',
                    border: `1.5px solid ${done ? (active ? 'var(--color-primary)' : 'var(--color-success)') : 'var(--color-border-light)'}`,
                    color: done ? (active ? '#fff' : 'var(--color-success)') : 'var(--text-muted)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700,
                  }}>
                    {done && !active ? '✓' : i + 1}
                  </div>
                  {i < 2 && <div style={{ width: 2, height: 14, background: done ? 'var(--color-success)' : 'var(--color-border)', margin: '2px 0' }} />}
                </div>
                <span style={{ fontSize: 13, fontWeight: active ? 600 : 400, color: active ? 'var(--text-primary)' : done ? 'var(--color-success)' : 'var(--text-muted)' }}>
                  {stage}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
