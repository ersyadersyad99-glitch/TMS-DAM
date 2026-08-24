import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, ChevronRight, ChevronLeft, Info, Calculator } from 'lucide-react';
import { useOrderStore, useInvoiceStore, useClientStore, useToastStore } from '../../store';
import { INDONESIA_PROVINCES, INDONESIA_CITIES } from '../../utils/indonesiaLocations';
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
  const provinces = INDONESIA_PROVINCES;
  const cities = drop.province ? (INDONESIA_CITIES[drop.province] || []) : [];

  return (
    <div style={{
      background: 'var(--color-bg-base)', borderRadius: 10,
      padding: '12px 14px', border: '1px solid var(--color-border)',
      marginBottom: 10,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 26, height: 26, borderRadius: '50%',
            background: 'var(--color-primary-dim)', color: 'var(--color-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 700, flexShrink: 0
          }}>
            {index + 1}
          </div>
          <span style={{ fontSize: 13, fontWeight: 700 }}>Titik Bongkar #{index + 1}</span>
        </div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onRemove} style={{ color: 'var(--color-danger)', padding: 4 }}>
          <Trash2 size={14} /> Hapus
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
        <div>
          <label className="form-label" style={{ fontSize: 10 }}>Provinsi *</label>
          <select className="form-input form-select" value={drop.province}
            onChange={e => onChange('province', e.target.value)}>
            <option value="">Pilih Provinsi...</option>
            {provinces.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        <div>
          <label className="form-label" style={{ fontSize: 10 }}>Kota/Kabupaten *</label>
          {cities.length > 0 ? (
            <select className="form-input form-select" value={drop.city}
              onChange={e => onChange('city', e.target.value)} disabled={!drop.province}>
              <option value="">Pilih Kota/Kabupaten...</option>
              {cities.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          ) : (
            <input className="form-input" placeholder="Kota/Kabupaten" value={drop.city}
              onChange={e => onChange('city', e.target.value)} />
          )}
        </div>

        <div>
          <label className="form-label" style={{ fontSize: 10 }}>Kecamatan (Freetaks)</label>
          <input className="form-input" placeholder="Nama Kecamatan" value={drop.district || ''}
            onChange={e => onChange('district', e.target.value)} />
        </div>

        <div>
          <label className="form-label" style={{ fontSize: 10 }}>Gudang/Toko (Opsional)</label>
          <input className="form-input" placeholder="Nama Gudang/Toko" value={drop.store || ''}
            onChange={e => onChange('store', e.target.value)} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div>
          <label className="form-label" style={{ fontSize: 10 }}>PIC Penerima (Nama)</label>
          <input className="form-input" placeholder="Nama PIC Penerima" value={drop.pic || ''}
            onChange={e => onChange('pic', e.target.value)} />
        </div>

        <div>
          <label className="form-label" style={{ fontSize: 10 }}>No. Telp Penerima</label>
          <input className="form-input" placeholder="No. HP/Telp Penerima" value={drop.phone || ''}
            onChange={e => onChange('phone', e.target.value)} />
        </div>
      </div>
    </div>
  );
}

export default function OrderNew() {
  const navigate = useNavigate();
  const { addOrder } = useOrderStore();
  const { addInvoice } = useInvoiceStore();
  const { clients } = useClientStore();
  const { addToast } = useToastStore();

  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    doNumber: '',     // No. DO (Manual or auto)
    soNumber: '',     // No. SO (Sales Order)
    clientName: '',
    serviceType: 'FTL', // Tipe Layanan: FTL, FCL, LTL, LCL, AIR FREIGHT
    unitType: '',       // Jenis Unit/Armada
    kubikasi: '',       // Kubikasi (CBM) - dropdown by unit
    tonase: '',         // Tonase (free input by admin)
    date: new Date().toISOString().split('T')[0],
    pickupDate: new Date().toISOString().split('T')[0], // Tgl Pickup
    etdDate: new Date().toISOString().split('T')[0],    // Tgl ETD (Estimated Time of Departure)
    etaDate: '',                                        // Tgl ETA (Estimated Time of Arrival)
    notes: '',
    paymentType: '70:30', // Options: '70:30', 'TOP 14 Hari', 'TOP 21 Hari', 'TOP 30 Hari', 'TOP 45 Hari'
    
    // Fee Components Breakdown
    baseFreight: '',   // Tarif Dasar Utama (Selling Rate)
    buyingPrice: '',   // Harga Buying Vendor (Biaya Modal)
    includePPN: false, // Checkbox PPN 1.1%
    ppnFee: '',        // Nominal PPN manual jika custom
    tkbmFee: '',       // Biaya TKBM (Tenaga Kerja Bongkar Muat)
    kraniFee: '',      // Biaya Krani (Tally / Petugas)
    otherFee: '',      // Biaya Lain-lain

    originProvince: '',
    originCity: '',
    originDistrict: '',
    originStore: '',
    drops: [{ id: 'new-0', province: '', city: '', district: '', store: '', pic: '', phone: '' }],
  });

  // Unit → available Kubikasi options
  const UNIT_KUBIKASI = {
    'CDE Std':        ['8 CBM', '10 CBM', '12 CBM'],
    'CDD Std':        ['14 CBM', '16 CBM', '18 CBM', '22 CBM'],
    'CDDL':           ['24 CBM', '26 CBM', '28 CBM'],
    'FUSO Std':       ['35 CBM'],
    'FUSO Long':      ['45 CBM', '50 CBM'],
    'Tronton Std':    ['60 CBM'],
    'Wingbox':        ['65 CBM'],
    'Container 1x20': ['33 CBM', '38 CBM'],
    'Container 1x40': ['67 CBM', '76 CBM'],
  };

  const kubikasiOptions = form.unitType ? (UNIT_KUBIKASI[form.unitType] || []) : [];

  const handleUnitChange = (unit) => {
    setForm(f => ({ ...f, unitType: unit, kubikasi: '' })); // reset kubikasi on unit change
  };

  // Calculations
  const baseVal = Number(form.baseFreight) || 0;
  const buyingVal = Number(form.buyingPrice) || 0;
  const ppnVal = form.includePPN ? Math.round(baseVal * 0.011) : (Number(form.ppnFee) || 0);
  const tkbmVal = Number(form.tkbmFee) || 0;
  const kraniVal = Number(form.kraniFee) || 0;
  const otherVal = Number(form.otherFee) || 0;

  const calculatedTotal = baseVal + ppnVal + tkbmVal + kraniVal + otherVal;
  const estMargin = calculatedTotal - buyingVal;

  const isTop = form.paymentType && form.paymentType.startsWith('TOP');
  const dp = isTop ? 0 : Math.round(calculatedTotal * 0.7);
  const final = isTop ? calculatedTotal : (calculatedTotal - dp);

  const originCities = form.originProvince ? (INDONESIA_CITIES[form.originProvince] || []) : [];

  const addDrop = () => {
    setForm(f => ({
      ...f,
      drops: [...f.drops, { id: `new-${Date.now()}`, province: '', city: '', district: '', store: '', pic: '', phone: '' }],
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
        if (field === 'province') { updated.city = ''; }
        return updated;
      }),
    }));
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const canProceed1 = form.clientName && form.date && calculatedTotal > 0;
  const canProceed2 = form.originProvince && form.originCity && form.drops.length > 0
    && form.drops.every(d => d.province && d.city);

  const handleSubmit = () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const id = form.doNumber.trim() ? form.doNumber.trim() : `DO-2025-${String(Math.floor(Math.random()*900)+100)}`;
      const order = {
        id,
        doNumber: id,
        soNumber: form.soNumber.trim() || null,
        serviceType: form.serviceType || 'FTL',
        paymentType: form.paymentType || '70:30',
        unitType: form.unitType || null,
        kubikasi: form.kubikasi || null,
        tonase: form.tonase.trim() || null,
        pickupDate: form.pickupDate || form.date,
        etdDate: form.etdDate || form.date,
        etaDate: form.etaDate || null,
        clientId: clients.find(c => c.name === form.clientName)?.id || null,
        clientName: form.clientName,
        date: form.date,
        totalValue: calculatedTotal,
        buyingPrice: buyingVal,
        estMargin: estMargin,
        dpAmount: dp,
        finalAmount: final,
        costBreakdown: {
          baseFreight: baseVal,
          buyingPrice: buyingVal,
          ppnFee: ppnVal,
          tkbmFee: tkbmVal,
          kraniFee: kraniVal,
          otherFee: otherVal,
        },
        status: isTop ? 'aktif' : 'menunggu_dp',
        paymentStatus: isTop ? 'dp_lunas' : 'belum_dp',
        invoicePending: isTop ? true : false,
        topDays: isTop
          ? (form.paymentType === 'TOP 14 Hari' ? 14
            : form.paymentType === 'TOP 21 Hari' ? 21
            : form.paymentType === 'TOP 30 Hari' ? 30
            : form.paymentType === 'TOP 45 Hari' ? 45 : 30)
          : null,
        driverId: null, driverName: null, fleetId: null, fleetPlate: null,
        origin: { province: form.originProvince, city: form.originCity, district: form.originDistrict || null, store: form.originStore || null },
        drops: form.drops.map((d, i) => ({
          id: `dp-${Date.now()}-${i}`,
          seq: i + 1,
          province: d.province, city: d.city, district: d.district || null, store: d.store || null,
          pic: d.pic || null, phone: d.phone || null,
          status: 'pending', pod: null,
        })),
        notes: form.notes,
      };

      addOrder(order);

      if (isTop) {
        addToast(`DO ${id} (${formatRupiah(calculatedTotal)}) dengan Tipe Pembayaran ${form.paymentType} berhasil dibuat! Invoice akan terbit setelah Delivered & POD lengkap.`, 'success');
      } else {
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
        addToast(`DO ${id} (${formatRupiah(calculatedTotal)}) dengan Pembayaran DP 70% : 30% berhasil dibuat!`, 'success');
      }
      navigate('/transport/orders');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Buat Delivery Order Baru</h1>
          <p className="page-subtitle">Isi rincian No. DO, No. SO, Tipe Service, Berat/Tonase, Jadwal (Pickup/ETD/ETA), Komponen Biaya & Rute</p>
        </div>
        <button className="btn btn-secondary" onClick={() => navigate(-1)}>Batal</button>
      </div>

      <div className="card" style={{ maxWidth: 840 }}>
        <WizardSteps step={step} />

        {/* Step 1 */}
        {step === 1 && (
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 20 }}>Informasi Dasar & Komponen Biaya</h3>

            {/* No. DO & No. SO Fields */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">No. Delivery Order (No. DO)</label>
                <input className="form-input" placeholder="misal: DO-2025-584 (Opsional / Auto)"
                  value={form.doNumber}
                  onChange={e => setForm(f => ({ ...f, doNumber: e.target.value }))} />
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Kosongkan jika ingin sistem buat No. DO otomatis</span>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">No. Sales Order (No. SO)</label>
                <input className="form-input" placeholder="misal: SO-2025-092"
                  value={form.soNumber}
                  onChange={e => setForm(f => ({ ...f, soNumber: e.target.value }))} />
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Nomor Sales Order dari Klien (opsional)</span>
              </div>
            </div>

            {/* Client, Service, & Weight Selection */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div className="form-group" style={{ margin: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <label className="form-label" style={{ color: 'var(--color-primary)', fontWeight: 600, margin: 0 }}>
                    🏢 Nama Klien (Database Klien) *
                  </label>
                </div>
                <select
                  className="form-input form-select"
                  value={form.clientName}
                  onChange={e => setForm(f => ({ ...f, clientName: e.target.value }))}
                  required
                >
                  <option value="">-- Pilih Klien dari Database --</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                  Wajib terdaftar di Database Master Klien
                </span>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Tipe Layanan (Service) *</label>
                <select className="form-input form-select" value={form.serviceType}
                  onChange={e => setForm(f => ({ ...f, serviceType: e.target.value }))}>
                  <option value="FTL">🚛 FTL (Full Truck Load)</option>
                  <option value="FCL">📦 FCL (Full Container Load)</option>
                  <option value="LTL">🚚 LTL (Less Than Truck Load)</option>
                  <option value="LCL">📦 LCL (Less Than Container Load)</option>
                  <option value="AIR FREIGHT">✈️ Air Freight</option>
                </select>
              </div>
            </div>

            {/* Unit/Armada + Kubikasi + Tonase */}
            <div style={{ marginBottom: 14, background: 'var(--color-bg-base)', padding: '14px 16px', borderRadius: 10, border: '1px solid var(--color-border)' }}>
              <label className="form-label" style={{ color: 'var(--color-primary)', fontWeight: 700, marginBottom: 10, display: 'block' }}>
                🚛 Unit / Armada & Muatan
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                {/* Unit/Armada */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: 11 }}>Jenis Unit / Armada</label>
                  <select className="form-input form-select" value={form.unitType}
                    onChange={e => handleUnitChange(e.target.value)}>
                    <option value="">-- Pilih Unit --</option>
                    <option value="CDE Std">🚚 CDE Std</option>
                    <option value="CDD Std">🚚 CDD Std</option>
                    <option value="CDDL">🚚 CDDL</option>
                    <option value="FUSO Std">🚛 FUSO Std</option>
                    <option value="FUSO Long">🚛 FUSO Long</option>
                    <option value="Tronton Std">🚛 Tronton Std</option>
                    <option value="Wingbox">🚛 Wingbox</option>
                    <option value="Container 1x20">📦 Container 1x20</option>
                    <option value="Container 1x40">📦 Container 1x40</option>
                  </select>

                </div>

                {/* Kubikasi (dynamic by unit) */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: 11 }}>Kubikasi (CBM)</label>
                  {kubikasiOptions.length > 0 ? (
                    <select className="form-input form-select" value={form.kubikasi}
                      onChange={e => setForm(f => ({ ...f, kubikasi: e.target.value }))}
                      disabled={!form.unitType}>
                      <option value="">-- Pilih Kubikasi --</option>
                      {kubikasiOptions.map(k => (
                        <option key={k} value={k}>{k}</option>
                      ))}
                    </select>
                  ) : (
                    <input className="form-input" placeholder="Pilih unit dulu" disabled style={{ opacity: 0.5 }} />
                  )}
                  {form.unitType && (
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3, display: 'block' }}>
                      Kapasitas {form.unitType}
                    </span>
                  )}
                </div>

                {/* Tonase (free input) */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: 11 }}>Tonase / Berat (Freetaks)</label>
                  <input className="form-input" placeholder="misal: 10 Ton / 8.000 Kg"
                    value={form.tonase}
                    onChange={e => setForm(f => ({ ...f, tonase: e.target.value }))} />
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3, display: 'block' }}>
                    Input bebas (freetaks)
                  </span>
                </div>
              </div>

              {/* Unit info summary */}
              {form.unitType && (
                <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <span className="badge" style={{ background: 'var(--color-primary-dim)', color: 'var(--color-primary)', fontSize: 11 }}>
                    🚛 {form.unitType}
                  </span>
                  {form.kubikasi && (
                    <span className="badge badge-active" style={{ fontSize: 11 }}>
                      📦 {form.kubikasi}
                    </span>
                  )}
                  {form.tonase && (
                    <span className="badge badge-done" style={{ fontSize: 11 }}>
                      ⚖️ {form.tonase}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Tipe Pembayaran (Term of Payment) Selector */}
            <div style={{ marginBottom: 16, background: 'var(--color-bg-base)', padding: '14px 16px', borderRadius: 10, border: '1px solid var(--color-border)' }}>
              <label className="form-label" style={{ color: 'var(--color-primary)', fontWeight: 700, marginBottom: 8, display: 'block' }}>
                💳 Tipe Pembayaran (Term of Payment) *
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
                {[
                  { key: '70:30', label: '70% : 30%', desc: 'DP 70% awal + Pelunasan 30%' },
                  { key: 'TOP 14 Hari', label: 'TOP 14 Hari', desc: 'Invoice setelah Delivered (14 hr)' },
                  { key: 'TOP 21 Hari', label: 'TOP 21 Hari', desc: 'Invoice setelah Delivered (21 hr)' },
                  { key: 'TOP 30 Hari', label: 'TOP 30 Hari', desc: 'Invoice setelah Delivered (30 hr)' },
                  { key: 'TOP 45 Hari', label: 'TOP 45 Hari', desc: 'Invoice setelah Delivered (45 hr)' },
                ].map(p => (
                  <div
                    key={p.key}
                    onClick={() => setForm(f => ({ ...f, paymentType: p.key }))}
                    style={{
                      padding: '10px 12px', borderRadius: 8, cursor: 'pointer', textAlign: 'center',
                      background: form.paymentType === p.key ? 'var(--color-primary-dim)' : 'var(--color-bg-card)',
                      border: `1.5px solid ${form.paymentType === p.key ? 'var(--color-primary)' : 'var(--color-border)'}`,
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 700, color: form.paymentType === p.key ? 'var(--color-primary)' : 'var(--text-primary)' }}>
                      {p.label}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{p.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Schedule Fields: Pickup Date, ETD, ETA */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16, background: 'var(--color-bg-base)', padding: '12px 14px', borderRadius: 8, border: '1px solid var(--color-border)' }}>
              <div>
                <label className="form-label" style={{ fontSize: 11 }}>📅 Tanggal Pickup *</label>
                <input type="date" className="form-input" value={form.pickupDate}
                  onChange={e => setForm(f => ({ ...f, pickupDate: e.target.value, date: e.target.value }))} />
              </div>
              <div>
                <label className="form-label" style={{ fontSize: 11 }}>🛫 Tanggal ETD (Keberangkatan)</label>
                <input type="date" className="form-input" value={form.etdDate}
                  onChange={e => setForm(f => ({ ...f, etdDate: e.target.value }))} />
              </div>
              <div>
                <label className="form-label" style={{ fontSize: 11 }}>🛬 Tanggal ETA (Estimasi Tiba)</label>
                <input type="date" className="form-input" value={form.etaDate}
                  onChange={e => setForm(f => ({ ...f, etaDate: e.target.value }))} />
              </div>
            </div>

            {/* Rincian Komponen Biaya Box */}
            <div style={{ background: 'var(--color-bg-base)', padding: '16px 18px', borderRadius: 10, border: '1px solid var(--color-border)', marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-primary)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Calculator size={15} /> Rincian Komponen Biaya Order & Harga Buying
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label className="form-label" style={{ fontSize: 11 }}>Tarif Utama / Selling Rate (Rp) *</label>
                  <input type="number" className="form-input" placeholder="misal: 5.000.000"
                    value={form.baseFreight}
                    onChange={e => setForm(f => ({ ...f, baseFreight: e.target.value }))} />
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: 11, color: 'var(--color-primary)', fontWeight: 600 }}>Harga Buying Vendor / Modal (Rp)</label>
                  <input type="number" className="form-input" placeholder="misal: 4.200.000"
                    value={form.buyingPrice}
                    onChange={e => setForm(f => ({ ...f, buyingPrice: e.target.value }))} />
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <label className="form-label" style={{ fontSize: 11, margin: 0 }}>PPN (1.1%)</label>
                    <label style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', color: 'var(--color-primary)' }}>
                      <input type="checkbox" checked={form.includePPN}
                        onChange={e => setForm(f => ({ ...f, includePPN: e.target.checked }))} />
                      1.1% Auto
                    </label>
                  </div>
                  <input type="number" className="form-input" placeholder={form.includePPN ? `PPN 1.1%: ${formatRupiah(ppnVal)}` : "Nominal PPN (Rp)"}
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
              <div style={{ background: 'linear-gradient(135deg, rgba(61,122,122,0.1), rgba(34,197,94,0.1))', borderRadius: 10, padding: '14px 18px', marginBottom: 16, border: '1px solid var(--color-primary)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>TOTAL SELLING (KLIEN)</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>{formatRupiah(calculatedTotal)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>HARGA BUYING (VENDOR)</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-primary)' }}>{formatRupiah(buyingVal)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>EST. MARGIN PROFIT</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: estMargin >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                      {formatRupiah(estMargin)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>INVOICE DP (70%)</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-secondary)' }}>{formatRupiah(dp)}</div>
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
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, padding: '12px 14px', background: 'var(--color-primary-dim)', borderRadius: 10, border: '1px solid rgba(79,110,247,0.2)' }}>
                <div>
                  <label className="form-label" style={{ fontSize: 10 }}>Provinsi Asal *</label>
                  <select className="form-input form-select" value={form.originProvince}
                    onChange={e => setForm(f => ({ ...f, originProvince: e.target.value, originCity: '', originDistrict: '', originStore: '' }))}>
                    <option value="">Pilih Provinsi...</option>
                    {INDONESIA_PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: 10 }}>Kota/Kabupaten Asal *</label>
                  <select className="form-input form-select" value={form.originCity}
                    onChange={e => setForm(f => ({ ...f, originCity: e.target.value, originStore: '' }))}
                    disabled={!form.originProvince}>
                    <option value="">Pilih Kota/Kabupaten...</option>
                    {(INDONESIA_CITIES[form.originProvince] || []).map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: 10 }}>Kecamatan Asal (Freetaks)</label>
                  <input className="form-input" placeholder="Nama Kecamatan Asal" value={form.originDistrict || ''}
                    onChange={e => setForm(f => ({ ...f, originDistrict: e.target.value }))} />
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: 10 }}>Gudang/Toko Asal (Opsional)</label>
                  <input className="form-input" placeholder="Gudang/Toko Asal" value={form.originStore || ''}
                    onChange={e => setForm(f => ({ ...f, originStore: e.target.value }))} />
                </div>
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10, marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>No. Delivery Order</div>
                <div style={{ fontWeight: 700, color: 'var(--color-primary)', fontSize: 12 }}>{form.doNumber || '(Auto)'}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>No. Sales Order</div>
                <div style={{ fontWeight: 600, fontSize: 12 }}>{form.soNumber || '—'}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Klien</div>
                <div style={{ fontWeight: 600, fontSize: 12 }}>{form.clientName}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Tipe Service</div>
                <div><span className="badge" style={{ background: 'var(--color-primary-dim)', color: 'var(--color-primary)', fontSize: 11 }}>{form.serviceType}</span></div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Unit / Armada</div>
                <div style={{ fontWeight: 600, fontSize: 12 }}>{form.unitType || '—'}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Kubikasi & Tonase</div>
                <div style={{ fontSize: 12 }}>
                  {form.kubikasi && <span className="badge badge-active" style={{ fontSize: 10, marginRight: 4 }}>{form.kubikasi}</span>}
                  {form.tonase && <span style={{ fontWeight: 600 }}>{form.tonase}</span>}
                  {!form.kubikasi && !form.tonase && '—'}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 20, background: 'var(--color-bg-base)', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--color-border)' }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>📅 Tanggal Pickup</div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{form.pickupDate || form.date}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>🛫 Tanggal ETD</div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{form.etdDate || '—'}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>🛬 Tanggal ETA</div>
                <div style={{ fontWeight: 600, fontSize: 13, color: form.etaDate ? 'var(--color-primary)' : 'var(--text-muted)' }}>{form.etaDate || '—'}</div>
              </div>
            </div>

            {/* Breakdown Table */}
            <div style={{ background: 'var(--color-bg-base)', borderRadius: 10, padding: '14px 16px', marginBottom: 20, border: '1px solid var(--color-border)' }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 10 }}>Rincian Biaya Selling, Buying & Profit Margin</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Tarif Utama Freight (Selling)</span>
                  <span style={{ fontWeight: 600 }}>{formatRupiah(baseVal)}</span>
                </div>
                {buyingVal > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-primary)' }}>
                    <span>Harga Buying Vendor (Biaya Modal)</span>
                    <span style={{ fontWeight: 600 }}>{formatRupiah(buyingVal)}</span>
                  </div>
                )}
                {buyingVal > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: estMargin >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                    <span>Estimasi Profit Margin</span>
                    <span style={{ fontWeight: 700 }}>{formatRupiah(estMargin)}</span>
                  </div>
                )}
                {ppnVal > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-primary)' }}>
                    <span>PPN (1.1%)</span>
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
            <button className="btn btn-success btn-lg" onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Memproses...' : '✅ Simpan & Terbitkan DO'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
