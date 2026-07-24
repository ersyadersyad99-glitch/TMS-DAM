import React, { useState } from 'react';
import { Plus, Trash2, ChevronRight } from 'lucide-react';
import { mockLocations } from '../../data/mockData';

export default function MasterLocations() {
  const [expanded, setExpanded] = useState(null);
  const [expandedCity, setExpandedCity] = useState(null);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Master Lokasi</h1>
          <p className="page-subtitle">Database Provinsi, Kota, dan Nama Toko untuk pengisian DO</p>
        </div>
        <button className="btn btn-primary"><Plus size={14} /> Tambah Lokasi</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {mockLocations.provinces.map(province => {
          const isOpen = expanded === province;
          const cities = mockLocations.cities[province] || [];
          return (
            <div key={province} className="card" style={{ padding: 0 }}>
              <div
                onClick={() => setExpanded(isOpen ? null : province)}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '14px 18px', cursor: 'pointer',
                  background: isOpen ? 'var(--color-primary-dim)' : undefined,
                  borderRadius: isOpen ? '14px 14px 0 0' : 14,
                  borderBottom: isOpen ? '1px solid var(--color-border)' : 'none',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>🗺️ {province}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{cities.length} kota/kabupaten</div>
                </div>
                <ChevronRight size={16} color="var(--text-muted)"
                  style={{ transform: isOpen ? 'rotate(90deg)' : 'none', transition: '0.2s' }} />
              </div>

              {isOpen && (
                <div style={{ padding: '12px 18px' }}>
                  {cities.map(city => {
                    const stores = mockLocations.stores[city] || [];
                    const cityKey = `${province}-${city}`;
                    const cityOpen = expandedCity === cityKey;
                    return (
                      <div key={city} style={{ marginBottom: 8 }}>
                        <div
                          onClick={() => setExpandedCity(cityOpen ? null : cityKey)}
                          style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '8px 12px', borderRadius: 8, cursor: 'pointer',
                            background: cityOpen ? 'var(--color-bg-base)' : 'var(--color-bg-input)',
                            border: '1px solid var(--color-border)',
                          }}
                        >
                          <div style={{ fontWeight: 500, fontSize: 13 }}>📍 {city}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{stores.length} toko</span>
                            <ChevronRight size={13} color="var(--text-muted)"
                              style={{ transform: cityOpen ? 'rotate(90deg)' : 'none', transition: '0.15s' }} />
                          </div>
                        </div>
                        {cityOpen && stores.length > 0 && (
                          <div style={{ paddingLeft: 12, marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {stores.map(store => (
                              <div key={store} style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                padding: '6px 10px', fontSize: 12, color: 'var(--text-secondary)',
                                background: 'var(--color-bg-base)', borderRadius: 6, border: '1px solid var(--color-border)',
                              }}>
                                <span>🏪 {store}</span>
                                <button className="btn btn-ghost" style={{ padding: '2px 4px', color: 'var(--color-danger)' }}>
                                  <Trash2 size={11} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <button className="btn btn-secondary btn-sm" style={{ width: '100%', marginTop: 8 }}>
                    <Plus size={12} /> Tambah Kota
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
