/**
 * AL BAYAN HIDAYATULLAH MAKASSAR — Cash & Bank View
 * Liquidity tracking, bank transactions, and cashflow charts
 */
window.App = window.App || {};
window.App.UI = window.App.UI || {};
window.App.UI.Views = window.App.UI.Views || {};

(function (Views, Domain, Repositories, Utils) {
  function renderVisuals(db, fromDate, toDate) {
    const summary = Domain.AccountingEngine.calculateCashFlowSummary(db, fromDate, toDate);
    const { masuk, keluar, net, pIn, pOut } = summary;

    const bars = document.getElementById('cashFlowBars');
    if (bars) {
      bars.innerHTML = `
        <div class="cf-row"><div class="cf-head"><span>Kas Masuk</span><b>${Utils.rupiah(masuk)} · ${pIn.toFixed(1)}%</b></div>
          <div class="cf-track"><div class="cf-fill in" style="width:${Math.min(100, pIn)}%"></div></div></div>
        <div class="cf-row"><div class="cf-head"><span>Kas Keluar</span><b>${Utils.rupiah(keluar)} · ${pOut.toFixed(1)}%</b></div>
          <div class="cf-track"><div class="cf-fill out" style="width:${Math.min(100, pOut)}%"></div></div></div>
        <div class="cf-net"><span>Arus Kas Neto</span><strong>${Utils.rupiah(net)}</strong></div>
      `;
    }

    const chart = document.getElementById('cashFlowPercentChart');
    if (chart) {
      chart.innerHTML = `
        <div class="cf-donut" style="--in:${pIn}%;--out:${pOut}%"><div><b>${Math.round((pIn + pOut) > 0 ? (Math.abs(net) / (masuk + keluar)) * 100 : 0)}%</b><span>Neto</span></div></div>
        <div class="cf-legend">
          <div><i class="in"></i><span>Kas masuk</span><b>${pIn.toFixed(1)}%</b></div>
          <div><i class="out"></i><span>Kas keluar</span><b>${pOut.toFixed(1)}%</b></div>
        </div>
      `;
    }
  }

  Views.CashView = {
    render() {
      const db = Repositories.StorageRepository.getDB();
      const period = db.settings?.period || Utils.currentMonth();
      const [f, t] = Utils.periodBounds(period);

      const cashCodes = (db.coa || [])
        .filter(a => a.code.startsWith('1101') || a.code.startsWith('1102'))
        .map(a => a.code);

      const rows = (db.journals || [])
        .filter(j => j.lines && j.lines.some(l => cashCodes.includes(l.account)))
        .slice()
        .sort((a, b) => b.date.localeCompare(a.date));

      const tableEl = document.getElementById('cashTable');
      if (tableEl) {
        if (!rows.length) {
          tableEl.innerHTML = '<div class="empty">Belum ada transaksi kas atau bank pada periode ini.</div>';
        } else {
          tableEl.innerHTML = `
            <div class="tablewrap"><table class="table">
              <thead><tr>
                <th>Tanggal</th><th>No. Bukti</th><th>Deskripsi</th><th class="num">Debit</th><th class="num">Kredit</th><th>Aksi</th>
              </tr></thead>
              <tbody>${rows.map(j => {
                const d = (j.lines || []).reduce((s, x) => s + Number(x.debit || 0), 0);
                const c = (j.lines || []).reduce((s, x) => s + Number(x.credit || 0), 0);
                return `<tr>
                  <td>${j.date}</td>
                  <td><b>${Utils.esc(j.no)}</b></td>
                  <td>${Utils.esc(j.desc)}</td>
                  <td class="num">${Utils.rupiah(d)}</td>
                  <td class="num">${Utils.rupiah(c)}</td>
                  <td>
                    <button class="btn" onclick="window.App.UI.Views.JournalView.openManual('${Utils.esc(j.id)}')">Edit</button>
                    <button class="btn danger" onclick="window.App.UI.Views.JournalView.delete('${Utils.esc(j.id)}')">Hapus</button>
                  </td>
                </tr>`;
              }).join('')}</tbody>
            </table></div>
          `;
        }
      }

      renderVisuals(db, f, t);
    }
  };
})(window.App.UI.Views, window.App.Domain, window.App.Repositories, window.App.Utils);

// Global alias
window.renderCash = () => window.App.UI.Views.CashView.render();
window.renderCashFlowVisuals = () => window.App.UI.Views.CashView.render();
