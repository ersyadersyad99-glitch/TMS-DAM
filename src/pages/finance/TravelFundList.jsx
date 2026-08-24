import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Plus, X, Calculator, Truck, User, FileText } from 'lucide-react';
import { useTravelFundStore, useOrderStore, useToastStore } from '../../store';
import { formatRupiah, formatDate, travelFundStatusLabel, travelFundStatusClass } from '../../utils/helpers';

const STAGE_FILTERS = [
  { key: 'all', label: 'Semua' },
  { key: 'pengajuan', label: 'Pengajuan' },
  { key: 'dicairkan', label: 'Dicairkan' },
  { key: 'realisasi_selesai', label: 'Selesai' },
];

const CATEGORY_INPUTS = [
  { key: 'uangJalan', label: 'Uang Jalan Driver', icon: '💵', placeholder: 'misal: 1.500.000' },
  { key: 'bbm', label: 'BBM (Bahan Bakar)', icon: '⛽', placeholder: 'misal: 800.000' },
  { key: 'toll', label: 'Toll', icon: '🛣️', placeholder: 'misal: 350.000' },
  { key: 'parkir', label: 'Parkir & Retribusi', icon: '🅿️', placeholder: 'misal: 50.000' },
  { key: 'inap', label: 'Biaya Inap Driver', icon: '🏨', placeholder: 'misal: 200.000' },
  { key: 'bongkaran', label: 'Bongkaran', icon: '📦', placeholder: 'misal: 150.000' },
  { key: 'langsir', label: 'Langsir', icon: '🚚', placeholder: 'misal: 100.000' },
  { key: 'tambahan', label: 'Biaya Tambahan', icon: '➕', placeholder: 'misal: 50.000' },
];

function CreateOperationalModal({ onClose }) {
  const { orders } = useOrderStore();
  const { addFund } = useTravelFundStore();
  const { addToast } = useToastStore();

  const [orderIdInput, setOrderIdInput] = useState('');
  const [driverInput, setDriverInput] = useState('');
  const [fleetInput, setFleetInput] = useState('');
  const [categoryAmounts, setCategoryAmounts] = useState({
    uangJalan: '',
    bbm: '',
    toll: '',
    parkir: '',
    inap: '',
    bongkaran: '',
    langsir: '',
    tambahan: '',
  });

  // Calculate live total pengeluaran
  const totalPengeluaran = Object.values(categoryAmounts).reduce(
    (sum, val) => sum + (Number(val) || 0),
    0
  );

  const handleSelectOrder = (selectedId) => {
    setOrderIdInput(selectedId);
    const found = orders.find(o => o.id === selectedId);
    if (found) {
      if (found.driverName) setDriverInput(found.driverName);
      if (found.fleetPlate) setFleetInput(found.fleetPlate);
    }
  };

  const handleAmountChange = (key, val) => {
    setCategoryAmounts(prev => ({ ...prev, [key]: val }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!orderIdInput) {
      addToast('Harap isi No. Delivery Order (DO)!', 'warning');
      return;
    }
    if (totalPengeluaran <= 0) {
      addToast('Total pengeluaran harus lebih dari 0!', 'warning');
      return;
    }

    const newFundId = `BO-${Date.now().toString().slice(-4)}`;

    // Map non-zero categories to realization items
    const initialRealizations = CATEGORY_INPUTS.map(cat => {
      const amt = Number(categoryAmounts[cat.key]) || 0;
      if (amt <= 0) return null;
      return {
        id: `r-${Date.now()}-${cat.key}`,
        category: cat.label,
        desc: `${cat.label} — ${orderIdInput}`,
        amount: amt,
        receipt: false,
      };
    }).filter(Boolean);

    const newFund = {
      id: newFundId,
      orderId: orderIdInput,
      driverName: driverInput || '—',
      fleetPlate: fleetInput || '',
      requestAmount: totalPengeluaran,
      disbursedAmount: 0,
      status: 'pengajuan',
      requestDate: new Date().toISOString().split('T')[0],
      realizations: initialRealizations,
      totalRealized: 0,
      balance: 0,
    };

    addFund(newFund);
    addToast(`Pengajuan Biaya Operasional ${newFundId} (${formatRupiah(totalPengeluaran)}) berhasil dibuat!`, 'success');
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" style={{ maxWidth: 640 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ fontSize: 20 }}>💸</div>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700 }}>Buat Pengajuan Biaya Operasional</h3>
              <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Input rincian pengeluaran per kategori untuk penugasan DO</p>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body" style={{ maxHeight: '80vh', overflowY: 'auto' }}>
          {/* Section 1: Order & Driver Selection */}
          <div style={{ background: 'var(--color-bg-base)', padding: '14px 16px', borderRadius: 8, border: '1px solid var(--color-border)', marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-primary)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              <FileText size={14} /> Data Penugasan Delivery Order
            </div>

            <div className="form-group" style={{ marginBottom: 10 }}>
              <label className="form-label">No. Delivery Order (DO) *</label>
              {orders.length > 0 ? (
                <select className="form-input form-select" value={orderIdInput} onChange={e => handleSelectOrder(e.target.value)}>
                  <option value="">Pilih DO yang sudah ditugaskan...</option>
                  {orders.map(o => (
                    <option key={o.id} value={o.id}>
                      {o.id} — {o.clientName} ({o.driverName || 'Belum ada sopir'})
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  className="form-input"
                  placeholder="Contoh: DO-2025-584"
                  value={orderIdInput}
                  onChange={e => setOrderIdInput(e.target.value)}
                  required
                />
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label className="form-label" style={{ fontSize: 11 }}>Nama Sopir</label>
                <div style={{ position: 'relative' }}>
                  <input
                    className="form-input"
                    placeholder="Contoh: Abdel"
                    value={driverInput}
                    onChange={e => setDriverInput(e.target.value)}
                    style={{ paddingLeft: 30 }}
                  />
                  <User size={13} style={{ position: 'absolute', left: 10, top: 11, color: 'var(--text-muted)' }} />
                </div>
              </div>

              <div>
                <label className="form-label" style={{ fontSize: 11 }}>Plat Armada</label>
                <div style={{ position: 'relative' }}>
                  <input
                    className="form-input"
                    placeholder="Contoh: E 9533 ETA"
                    value={fleetInput}
                    onChange={e => setFleetInput(e.target.value)}
                    style={{ paddingLeft: 30 }}
                  />
                  <Truck size={13} style={{ position: 'absolute', left: 10, top: 11, color: 'var(--text-muted)' }} />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Sub-Fitur 8 Kategori Pengeluaran */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Calculator size={14} /> Sub-Fitur Rincian Kategori Pengeluaran
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {CATEGORY_INPUTS.map(cat => (
                <div key={cat.key} style={{ background: 'var(--color-bg-card)', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--color-border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, fontSize: 12, fontWeight: 600 }}>
                    <span>{cat.icon}</span>
                    <span>{cat.label}</span>
                  </div>
                  <input
                    type="number"
                    className="form-input"
                    placeholder={cat.placeholder}
                    value={categoryAmounts[cat.key]}
                    onChange={e => handleAmountChange(cat.key, e.target.value)}
                    style={{ fontSize: 13 }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Live Total Pengeluaran Banner */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(79,110,247,0.15), rgba(34,197,94,0.15))',
            padding: '14px 18px', borderRadius: 10, border: '1px solid var(--color-primary)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16
          }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Total Pengeluaran Operasional
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                Otomatis dihitung dari 8 kategori di atas
              </div>
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-primary)' }}>
              {formatRupiah(totalPengeluaran)}
            </div>
          </div>

          {/* Footer actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Batal</button>
            <button type="submit" className="btn btn-primary btn-lg">
              ✅ Simpan & Ajukan ({formatRupiah(totalPengeluaran)})
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function TravelFundList() {
  const navigate = useNavigate();
  const { funds, updateStatus, disburse } = useTravelFundStore();
  const { addToast } = useToastStore();
  const [filter, setFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);

  const normalizedFunds = (funds || []).map(f => {
    if (f && f.fund) {
      return {
        ...f.fund,
        driverName: f.fund.driverName || f.order?.driverName || f.driver?.name || '—',
        fleetPlate: f.order?.fleetPlate || '—',
        driver: f.driver,
        order: f.order,
      };
    }
    return f;
  });

  const filtered = filter === 'all' ? normalizedFunds : normalizedFunds.filter(f => f.status === filter);

  const handleDisburse = (id) => {
    disburse(id);
    addToast('Biaya Operasional berhasil dicairkan!', 'success');
  };

  const handleApprove = (id) => {
    // Use disburse() to properly update disbursedAmount + disbursedAt and call backend endpoint
    disburse(id);
    addToast('Pengajuan disetujui & dana telah dicairkan!', 'success');
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Biaya Operasional</h1>
          <p className="page-subtitle">Kelola dana & rincian biaya operasional pengiriman</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={15} /> Buat Pengajuan Biaya Operasional
        </button>
      </div>

      {/* Modal */}
      {showModal && <CreateOperationalModal onClose={() => setShowModal(false)} />}

      {/* Pipeline summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { status: 'pengajuan', label: 'Pengajuan', color: 'var(--color-warning)', dimColor: 'var(--color-warning-dim)' },
          { status: 'dicairkan', label: 'Dicairkan', color: 'var(--color-info)', dimColor: 'var(--color-info-dim)' },
          { status: 'realisasi_selesai', label: 'Selesai', color: 'var(--color-success)', dimColor: 'var(--color-success-dim)' },
        ].map(({ status, label, color, dimColor }) => {
          const items = normalizedFunds.filter(f => f.status === status);
          const total = items.reduce((s, f) => s + (f.disbursedAmount || f.requestAmount || 0), 0);
          return (
            <div key={status} className="card" style={{ borderColor: `${color}33`, background: dimColor, cursor: 'pointer' }}
              onClick={() => setFilter(filter === status ? 'all' : status)}>
              <div style={{ fontSize: 11, fontWeight: 600, color, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color }}>{items.length}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{formatRupiah(total)}</div>
            </div>
          );
        })}
      </div>

      <div className="flex gap-2 mb-4">
        {STAGE_FILTERS.map(f => (
          <button key={f.key} className={`btn btn-sm ${filter === f.key ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilter(f.key)}>{f.label}</button>
        ))}
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-container" style={{ border: 'none' }}>
          <table>
            <thead>
              <tr>
                <th>No.</th>
                <th>No. DO</th>
                <th>Sopir</th>
                <th>Pengajuan</th>
                <th>Dicairkan</th>
                <th>Realisasi</th>
                <th>Saldo</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)' }}>
                    Belum ada data biaya operasional. Klik tombol "+ Buat Pengajuan Biaya Operasional" di atas.
                  </td>
                </tr>
              ) : (
                filtered.map(fund => (
                  <tr key={fund.id}>
                    <td style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{fund.id}</td>
                    <td>{fund.orderId}</td>
                    <td>{fund.driverName || <span style={{ color: 'var(--text-muted)' }}>Belum ditugaskan</span>}</td>
                    <td style={{ fontWeight: 500 }}>{formatRupiah(fund.requestAmount)}</td>
                    <td style={{ color: fund.disbursedAmount > 0 ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                      {formatRupiah(fund.disbursedAmount)}
                    </td>
                    <td>{formatRupiah(fund.totalRealized)}</td>
                    <td>
                      {fund.status === 'realisasi_selesai' ? (
                        <span style={{ fontWeight: 700, color: fund.balance >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                          {fund.balance >= 0 ? `+${formatRupiah(fund.balance)}` : `−${formatRupiah(Math.abs(fund.balance))}`}
                        </span>
                      ) : '—'}
                    </td>
                    <td>
                      <span className={`badge ${travelFundStatusClass[fund.status]}`}>
                        {travelFundStatusLabel[fund.status]}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/finance/travel-funds/${fund.id}`)}>
                          <Eye size={13} /> Detail
                        </button>
                        {fund.status === 'pengajuan' && (
                          <button className="btn btn-success btn-sm" onClick={() => handleApprove(fund.id)}>
                            Setujui
                          </button>
                        )}
                        {fund.status === 'dicairkan' && fund.disbursedAmount === 0 && (
                          <button className="btn btn-primary btn-sm" onClick={() => handleDisburse(fund.id)}>
                            Cairkan
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
