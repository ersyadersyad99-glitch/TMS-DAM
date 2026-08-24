import { useState, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
import {
  Upload, Download, FileSpreadsheet, CheckCircle, XCircle,
  AlertTriangle, ChevronRight, Loader2, RotateCcw, FileDown,
  Users, MapPin, CreditCard, Package
} from 'lucide-react';
import { useClientStore } from '../../store/index.js';
import { getActiveTenantId } from '../../config/tenants';
import { API_BASE_URL } from '../../services/api';


// ─── Constants ─────────────────────────────────────────────────────────────
const VALID_SERVICES  = ['FTL', 'LTL', 'FCL', 'LCL', 'AIR FREIGHT'];
const VALID_PAYMENTS  = ['70:30', 'TOP 14 Hari', 'TOP 21 Hari', 'TOP 30 Hari', 'TOP 45 Hari'];
const UNIT_TYPES      = ['CDE Std', 'CDD Std', 'CDDL', 'FUSO Std', 'FUSO Long', 'Tronton Std', 'Wingbox', 'Container 1x20', 'Container 1x40'];


const TEMPLATE_COLUMNS = [
  'No. DO', 'Tanggal Pickup', 'Tipe Layanan', 'Nama Klien', 'No. SO (Referensi)',
  'Jenis Armada', 'Kubikasi', 'Tonase',
  'Tipe Pembayaran', 'Tarif Selling (Rp)', 'Tarif Buying (Rp)',
  'PPN 1.1%', 'Biaya TKBM (Rp)', 'Biaya Krani (Rp)', 'Biaya Lain (Rp)',
  'Provinsi Asal', 'Kota Asal', 'Kecamatan Asal', 'Gudang / Toko Asal',
  'Tgl ETD', 'Tgl ETA',
  'Provinsi Tujuan', 'Kota Tujuan', 'Kecamatan Tujuan', 'Toko / Gudang Tujuan',
  'PIC Penerima', 'No. Telp PIC', 'Catatan',
];

const REQUIRED_COLUMNS = [
  'Tanggal Pickup', 'Tipe Layanan', 'Nama Klien',
  'Tipe Pembayaran', 'Tarif Selling (Rp)',
  'Provinsi Asal', 'Kota Asal',
  'Provinsi Tujuan', 'Kota Tujuan',
];

// Step definitions
const STEPS = [
  { id: 1, label: 'Download Template', icon: Download },
  { id: 2, label: 'Upload File', icon: Upload },
  { id: 3, label: 'Validasi', icon: CheckCircle },
  { id: 4, label: 'Import', icon: Package },
];

// ─── Helper: format Rupiah ─────────────────────────────────────────────────
function formatRp(num) {
  if (!num && num !== 0) return '-';
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);
}

// ─── Main Component ─────────────────────────────────────────────────────────
export default function BulkBooking() {
  const [step, setStep]           = useState(1);
  const [file, setFile]           = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [validateResult, setValidateResult] = useState(null); // from ?mode=validate
  const [importResult, setImportResult]     = useState(null); // from ?mode=import
  const [error, setError]         = useState('');
  const fileInputRef = useRef(null);
  const { clients } = useClientStore();

  // ── Download template ────────────────────────────────────────────────────
  function handleDownloadTemplate() {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Bulk Booking
    const exampleRow = [
      'DO-2026-001', '2026-08-20', 'FTL', 'PT Sany Heavy Indonesia', 'SO-2026-001',
      'FUSO Long', '45 CBM', '13 ton',
      '70:30', 6500000, 5000000,
      'N', 0, 0, 0,
      'DKI Jakarta', 'Jakarta Timur', 'Cakung', 'WH SHII Jakarta',
      '2026-08-21', '2026-08-25',
      'Jawa Barat', 'Bekasi', 'Tambun Selatan', 'PT Starwagen Bekasi',
      'Budi Santoso', '08123456789', 'Fragile - handle with care',
    ];

    const ws1 = XLSX.utils.aoa_to_sheet([TEMPLATE_COLUMNS, exampleRow]);


    // Style header row — bold
    const headerRange = XLSX.utils.decode_range(ws1['!ref'] || 'A1');
    for (let c = headerRange.s.c; c <= headerRange.e.c; c++) {
      const cellRef = XLSX.utils.encode_cell({ r: 0, c });
      if (!ws1[cellRef]) ws1[cellRef] = {};
      ws1[cellRef].s = { font: { bold: true } };
    }

    // Set column widths
    ws1['!cols'] = TEMPLATE_COLUMNS.map(() => ({ wch: 22 }));
    XLSX.utils.book_append_sheet(wb, ws1, 'Bulk Booking');

    // Sheet 2: Instructions
    const instructions = [
      ['TMSF BULK BOOKING — PETUNJUK PENGISIAN'],
      [''],
      ['CARA PENGISIAN:'],
      ['1. Isi data di sheet "Bulk Booking" mulai dari baris ke-2 (baris pertama adalah header).'],
      ['2. Satu baris = satu Delivery Order dengan SATU titik tujuan.'],
      ['3. Multi-drop: Jika satu order punya banyak tujuan, isi baris terpisah dengan No. SO yang SAMA.'],
      ['   Sistem akan menggabungkan baris dengan No. SO yang sama menjadi satu order dengan banyak drop.'],
      [''],
      ['FORMAT WAJIB:'],
      ['- Tanggal Pickup, Tgl ETD, Tgl ETA: Format YYYY-MM-DD (contoh: 2026-08-20)'],
      ['- Tarif Selling, Tarif Buying, Biaya: Angka bulat tanpa titik/koma (contoh: 6500000)'],
      ['- PPN 1.1%: Isi Y (ya) atau N (tidak)'],
      [''],
      ['TIPE LAYANAN yang Valid:'],
      ...VALID_SERVICES.map(s => [`   - ${s}`]),
      [''],
      ['TIPE PEMBAYARAN yang Valid:'],
      ...VALID_PAYMENTS.map(p => [`   - ${p}`]),
      [''],
      ['KOLOM WAJIB (tidak boleh kosong):'],
      ...REQUIRED_COLUMNS.map(c => [`   * ${c}`]),
      [''],
      ['BATAS UPLOAD: Maksimal 2000 baris per file'],
      [''],
      ['MULTI-DROP EXAMPLE:'],
      ['Tanggal Pickup | Nama Klien  | No. SO   | Provinsi Tujuan | Kota Tujuan'],
      ['2026-08-20     | PT Sany     | SO-001   | Jawa Barat      | Bekasi'],
      ['2026-08-20     | PT Sany     | SO-001   | Jawa Timur      | Surabaya'],
      ['(Kedua baris di atas akan menjadi 1 order dengan 2 drop point)'],
    ];
    const ws2 = XLSX.utils.aoa_to_sheet(instructions);
    ws2['!cols'] = [{ wch: 80 }];
    XLSX.utils.book_append_sheet(wb, ws2, 'Petunjuk Pengisian');

    // Sheet 3: Master Reference — clients
    const clientData = [['Nama Klien (copy persis ke sheet Bulk Booking)']];
    (clients || []).filter(c => c.status === 'active').forEach(c => clientData.push([c.name]));
    const ws3 = XLSX.utils.aoa_to_sheet(clientData);
    ws3['!cols'] = [{ wch: 40 }];
    XLSX.utils.book_append_sheet(wb, ws3, 'Referensi Klien');

    // Sheet 4: Service & Payment Reference
    const refData = [
      ['Tipe Layanan', 'Tipe Pembayaran', 'Jenis Armada'],
      ...Array.from({ length: Math.max(VALID_SERVICES.length, VALID_PAYMENTS.length, UNIT_TYPES.length) }).map((_, i) => [
        VALID_SERVICES[i] || '', VALID_PAYMENTS[i] || '', UNIT_TYPES[i] || '',
      ]),
    ];
    const ws4 = XLSX.utils.aoa_to_sheet(refData);
    ws4['!cols'] = [{ wch: 20 }, { wch: 20 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, ws4, 'Referensi Layanan');

    XLSX.writeFile(wb, 'TMSF_Bulk_Booking_Template.xlsx');
  }

  // ── File handling ────────────────────────────────────────────────────────
  function handleFileSelect(selectedFile) {
    setError('');
    setValidateResult(null);
    setImportResult(null);

    if (!selectedFile) return;

    const ext = selectedFile.name.split('.').pop()?.toLowerCase();
    if (!['xlsx', 'xls'].includes(ext)) {
      setError('Hanya file Excel (.xlsx / .xls) yang diperbolehkan');
      return;
    }
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('Ukuran file maksimal 10 MB');
      return;
    }

    setFile(selectedFile);
    setStep(2);
  }

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) handleFileSelect(droppedFile);
  }, [clients]);

  // ── Validate (mode=validate) ─────────────────────────────────────────────
  async function handleValidate() {
    if (!file) return;
    setIsLoading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${API_BASE_URL}/orders/bulk?mode=validate`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'X-Tenant': getActiveTenantId() },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Validasi gagal');
      setValidateResult(data);
      setStep(3);
    } catch (err) {
      setError(err.message || 'Terjadi kesalahan saat validasi');
    } finally {
      setIsLoading(false);
    }
  }

  // ── Import (mode=import) ─────────────────────────────────────────────────
  async function handleImport() {
    if (!file) return;
    setIsLoading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${API_BASE_URL}/orders/bulk?mode=import`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'X-Tenant': getActiveTenantId() },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Import gagal');
      setImportResult(data);
      setStep(4);

      // Auto-refresh order store
      window.dispatchEvent(new CustomEvent('tms_state_updated'));
    } catch (err) {
      setError(err.message || 'Terjadi kesalahan saat import');
    } finally {
      setIsLoading(false);
    }
  }

  // ── Download error report ────────────────────────────────────────────────
  function downloadErrorReport(source) {
    const errors = source?.errors || [];
    if (errors.length === 0) return;
    const rows = [['No. Baris', 'No. SO', 'Pesan Error']];
    errors.forEach(e => {
      rows.push([e.rowNum, e.soNumber || '-', e.errors?.join('; ')]);
    });
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 10 }, { wch: 20 }, { wch: 60 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Error Report');
    XLSX.writeFile(wb, 'TMSF_Bulk_Error_Report.xlsx');
  }

  // ── Download success report ──────────────────────────────────────────────
  function downloadSuccessReport() {
    if (!importResult) return;
    const rows = [['No. DO', 'No. SO', 'Nama Klien', 'Kota Tujuan']];
    (importResult.success || []).forEach(s => {
      rows.push([s.doId, s.soNumber || '-', s.clientName, s.kotaTujuan]);
    });
    if (importResult.failed?.length > 0) {
      rows.push([]);
      rows.push(['=== BARIS GAGAL ===']);
      rows.push(['No. Baris', 'No. SO', 'Nama Klien', 'Error']);
      importResult.failed.forEach(f => {
        rows.push([f.rowNum, f.soNumber || '-', f.clientName, f.errors?.join('; ')]);
      });
    }
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 16 }, { wch: 20 }, { wch: 30 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Import Result');
    XLSX.writeFile(wb, 'TMSF_Bulk_Import_Result.xlsx');
  }

  // ── Reset ────────────────────────────────────────────────────────────────
  function handleReset() {
    setStep(1);
    setFile(null);
    setValidateResult(null);
    setImportResult(null);
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  // ─── Render ─────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', padding: '32px 24px', background: 'var(--color-bg, #0f172a)', color: 'var(--color-text, #f1f5f9)' }}>

      {/* Page Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, background: 'linear-gradient(135deg, #6366f1, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Bulk Booking
        </h1>
        <p style={{ margin: '8px 0 0', color: '#94a3b8', fontSize: 15 }}>
          Import banyak Delivery Order sekaligus dari file Excel
        </p>
      </div>

      {/* Step Progress Bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 40 }}>
        {STEPS.map((s, idx) => {
          const Icon = s.icon;
          const isActive   = step === s.id;
          const isComplete = step > s.id;
          return (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', flex: idx < STEPS.length - 1 ? 1 : 'unset' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 16px', borderRadius: 999,
                background: isActive ? 'linear-gradient(135deg,#6366f1,#a78bfa)' : isComplete ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${isActive ? 'transparent' : isComplete ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.08)'}`,
                color: isActive ? '#fff' : isComplete ? '#a78bfa' : '#475569',
                fontWeight: isActive ? 700 : 500, fontSize: 14,
                transition: 'all 0.3s ease',
              }}>
                {isComplete ? <CheckCircle size={16} /> : <Icon size={16} />}
                <span style={{ display: window.innerWidth < 600 ? 'none' : 'inline' }}>{s.label}</span>
              </div>
              {idx < STEPS.length - 1 && (
                <div style={{ flex: 1, height: 2, background: step > s.id ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.06)', margin: '0 8px' }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Error Banner */}
      {error && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '14px 18px', borderRadius: 12, marginBottom: 24,
          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
          color: '#f87171',
        }}>
          <XCircle size={18} />
          <span style={{ fontSize: 14 }}>{error}</span>
        </div>
      )}

      {/* ── STEP 1: Download Template ──────────────────────────────────────── */}
      {step === 1 && (
        <Card>
          <SectionTitle icon={<Download size={20} />}>Download Template Excel</SectionTitle>
          <p style={{ color: '#94a3b8', fontSize: 14, marginBottom: 24 }}>
            Download template Excel resmi TMSF, isi data Delivery Order, lalu upload kembali.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
            {[
              { icon: <FileSpreadsheet size={22} color="#6366f1" />, title: '27 Kolom', desc: 'Sesuai form Order TMSF' },
              { icon: <Users size={22} color="#22d3ee" />, title: 'Master Data', desc: 'Klien & referensi tersedia' },
              { icon: <MapPin size={22} color="#a78bfa" />, title: 'Multi-Drop', desc: 'Isi No. SO sama = 1 order' },
              { icon: <CreditCard size={22} color="#4ade80" />, title: '500+ Baris', desc: 'Maks 2000 per upload' },
            ].map((item, i) => (
              <div key={i} style={{ padding: '16px 20px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: 14 }}>
                {item.icon}
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{item.title}</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button
              id="btn-download-template"
              onClick={handleDownloadTemplate}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '12px 24px', borderRadius: 10, border: 'none', cursor: 'pointer',
                background: 'linear-gradient(135deg,#6366f1,#a78bfa)', color: '#fff',
                fontWeight: 700, fontSize: 15, transition: 'opacity 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              <Download size={18} /> Download Template
            </button>
            <button
              id="btn-go-upload"
              onClick={() => setStep(2)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '12px 24px', borderRadius: 10, cursor: 'pointer',
                background: 'rgba(255,255,255,0.06)', color: '#94a3b8',
                border: '1px solid rgba(255,255,255,0.1)', fontWeight: 600, fontSize: 15,
                transition: 'background 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
            >
              Sudah punya file? Upload <ChevronRight size={16} />
            </button>
          </div>
        </Card>
      )}

      {/* ── STEP 2: Upload File ────────────────────────────────────────────── */}
      {step === 2 && (
        <Card>
          <SectionTitle icon={<Upload size={20} />}>Upload File Excel</SectionTitle>
          <p style={{ color: '#94a3b8', fontSize: 14, marginBottom: 24 }}>
            Upload file Excel yang sudah diisi. Format: .xlsx — Maks 10 MB — Maks 2000 baris.
          </p>

          {/* Drag & Drop Zone */}
          <div
            id="dropzone"
            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${isDragging ? '#6366f1' : file ? '#4ade80' : 'rgba(255,255,255,0.15)'}`,
              borderRadius: 16, padding: '48px 24px', textAlign: 'center', cursor: 'pointer',
              background: isDragging ? 'rgba(99,102,241,0.08)' : file ? 'rgba(74,222,128,0.05)' : 'rgba(255,255,255,0.02)',
              transition: 'all 0.2s ease',
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              style={{ display: 'none' }}
              onChange={e => handleFileSelect(e.target.files?.[0])}
            />
            {file ? (
              <div>
                <FileSpreadsheet size={48} color="#4ade80" style={{ margin: '0 auto 16px' }} />
                <div style={{ fontWeight: 700, fontSize: 17, color: '#4ade80' }}>{file.name}</div>
                <div style={{ color: '#94a3b8', fontSize: 13, marginTop: 6 }}>
                  {(file.size / 1024).toFixed(1)} KB · Klik untuk ganti file
                </div>
              </div>
            ) : (
              <div>
                <Upload size={48} color="#6366f1" style={{ margin: '0 auto 16px' }} />
                <div style={{ fontWeight: 700, fontSize: 17 }}>Drag & drop file Excel di sini</div>
                <div style={{ color: '#94a3b8', fontSize: 13, marginTop: 6 }}>atau klik untuk browse file</div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
            <button
              onClick={() => setStep(1)}
              style={{ padding: '12px 20px', borderRadius: 10, cursor: 'pointer', background: 'transparent', color: '#64748b', border: '1px solid rgba(255,255,255,0.08)', fontWeight: 600, fontSize: 14 }}
            >
              ← Kembali
            </button>
            <button
              id="btn-validate"
              onClick={handleValidate}
              disabled={!file || isLoading}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '12px 24px', borderRadius: 10, border: 'none', cursor: file && !isLoading ? 'pointer' : 'not-allowed',
                background: file && !isLoading ? 'linear-gradient(135deg,#6366f1,#a78bfa)' : 'rgba(255,255,255,0.06)',
                color: file && !isLoading ? '#fff' : '#475569', fontWeight: 700, fontSize: 15,
              }}
            >
              {isLoading ? <><Loader2 size={17} style={{ animation: 'spin 1s linear infinite' }} /> Memvalidasi...</> : <><CheckCircle size={17} /> Validasi File</>}
            </button>
          </div>
        </Card>
      )}

      {/* ── STEP 3: Validation Result & Confirm Import ─────────────────────── */}
      {step === 3 && validateResult && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16 }}>
            <StatCard label="Total Baris" value={validateResult.totalRows} color="#6366f1" />
            <StatCard label="Baris Valid" value={validateResult.validCount} color="#4ade80" />
            <StatCard label="Baris Error" value={validateResult.errorCount} color="#f87171" />
            <StatCard label="Siap Import" value={validateResult.validCount} color="#22d3ee" />
          </div>

          {/* Validation Card */}
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <SectionTitle icon={<CheckCircle size={20} />}>Hasil Validasi</SectionTitle>
              {validateResult.errorCount > 0 && (
                <button
                  id="btn-download-errors"
                  onClick={() => downloadErrorReport(validateResult)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
                    borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600,
                    background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171',
                  }}
                >
                  <FileDown size={14} /> Download Error Report
                </button>
              )}
            </div>

            {validateResult.errorCount === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '20px', background: 'rgba(74,222,128,0.08)', borderRadius: 12, border: '1px solid rgba(74,222,128,0.2)' }}>
                <CheckCircle size={24} color="#4ade80" />
                <div>
                  <div style={{ fontWeight: 700, color: '#4ade80', fontSize: 16 }}>Semua baris valid!</div>
                  <div style={{ color: '#86efac', fontSize: 13 }}>Tidak ada error. {validateResult.validCount} order siap diimport.</div>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, padding: '12px 16px', background: 'rgba(251,191,36,0.08)', borderRadius: 10, border: '1px solid rgba(251,191,36,0.2)' }}>
                  <AlertTriangle size={18} color="#fbbf24" />
                  <span style={{ color: '#fcd34d', fontSize: 14, fontWeight: 600 }}>
                    {validateResult.errorCount} baris bermasalah. Hanya {validateResult.validCount} baris valid yang akan diimport.
                  </span>
                </div>
                <div style={{ maxHeight: 320, overflowY: 'auto', borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: 'rgba(255,255,255,0.04)' }}>
                        <th style={{ padding: '10px 14px', textAlign: 'left', color: '#64748b', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>Baris</th>
                        <th style={{ padding: '10px 14px', textAlign: 'left', color: '#64748b', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>No. SO</th>
                        <th style={{ padding: '10px 14px', textAlign: 'left', color: '#64748b', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>Error</th>
                      </tr>
                    </thead>
                    <tbody>
                      {validateResult.errors?.map((e, i) => (
                        <tr key={i} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                          <td style={{ padding: '10px 14px', color: '#f87171', fontWeight: 700 }}>#{e.rowNum}</td>
                          <td style={{ padding: '10px 14px', color: '#94a3b8' }}>{e.soNumber || '-'}</td>
                          <td style={{ padding: '10px 14px', color: '#fca5a5' }}>{e.errors?.join(' · ')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </Card>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={() => setStep(2)}
              style={{ padding: '12px 20px', borderRadius: 10, cursor: 'pointer', background: 'transparent', color: '#64748b', border: '1px solid rgba(255,255,255,0.08)', fontWeight: 600, fontSize: 14 }}
            >
              ← Upload Ulang
            </button>
            <button
              id="btn-confirm-import"
              onClick={handleImport}
              disabled={validateResult.validCount === 0 || isLoading}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '12px 28px', borderRadius: 10, border: 'none',
                cursor: validateResult.validCount > 0 && !isLoading ? 'pointer' : 'not-allowed',
                background: validateResult.validCount > 0 ? 'linear-gradient(135deg,#6366f1,#a78bfa)' : 'rgba(255,255,255,0.06)',
                color: validateResult.validCount > 0 ? '#fff' : '#475569', fontWeight: 700, fontSize: 15,
              }}
            >
              {isLoading
                ? <><Loader2 size={17} style={{ animation: 'spin 1s linear infinite' }} /> Mengimport...</>
                : <><Package size={17} /> Import {validateResult.validCount} Order</>}
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 4: Import Result ──────────────────────────────────────────── */}
      {step === 4 && importResult && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Header Banner */}
          <div style={{
            padding: '24px 28px', borderRadius: 16,
            background: importResult.successCount > 0 ? 'rgba(74,222,128,0.08)' : 'rgba(239,68,68,0.08)',
            border: `1px solid ${importResult.successCount > 0 ? 'rgba(74,222,128,0.2)' : 'rgba(239,68,68,0.2)'}`,
            display: 'flex', alignItems: 'center', gap: 16,
          }}>
            <CheckCircle size={36} color={importResult.successCount > 0 ? '#4ade80' : '#f87171'} />
            <div>
              <div style={{ fontWeight: 800, fontSize: 20, color: importResult.successCount > 0 ? '#4ade80' : '#f87171' }}>
                Import Selesai
              </div>
              <div style={{ color: '#94a3b8', fontSize: 14, marginTop: 4 }}>
                {importResult.successCount} order berhasil dibuat · {importResult.failedCount} gagal
              </div>
            </div>
          </div>

          {/* Stat Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16 }}>
            <StatCard label="Total Diproses" value={importResult.totalRows} color="#6366f1" />
            <StatCard label="Berhasil Dibuat" value={importResult.successCount} color="#4ade80" />
            <StatCard label="Gagal" value={importResult.failedCount} color="#f87171" />
          </div>

          {/* Success table */}
          {importResult.success?.length > 0 && (
            <Card>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <SectionTitle icon={<CheckCircle size={18} />}>Order Berhasil Dibuat</SectionTitle>
                <button
                  id="btn-download-result"
                  onClick={downloadSuccessReport}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)', color: '#4ade80' }}
                >
                  <FileDown size={14} /> Download Hasil
                </button>
              </div>
              <div style={{ maxHeight: 360, overflowY: 'auto', borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.04)' }}>
                      {['No. DO', 'No. SO', 'Nama Klien', 'Kota Tujuan'].map(h => (
                        <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: '#64748b', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {importResult.success.map((s, i) => (
                      <tr key={i} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                        <td style={{ padding: '10px 14px', color: '#a78bfa', fontWeight: 700 }}>{s.doId}</td>
                        <td style={{ padding: '10px 14px', color: '#94a3b8' }}>{s.soNumber || '-'}</td>
                        <td style={{ padding: '10px 14px' }}>{s.clientName}</td>
                        <td style={{ padding: '10px 14px', color: '#94a3b8' }}>{s.kotaTujuan}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Failed table */}
          {importResult.failed?.length > 0 && (
            <Card>
              <SectionTitle icon={<XCircle size={18} />}>Order Gagal Dibuat</SectionTitle>
              <div style={{ maxHeight: 280, overflowY: 'auto', marginTop: 12, borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.04)' }}>
                      {['Baris', 'No. SO', 'Nama Klien', 'Error'].map(h => (
                        <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: '#64748b', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {importResult.failed.map((f, i) => (
                      <tr key={i} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                        <td style={{ padding: '10px 14px', color: '#f87171', fontWeight: 700 }}>#{f.rowNum}</td>
                        <td style={{ padding: '10px 14px', color: '#94a3b8' }}>{f.soNumber || '-'}</td>
                        <td style={{ padding: '10px 14px' }}>{f.clientName}</td>
                        <td style={{ padding: '10px 14px', color: '#fca5a5' }}>{f.errors?.join(' · ')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              id="btn-import-again"
              onClick={handleReset}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 24px', borderRadius: 10, cursor: 'pointer', background: 'linear-gradient(135deg,#6366f1,#a78bfa)', color: '#fff', fontWeight: 700, fontSize: 15, border: 'none' }}
            >
              <RotateCcw size={16} /> Import Lagi
            </button>
            <a
              href="/transport/orders"
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 24px', borderRadius: 10, cursor: 'pointer', background: 'rgba(255,255,255,0.06)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.08)', fontWeight: 600, fontSize: 15, textDecoration: 'none' }}
            >
              Lihat Daftar Order →
            </a>
          </div>
        </div>
      )}

      {/* CSS for spinner animation */}
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────
function Card({ children }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 16, padding: '28px 28px',
    }}>
      {children}
    </div>
  );
}

function SectionTitle({ icon, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, fontWeight: 700, fontSize: 16 }}>
      <span style={{ color: '#6366f1' }}>{icon}</span>
      {children}
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div style={{
      padding: '20px 22px', borderRadius: 14,
      background: 'rgba(255,255,255,0.04)', border: `1px solid ${color}33`,
    }}>
      <div style={{ fontSize: 32, fontWeight: 800, color }}>{value?.toLocaleString()}</div>
      <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>{label}</div>
    </div>
  );
}
