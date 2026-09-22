/**
 * AL BAYAN HIDAYATULLAH MAKASSAR — Financial Reports View
 * Trial Balance, Income Statement, Balance Sheet, Cash Flow, and Equity Statements
 */
window.App = window.App || {};
window.App.UI = window.App.UI || {};
window.App.UI.Views = window.App.UI.Views || {};

(function (Views, Domain, Repositories, Utils) {
  function renderSection(title, list, isRevenue = false) {
    const total = list.reduce((s, x) => s + Domain.AccountingEngine.normalBalance(x[0], x[1]), 0);
    return `
      <h3>${title}</h3>
      <table class="table"><tbody>
        ${list.map(x => `<tr>
          <td>${x[0].code} — ${Utils.esc(x[0].name)}</td>
          <td class="num">${Utils.rupiah(Domain.AccountingEngine.normalBalance(x[0], x[1]))}</td>
        </tr>`).join('')}
        <tr>
          <th>Total ${title}</th>
          <th class="num">${Utils.rupiah(total)}</th>
        </tr>
      </tbody></table>
    `;
  }

  function renderEquityVisuals(db, f, t) {
    const summary = Domain.AccountingEngine.calculateEquitySummary(db, f, t);
    const { rows, total } = summary;

    const bars = document.getElementById('equityBars');
    if (bars) {
      bars.innerHTML = rows.length ? rows.map((x, i) => {
        const p = (Math.max(0, x.value) / total) * 100;
        return `<div class="eq-row">
          <div class="eq-head"><span><b>${i + 1}.</b> ${Utils.esc(x.name)}</span><b>${Utils.rupiah(x.value)} · ${p.toFixed(1)}%</b></div>
          <div class="eq-code">${x.code}</div>
          <div class="eq-track"><div class="eq-fill" style="width:${Math.min(100, p)}%"></div></div>
        </div>`;
      }).join('') : '<div class="empty-ranking">Belum ada mutasi ekuitas pada periode ini.</div>';
    }

    const chart = document.getElementById('equityPercentChart');
    if (chart) {
      chart.innerHTML = rows.length ? `
        <div class="eq-donut"><div><b>${rows.length}</b><span>akun</span></div></div>
        <div class="eq-legend">${rows.map(x => {
          const p = (Math.max(0, x.value) / total) * 100;
          return `<div><i></i><span>${Utils.esc(x.name)}</span><b>${p.toFixed(1)}%</b></div>`;
        }).join('')}</div>
      ` : '<div class="empty-ranking">Belum ada data ekuitas.</div>';
    }
  }

  Views.ReportsView = {
    render() {
      const db = Repositories.StorageRepository.getDB();
      const period = db.settings?.period || Utils.currentMonth();
      
      const trialFromInput = document.getElementById('trialFrom');
      const trialToInput = document.getElementById('trialTo');
      const [defaultF, defaultT] = Utils.periodBounds(period);

      const f = trialFromInput?.value || defaultF;
      const t = trialToInput?.value || defaultT;
      if (trialFromInput && !trialFromInput.value) trialFromInput.value = f;
      if (trialToInput && !trialToInput.value) trialToInput.value = t;

      const accounts = (db.coa || []).filter(a => a.active !== false && a.postable !== false && !Domain.isHeader(a));

      // 1. Neraca Saldo
      const trialEl = document.getElementById('trialTable');
      if (trialEl) {
        const rows = accounts.map(a => {
          const v = Domain.AccountingEngine.sumAccount(db, a.code, f, t);
          return `<tr>
            <td>${a.code}</td>
            <td>${Utils.esc(a.name)}</td>
            <td>${a.type}</td>
            <td class="num">${Utils.rupiah(v > 0 ? v : 0)}</td>
            <td class="num">${Utils.rupiah(v < 0 ? -v : 0)}</td>
          </tr>`;
        }).join('');

        trialEl.innerHTML = `
          <h2>Neraca Saldo</h2>
          <p>${Utils.esc(db.settings.name)} • Periode ${f} s/d ${t}</p>
          <div class="tablewrap"><table class="table">
            <thead><tr>
              <th>Kode</th><th>Akun</th><th>Tipe</th><th class="num">Debit</th><th class="num">Kredit</th>
            </tr></thead>
            <tbody>${rows || '<tr><td colspan="5" class="empty">Belum ada data neraca saldo.</td></tr>'}</tbody>
          </table></div>
        `;
      }

      // 2. Laba Rugi
      const rev = accounts.filter(a => a.type === 'Revenue').map(a => [a, Domain.AccountingEngine.sumAccount(db, a.code, f, t)]);
      const exp = accounts.filter(a => a.type === 'Expense').map(a => [a, Domain.AccountingEngine.sumAccount(db, a.code, f, t)]);
      const totalR = rev.reduce((s, x) => s + Domain.AccountingEngine.normalBalance(x[0], x[1]), 0);
      const totalE = exp.reduce((s, x) => s + Domain.AccountingEngine.normalBalance(x[0], x[1]), 0);
      const netProfit = totalR - totalE;

      const incEl = document.getElementById('incomeTable');
      if (incEl) {
        incEl.innerHTML = `
          <h2>Laporan Laba Rugi / Surplus Defisit</h2>
          <p>${Utils.esc(db.settings.name)} • Periode ${period}</p>
          ${renderSection('Pendapatan / Penerimaan', rev, true)}
          <hr style="margin:20px 0;border:0;border-top:1px solid #e4e9f0">
          ${renderSection('Beban / Pengeluaran', exp, false)}
          <h3 class="num" style="margin-top:15px;color:${netProfit >= 0 ? '#087443' : '#b42318'}">
            Surplus / (Defisit) Bersih: ${Utils.rupiah(netProfit)}
          </h3>
        `;
      }

      // 3. Neraca
      const assets = accounts.filter(a => a.type === 'Asset').map(a => [a, Domain.AccountingEngine.sumAccount(db, a.code, f, t)]);
      const liab = accounts.filter(a => a.type === 'Liability').map(a => [a, Domain.AccountingEngine.sumAccount(db, a.code, f, t)]);
      const eq = accounts.filter(a => a.type === 'Equity').map(a => [a, Domain.AccountingEngine.sumAccount(db, a.code, f, t)]);

      const totalLiab = liab.reduce((s, x) => s + Domain.AccountingEngine.normalBalance(x[0], x[1]), 0);
      const totalEq = eq.reduce((s, x) => s + Domain.AccountingEngine.normalBalance(x[0], x[1]), 0);

      const balEl = document.getElementById('balanceTable');
      if (balEl) {
        balEl.innerHTML = `
          <h2>Laporan Posisi Keuangan (Neraca)</h2>
          <p>${Utils.esc(db.settings.name)} • Posisi per ${t}</p>
          ${renderSection('Aset', assets, false)}
          <hr style="margin:20px 0;border:0;border-top:1px solid #e4e9f0">
          ${renderSection('Liabilitas', liab, false)}
          ${renderSection('Ekuitas / Dana', eq, false)}
          <h3 class="num" style="margin-top:15px">
            Total Liabilitas + Ekuitas + Laba: ${Utils.rupiah(totalLiab + totalEq + netProfit)}
          </h3>
        `;
      }

      // 4. Arus Kas (Ringkas)
      const cashAccounts = accounts.filter(a => a.code.startsWith('1101') || a.code.startsWith('1102'));
      let netCash = 0;
      cashAccounts.forEach(a => netCash += Domain.AccountingEngine.normalBalance(a, Domain.AccountingEngine.sumAccount(db, a.code, f, t)));

      const cfEl = document.getElementById('cashflowTable');
      if (cfEl) {
        cfEl.innerHTML = `
          <h2>Laporan Arus Kas</h2>
          <p>Mutasi bersih kas & bank berdasarkan jurnal periode ${period}.</p>
          <h3>Perubahan Bersih Kas & Setara Kas: ${Utils.rupiah(netCash)}</h3>
          <p style="color:#667085;font-size:13px">Untuk analisis lebih rinci, gunakan menu Kas & Bank atau grafik komposisi visual di bawah.</p>
        `;
      }

      // 5. Perubahan Ekuitas
      const eqEl = document.getElementById('equityTable');
      if (eqEl) {
        eqEl.innerHTML = `
          <h2>Laporan Perubahan Ekuitas</h2>
          <p>Ekuitas Akhir = Ekuitas Terdaftar + Surplus/(Defisit) Periode Berjalan.</p>
          <h3>Total Ekuitas Akhir: ${Utils.rupiah(totalEq + netProfit)}</h3>
        `;
      }

      renderEquityVisuals(db, f, t);
    }
  };
})(window.App.UI.Views, window.App.Domain, window.App.Repositories, window.App.Utils);

// Global alias
window.renderReports = () => window.App.UI.Views.ReportsView.render();
window.renderEquityVisuals = () => window.App.UI.Views.ReportsView.render();
