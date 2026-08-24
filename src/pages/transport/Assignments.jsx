import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserCheck } from 'lucide-react';
import { useOrderStore, useVendorStore, useToastStore } from '../../store';
import { formatRupiah, formatDate } from '../../utils/helpers';

const SERVICE_TYPES = [
  { key: 'FTL', label: 'FTL', icon: '🚛', desc: 'Full Truck Load' },
  { key: 'FCL', label: 'FCL', icon: '📦', desc: 'Full Container Load' },
  { key: 'LTL', label: 'LTL', icon: '🚚', desc: 'Less Than Truck Load' },
  { key: 'LCL', label: 'LCL', icon: '📦', desc: 'Less Than Container Load' },
  { key: 'AIR FREIGHT', label: 'AIR FREIGHT', icon: '✈️', desc: 'Air Freight Cargo' },
];

export default function Assignments() {
  const navigate = useNavigate();
  const { orders, assignDriver } = useOrderStore();
  const { vendors } = useVendorStore();
  const { addToast } = useToastStore();

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [vendorName, setVendorName] = useState('');
  const [driverName, setDriverName] = useState('');
  const [fleetPlate, setFleetPlate] = useState('');
  const [serviceType, setServiceType] = useState('FTL');

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Both 'menunggu_dp' and 'aktif' orders (without driver assigned) are eligible for driver assignment
  const assignableOrders = orders.filter(
    o => ['menunggu_dp', 'aktif'].includes(o.status) && (!o.driverId || o.driverId === '' || o.driverId === 'null')
  );

  const handleAssign = () => {
    if (isSubmitting || !selectedOrder) return;
    const vName = vendorName.trim();
    const dName = driverName.trim();
    const fPlate = fleetPlate.trim().toUpperCase();

    if (!vName || !dName || !fPlate) {
      addToast('Nama Vendor, Nama Driver, dan No. Pol Armada wajib diisi!', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const driverId = `d-${Date.now()}`;
      const fleetId = `f-${Date.now()}`;

      assignDriver(selectedOrder.id, driverId, dName, fleetId, fPlate, serviceType, vName);
      addToast(`Penugasan ${serviceType}: ${dName} + ${fPlate} (Vendor: ${vName}) ke ${selectedOrder.id} berhasil!`, 'success');
      
      setSelectedOrder(null);
      setVendorName('');
      setDriverName('');
      setFleetPlate('');
      setServiceType('FTL');

      navigate('/transport/orders');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isAssignValid = !isSubmitting && vendorName.trim().length > 0 &&
                        driverName.trim().length > 0 &&
                        fleetPlate.trim().length > 0;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Penugasan Sopir & Armada</h1>
          <p className="page-subtitle">Pilih DO, tentukan tipe service (Consol / Charter / Full), Vendor Armada, Driver, dan No. Polisi</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 16, alignItems: 'start' }}>
        {/* DO List */}
        <div>
          <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>
            DO Siap Ditugaskan ({assignableOrders.length})
          </h3>
          {assignableOrders.length === 0 ? (
            <div className="card">
              <div className="empty-state">
                <div className="empty-state-icon">✅</div>
                <div className="empty-state-title">Semua DO sudah ditugaskan</div>
                <div className="empty-state-text">Tidak ada DO yang menunggu penugasan sopir.</div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {assignableOrders.map(o => {
                const isSelected = selectedOrder?.id === o.id;
                return (
                  <div
                    key={o.id}
                    className="card"
                    onClick={() => setSelectedOrder(isSelected ? null : o)}
                    style={{
                      cursor: 'pointer',
                      border: isSelected ? '1px solid var(--color-primary)' : undefined,
                      background: isSelected ? 'var(--color-primary-dim)' : undefined,
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontWeight: 700, fontSize: 15, color: isSelected ? 'var(--color-primary)' : undefined }}>{o.id}</span>
                          {o.serviceType && (
                            <span className="badge" style={{ background: 'var(--color-primary-dim)', color: 'var(--color-primary)', fontSize: 11 }}>
                              {o.serviceType}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>{o.clientName}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                          {o.origin ? `${o.origin.city} → ` : ''}{o.drops ? o.drops.map(d => d.city).join(' → ') : ''}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 600 }}>{formatRupiah(o.totalValue)}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{formatDate(o.date)}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{o.drops ? o.drops.length : 0} Drop Points</div>
                      </div>
                    </div>
                    {isSelected && (
                      <div style={{ marginTop: 10, padding: '6px 10px', background: 'rgba(79,110,247,0.08)', borderRadius: 6, fontSize: 12, color: 'var(--color-primary)' }}>
                        ✓ Dipilih — tentukan Vendor, Driver & No. Polisi di panel kanan
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Assignment Panel */}
        <div style={{ position: 'sticky', top: 80 }}>
          <div className="card">
            <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 16 }}>
              {selectedOrder ? `Tugaskan ke ${selectedOrder.id}` : 'Pilih DO terlebih dahulu'}
            </h3>

            {selectedOrder ? (
              <>
                {/* Service Type Selection */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>
                    Tipe Service Layanan *
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                    {SERVICE_TYPES.map(s => (
                      <div
                        key={s.key}
                        onClick={() => setServiceType(s.key)}
                        style={{
                          padding: '10px 6px', borderRadius: 8, textAlign: 'center', cursor: 'pointer',
                          background: serviceType === s.key ? 'var(--color-primary-dim)' : 'var(--color-bg-base)',
                          border: `1.5px solid ${serviceType === s.key ? 'var(--color-primary)' : 'var(--color-border)'}`,
                          transition: 'all 0.15s',
                        }}
                      >
                        <div style={{ fontSize: 18, marginBottom: 2 }}>{s.icon}</div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: serviceType === s.key ? 'var(--color-primary)' : 'var(--text-primary)' }}>{s.label}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{s.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Vendor Dropdown (Mandatory) */}
                <div className="form-group" style={{ marginBottom: 14 }}>
                  <label className="form-label" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
                    🏢 Nama Vendor Armada (Dropdown) *
                  </label>
                  {vendors && vendors.length > 0 ? (
                    <select
                      className="form-input form-select"
                      value={vendorName}
                      onChange={e => setVendorName(e.target.value)}
                    >
                      <option value="">-- Pilih Vendor Armada --</option>
                      {vendors.map(v => (
                        <option key={v.id} value={v.name}>{v.name} ({v.city || 'Vendor'})</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      className="form-input"
                      placeholder="Masukkan nama Vendor Logistik"
                      value={vendorName}
                      onChange={e => setVendorName(e.target.value)}
                    />
                  )}
                </div>

                {/* Driver Name (Free Text) */}
                <div className="form-group" style={{ marginBottom: 14 }}>
                  <label className="form-label">👨‍✈️ Nama Driver / Sopir (Free Text) *</label>
                  <input
                    className="form-input"
                    placeholder="misal: Budi Santoso / Ahmad"
                    value={driverName}
                    onChange={e => setDriverName(e.target.value)}
                  />
                </div>

                {/* Fleet Plate (Free Text) */}
                <div className="form-group" style={{ marginBottom: 20 }}>
                  <label className="form-label">🚛 No. Polisi Armada (Free Text) *</label>
                  <input
                    className="form-input"
                    placeholder="misal: B 9821 UXR / E 9533 ETA"
                    value={fleetPlate}
                    onChange={e => setFleetPlate(e.target.value)}
                    style={{ textTransform: 'uppercase' }}
                  />
                </div>

                <button
                  className="btn btn-primary btn-lg"
                  style={{ width: '100%' }}
                  disabled={!isAssignValid}
                  onClick={handleAssign}
                >
                  <UserCheck size={16} /> Tugaskan Layanan {serviceType}
                </button>
              </>
            ) : (
              <div className="empty-state" style={{ padding: '30px 0' }}>
                <div style={{ fontSize: 36 }}>👆</div>
                <div className="empty-state-title">Pilih DO dari daftar</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
