/**
 * AL BAYAN HIDAYATULLAH MAKASSAR — UI Utilities
 * Presentation Layer formatting and string utilities
 */
window.App = window.App || {};
window.App.Utils = (function () {
  const rupiahFormatter = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  });

  const numberFormatter = new Intl.NumberFormat('id-ID');

  function rupiah(n) {
    return rupiahFormatter.format(Number(n) || 0);
  }

  function num(n) {
    return numberFormatter.format(Math.round(Number(n) || 0));
  }

  function safeNum(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }

  function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, m => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[m]));
  }

  function today() {
    return new Date().toISOString().slice(0, 10);
  }

  function currentMonth() {
    return new Date().toISOString().slice(0, 7);
  }

  function periodBounds(periodStr) {
    const p = periodStr || currentMonth();
    const year = Number(p.slice(0, 4));
    const month = Number(p.slice(5, 7));
    const lastDay = new Date(year, month, 0).getDate();
    return [`${p}-01`, `${p}-${String(lastDay).padStart(2, '0')}`];
  }

  function downloadFile(fileName, content, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(url);
      a.remove();
    }, 500);
  }

  return {
    rupiah,
    num,
    safeNum,
    esc,
    today,
    currentMonth,
    periodBounds,
    downloadFile
  };
})();

// Provide global aliases for compatibility if required by inline attributes
window.rupiah = window.App.Utils.rupiah;
window.num = window.App.Utils.num;
window.esc = window.App.Utils.esc;
