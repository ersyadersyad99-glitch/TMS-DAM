import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Receipt, Tag, FileText, Upload, CheckCircle, ExternalLink } from 'lucide-react';
import { useTravelFundStore, useToastStore } from '../../store';
import { apiSync, getUploadUrl } from '../../services/api';
import { formatRupiah, formatDate } from '../../utils/helpers';

const EXPENSE_CATEGORIES = [
  'Bongkaran',
  'Biaya Inap Driver',
  'Uang Jalan Driver',
  'BBM',
  'Toll',
  'Parkir',
  'Langsir',
  'Biaya Tambahan',
];

export default function TravelFundDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { funds, addRealization, finalizeRealization, disburse } = useTravelFundStore();
  const { addToast } = useToastStore();

  const [newItem, setNewItem] = useState({
    category: 'Bongkaran',
    desc: '',
    amount: '',
    file: null,
    fileName: '',
  });
  const [showForm, setShowForm] = useState(false);

  const fundRaw = funds.find(f => f.id === id || f.fund?.id === id);
  const fund = fundRaw
    ? (fundRaw.fund
        ? {
            ...fundRaw.fund,
            driverName: fundRaw.fund.driverName || fundRaw.order?.driverName || fundRaw.driver?.name || '—',
            fleetPlate: fundRaw.order?.fleetPlate || '—',
            realizations: fundRaw.fund.realizations || fundRaw.items || [],
          }
        : {
            ...fundRaw,
            realizations: fundRaw.realizations || fundRaw.items || [],
          })
    : null;

  if (!fund) return (
    <div className="empty-state">
      <div className="empty-state-icon">🔍</div>
      <div className="empty-state-title">Biaya Operasional tidak ditemukan</div>
      <button className="btn btn-secondary" onClick={() => navigate(-1)}>Kembali</button>
    </div>
  );

  const realizations = fund.realizations || fund.items || [];
  const balance = fund.disbursedAmount - fund.totalRealized;
  const isPositive = balance >= 0;

  const handleSelectPreset = (catName) => {
    setNewItem(prev => ({
      ...prev,
      category: catName,
      desc: prev.desc || `Pengeluaran ${catName}`,
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewItem(prev => ({
        ...prev,
        file: file,
        fileName: file.name,
      }));
    }
  };

  const handleAddItem = async () => {
    const amt = Number(newItem.amount);
    if (isNaN(amt) || amt <= 0) {
      addToast('Nominal pengeluaran wajib diisi dan harus lebih besar dari 0!', 'warning');
      return;
    }

    const descText = newItem.desc.trim() || `Pengeluaran ${newItem.category}`;
    let savedFileName = newItem.fileName || null;

    if (newItem.file) {
      addToast(`Mengupload kwitansi ${newItem.fileName}...`, 'info');
      const res = await apiSync.addTravelFundItem(id, newItem.category, descText, amt, newItem.file);
      if (res && res.receiptFile) {
        savedFileName = res.receiptFile;
      }
    }

    addRealization(id, {
      id: `r-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      category: newItem.category,
      desc: descText,
      description: descText,
      amount: amt,
      receipt: Boolean(savedFileName || newItem.file),
      hasReceipt: Boolean(savedFileName || newItem.file),
      receiptFile: savedFileName,
    });

    addToast(`Item realisasi "${newItem.category}" (${formatRupiah(amt)}) berhasil ditambahkan!`, 'success');
    
    // Reset form while keeping it open to support adding 2 or more items easily!
    setNewItem({
      category: 'Bongkaran',
      desc: '',
      amount: '',
      file: null,
      fileName: '',
    });
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
  const sc = statusColors[fund.status] || statusColors.pengajuan;

  return (
    <div>
      <div className="page-header">
        <div>
          <button className="btn btn-ghost btn-sm mb-2" onClick={() => navigate(-1)}>← Kembali</button>
          <div className="flex items-center gap-3">
            <h1 className="page-title">{fund.id}</h1>
            <span className="badge" style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.color}44` }}>
              {sc.label}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          {fund.status === 'dicairkan' && fund.disbursedAmount > 0 && realizations.length > 0 && fund.status !== 'realisasi_selesai' && (
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

          {/* Realization Items Card */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 700 }}>Rincian Realisasi Pengeluaran Driver</h3>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Item biaya operasional + Upload Struk / Kwitansi Bukti Pengeluaran</p>
              </div>

              {fund.status === 'dicairkan' && !showForm && (
                <button className="btn btn-primary btn-sm" onClick={() => setShowForm(true)}>
                  <Plus size={13} /> + Tambah Item Realisasi
                </button>
              )}
            </div>

            {/* Quick Presets & Interactive Form */}
            {showForm && (
              <div style={{ background: 'var(--color-bg-base)', padding: 16, borderRadius: 10, border: '1.5px solid var(--color-primary)', marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-primary)' }}>
                    ➕ Input Item Pengeluaran Driver (Bongkaran, Inap, BBM, etc.)
                  </div>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowForm(false)}>Batal</button>
                </div>

                {/* Quick Presets Buttons */}
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>PILIH KATEGORI CEPAT:</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => handleSelectPreset('Bongkaran')}>
                      📦 + Bongkaran
                    </button>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => handleSelectPreset('Biaya Inap Driver')}>
                      🏨 + Biaya Inap Driver
                    </button>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => handleSelectPreset('BBM')}>
                      ⛽ + BBM
                    </button>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => handleSelectPreset('Toll')}>
                      🛣️ + Toll
                    </button>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => handleSelectPreset('Uang Jalan Driver')}>
                      💵 + Uang Jalan
                    </button>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '170px 140px 1fr', gap: 10, marginBottom: 12 }}>
                  <div>
                    <label className="form-label" style={{ fontSize: 11 }}>Kategori Biaya *</label>
                    <select className="form-input form-select" value={newItem.category}
                      onChange={e => setNewItem(v => ({ ...v, category: e.target.value }))}>
                      {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="form-label" style={{ fontSize: 11 }}>Nominal (Rp) *</label>
                    <input className="form-input" type="number" placeholder="misal: 150000" value={newItem.amount}
                      onChange={e => setNewItem(v => ({ ...v, amount: e.target.value }))} required />
                  </div>

                  <div>
                    <label className="form-label" style={{ fontSize: 11 }}>Catatan / Deskripsi</label>
                    <input className="form-input" placeholder="misal: Bongkaran pasar / Inap 1 malam" value={newItem.desc}
                      onChange={e => setNewItem(v => ({ ...v, desc: e.target.value }))} />
                  </div>
                </div>

                {/* File Upload Zone for Kwitansi / Struk */}
                <div style={{ marginBottom: 12 }}>
                  <label className="form-label" style={{ fontSize: 11 }}>Upload Struk / Kwitansi (PDF / Foto JPG/PNG)</label>
                  <label style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                    border: '1px dashed var(--color-primary)', borderRadius: 8, background: 'var(--color-primary-dim)',
                    cursor: 'pointer'
                  }}>
                    <Upload size={16} color="var(--color-primary)" />
                    <span style={{ fontSize: 12, color: 'var(--text-primary)', flex: 1 }}>
                      {newItem.fileName ? `📄 ${newItem.fileName}` : 'Klik untuk upload bukti struk/kwitansi (PDF atau Gambar Foto)'}
                    </span>
                    <input type="file" accept=".pdf,image/*" hidden onChange={handleFileChange} />
                  </label>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    💡 Form tetap terbuka setelah simpan agar bisa langsung menambah item ke-2 (seperti Bongkaran & Biaya Inap secara bersamaan).
                  </span>
                  <button type="button" className="btn btn-primary" onClick={handleAddItem}>
                    + Simpan & Tambahkan Item
                  </button>
                </div>
              </div>
            )}

            {/* Realization items table / list */}
            {realizations.length === 0 ? (
              <div className="empty-state" style={{ padding: '30px 0' }}>
                <div style={{ fontSize: 32 }}>🧾</div>
                <div className="empty-state-title">Belum ada rincian biaya realisasi</div>
                {fund.status === 'dicairkan' && (
                  <div className="empty-state-text">Klik "+ Tambah Item Realisasi" di atas untuk memasukkan pengeluaran Bongkaran, Biaya Inap, BBM, dll.</div>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {realizations.map((r, i) => {
                  const receiptFileName = r.receiptFile || r.receiptName || (typeof r.receipt === 'string' ? r.receipt : null);
                  const fileUrl = receiptFileName
                    ? getUploadUrl(receiptFileName)
                    : null;

                  return (
                    <div key={r.id || i} style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      padding: '14px 0',
                      borderBottom: i < realizations.length - 1 ? '1px solid var(--color-border)' : 'none',
                    }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 8,
                        background: 'var(--color-primary-dim)', border: '1px solid var(--color-border)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                      }}>
                        <Receipt size={16} color="var(--color-primary)" />
                      </div>

                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span style={{ fontWeight: 700, fontSize: 14 }}>{r.category || 'Biaya Operasional'}</span>
                          <span className="badge badge-info" style={{ fontSize: 10 }}>
                            {r.desc || r.description || r.category}
                          </span>
                        </div>

                        {fileUrl ? (
                          <a
                            href={fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                              fontSize: 11, color: 'var(--color-primary)', fontWeight: 600,
                              background: 'var(--color-bg-base)', padding: '2px 8px', borderRadius: 4,
                              border: '1px solid var(--color-border)'
                            }}
                          >
                            📎 Lihat / Download Kwitansi PDF ({receiptFileName}) <ExternalLink size={10} />
                          </a>
                        ) : (
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            {r.hasReceipt || r.receipt ? '📎 Bon/Struk Terlampir' : 'Tanpa Struk'}
                          </div>
                        )}
                      </div>

                      <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--text-primary)' }}>
                        {formatRupiah(r.amount)}
                      </div>
                    </div>
                  );
                })}

                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '14px 0 0', fontWeight: 800, fontSize: 15,
                  borderTop: '2px solid var(--color-border)', marginTop: 8
                }}>
                  <span>Total Realisasi Pengeluaran</span>
                  <span style={{ color: 'var(--color-primary)' }}>{formatRupiah(fund.totalRealized)}</span>
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
