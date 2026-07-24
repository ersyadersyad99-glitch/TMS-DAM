import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserCheck } from 'lucide-react';
import { useOrderStore, useToastStore } from '../../store';
import { mockDrivers, mockFleet } from '../../data/mockData';
import {
  formatRupiah, formatDate,
  driverStatusLabel, driverStatusClass,
  fleetStatusLabel, fleetStatusClass,
} from '../../utils/helpers';

const SERVICE_TYPES = [
  { key: 'Consol', label: 'Consol', icon: '🚚', desc: 'Konsolidasi' },
  { key: 'Charter', label: 'Charter', icon: '🚛', desc: 'Sewa Full' },
  { key: 'Full', label: 'Full', icon: '📦', desc: 'Full Load' },
];

export default function Assignments() {
  const navigate = useNavigate();
  const { orders, assignDriver } = useOrderStore();
  const { addToast } = useToastStore();

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedDriver, setSelectedDriver] = useState('');
  const [customDriverName, setCustomDriverName] = useState('');
  const [selectedFleet, setSelectedFleet] = useState('');
  const [customFleetPlate, setCustomFleetPlate] = useState('');
  const [serviceType, setServiceType] = useState('Charter');

  const assignableOrders = orders.filter(
    o => (o.status === 'aktif' || o.status === 'menunggu_dp') && !o.driverId && o.paymentStatus === 'dp_lunas'
  );

  const drivers = mockDrivers;
  const fleet = mockFleet;

  const handleAssign = () => {
    if (!selectedOrder) return;

    let driverId = selectedDriver;
    let driverName = customDriverName;
    if (drivers.length > 0) {
      const driver = drivers.find(d => d.id === selectedDriver);
      driverName = driver?.name || customDriverName;
    } else {
      driverId = `d-${Date.now()}`;
    }

    let fleetId = selectedFleet;
    let fleetPlate = customFleetPlate;
    if (fleet.length > 0) {
      const fl = fleet.find(f => f.id === selectedFleet);
      fleetPlate = fl?.plate || customFleetPlate;
    } else {
      fleetId = `f-${Date.now()}`;
    }

    if (!driverName || !fleetPlate) return;

    assignDriver(selectedOrder.id, driverId, driverName, fleetId, fleetPlate, serviceType);
    addToast(`Penugasan ${serviceType}: ${driverName} + ${fleetPlate} ke ${selectedOrder.id} berhasil!`, 'success');
    setSelectedOrder(null);
    setSelectedDriver('');
    setCustomDriverName('');
    setSelectedFleet('');
    setCustomFleetPlate('');
    setServiceType('Charter');
  };

  const isAssignValid = (drivers.length > 0 ? selectedDriver : customDriverName) &&
                        (fleet.length > 0 ? selectedFleet : customFleetPlate);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Penugasan Sopir & Armada</h1>
          <p className="page-subtitle">Pilih DO, tentukan tipe service (Consol / Charter / Full), dan tugaskan armada</p>
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
                        ✓ Dipilih — tentukan Tipe Service, Sopir & Armada di panel kanan
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
                <div style={{ marginBottom: 18 }}>
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

                {/* Driver selection */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>Pilih / Isi Nama Sopir</div>
                  {drivers.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {drivers.map(d => (
                        <div
                          key={d.id}
                          onClick={() => d.status === 'available' && setSelectedDriver(d.id)}
                          style={{
                            padding: '10px 12px', borderRadius: 8,
                            background: selectedDriver === d.id ? 'var(--color-primary-dim)' : 'var(--color-bg-base)',
                            border: `1px solid ${selectedDriver === d.id ? 'rgba(79,110,247,0.3)' : 'var(--color-border)'}`,
                            cursor: d.status === 'available' ? 'pointer' : 'not-allowed',
                            opacity: d.status !== 'available' ? 0.5 : 1,
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 13 }}>{d.name}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{d.phone} · {d.license}</div>
                          </div>
                          <span className={`badge ${driverStatusClass[d.status]}`}>{driverStatusLabel[d.status]}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <input className="form-input" placeholder="Masukkan nama sopir (misal: Abdel)"
                      value={customDriverName} onChange={e => setCustomDriverName(e.target.value)} />
                  )}
                </div>

                {/* Fleet selection */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>Pilih / Isi Plat Armada</div>
                  {fleet.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {fleet.map(f => (
                        <div
                          key={f.id}
                          onClick={() => f.status === 'available' && setSelectedFleet(f.id)}
                          style={{
                            padding: '10px 12px', borderRadius: 8,
                            background: selectedFleet === f.id ? 'var(--color-primary-dim)' : 'var(--color-bg-base)',
                            border: `1px solid ${selectedFleet === f.id ? 'rgba(79,110,247,0.3)' : 'var(--color-border)'}`,
                            cursor: f.status === 'available' ? 'pointer' : 'not-allowed',
                            opacity: f.status !== 'available' ? 0.5 : 1,
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 13 }}>{f.plate}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{f.type} · {f.capacity}</div>
                          </div>
                          <span className={`badge ${fleetStatusClass[f.status]}`}>{fleetStatusLabel[f.status]}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <input className="form-input" placeholder="Masukkan plat kendaraan (misal: E 9533 ETA)"
                      value={customFleetPlate} onChange={e => setCustomFleetPlate(e.target.value)} />
                  )}
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
