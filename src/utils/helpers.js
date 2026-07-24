// Utility functions

export const formatRupiah = (amount) => {
  if (!amount && amount !== 0) return '—';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric'
  });
};

export const formatDateShort = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'short'
  });
};

export const statusLabels = {
  draft: 'Draft',
  menunggu_dp: 'Menunggu DP',
  aktif: 'Aktif',
  transit: 'Dalam Perjalanan',
  selesai: 'Selesai',
  dibatalkan: 'Dibatalkan',
};

export const statusBadgeClass = {
  draft: 'badge-draft',
  menunggu_dp: 'badge-pending',
  aktif: 'badge-active',
  transit: 'badge-transit',
  selesai: 'badge-done',
  dibatalkan: 'badge-canceled',
};

export const paymentLabels = {
  belum_dp: 'Belum DP',
  dp_lunas: 'DP Lunas',
  lunas: 'Lunas',
};

export const paymentBadgeClass = {
  belum_dp: 'badge-pending',
  dp_lunas: 'badge-active',
  lunas: 'badge-done',
};

export const driverStatusLabel = {
  available: 'Tersedia',
  on_trip: 'Sedang Jalan',
  off: 'Tidak Aktif',
};

export const driverStatusClass = {
  available: 'badge-done',
  on_trip: 'badge-transit',
  off: 'badge-draft',
};

export const fleetStatusLabel = {
  available: 'Tersedia',
  on_trip: 'Sedang Jalan',
  maintenance: 'Maintenance',
};

export const fleetStatusClass = {
  available: 'badge-done',
  on_trip: 'badge-transit',
  maintenance: 'badge-canceled',
};

export const travelFundStatusLabel = {
  pengajuan: 'Pengajuan',
  dicairkan: 'Dicairkan',
  realisasi_selesai: 'Realisasi Selesai',
};

export const travelFundStatusClass = {
  pengajuan: 'badge-pending',
  dicairkan: 'badge-active',
  realisasi_selesai: 'badge-done',
};

export const invoiceTypeLabel = {
  dp: 'Invoice DP (70%)',
  pelunasan: 'Invoice Pelunasan (30%)',
};

export const invoiceStatusLabel = {
  unpaid: 'Belum Dibayar',
  paid: 'Lunas',
  overdue: 'Jatuh Tempo',
};

export const invoiceStatusClass = {
  unpaid: 'badge-pending',
  paid: 'badge-done',
  overdue: 'badge-canceled',
};

export const getDropProgress = (drops) => {
  if (!drops || drops.length === 0) return { done: 0, total: 0, pct: 0 };
  const done = drops.filter(d => d.status === 'done').length;
  return { done, total: drops.length, pct: Math.round((done / drops.length) * 100) };
};

export const allPODUploaded = (drops) => {
  if (!drops || drops.length === 0) return false;
  return drops.every(d => d.pod !== null);
};

export const generateId = (prefix) => {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}`;
};
