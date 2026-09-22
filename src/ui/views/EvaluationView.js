/**
 * AL BAYAN HIDAYATULLAH MAKASSAR — Evaluation & Financial Ratios View
 * Analytics, key ratios (liquidity, leverage, profitability, ROA), and commentary
 */
window.App = window.App || {};
window.App.UI = window.App.UI || {};
window.App.UI.Views = window.App.UI.Views || {};

(function (Views, Domain, Repositories, Utils) {
  Views.EvaluationView = {
    render() {
      const db = Repositories.StorageRepository.getDB();
      const period = db.settings?.period || Utils.currentMonth();
      const [f, t] = Utils.periodBounds(period);

      const ratios = Domain.AccountingEngine.calculateRatios(db, f, t);
      const periodTot = Domain.AccountingEngine.totals(db, f, t);
      const allTot = Domain.AccountingEngine.totals(db);

      const cash = (db.coa || [])
        .filter(a => a.code.startsWith('1101') || a.code.startsWith('1102'))
        .reduce((s, a) => s + Domain.AccountingEngine.normalBalance(a, Domain.AccountingEngine.sumAccount(db, a.code, f, t)), 0);

      const profit = periodTot.Revenue - periodTot.Expense;

      const ratiosEl = document.getElementById('ratios');
      if (ratiosEl) {
        ratiosEl.innerHTML = ratios.map(r => `
          <div class="card metric">
            <div class="label">${r.name}</div>
            <div class="value">${r.value.toFixed(2)}${r.isRatio ? 'x' : '%'}</div>
            <div class="sub">Indikator analitis standar SAK EP</div>
          </div>
        `).join('');
      }

      const evalTextEl = document.getElementById('evaluationText');
      if (evalTextEl) {
        evalTextEl.innerHTML = `
          <p><b>Likuiditas & Kas Tersedia:</b> Kas & setara kas posisi periode ini tercatat sebesar <b>${Utils.rupiah(cash)}</b>.</p>
          <p><b>Profitabilitas & Efisiensi:</b> Surplus/(defisit) bersih berjalan sebesar <b>${Utils.rupiah(profit)}</b> dari total penerimaan <b>${Utils.rupiah(periodTot.Revenue)}</b>.</p>
          <p><b>Struktur Finansial:</b> Total kewajiban/liabilitas sebesar <b>${Utils.rupiah(allTot.Liability)}</b> dibandingkan dengan total nilai aset <b>${Utils.rupiah(allTot.Asset)}</b>.</p>
          <p style="color:#667085;font-size:13px;margin-top:10px">Catatan: Rasio keuangan menyajikan indikator kinerja analitis. Interpretasi tetap harus disesuaikan dengan rencana anggaran dan kebijakan entitas nirlaba/pendidikan.</p>
        `;
      }
    }
  };
})(window.App.UI.Views, window.App.Domain, window.App.Repositories, window.App.Utils);

// Global alias
window.renderEvaluation = () => window.App.UI.Views.EvaluationView.render();
