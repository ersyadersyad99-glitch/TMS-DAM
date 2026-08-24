import React, { useState, useEffect } from 'react';
import { Plus, Phone, Mail, MapPin, Search, X, CheckCircle, Trash2, AlertTriangle } from 'lucide-react';
import { useVendorStore, useToastStore } from '../../store';
import { useTenant } from '../../context/TenantContext';

export default function MasterFleet() {
  const { vendors, addVendor, deleteVendor, fetchFromApi } = useVendorStore();
  const { addToast } = useToastStore();
  const { branding } = useTenant();

  useEffect(() => {
    fetchFromApi();
  }, []);

  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [vendorToDelete, setVendorToDelete] = useState(null);

  const [form, setForm] = useState({
    name: '',
    pic: '',
    phone: '',
    email: '',
    city: '',
    bankAccount: '', // No. Rekening & Nama Bank Vendor (Wajib)
    status: 'active',
  });

  const filteredVendors = vendors.filter(v =>
    v.name.toLowerCase().includes(search.toLowerCase()) ||
    (v.pic && v.pic.toLowerCase().includes(search.toLowerCase())) ||
    (v.bankAccount && v.bankAccount.toLowerCase().includes(search.toLowerCase())) ||
    (v.city && v.city.toLowerCase().includes(search.toLowerCase()))
  );

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!form.name.trim() || !form.bankAccount.trim()) {
      addToast('Nama Vendor dan No. Rekening Bank Vendor wajib diisi!', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const newVendor = {
        id: `v-${Date.now()}`,
        name: form.name.trim(),
        pic: form.pic.trim() || '—',
        phone: form.phone.trim() || '—',
        email: form.email.trim() || '—',
        city: form.city.trim() || '—',
        bankAccount: form.bankAccount.trim(),
        status: 'active',
      };
      addVendor(newVendor);
      addToast(`Vendor Armada "${newVendor.name}" (Rek: ${newVendor.bankAccount}) berhasil ditambahkan!`, 'success');
      setShowModal(false);
      setForm({ name: '', pic: '', phone: '', email: '', city: '', bankAccount: '', status: 'active' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteVendor = (vendor) => {
    deleteVendor(vendor.id);
    addToast(`Vendor Armada "${vendor.name}" berhasil dihapus dari database!`, 'info');
    setVendorToDelete(null);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Armada Vendor ({branding.sidebarTitle})</h1>
          <p className="page-subtitle">Database Vendor Transporter & Mitra Ekspedisi ({vendors.length} terdaftar)</p>
        </div>
        <button className="btn btn-primary btn-lg" onClick={() => setShowModal(true)}>
          <Plus size={16} /> Tambah Vendor Baru
        </button>
      </div>

      {/* Search & Filter */}
      <div className="filter-bar">
        <div className="search-input-wrap" style={{ maxWidth: 400 }}>
          <Search className="search-icon" size={14} />
          <input
            className="form-input"
            placeholder="Cari Nama Vendor, PIC, atau Kota..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Vendor Cards Grid */}
      {filteredVendors.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">🏢</div>
            <div className="empty-state-title">Belum ada Vendor Armada</div>
            <div className="empty-state-text">Klik tombol <strong>+ Tambah Vendor Baru</strong> di atas untuk mendaftarkan mitra vendor.</div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {filteredVendors.map(v => (
            <div key={v.id} className="card" style={{
              display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
              border: '1px solid var(--color-border)',
              transition: 'transform 0.2s, box-shadow 0.2s',
              position: 'relative',
            }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: 10,
                    background: 'var(--color-primary-dim)', color: 'var(--color-primary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 20, fontWeight: 700,
                    border: '1px solid var(--color-primary-glow)',
                  }}>
                    🏢
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="badge badge-done" style={{ fontSize: 10 }}>
                      <CheckCircle size={10} /> Aktif
                    </span>
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ color: '#ef4444', padding: '4px 8px' }}
                      title="Hapus Vendor Armada"
                      onClick={() => setVendorToDelete(v)}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 4, color: 'var(--text-primary)' }}>
                  {v.name}
                </div>
                <div style={{ fontSize: 12, color: 'var(--color-primary)', fontWeight: 600, marginBottom: 12 }}>
                  PIC: {v.pic || '—'}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Phone size={13} color="var(--text-muted)" />
                    <span>{v.phone || '—'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Mail size={13} color="var(--text-muted)" />
                    <span>{v.email || '—'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <MapPin size={13} color="var(--text-muted)" />
                    <span>{v.city || '—'}</span>
                  </div>
                  {v.bankAccount && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-primary)', fontWeight: 600, marginTop: 2 }}>
                      <span>💳</span>
                      <span>Rek: {v.bankAccount}</span>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ marginTop: 16, paddingTop: 10, borderTop: '1px solid var(--color-border)', fontSize: 11, color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>ID: {v.id}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>Vendor Terverifikasi</span>
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ color: '#ef4444', fontSize: 11, padding: '2px 6px' }}
                    onClick={() => setVendorToDelete(v)}
                  >
                    Hapus
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Vendor Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 460 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                🏢 Tambah Vendor Armada Baru
              </h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowModal(false)}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Nama Perusahaan / Vendor (Wajib) *</label>
                <input
                  className="form-input"
                  placeholder="misal: PT Mitra Trans Logistik"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  required
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
                  💳 No. Rekening & Bank Vendor (Mandatory) *
                </label>
                <input
                  className="form-input"
                  placeholder="misal: BCA 8899221100 a/n PT Mitra Trans Logistik"
                  value={form.bankAccount}
                  onChange={e => setForm(f => ({ ...f, bankAccount: e.target.value }))}
                  required
                />
                <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                  Wajib diisi untuk keperluan transfer pembayaran otomatis ke vendor
                </span>
              </div>

              <div className="form-group">
                <label className="form-label">Nama PIC / Penanggung Jawab</label>
                <input
                  className="form-input"
                  placeholder="misal: Budi Kurniawan (Manager Ops)"
                  value={form.pic}
                  onChange={e => setForm(f => ({ ...f, pic: e.target.value }))}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">No. Telepon / WA</label>
                  <input
                    className="form-input"
                    placeholder="misal: 0812-9988-7766"
                    value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Kota / Domisili Pusat</label>
                  <input
                    className="form-input"
                    placeholder="misal: Jakarta / Surabaya"
                    value={form.city}
                    onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Email Kontak</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="misal: ops@mitratrans.co.id"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                />
              </div>

              <div className="divider" />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Batal</button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Memproses...' : 'Simpan Vendor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Vendor Confirmation Modal */}
      {vendorToDelete && (
        <div className="modal-overlay" onClick={() => setVendorToDelete(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{
                width: 44, height: 44, borderRadius: '50%',
                background: '#fef2f2', border: '1px solid #fecaca',
                color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <AlertTriangle size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  Hapus Vendor Armada
                </h3>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  Konfirmasi Hapus ({branding.sidebarTitle})
                </div>
              </div>
            </div>

            <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.5, marginBottom: 16 }}>
              Apakah Anda yakin ingin menghapus Vendor Armada <strong>"{vendorToDelete.name}"</strong>
              {vendorToDelete.bankAccount && ` (Rek: ${vendorToDelete.bankAccount})`}?
            </div>

            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, padding: '10px 12px', fontSize: 11, color: '#991b1b', marginBottom: 20 }}>
              ⚠️ Tindakan ini akan menghapus data vendor dari database {branding.sidebarTitle}. Data yang sudah dihapus tidak dapat dikembalikan.
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button className="btn btn-secondary" onClick={() => setVendorToDelete(null)}>
                Batal
              </button>
              <button
                className="btn btn-primary"
                style={{ background: '#ef4444', color: '#ffffff', borderColor: '#dc2626' }}
                onClick={() => handleDeleteVendor(vendorToDelete)}
              >
                Ya, Hapus Vendor
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
