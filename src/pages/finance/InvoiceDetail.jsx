import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FileText, Download, CheckCircle, Printer } from 'lucide-react';
import { useInvoiceStore, useOrderStore, useToastStore } from '../../store';
import { formatRupiah, formatDate, invoiceStatusLabel, invoiceStatusClass } from '../../utils/helpers';

export default function InvoiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { invoices, markPaid } = useInvoiceStore();
  const { orders } = useOrderStore();
  const { addToast } = useToastStore();

  const invoice = invoices.find(i => i.id === id);
  if (!invoice) return (
    <div className="empty-state">
      <div className="empty-state-icon">🔍</div>
      <div className="empty-state-title">Invoice tidak ditemukan</div>
      <button className="btn btn-secondary" onClick={() => navigate(-1)}>Kembali</button>
    </div>
  );

  const order = orders.find(o => o.id === invoice.orderId);
  const podFiles = order?.drops?.filter(d => d.pod).map(d => d.pod) || [];

  const handlePrintPDF = () => {
    window.print();
  };

  const handleMergePDF = () => {
    addToast(`Menggabungkan ${podFiles.length} Surat Jalan ke Invoice ${id}...`, 'info');
    setTimeout(() => {
      window.print();
      addToast(`PDF berhasil dicetak / digabungkan!`, 'success');
    }, 800);
  };

  const handleMarkPaid = () => {
    markPaid(id);
    if (invoice.type === 'pelunasan') {
      useOrderStore.getState().markOrderLunas(invoice.orderId);
    }
    addToast(`Invoice ${id} ditandai Lunas!`, 'success');
  };

  return (
    <div>
      <div className="page-header no-print">
        <div>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)} style={{ marginBottom: 8 }}>← Kembali</button>
          <h1 className="page-title">{invoice.id}</h1>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6 }}>
            <span className={`badge ${invoice.type === 'dp' ? 'badge-active' : 'badge-done'}`}>
              {invoice.type === 'dp' ? 'Invoice DP (70%)' : 'Invoice Pelunasan (30%)'}
            </span>
            <span className={`badge ${invoiceStatusClass[invoice.status]}`}>{invoiceStatusLabel[invoice.status]}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {invoice.type === 'pelunasan' && podFiles.length > 0 && (
            <button className="btn btn-secondary" onClick={handleMergePDF}>
              <FileText size={14} /> Merge PDF + SJ ({podFiles.length})
            </button>
          )}
          <button className="btn btn-primary" onClick={handlePrintPDF}>
            <Printer size={14} /> Cetak / Save PDF
          </button>
          {invoice.status === 'unpaid' && (
            <button className="btn btn-success" onClick={handleMarkPaid}>
              <CheckCircle size={14} /> Tandai Lunas
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16, alignItems: 'start' }}>
        {/* Printable Invoice Document */}
        <div className="card printable-doc" style={{ background: '#ffffff', color: '#000000', padding: 36, borderRadius: 10 }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '3px double #000', paddingBottom: 16, marginBottom: 24 }}>
            <div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#1e3a8a', marginBottom: 2 }}>PT. LOGISTIK TMS INDONESIA</div>
              <div style={{ fontSize: 11, color: '#444' }}>Transport & Supply Chain Management System</div>
              <div style={{ fontSize: 11, color: '#444', marginTop: 4 }}>Jl. Jend. Sudirman No. 102, Jakarta | Telp: (021) 555-8899</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 22, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1 }}>INVOICE</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#1e3a8a', marginTop: 2 }}>{invoice.id}</div>
              <div style={{ fontSize: 11, color: '#333', marginTop: 4 }}>Diterbitkan: <strong>{formatDate(invoice.date)}</strong></div>
              <div style={{ fontSize: 11, color: '#333' }}>Jatuh Tempo: <strong>{formatDate(invoice.dueDate)}</strong></div>
            </div>
          </div>

          {/* Client & DO Info */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24, padding: 14, border: '1px solid #ddd', borderRadius: 6, background: '#f9fafb' }}>
            <div>
              <div style={{ fontSize: 10, color: '#666', textTransform: 'uppercase', fontWeight: 700, marginBottom: 4 }}>DITAGIHKAN KEPADA</div>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{invoice.clientName}</div>
              <div style={{ fontSize: 12, color: '#444', marginTop: 2 }}>Ref. Delivery Order: <strong>{invoice.orderId}</strong></div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: '#666', textTransform: 'uppercase', fontWeight: 700, marginBottom: 4 }}>TIPE TAGIHAN & PEMBAYARAN</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: invoice.type === 'dp' ? '#2563eb' : '#16a34a' }}>
                {invoice.type === 'dp' ? 'Down Payment (70%)' : 'Pelunasan Sisa (30%)'}
              </div>
              <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>
                Status Pembayaran: <strong>{invoice.status === 'paid' ? 'LUNAS ✓' : 'BELUM DIBAYAR'}</strong>
              </div>
            </div>
          </div>

          {/* Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24, fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700 }}>Deskripsi Layanan Pengiriman</th>
                <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700 }}>Nominal Tagihan</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '14px 12px' }}>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>
                    {invoice.type === 'dp' ? 'Down Payment 70%' : 'Pelunasan Sisa 30%'} — Jasa Transportasi Logistik
                  </div>
                  <div style={{ fontSize: 11, color: '#555', marginTop: 4 }}>
                    No. DO: {invoice.orderId}
                    {order && order.origin && ` · Asal: ${order.origin.city}`}
                    {order && order.drops && ` → Tujuan: ${order.drops.map(d => d.city).join(', ')}`}
                  </div>
                </td>
                <td style={{ padding: '14px 12px', textAlign: 'right', fontWeight: 700, fontSize: 14 }}>
                  {formatRupiah(invoice.amount)}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Total Box */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 32 }}>
            <div style={{ minWidth: 260, border: '1px solid #cbd5e1', padding: 16, borderRadius: 6, background: '#f8fafc' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                <span style={{ color: '#64748b' }}>Subtotal</span>
                <span>{formatRupiah(invoice.amount)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                <span style={{ color: '#64748b' }}>PPN (0%)</span>
                <span>—</span>
              </div>
              <div style={{ borderTop: '2px solid #cbd5e1', paddingTop: 8, marginTop: 8, display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 800 }}>
                <span>TOTAL TAGIHAN</span>
                <span style={{ color: '#1e3a8a' }}>{formatRupiah(invoice.amount)}</span>
              </div>
            </div>
          </div>

          {/* Payment Account & Signature */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px', gap: 20, paddingTop: 16, borderTop: '1px dashed #cbd5e1' }}>
            <div style={{ fontSize: 11, color: '#475569' }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>PEMBAYARAN DITRANSFER KE REKENING:</div>
              <div>Bank BCA: <strong>8830-1928-11</strong> a.n PT Logistik TMS Indonesia</div>
              <div>Bank Mandiri: <strong>137-00-982138-2</strong> a.n PT Logistik TMS Indonesia</div>
              <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 4 }}>*Harap mencantumkan nomor invoice pada berita transfer.</div>
            </div>

            <div style={{ textAlign: 'center', fontSize: 11 }}>
              <div>Departemen Keuangan</div>
              <div style={{ height: 50 }} />
              <div style={{ fontWeight: 700, textDecoration: 'underline' }}>Siti Rahmawati</div>
              <div style={{ fontSize: 10, color: '#64748b' }}>Finance Manager</div>
            </div>
          </div>
        </div>

        {/* Right Panel (Non-printable) */}
        <div className="no-print" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Status */}
          <div className="card">
            <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 14, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Status Pembayaran</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {['Diterbitkan', 'Dikirim ke Klien', 'Dibayar'].map((step, i) => {
                const done = invoice.status === 'paid' ? true : i < 1;
                return (
                  <div key={step} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
                    <div style={{
                      width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                      background: done ? 'var(--color-success-dim)' : 'var(--color-bg-input)',
                      border: `1px solid ${done ? 'rgba(34,197,94,0.3)' : 'var(--color-border)'}`,
                      color: done ? 'var(--color-success)' : 'var(--text-muted)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12,
                    }}>
                      {done ? '✓' : i + 1}
                    </div>
                    <span style={{ color: done ? 'var(--text-primary)' : 'var(--text-muted)' }}>{step}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* POD attachments (for pelunasan) */}
          {invoice.type === 'pelunasan' && (
            <div className="card">
              <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Lampiran Surat Jalan
              </h3>
              {podFiles.length > 0 ? (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
                    {podFiles.map((f, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: 'var(--color-bg-base)', borderRadius: 6, fontSize: 12 }}>
                        <FileText size={13} color="var(--color-primary)" />
                        <span style={{ flex: 1, color: 'var(--text-secondary)' }}>{f}</span>
                      </div>
                    ))}
                  </div>
                  <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleMergePDF}>
                    <Printer size={14} /> Merge PDF & Cetak ({podFiles.length} SJ)
                  </button>
                </>
              ) : (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '16px 0' }}>
                  Belum ada Surat Jalan yang diupload
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
