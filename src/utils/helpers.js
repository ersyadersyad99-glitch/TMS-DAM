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

export const terbilang = (n) => {
  if (!n || isNaN(n)) return 'Nol Rupiah';
  const angka = ['', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas'];
  const num = Math.floor(Math.abs(n));
  if (num === 0) return 'Nol Rupiah';
  let temp = '';
  if (num < 12) {
    temp = ' ' + angka[num];
  } else if (num < 20) {
    temp = terbilang(num - 10).replace(' Rupiah', '') + ' Belas';
  } else if (num < 100) {
    temp = terbilang(Math.floor(num / 10)).replace(' Rupiah', '') + ' Puluh' + terbilang(num % 10).replace(' Rupiah', '');
  } else if (num < 200) {
    temp = ' Seratus' + terbilang(num - 100).replace(' Rupiah', '');
  } else if (num < 1000) {
    temp = terbilang(Math.floor(num / 100)).replace(' Rupiah', '') + ' Ratus' + terbilang(num % 100).replace(' Rupiah', '');
  } else if (num < 2000) {
    temp = ' Seribu' + terbilang(num - 1000).replace(' Rupiah', '');
  } else if (num < 1000000) {
    temp = terbilang(Math.floor(num / 1000)).replace(' Rupiah', '') + ' Ribu' + terbilang(num % 1000).replace(' Rupiah', '');
  } else if (num < 1000000000) {
    temp = terbilang(Math.floor(num / 1000000)).replace(' Rupiah', '') + ' Juta' + terbilang(num % 1000000).replace(' Rupiah', '');
  } else if (num < 1000000000000) {
    temp = terbilang(Math.floor(num / 1000000000)).replace(' Rupiah', '') + ' Miliar' + terbilang(num % 1000000000).replace(' Rupiah', '');
  }
  return temp.trim() + ' Rupiah';
};


export const statusLabels = {
  draft: 'Draft',
  menunggu_dp: 'Menunggu DP',
  aktif: 'Aktif',
  // Shipment tracking statuses
  picked_up: 'Picked Up',
  in_transit: 'In Transit',
  en_route: 'En Route to Destination',
  delivered: 'Delivered',
  // Legacy alias
  transit: 'In Transit',
  selesai: 'Selesai',
  dibatalkan: 'Dibatalkan',
};

export const statusBadgeClass = {
  draft: 'badge-draft',
  menunggu_dp: 'badge-pending',
  aktif: 'badge-active',
  picked_up: 'badge-transit',
  in_transit: 'badge-transit',
  en_route: 'badge-transit',
  delivered: 'badge-done',
  transit: 'badge-transit',
  selesai: 'badge-done',
  dibatalkan: 'badge-canceled',
};

// Shipment tracking steps in order
export const SHIPMENT_STEPS = [
  { key: 'picked_up', label: 'Picked Up', icon: '📦' },
  { key: 'in_transit', label: 'In Transit', icon: '🚛' },
  { key: 'en_route', label: 'En Route to Destination', icon: '📍' },
  { key: 'delivered', label: 'Delivered', icon: '✅' },
];

// Returns 0-based index of current step (-1 if not started)
export const getShipmentStepIndex = (status) => {
  const steps = ['picked_up', 'in_transit', 'en_route', 'delivered'];
  return steps.indexOf(status);
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
  top_full: 'Invoice Full (TOP)',
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

export const exportToCSV = (filename, headers, rows) => {
  if (!rows || rows.length === 0) return;

  const escapeCell = (cell) => {
    if (cell === null || cell === undefined) return '""';
    const str = String(cell).replace(/"/g, '""');
    return `"${str}"`;
  };

  const headerLine = headers.map(escapeCell).join(',');
  const rowLines = rows.map(r => r.map(escapeCell).join(','));
  const csvContent = '\uFEFF' + [headerLine, ...rowLines].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const exportToExcel = (filename, headers, rows) => {
  if (!rows || rows.length === 0) return;

  const renderCell = (cell) => {
    if (cell === null || cell === undefined) return '';
    const str = String(cell);
    if (str.startsWith('<a ') || str.startsWith('<A ') || str.includes('<a href')) {
      return str;
    }
    if (str.startsWith('http://') || str.startsWith('https://')) {
      return `<a href="${str}" target="_blank">${str}</a>`;
    }
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  };

  const tableHtml = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
  <head>
    <meta http-equiv="content-type" content="text/html; charset=UTF-8"/>
    <!--[if gte mso 9]>
    <xml>
      <x:ExcelWorkbook>
        <x:ExcelWorksheets>
          <x:ExcelWorksheet>
            <x:Name>Data Export</x:Name>
            <x:WorksheetOptions>
              <x:DisplayGridlines/>
            </x:WorksheetOptions>
          </x:ExcelWorksheet>
        </x:ExcelWorksheets>
      </x:ExcelWorkbook>
    </xml>
    <![endif]-->
    <style>
      th { background-color: #2563EB; color: #FFFFFF; font-weight: bold; font-family: sans-serif; border: 1px solid #CCCCCC; padding: 8px 14px; text-align: left; }
      td { font-family: sans-serif; border: 1px solid #E5E7EB; padding: 6px 12px; vertical-align: top; }
      tr:nth-child(even) { background-color: #F9FAFB; }
      a { color: #2563EB; font-weight: bold; text-decoration: underline; }
    </style>
  </head>
  <body>
    <table>
      <thead>
        <tr>
          ${headers.map(h => `<th>${h.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        ${rows.map(row => `
          <tr>
            ${row.map(cell => `<td>${renderCell(cell)}</td>`).join('')}
          </tr>
        `).join('')}
      </tbody>
    </table>
  </body>
  </html>`;

  const blob = new Blob([tableHtml], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.xls`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
