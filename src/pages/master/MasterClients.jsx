import React, { useState } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { useClientStore, useToastStore } from '../../store';

export default function MasterClients() {
  const { clients, addClient, deleteClient } = useClientStore();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', contact: '', address: '', bankAccount: '' });
  const { addToast } = useToastStore();

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAdd = () => {
    if (isSubmitting) return;

    if (!form.name.trim()) {
      addToast('Nama Perusahaan Klien wajib diisi!', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const newClient = {
        id: `c-${Date.now()}`,
        name: form.name.trim(),
        contact: form.contact.trim() || '—',
        address: form.address.trim() || '—',
        bankAccount: form.bankAccount.trim() || '—',
      };
      addClient(newClient);
      setForm({ name: '', contact: '', address: '', bankAccount: '' });
      setShowForm(false);
      addToast(`Klien "${newClient.name}" berhasil ditambahkan ke database!`, 'success');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Master Klien</h1>
          <p className="page-subtitle">Database Klien & Pembayar Tagihan ({clients.length} terdaftar)</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(s => !s)}>
          <Plus size={14} /> Tambah Klien
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 16, maxWidth: 600 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>🏢 Tambah Klien Baru</h3>
          <div className="form-group">
            <label className="form-label">Nama Perusahaan Klien *</label>
            <input className="form-input" placeholder="misal: PT Indofood Sukses Makmur Tbk" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">💳 No. Rekening & Bank Klien</label>
            <input className="form-input" placeholder="misal: BCA 088-291-0021 a/n PT Indofood Sukses Makmur Tbk" value={form.bankAccount} onChange={e => setForm(f => ({ ...f, bankAccount: e.target.value }))} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">No. Kontak / WA</label>
              <input className="form-input" placeholder="misal: 021-57958822 (Pak Budi)" value={form.contact} onChange={e => setForm(f => ({ ...f, contact: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Alamat Penagihan</label>
              <input className="form-input" placeholder="misal: Indofood Tower, Jakarta" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
            <button className="btn btn-primary" onClick={handleAdd} disabled={isSubmitting}>
              {isSubmitting ? 'Memproses...' : 'Simpan Klien'}
            </button>
            <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Batal</button>
          </div>
        </div>
      )}

      <div className="card" style={{ padding: 0 }}>
        <div className="table-container" style={{ border: 'none' }}>
          <table>
            <thead>
              <tr>
                <th>Nama Perusahaan Klien</th>
                <th>No. Rekening Bank Klien</th>
                <th>Kontak</th>
                <th>Alamat Penagihan</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {clients.map(c => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>🏢 {c.name}</td>
                  <td style={{ color: 'var(--color-primary)', fontWeight: 600, fontSize: 13 }}>
                    💳 {c.bankAccount || '—'}
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>{c.contact}</td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{c.address}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => deleteClient(c.id)} style={{ color: 'var(--color-danger)' }}>
                        <Trash2 size={12} /> Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
