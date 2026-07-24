import React, { useState } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { mockClients } from '../../data/mockData';
import { useToastStore } from '../../store';

export default function MasterClients() {
  const [clients, setClients] = useState(mockClients);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', contact: '', address: '' });
  const { addToast } = useToastStore();

  const handleAdd = () => {
    if (!form.name) return;
    const newClient = { id: `c${Date.now()}`, ...form };
    setClients(c => [...c, newClient]);
    setForm({ name: '', contact: '', address: '' });
    setShowForm(false);
    addToast(`Klien "${form.name}" berhasil ditambahkan!`, 'success');
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Master Klien</h1>
          <p className="page-subtitle">{clients.length} klien terdaftar</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(s => !s)}>
          <Plus size={14} /> Tambah Klien
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 16, maxWidth: 600 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Klien Baru</h3>
          <div className="form-group">
            <label className="form-label">Nama Perusahaan *</label>
            <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">No. Kontak</label>
            <input className="form-input" value={form.contact} onChange={e => setForm(f => ({ ...f, contact: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Alamat Penagihan</label>
            <input className="form-input" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-primary" onClick={handleAdd}>Simpan</button>
            <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Batal</button>
          </div>
        </div>
      )}

      <div className="card" style={{ padding: 0 }}>
        <div className="table-container" style={{ border: 'none' }}>
          <table>
            <thead>
              <tr>
                <th>Nama Perusahaan</th>
                <th>Kontak</th>
                <th>Alamat</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {clients.map(c => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 600 }}>{c.name}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{c.contact}</td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{c.address}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-ghost btn-sm"><Edit2 size={12} /></button>
                      <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-danger)' }}><Trash2 size={12} /></button>
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
