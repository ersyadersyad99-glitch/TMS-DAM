import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, ChevronRight, ChevronLeft, Info, Calculator } from 'lucide-react';
import { useOrderStore, useInvoiceStore, useToastStore } from '../../store';
import { mockClients, mockLocations } from '../../data/mockData';
import { formatRupiah } from '../../utils/helpers';

const STEPS = ['Info Dasar & Biaya', 'Rute & Drop Points', 'Review & Submit'];

function WizardSteps({ step }) {
  return (
    <div className="wizard-steps">
      {STEPS.map((s, i) => (
        <React.Fragment key={i}>
          {i > 0 && <div className={`wizard-connector ${i < step ? 'done' : ''}`} />}
          <div className={`wizard-step ${i + 1 === step ? 'active' : i + 1 < step ? 'done' : ''}`}>
            <div className="wizard-step-num">{i + 1 < step ? '✓' : i + 1}</div>
            <span className="wizard-step-label">{s}</span>
          </div>
        </React.Fragment>
      ))}
    </div>
  );
}

function DropPointRow({ drop, index, onChange, onRemove }) {
  const provinces = mockLocations.provinces || [];
  const cities = drop.province ? (mockLocations.cities[drop.province] || []) : [];
  const stores = drop.city ? (mockLocations.stores[drop.city] || []) : [];

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '28px 1fr 1fr 1fr 36px',
      gap: 8, alignItems: 'center', padding: '10px 14px',
      background: 'var(--color-bg-base)', borderRadius: 8,
      border: '1px solid var(--color-border)',
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: '50%',
        background: 'var(--color-primary-dim)', color: 'var(--color-primary)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 12, fontWeight: 700, flexShrink: 0
      }}>
        {index + 1}
      </div>

      {provinces.length > 0 ? (
        <select className="form-input form-select" value={drop.province}
          onChange={e => onChange('province', e.target.value)}>
          <option value="">Provinsi</option>
          {provinces.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      ) : (
        <input className="form-input" placeholder="Provinsi (misal: DKI Jakarta)" value={drop.province}
          onChange={e => onChange('province', e.target.value)} />
      )}

      {cities.length > 0 ? (
        <select className="form-input form-select" value={drop.city}
          onChange={e => onChange('city', e.target.value)}
          disabled={!drop.province}>
          <option value="">Kota/Kabupaten</option>
          {cities.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      ) : (
        <input className="form-input" placeholder="Kota/Kabupaten" value={drop.city}
          onChange={e => onChange('city', e.target.value)} />
      )}

      {stores.length > 0 ? (
        <select className="form-input form-select" value={drop.store}
          onChange={e => onChange('store', e.target.value)}
          disabled={!drop.city}>
          <option value="">Nama Toko/Gudang</option>
          {stores.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      ) : (
        <input className="form-input" placeholder="Gudang/Toko (Opsional)" value={drop.store}
          onChange={e => onChange('store', e.target.value)} />
      )}

      <button className="btn btn-ghost btn-sm" onClick={onRemove} style={{ color: 'var(--color-danger)', padding: 4 }}>
        <Trash2 size={14} />
      </button>
    </div>
  );
}

export default function OrderNew() {
  const navigate = useNavigate();
  const { addOrder } = useOrderStore();
  const { addInvoice } = useInvoiceStore();
  const { addToast } = useToastStore();

  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    clientName: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
    
    // Fee Components Breakdown
    baseFreight: '',   // Tarif Dasar Utama
    includePPN: false, // Checkbox PPN 11%
    ppnFee: '',        // Nominal PPN manual jika custom
    tkbmFee: '',       // Biaya TKBM (Tenaga Kerja Bongkar Muat)
    kraniFee: '',      // Biaya Krani (Tally / Petugas)
    otherFee: '',      // Biaya Lain-lain

    originProvince: '',
    originCity: '',
    originStore: '',
    drops: [{ id: 'new-0', province: '', city: '', store: '' }],
  });

  // Calculations
  const baseVal = Number(form.baseFreight) || 0;
  const ppnVal = form.includePPN ? Math.round(baseVal * 0.11) : (Number(form.ppnFee) || 0);
  const tkbmVal = Number(form.tkbmFee) || 0;
  const kraniVal = Number(form.kraniFee) || 0;
  const otherVal = Number(form.otherFee) || 0;

  const calculatedTotal = baseVal + ppnVal + tkbmVal + kraniVal + otherVal;
  const dp = Math.round(calculatedTotal * 0.7);
  const final = calculatedTotal - dp;

  const originCities = form.originProvince ? (mockLocations.cities[form.originProvince] || []) : [];
  const originStores = form.originCity ? (mockLocations.stores[form.originCity] || []) : [];

  const addDrop = () => {
    setForm(f => ({
      ...f,
      drops: [...f.drops, { id: `new-${Date.now()}`, province: '', city: '', store: '' }],
    }));
  };

  const removeDrop = (idx) => {
    setForm(f => ({ ...f, drops: f.drops.filter((_, i) => i !== idx) }));
  };

  const updateDrop = (idx, field, value) => {
    setForm(f => ({
      ...f,
      drops: f.drops.map((d, i) => {
        if (i !== idx) return d;
        const updated = { ...d, [field]: value };
        if (field === 'province' && mockLocations.provinces?.length > 0) { updated.city = ''; updated.store = ''; }
        if (field === 'city' && mockLocations.cities[updated.province]?.length > 0) { updated.store = ''; }
        return updated;
      }),
    }));
  };

  const canProceed1 = form.clientName && form.date && calculatedTotal > 0;
  const canProceed2 = form.originProvince && form.originCity && form.drops.length > 0
    && form.drops.every(d => d.province && d.city);

  const handleSubmit = () => {
    const id = `DO-2025-${String(Math.floor(Math.random()*900)+100)}`;
    const order = {
      id,
      clientId: `c-${Date.now()}`,
      clientName: form.clientName,
      date: form.date,
      totalValue: calculatedTotal,
      dpAmount: dp,
      finalAmount: final,
      costBreakdown: {
        baseFreight: baseVal,
        ppnFee: ppnVal,
        tkbmFee: tkbmVal,
        kraniFee: kraniVal,
        otherFee: otherVal,
      },
      status: 'menunggu_dp',
      paymentStatus: 'belum_dp',
      driverId: null, driverName: null, fleetId: null, fleetPlate: null,
      origin: { province: form.originProvince, city: form.originCity, store: form.originStore },
      drops: form.drops.map((d, i) => ({
        id: `dp-${Date.now()}-${i}`,
        seq: i + 1,
        province: d.province, city: d.city, store: d.store,
        status: 'pending', pod: null,
      })),
      notes: form.notes,
    };

    addOrder(order);
    addInvoice({
      id: `INV-DP-${id}`,
      orderId: id,
      clientName: form.clientName,
      type: 'dp',
      amount: dp,
      date: form.date,
      dueDate: new Date(new Date(form.date).getTime() + 2 * 86400000).toISOString().split('T')[0],
      status: 'unpaid',
    });

    addToast(`DO ${id} (${formatRupiah(calculatedTotal)}) berhasil dibuat! Invoice DP diterbitkan.`, 'success');
    navigate(`/transport/orders/${id}`);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Buat Delivery Order Baru</h1>
          <p className="page-subtitle">Isi rincian komponen biaya (Tarif dasar, PPN, TKBM, Krani) dan rute perjalanan</p>
        </div>
        <button className="btn btn-secondary" onClick={() => navigate(-1)}>Batal</button>
      </div>

      <div className="card" style={{ maxWidth: 840 }}>
        <WizardSteps step={step} />

        {/* Step 1 */}
        {step === 1 && (
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 20 }}>Informasi Dasar & Komponen Biaya</h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">Nama Klien *</label>
                {mockClients.length > 0 ? (
                  <select className="form-input form-select" value={form.clientName}
                    onChange={e => setForm(f => ({ ...f, clientName: e.target.value }))}>
                    <option value="">Pilih Klien</option>
                    {mockClients.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                ) : (
                  <input className="form-input" placeholder="Masukkan nama Klien/Perusahaan"
                    value={form.clientName}
                    onChange={e => setForm(f => ({ ...f, clientName: e.target.value }))} />
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Tanggal Berangkat *</label>
                <input type="date" className="form-input" value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
              </div>
            </div>

            {/* Rincian Komponen Biaya Box */}
            <div style={{ background: 'var(--color-bg-base)', padding: '16px 18px', borderRadius: 10, border: '1px solid var(--color-border)', marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-primary)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Calculator size={15} /> Rincian Komponen Biaya Order
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label className="form-label" style={{ fontSize: 11 }}>Tarif Utama / Freight Rate (Rp) *</label>
                  <input type="number" className="form-input" placeholder="misal: 5.000.000"
                    value={form.baseFreight}
                    onChange={e => setForm(f => ({ ...f, baseFreight: e.target.value }))} />
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <label className="form-label" style={{ fontSize: 11, margin: 0 }}>PPN (Pajak)</label>
                    <label style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', color: 'var(--color-primary)' }}>
                      <input type="checkbox" checked={form.includePPN}
                        onChange={e => setForm(f => ({ ...f, includePPN: e.target.checked }))} />
                      Hitung 11% Otomatis
                    </label>
                  </div>
                  <input type="number" className="form-input" placeholder={form.includePPN ? `PPN 11%: ${formatRupiah(ppnVal)}` : "Nominal PPN (Rp)"}
                    disabled={form.includePPN}
                    value={form.includePPN ? ppnVal : form.ppnFee}
                    onChange={e => setForm(f => ({ ...f, ppnFee: e.target.value }))} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div>
                  <label className="form-label" style={{ fontSize: 11 }}>Biaya TKBM (Bongkar Muat)</label>
                  <input type="number" className="form-input" placeholder="misal: 250.000"
                    value={form.tkbmFee}
                    onChange={e => setForm(f => ({ ...f, tkbmFee: e.target.value }))} />
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: 11 }}>Biaya Krani / Tally</label>
                  <input type="number" className="form-input" placeholder="misal: 150.000"
                    value={form.kraniFee}
                    onChange={e => setForm(f => ({ ...f, kraniFee: e.target.value }))} />
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: 11 }}>Biaya Lainnya</label>
                  <input type="number" className="form-input" placeholder="misal: 100.000"
                    value={form.otherFee}
                    onChange={e => setForm(f => ({ ...f, otherFee: e.target.value }))} />
                </div>
              </div>
            </div>

            {/* Live Auto-Calculate Banner */}
            {calculatedTotal > 0 && (
              <div style={{ background: 'linear-gradient(135deg, rgba(79,110,247,0.12), rgba(34,197,94,0.12))', borderRadius: 10, padding: '14px 18px', marginBottom: 16, border: '1px solid var(--color-primary)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>TOTAL NILAI ORDER</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' }}>{formatRupiah(calculatedTotal)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Invoice DP (70%)</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-primary)' }}>{formatRupiah(dp)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Invoice Pelunasan (30%)</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-success)' }}>{formatRupiah(final)}</div>
                  </div>
                </div>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Catatan / Instruksi Khusus (opsional)</label>
              <textarea className="form-input" rows={2} placeholder="Instruksi khusus pengiriman, jenis barang, dll."
                value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                style={{ resize: 'vertical' }} />
            </div>
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Rute Perjalanan</h3>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 20 }}>
              Tentukan titik asal dan semua titik bongkar muat.
            </p>

            {/* Origin */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                📍 Titik Asal (Muat)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, padding: '10px 14px', background: 'var(--color-primary-dim)', borderRadius: 8, border: '1px solid rgba(79,110,247,0.2)' }}>
                {mockLocations.provinces?.length > 0 ? (
                  <select className="form-input form-select" value={form.originProvince}
                    onChange={e => setForm(f => ({ ...f, originProvince: e.target.value, originCity: '', originStore: '' }))}>
                    <option value="">Provinsi</option>
                    {mockLocations.provinces.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                ) : (
                  <input className="form-input" placeholder="Provinsi (misal: DKI Jakarta)" value={form.originProvince}
                    onChange={e => setForm(f => ({ ...f, originProvince: e.target.value }))} />
                )}

                {originCities.length > 0 ? (
                  <select className="form-input form-select" value={form.originCity}
                    onChange={e => setForm(f => ({ ...f, originCity: e.target.value, originStore: '' }))}
                    disabled={!form.originProvince}>
                    <option value="">Kota/Kabupaten</option>
                    {originCities.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                ) : (
                  <input className="form-input" placeholder="Kota/Kabupaten" value={form.originCity}
                    onChange={e => setForm(f => ({ ...f, originCity: e.target.value }))} />
                )}

                {originStores.length > 0 ? (
                  <select className="form-input form-select" value={form.originStore}
                    onChange={e => setForm(f => ({ ...f, originStore: e.target.value }))}
                    disabled={!form.originCity}>
                    <option value="">Nama Lokasi</option>
                    {originStores.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                ) : (
                  <input className="form-input" placeholder="Gudang/Toko (Opsional)" value={form.originStore}
                    onChange={e => setForm(f => ({ ...f, originStore: e.target.value }))} />
                )}
              </div>
            </div>

            {/* Drops */}
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
              🏁 Titik Bongkar / Drop Points
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
              {form.drops.map((d, i) => (
                <DropPointRow key={d.id} drop={d} index={i}
                  onChange={(field, val) => updateDrop(i, field, val)}
                  onRemove={() => removeDrop(i)} />
              ))}
            </div>
            <button className="btn btn-secondary" onClick={addDrop} style={{ width: '100%' }}>
              <Plus size={14} /> Tambah Drop Point
            </button>
          </div>
        )}

        {/* Step 3 — Review */}
        {step === 3 && (
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 20 }}>Review & Konfirmasi Order</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Klien</div>
                <div style={{ fontWeight: 600 }}>{form.clientName}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Tanggal Berangkat</div>
                <div style={{ fontWeight: 600 }}>{form.date}</div>
              </div>
            </div>

            {/* Breakdown Table */}
            <div style={{ background: 'var(--color-bg-base)', borderRadius: 10, padding: '14px 16px', marginBottom: 20, border: '1px solid var(--color-border)' }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 10 }}>Rincian Komponen Biaya</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Tarif Utama Freight</span>
                  <span style={{ fontWeight: 600 }}>{formatRupiah(baseVal)}</span>
                </div>
                {ppnVal > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-primary)' }}>
                    <span>PPN (Pajak)</span>
                    <span style={{ fontWeight: 600 }}>+{formatRupiah(ppnVal)}</span>
                  </div>
                )}
                {tkbmVal > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Biaya TKBM (Bongkar Muat)</span>
                    <span style={{ fontWeight: 600 }}>+{formatRupiah(tkbmVal)}</span>
                  </div>
                )}
                {kraniVal > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Biaya Krani / Tally</span>
                    <span style={{ fontWeight: 600 }}>+{formatRupiah(kraniVal)}</span>
                  </div>
                )}
                {otherVal > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Biaya Lainnya</span>
                    <span style={{ fontWeight: 600 }}>+{formatRupiah(otherVal)}</span>
                  </div>
                )}
                <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 8, marginTop: 4, display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 700 }}>
                  <span>Total Nilai Order</span>
                  <span>{formatRupiah(calculatedTotal)}</span>
                </div>
              </div>
            </div>

            <div style={{ background: 'var(--color-primary-dim)', borderRadius: 10, padding: '14px 16px', border: '1px solid rgba(79,110,247,0.2)' }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 10 }}>Skema Pembayaran (70 : 30)</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Invoice DP (70%)</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-primary)' }}>{formatRupiah(dp)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Pelunasan (30%)</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-success)' }}>{formatRupiah(final)}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="divider" />
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <button className="btn btn-secondary" onClick={() => step > 1 ? setStep(s => s-1) : navigate(-1)}>
            <ChevronLeft size={15} /> {step === 1 ? 'Batal' : 'Sebelumnya'}
          </button>
          {step < 3 ? (
            <button
              className="btn btn-primary"
              disabled={step === 1 ? !canProceed1 : !canProceed2}
              onClick={() => setStep(s => s+1)}
            >
              Selanjutnya <ChevronRight size={15} />
            </button>
          ) : (
            <button className="btn btn-success btn-lg" onClick={handleSubmit}>
              ✅ Simpan & Terbitkan DO
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
