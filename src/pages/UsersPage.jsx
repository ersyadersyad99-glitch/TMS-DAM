import React, { useState } from 'react';
import {
  Plus, Search, Shield, ToggleLeft, ToggleRight,
  Trash2, Edit2, X, Check, Key
} from 'lucide-react';
import { useUserStore, useAuthStore, useToastStore } from '../store';
import { roleLabels, roleColors, avatarGradients } from '../data/mockUsers';
import { formatDate } from '../utils/helpers';

const ROLES = ['admin', 'dispatcher', 'finance', 'viewer'];

function RoleBadge({ role }) {
  const c = roleColors[role] || roleColors.viewer;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 999,
      background: c.bg, color: c.color,
      border: `1px solid ${c.border}`,
      fontSize: 11, fontWeight: 600, letterSpacing: 0.3,
    }}>
      <Shield size={10} />
      {roleLabels[role] || role}
    </span>
  );
}

function UserAvatar({ user, size = 36 }) {
  return (
    <div style={{
      width: size, height: size,
      borderRadius: '50%',
      background: avatarGradients[user.role] || avatarGradients.viewer,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontWeight: 700, color: '#fff',
      flexShrink: 0,
      boxShadow: `0 2px 8px ${(roleColors[user.role] || roleColors.viewer).color}44`,
    }}>
      {user.name.charAt(0).toUpperCase()}
    </div>
  );
}

function AddUserModal({ onClose, onSave }) {
  const [form, setForm] = useState({
    name: '', email: '', password: '', role: 'dispatcher',
  });

  const handleSave = () => {
    if (!form.name || !form.email || !form.password) return;
    onSave({
      id: `u${Date.now()}`,
      ...form,
      status: 'active',
      avatar: form.name.charAt(0).toUpperCase(),
      createdAt: new Date().toISOString().split('T')[0],
      lastLogin: '—',
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}
        style={{ padding: 28, maxWidth: 440 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700 }}>Tambah User Baru</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="form-group">
          <label className="form-label">Nama Lengkap *</label>
          <input className="form-input" placeholder="Nama lengkap"
            value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
        </div>
        <div className="form-group">
          <label className="form-label">Email *</label>
          <input type="email" className="form-input" placeholder="email@perusahaan.id"
            value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
        </div>
        <div className="form-group">
          <label className="form-label">Password *</label>
          <div style={{ position: 'relative' }}>
            <Key size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input type="password" className="form-input" placeholder="Min. 6 karakter"
              style={{ paddingLeft: 32 }}
              value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Role</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {ROLES.map(r => {
              const c = roleColors[r];
              const selected = form.role === r;
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, role: r }))}
                  style={{
                    padding: '6px 14px', borderRadius: 999, cursor: 'pointer',
                    fontSize: 12, fontWeight: 600,
                    background: selected ? c.bg : 'var(--color-bg-input)',
                    color: selected ? c.color : 'var(--text-secondary)',
                    border: `1px solid ${selected ? c.border : 'var(--color-border)'}`,
                    transition: 'all 0.15s',
                  }}
                >
                  {roleLabels[r]}
                </button>
              );
            })}
          </div>
        </div>

        <div className="divider" />
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={onClose}>Batal</button>
          <button className="btn btn-primary" onClick={handleSave}
            disabled={!form.name || !form.email || !form.password}>
            <Check size={14} /> Simpan User
          </button>
        </div>
      </div>
    </div>
  );
}

function EditRoleModal({ user, onClose, onSave }) {
  const [role, setRole] = useState(user.role);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}
        style={{ padding: 28, maxWidth: 380 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700 }}>Ubah Role — {user.name}</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={15} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
          {ROLES.map(r => {
            const c = roleColors[r];
            const selected = role === r;
            return (
              <div
                key={r}
                onClick={() => setRole(r)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 14px', borderRadius: 10, cursor: 'pointer',
                  background: selected ? c.bg : 'var(--color-bg-input)',
                  border: `1px solid ${selected ? c.border : 'var(--color-border)'}`,
                  transition: 'all 0.15s',
                }}
              >
                <div style={{
                  width: 10, height: 10, borderRadius: '50%',
                  background: c.color, flexShrink: 0,
                }} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13, color: selected ? c.color : 'var(--text-primary)' }}>
                    {roleLabels[r]}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
                    {r === 'admin' ? 'Akses penuh ke semua fitur'
                      : r === 'dispatcher' ? 'Kelola DO dan penugasan'
                      : r === 'finance' ? 'Kelola invoice dan uang jalan'
                      : 'Hanya lihat data (read-only)'}
                  </div>
                </div>
                {selected && <Check size={14} style={{ marginLeft: 'auto', color: c.color }} />}
              </div>
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={onClose}>Batal</button>
          <button className="btn btn-primary" onClick={() => onSave(role)}>
            Simpan Role
          </button>
        </div>
      </div>
    </div>
  );
}

export default function UsersPage() {
  const { users, addUser, updateUser, deleteUser, toggleStatus, fetchFromApi } = useUserStore();
  const { user: currentUser } = useAuthStore();
  const { addToast } = useToastStore();

  React.useEffect(() => {
    if (fetchFromApi) fetchFromApi();
  }, [fetchFromApi]);

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editRoleUser, setEditRoleUser] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const filtered = users.filter(u => {
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    const matchSearch = !search
      || u.name.toLowerCase().includes(search.toLowerCase())
      || u.email.toLowerCase().includes(search.toLowerCase());
    return matchRole && matchSearch;
  });

  const handleAddUser = (user) => {
    addUser(user);
    setShowAddModal(false);
    addToast(`User "${user.name}" berhasil ditambahkan!`, 'success');
  };

  const handleEditRole = (role) => {
    updateUser(editRoleUser.id, { role });
    addToast(`Role ${editRoleUser.name} diubah ke ${roleLabels[role]}`, 'success');
    setEditRoleUser(null);
  };

  const handleToggle = (u) => {
    if (u.id === currentUser?.id) {
      addToast('Tidak bisa menonaktifkan akun sendiri!', 'error');
      return;
    }
    toggleStatus(u.id);
    addToast(
      `${u.name} ${u.status === 'active' ? 'dinonaktifkan' : 'diaktifkan'}.`,
      u.status === 'active' ? 'warning' : 'success'
    );
  };

  const handleDelete = (u) => {
    if (u.id === currentUser?.id) {
      addToast('Tidak bisa menghapus akun sendiri!', 'error');
      return;
    }
    deleteUser(u.id);
    setConfirmDelete(null);
    addToast(`User "${u.name}" dihapus.`, 'info');
  };

  // Stats
  const activeCount = users.filter(u => u.status === 'active').length;
  const roleStats = ROLES.map(r => ({
    role: r, count: users.filter(u => u.role === r).length,
  }));

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Manajemen Pengguna</h1>
          <p className="page-subtitle">{users.length} akun terdaftar · {activeCount} aktif</p>
        </div>
        <button className="btn btn-primary btn-lg" onClick={() => setShowAddModal(true)}>
          <Plus size={15} /> Tambah User
        </button>
      </div>

      {/* Role stat cards */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {roleStats.map(({ role, count }) => {
          const c = roleColors[role];
          return (
            <div
              key={role}
              className="card"
              style={{
                borderColor: c.border, cursor: 'pointer',
                background: roleFilter === role ? c.bg : undefined,
                transition: 'all 0.15s',
              }}
              onClick={() => setRoleFilter(roleFilter === role ? 'all' : role)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: c.color, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  {roleLabels[role]}
                </div>
                <Shield size={13} color={c.color} />
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, color: c.color, marginTop: 6 }}>{count}</div>
            </div>
          );
        })}
      </div>

      {/* Filter Bar */}
      <div className="filter-bar">
        <div className="search-input-wrap" style={{ maxWidth: 320 }}>
          <Search className="search-icon" size={14} />
          <input className="form-input" placeholder="Cari nama atau email..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <button className={`btn btn-sm ${roleFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setRoleFilter('all')}>Semua Role</button>
          {ROLES.map(r => {
            const c = roleColors[r];
            return (
              <button
                key={r}
                className={`btn btn-sm ${roleFilter === r ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setRoleFilter(r)}
                style={roleFilter === r ? { background: c.color, borderColor: c.color } : {}}
              >
                {roleLabels[r]}
              </button>
            );
          })}
        </div>
      </div>

      {/* User Table */}
      <div className="card" style={{ padding: 0 }}>
        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">👤</div>
            <div className="empty-state-title">Tidak ada user ditemukan</div>
          </div>
        ) : (
          <div className="table-container" style={{ border: 'none' }}>
            <table>
              <thead>
                <tr>
                  <th>Pengguna</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Bergabung</th>
                  <th>Login Terakhir</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(u => {
                  const isSelf = u.id === currentUser?.id;
                  return (
                    <tr key={u.id} style={{ opacity: u.status === 'inactive' ? 0.6 : 1 }}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <UserAvatar user={u} size={34} />
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 13 }}>
                              {u.name}
                              {isSelf && (
                                <span style={{
                                  marginLeft: 8, fontSize: 10, fontWeight: 600,
                                  color: 'var(--color-primary)',
                                  background: 'var(--color-primary-dim)',
                                  padding: '1px 6px', borderRadius: 999,
                                }}>Anda</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{u.email}</td>
                      <td><RoleBadge role={u.role} /></td>
                      <td>
                        <span className={`badge ${u.status === 'active' ? 'badge-done' : 'badge-draft'}`}>
                          {u.status === 'active' ? '● Aktif' : '○ Nonaktif'}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{formatDate(u.createdAt)}</td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                        {u.lastLogin === '—' ? '—' : formatDate(u.lastLogin)}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {/* Edit Role */}
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => setEditRoleUser(u)}
                            title="Ubah Role"
                          >
                            <Edit2 size={13} />
                          </button>

                          {/* Toggle Status */}
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => handleToggle(u)}
                            title={u.status === 'active' ? 'Nonaktifkan' : 'Aktifkan'}
                            disabled={isSelf}
                            style={{ color: u.status === 'active' ? 'var(--color-warning)' : 'var(--color-success)' }}
                          >
                            {u.status === 'active'
                              ? <ToggleRight size={16} />
                              : <ToggleLeft size={16} />
                            }
                          </button>

                          {/* Delete */}
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => setConfirmDelete(u)}
                            title="Hapus User"
                            disabled={isSelf}
                            style={{ color: 'var(--color-danger)' }}
                          >
                            <Trash2 size={13} />
                          </button>
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

      {/* Modals */}
      {showAddModal && (
        <AddUserModal
          onClose={() => setShowAddModal(false)}
          onSave={handleAddUser}
        />
      )}

      {editRoleUser && (
        <EditRoleModal
          user={editRoleUser}
          onClose={() => setEditRoleUser(null)}
          onSave={handleEditRole}
        />
      )}

      {confirmDelete && (
        <div className="modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ padding: 28 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>Hapus User?</h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
              Akun <strong>{confirmDelete.name}</strong> ({confirmDelete.email}) akan dihapus permanen.
              Tindakan ini tidak bisa dibatalkan.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setConfirmDelete(null)}>Batal</button>
              <button className="btn btn-danger" onClick={() => handleDelete(confirmDelete)}>
                <Trash2 size={13} /> Hapus Permanen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
