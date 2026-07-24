import React, { useState } from 'react';
import { Plus, Truck, User } from 'lucide-react';
import { mockDrivers, mockFleet } from '../../data/mockData';
import {
  driverStatusLabel, driverStatusClass,
  fleetStatusLabel, fleetStatusClass
} from '../../utils/helpers';

export default function MasterFleet() {
  const [tab, setTab] = useState('fleet');

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Armada & Sopir</h1>
          <p className="page-subtitle">Kelola unit kendaraan dan data sopir</p>
        </div>
        <button className="btn btn-primary"><Plus size={14} /> Tambah {tab === 'fleet' ? 'Armada' : 'Sopir'}</button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 20, background: 'var(--color-bg-card)', borderRadius: 10, padding: 4, width: 'fit-content', border: '1px solid var(--color-border)' }}>
        <button
          className={`btn btn-sm ${tab === 'fleet' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ borderRadius: 8 }}
          onClick={() => setTab('fleet')}
        >
          <Truck size={13} /> Unit Armada ({mockFleet.length})
        </button>
        <button
          className={`btn btn-sm ${tab === 'drivers' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ borderRadius: 8 }}
          onClick={() => setTab('drivers')}
        >
          <User size={13} /> Sopir ({mockDrivers.length})
        </button>
      </div>

      {tab === 'fleet' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
          {mockFleet.map(f => (
            <div key={f.id} className="card" style={{
              borderColor: f.status === 'available' ? 'rgba(34,197,94,0.2)' : f.status === 'maintenance' ? 'rgba(239,68,68,0.2)' : 'rgba(129,140,248,0.2)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                <div style={{ fontSize: 32 }}>🚛</div>
                <span className={`badge ${fleetStatusClass[f.status]}`}>{fleetStatusLabel[f.status]}</span>
              </div>
              <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 2 }}>{f.plate}</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 1 }}>{f.type}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Kapasitas: {f.capacity}</div>
            </div>
          ))}
        </div>
      )}

      {tab === 'drivers' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
          {mockDrivers.map(d => (
            <div key={d.id} className="card" style={{
              borderColor: d.status === 'available' ? 'rgba(34,197,94,0.2)' : 'var(--color-border)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--color-primary), #818cf8)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, fontWeight: 700, color: '#fff',
                }}>
                  {d.name.charAt(0)}
                </div>
                <span className={`badge ${driverStatusClass[d.status]}`}>{driverStatusLabel[d.status]}</span>
              </div>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2 }}>{d.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 1 }}>{d.phone}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>SIM: {d.license}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
