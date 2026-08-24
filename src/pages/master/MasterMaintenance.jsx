import React, { useState } from 'react';
import { Wrench, Plus, CheckCircle, Clock, AlertTriangle, Search } from 'lucide-react';
import { useTenant } from '../../context/TenantContext';

export default function MasterMaintenance() {
  const { branding } = useTenant();
  const [search, setSearch] = useState('');

  const [records, setRecords] = useState([
    {
      id: 'MT-001',
      plate: 'B 9234 UYT',
      unitType: 'CDD Long Box',
      type: 'Servis Berkala',
      date: '2026-08-01',
      cost: 2500000,
      status: 'Selesai',
      workshop: 'Bengkel Resmi Hino',
      notes: 'Ganti oli mesin, filter oli, dan stel rem',
    },
    {
      id: 'MT-002',
      plate: 'B 9812 WQ',
      unitType: 'Fuso Tronton',
      type: 'Ganti Ban',
      date: '2026-08-03',
      cost: 4800000,
      status: 'Proses',
      workshop: 'Toko Ban Utama',
      notes: 'Ganti 2 ban belakang luar',
    },
    {
      id: 'MT-003',
      plate: 'B 9102 KAA',
      unitType: 'Wingbox',
      type: 'Perbaikan Sistem Hidrolik',
      date: '2026-08-05',
      cost: 3200000,
      status: 'Jadwal',
      workshop: 'Bengkel Cipta Karya',
      notes: 'Cek kebocoran oli hidrolik wingbox',
    },
  ]);

  const filtered = records.filter(r =>
    r.plate.toLowerCase().includes(search.toLowerCase()) ||
    r.type.toLowerCase().includes(search.toLowerCase()) ||
    r.workshop.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 className="page-title" style={{ fontSize: 24, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Wrench size={24} style={{ color: 'var(--color-primary)' }} />
            Perawatan & Servis Armada ({branding.sidebarTitle})
          </h1>
          <p className="page-subtitle" style={{ color: 'var(--text-secondary)', marginTop: 4 }}>
            Manajemen riwayat perawatan, ganti oli, dan perbaikan armada kendaraan.
          </p>
        </div>
        <button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Plus size={16} />
          Catat Servis Baru
        </button>
      </div>

      {/* Filter & Search */}
      <div className="card" style={{ padding: 16, marginBottom: 20, display: 'flex', gap: 16, alignItems: 'center' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: 36 }}
            placeholder="Cari plat nomor, jenis servis, atau bengkel..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Records Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Kode Servis</th>
              <th>Plat Nomor</th>
              <th>Tipe Armada</th>
              <th>Jenis Perawatan</th>
              <th>Tanggal</th>
              <th>Bengkel</th>
              <th>Biaya</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => (
              <tr key={r.id}>
                <td style={{ fontWeight: 600 }}>{r.id}</td>
                <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{r.plate}</td>
                <td>{r.unitType}</td>
                <td>{r.type}</td>
                <td>{r.date}</td>
                <td>{r.workshop}</td>
                <td style={{ fontWeight: 600, color: 'var(--color-primary)' }}>
                  Rp {r.cost.toLocaleString('id-ID')}
                </td>
                <td>
                  <span
                    className={`badge ${
                      r.status === 'Selesai' ? 'badge-success' :
                      r.status === 'Proses' ? 'badge-warning' : 'badge-info'
                    }`}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                  >
                    {r.status === 'Selesai' && <CheckCircle size={12} />}
                    {r.status === 'Proses' && <Clock size={12} />}
                    {r.status === 'Jadwal' && <AlertTriangle size={12} />}
                    {r.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
