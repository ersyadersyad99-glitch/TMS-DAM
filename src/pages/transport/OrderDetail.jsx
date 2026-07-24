import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Upload, CheckCircle, Clock, AlertTriangle, FileText, X, Printer, Download } from 'lucide-react';
import { useOrderStore, useInvoiceStore, useToastStore } from '../../store';
import {
  formatRupiah, formatDate,
  statusLabels, statusBadgeClass,
  paymentLabels, paymentBadgeClass,
  allPODUploaded, getDropProgress
} from '../../utils/helpers';

function PODUploadCard({ drop, onUpload }) {
  const [dragging, setDragging] = useState(false);

  const handleFile = (file) => {
    if (file && file.type === 'application/pdf') {
      onUpload(drop.id, file.name);
    }
  };

  return (
    <div style={{
      background: 'var(--color-bg-base)', border: `1px solid ${drop.pod ? 'rgba(34,197,94,0.3)' : 'var(--color-border)'}`,
      borderRadius: 10, padding: '14px 16px',
      transition: 'all 0.2s',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <div style={{
              width: 24, height: 24, borderRadius: '50%',
              background: drop.pod ? 'var(--color-success-dim)' : 'var(--color-bg-input)',
              color: drop.pod ? 'var(--color-success)' : 'var(--text-muted)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700, flexShrink: 0,
              border: `1px solid ${drop.pod ? 'rgba(34,197,94,0.3)' : 'var(--color-border-light)'}`,
            }}>
              {drop.pod ? '✓' : drop.seq}
            </div>
            <span style={{ fontWeight: 600, fontSize: 14 }}>{drop.store || drop.city}</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', paddingLeft: 32 }}>
            {drop.city}, {drop.province}
          </div>
        </div>
        {drop.pod && (
          <span className="badge badge-done">POD ✓</span>
        )}
      </div>

      {drop.pod ? (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
          background: 'var(--color-success-dim)', borderRadius: 6, fontSize: 12,
        }}>
          <FileText size={14} color="var(--color-success)" />
          <span style={{ color: 'var(--color-success)', flex: 1 }}>{drop.pod}</span>
          <button className="btn-ghost" style={{ color: 'var(--text-muted)', padding: 2 }}
            onClick={() => onUpload(drop.id, null)}>
            <X size={12} />
          </button>
        </div>
      ) : (
        <label
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}
          className={`upload-zone ${dragging ? 'drag-over' : ''}`}
          style={{ cursor: 'pointer', display: 'block' }}
        >
          <input type="file" accept=".pdf" hidden
            onChange={e => handleFile(e.target.files[0])} />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <Upload size={20} color="var(--text-muted)" />
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              Klik atau drag & drop Surat Jalan (PDF)
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Format: PDF</div>
          </div>
        </label>
      )}
    </div>
  );
}

function SuratJalanModal({ order, onClose }) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" style={{ maxWidth: 720, background: '#ffffff', color: '#000000', padding: 32 }} onClick={e => e.stopPropagation()}>
        <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottom: '1px solid #eee', paddingBottom: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>Pratinjau Cetak Surat Jalan (PDF)</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" onClick={handlePrint}>
              <Printer size={14} /> Cetak / Save PDF
            </button>
            <button className="btn btn-secondary" onClick={onClose}>Tutup</button>
          </div>
        </div>

        {/* Printable Surat Jalan Document */}
        <div className="printable-doc" style={{ fontFamily: 'sans-serif', color: '#000000', lineHeight: 1.5 }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '3px double #000', paddingBottom: 14, marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 24, fontWeight: 'bold', letterSpacing: 1 }}>PT. LOGISTIK TMS INDONESIA</div>
              <div style={{ fontSize: 11, color: '#444' }}>Jl. Jend. Sudirman No. 102, Jakarta Selatan | Telp: (021) 555-8899</div>
              <div style={{ fontSize: 11, color: '#444' }}>Email: ops@tms-logistics.co.id | Web: www.tms-logistics.id</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 18, fontWeight: 'bold', textDecoration: 'underline' }}>SURAT JALAN</div>
              <div style={{ fontSize: 13, fontWeight: 'bold', marginTop: 4 }}>No: {order.id}</div>
              <div style={{ fontSize: 11 }}>Tgl: {formatDate(order.date)}</div>
            </div>
          </div>

          {/* Info Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16, fontSize: 11, border: '1px solid #ccc', padding: 12, borderRadius: 4 }}>
            <div>
              <div><strong>Klien / Tagihan:</strong> {order.clientName}</div>
              <div><strong>Tipe Layanan:</strong> {order.serviceType || 'Charter'}</div>
              <div><strong>Catatan:</strong> {order.notes || '—'}</div>
            </div>
            <div>
              <div><strong>Nama Sopir:</strong> {order.driverName || '—'}</div>
              <div><strong>Plat Nomor Armada:</strong> {order.fleetPlate || '—'}</div>
              <div><strong>Asal (Muat):</strong> {order.origin ? `${order.origin.store || order.origin.city} (${order.origin.city})` : '—'}</div>
            </div>
          </div>

          {/* Drop Points Table */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontWeight: 'bold', fontSize: 12, marginBottom: 6 }}>DAFTAR TUJUAN & MUATAN BARANG:</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr style={{ background: '#f0f0f0' }}>
                  <th style={{ border: '1px solid #999', padding: '6px 8px', textAlign: 'center', width: 40 }}>No</th>
                  <th style={{ border: '1px solid #999', padding: '6px 8px', textAlign: 'left' }}>Toko / Lokasi Tujuan</th>
                  <th style={{ border: '1px solid #999', padding: '6px 8px', textAlign: 'left' }}>Kota & Provinsi</th>
                  <th style={{ border: '1px solid #999', padding: '6px 8px', textAlign: 'center', width: 100 }}>Status POD</th>
                </tr>
              </thead>
              <tbody>
                {order.drops && order.drops.map((drop, idx) => (
                  <tr key={drop.id || idx}>
                    <td style={{ border: '1px solid #999', padding: '6px 8px', textAlign: 'center' }}>{idx + 1}</td>
                    <td style={{ border: '1px solid #999', padding: '6px 8px', fontWeight: 'bold' }}>{drop.store || drop.city}</td>
                    <td style={{ border: '1px solid #999', padding: '6px 8px' }}>{drop.city}, {drop.province}</td>
                    <td style={{ border: '1px solid #999', padding: '6px 8px', textAlign: 'center' }}>{drop.pod ? 'Diterima ✓' : 'Dalam Proses'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Signatures */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, textAlign: 'center', marginTop: 40, fontSize: 11 }}>
            <div>
              <div>Pengirim (Dispatcher)</div>
              <div style={{ height: 60 }} />
              <div>( _____________________ )</div>
            </div>
            <div>
              <div>Pengemudi (Sopir)</div>
              <div style={{ height: 60 }} />
              <div>( <strong>{order.driverName || '___________'}</strong> )</div>
            </div>
            <div>
              <div>Penerima Barang</div>
              <div style={{ height: 60 }} />
              <div>( _____________________ )</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { orders, updateDropPOD, closeOrder, markDPPaid } = useOrderStore();
  const { invoices, markPaid, addInvoice } = useInvoiceStore();
  const { addToast } = useToastStore();
  const [confirmClose, setConfirmClose] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);

  const order = orders.find(o => o.id === id);
  if (!order) return (
    <div className="empty-state">
      <div className="empty-state-icon">🔍</div>
      <div className="empty-state-title">Order tidak ditemukan</div>
      <button className="btn btn-secondary" onClick={() => navigate(-1)}>Kembali</button>
    </div>
  );

  const dpInvoice = invoices.find(inv => inv.orderId === id && inv.type === 'dp');
  const finalInvoice = invoices.find(inv => inv.orderId === id && inv.type === 'pelunasan');
  const { done, total, pct } = getDropProgress(order.drops);
  const canClose = allPODUploaded(order.drops) && order.status === 'transit';

  const handleUpload = (dropId, filename) => {
    updateDropPOD(id, dropId, filename);
    if (filename) addToast(`Surat Jalan drop #${dropId} berhasil diupload!`, 'success');
  };

  const handleClose = () => {
    closeOrder(id);
    addInvoice({
      id: `INV-LNS-${id}`,
      orderId: id,
      clientName: order.clientName,
      type: 'pelunasan',
      amount: order.finalAmount,
      date: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
      status: 'unpaid',
    });
    addToast(`Order ${id} ditutup! Invoice Pelunasan 30% diterbitkan.`, 'success');
    setConfirmClose(false);
  };

  const handleMarkDPPaid = () => {
    if (dpInvoice) markPaid(dpInvoice.id);
    markDPPaid(id);
    addToast('DP lunas! Order siap ditugaskan.', 'success');
  };

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}>← Kembali</button>
            <span style={{ color: 'var(--text-muted)' }}>/</span>
          </div>
          <h1 className="page-title">{order.id}</h1>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6 }}>
            <span className={`badge ${statusBadgeClass[order.status]}`}>{statusLabels[order.status]}</span>
            <span className={`badge ${paymentBadgeClass[order.paymentStatus]}`}>{paymentLabels[order.paymentStatus]}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" onClick={() => setShowPrintModal(true)}>
            <Printer size={15} /> Cetak Surat Jalan (PDF)
          </button>
          {order.status === 'menunggu_dp' && (
            <button className="btn btn-success" onClick={handleMarkDPPaid}>
              ✅ Tandai DP Lunas
            </button>
          )}
          {order.status === 'aktif' && !order.driverId && (
            <button className="btn btn-primary" onClick={() => navigate('/transport/assignments')}>
              Tugaskan Sopir & Armada
            </button>
          )}
          {canClose ? (
            <button className="btn btn-success btn-lg" onClick={() => setConfirmClose(true)}>
              🔒 Tutup & Selesaikan Order
            </button>
          ) : order.status === 'transit' && (
            <div className="tooltip-wrap">
              <button className="btn btn-primary btn-lg" disabled>
                🔒 Tutup Order
              </button>
              <div className="tooltip-tip">Selesaikan semua POD terlebih dahulu ({done}/{total})</div>
            </div>
          )}
        </div>
      </div>

      {/* Surat Jalan Modal */}
      {showPrintModal && <SuratJalanModal order={order} onClose={() => setShowPrintModal(false)} />}

      {/* Main layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 16, alignItems: 'start' }}>
        {/* Left Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Info */}
          <div className="card">
            <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 14, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Informasi</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { label: 'Klien', value: order.clientName },
                { label: 'Tipe Service', value: <span className="badge" style={{ background: 'var(--color-primary-dim)', color: 'var(--color-primary)' }}>{order.serviceType || 'Charter'}</span> },
                { label: 'Tanggal', value: formatDate(order.date) },
                { label: 'Sopir', value: order.driverName || <span style={{ color: 'var(--text-muted)' }}>Belum ditugaskan</span> },
                { label: 'Armada', value: order.fleetPlate || <span style={{ color: 'var(--text-muted)' }}>—</span> },
                { label: 'Catatan', value: order.notes || <span style={{ color: 'var(--text-muted)' }}>—</span> },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>{label}</div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Finance */}
          <div className="card">
            <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 14, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Keuangan</h3>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Total Nilai Order</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{formatRupiah(order.totalValue)}</div>
              
              {order.costBreakdown && (
                <div style={{ background: 'var(--color-bg-base)', padding: '10px 12px', borderRadius: 6, border: '1px solid var(--color-border)', marginTop: 8, fontSize: 11 }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>Komponen Biaya:</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Tarif Utama:</span>
                    <span>{formatRupiah(order.costBreakdown.baseFreight)}</span>
                  </div>
                  {order.costBreakdown.ppnFee > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-primary)' }}>
                      <span>PPN:</span>
                      <span>+{formatRupiah(order.costBreakdown.ppnFee)}</span>
                    </div>
                  )}
                  {order.costBreakdown.tkbmFee > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>TKBM:</span>
                      <span>+{formatRupiah(order.costBreakdown.tkbmFee)}</span>
                    </div>
                  )}
                  {order.costBreakdown.kraniFee > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Krani / Tally:</span>
                      <span>+{formatRupiah(order.costBreakdown.kraniFee)}</span>
                    </div>
                  )}
                  {order.costBreakdown.otherFee > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Lainnya:</span>
                      <span>+{formatRupiah(order.costBreakdown.otherFee)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* DP Invoice */}
              <div style={{
                padding: '10px 12px', borderRadius: 8,
                background: dpInvoice?.status === 'paid' ? 'var(--color-success-dim)' : 'var(--color-warning-dim)',
                border: `1px solid ${dpInvoice?.status === 'paid' ? 'rgba(34,197,94,0.2)' : 'rgba(245,158,11,0.2)'}`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                  <span style={{ fontSize: 11, fontWeight: 600 }}>Invoice DP (70%)</span>
                  <span className={`badge ${dpInvoice?.status === 'paid' ? 'badge-done' : 'badge-pending'}`}>
                    {dpInvoice?.status === 'paid' ? 'Lunas' : 'Belum Bayar'}
                  </span>
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: dpInvoice?.status === 'paid' ? 'var(--color-success)' : 'var(--color-warning)' }}>
                  {formatRupiah(order.dpAmount)}
                </div>
                {dpInvoice && (
                  <button className="btn btn-ghost btn-sm" style={{ marginTop: 6, fontSize: 11, padding: 0 }} onClick={() => navigate(`/finance/invoices/${dpInvoice.id}`)}>
                    📄 Lihat & Cetak Invoice DP
                  </button>
                )}
              </div>
              {/* Final Invoice */}
              <div style={{
                padding: '10px 12px', borderRadius: 8,
                background: finalInvoice ? (finalInvoice.status === 'paid' ? 'var(--color-success-dim)' : 'var(--color-warning-dim)') : 'var(--color-bg-input)',
                border: `1px solid ${finalInvoice?.status === 'paid' ? 'rgba(34,197,94,0.2)' : 'var(--color-border)'}`,
                opacity: !finalInvoice ? 0.5 : 1,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                  <span style={{ fontSize: 11, fontWeight: 600 }}>Invoice Pelunasan (30%)</span>
                  {finalInvoice && (
                    <span className={`badge ${finalInvoice.status === 'paid' ? 'badge-done' : 'badge-pending'}`}>
                      {finalInvoice.status === 'paid' ? 'Lunas' : 'Belum Bayar'}
                    </span>
                  )}
                  {!finalInvoice && <span className="badge badge-draft">Belum Terbit</span>}
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: finalInvoice?.status === 'paid' ? 'var(--color-success)' : 'var(--text-secondary)' }}>
                  {formatRupiah(order.finalAmount)}
                </div>
                {finalInvoice ? (
                  <button className="btn btn-ghost btn-sm" style={{ marginTop: 6, fontSize: 11, padding: 0 }} onClick={() => navigate(`/finance/invoices/${finalInvoice.id}`)}>
                    📄 Lihat & Cetak Invoice 30%
                  </button>
                ) : (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Terbit setelah order ditutup</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right — Route Tracker */}
        <div>
          {/* Progress bar */}
          <div className="card" style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Progress Perjalanan</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: pct === 100 ? 'var(--color-success)' : 'var(--color-primary)' }}>
                {done}/{total} Drop Points
              </span>
            </div>
            <div className="progress-bar" style={{ height: 8 }}>
              <div className={`progress-fill ${pct === 100 ? 'success' : ''}`} style={{ width: `${pct}%` }} />
            </div>
          </div>

          {/* Route Timeline + POD */}
          <div className="card">
            <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 16, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Upload Surat Jalan (POD)
            </h3>

            {/* Origin */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 8, alignItems: 'center', padding: '10px 14px', background: 'var(--color-primary-dim)', borderRadius: 8 }}>
              <div style={{ fontSize: 20 }}>📍</div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>Titik Asal (Muat)</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  {order.origin.store || order.origin.city} — {order.origin.city}, {order.origin.province}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
              {order.drops.map((drop, i) => (
                <React.Fragment key={drop.id}>
                  <div style={{ height: 12, width: 2, background: 'var(--color-border)', marginLeft: 20 }} />
                  <PODUploadCard
                    drop={drop}
                    onUpload={order.status === 'transit' ? handleUpload : () => {}}
                  />
                </React.Fragment>
              ))}
            </div>

            {order.status !== 'transit' && order.status !== 'selesai' && (
              <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--color-warning-dim)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 8, fontSize: 12, color: 'var(--color-warning)' }}>
                ⚠️ Upload POD hanya bisa dilakukan setelah order dalam status <strong>Dalam Perjalanan</strong>.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirm Close Modal */}
      {confirmClose && (
        <div className="modal-overlay" onClick={() => setConfirmClose(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ padding: 28 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>Tutup & Selesaikan Order?</h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
              Semua <strong>{total} POD</strong> sudah diupload. Order akan ditutup dan Invoice Pelunasan <strong>{formatRupiah(order.finalAmount)}</strong> akan diterbitkan.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setConfirmClose(false)}>Batal</button>
              <button className="btn btn-success" onClick={handleClose}>Ya, Tutup Order</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
