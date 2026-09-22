/**
 * AL BAYAN HIDAYATULLAH MAKASSAR — Dashboard View
 * Executive dashboard, KPI cards, visual charts, and recent activity
 */
window.App = window.App || {};
window.App.UI = window.App.UI || {};
window.App.UI.Views = window.App.UI.Views || {};

(function (Views, Domain, Repositories, Utils) {
  function drawBalanceChart(assets, liabilities, equity) {
    const c = document.getElementById('balanceChart');
    if (!c) return;

    const ctx = c.getContext('2d');
    const ratio = window.devicePixelRatio || 1;
    const w = Math.max(c.clientWidth, 500);
    const h = 240;

    c.width = w * ratio;
    c.height = h * ratio;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const vals = [Math.max(0, assets), Math.max(0, liabilities), Math.max(0, equity)];
    const labels = ['Aset', 'Liabilitas', 'Ekuitas'];
    const max = Math.max(...vals, 1);
    const base = h - 38;
    const top = 28;
    const gap = 22;
    const bw = Math.min(110, (w - 80 - gap * 2) / 3);

    vals.forEach((v, i) => {
      const x = 35 + i * (bw + gap + (w - 3 * bw - gap * 2 - 70) / 3);
      const bh = Math.max(4, (v / max) * (base - top));
      const y = base - bh;

      ctx.fillStyle = ['#1d4ed8', '#f59e0b', '#16a34a'][i];
      ctx.beginPath();
      ctx.roundRect(x, y, bw, bh, 10);
      ctx.fill();

      ctx.fillStyle = '#344054';
      ctx.font = '600 13px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(labels[i], x + bw / 2, base + 20);

      ctx.font = '700 12px Arial';
      ctx.fillText(Utils.rupiah(v), x + bw / 2, Math.max(18, y - 8));
    });
  }

  function renderCentralInfo(db) {
    const el = document.getElementById('centralInfoGrid');
    if (!el) return;

    const used = Repositories.StorageRepository.getUsedAccountCodes();
    const active = (db.coa || []).filter(a => a.active !== false).length;
    const post = (db.coa || []).filter(a => a.active !== false && a.postable !== false).length;
    const headers = (db.coa || []).filter(a => a.postable === false).length;
    const usedCount = Object.keys(used).length;
    const budgetTotal = (db.budgets || []).reduce((s, b) => s + Number(b.plan || 0), 0);
    const journalCount = (db.journals || []).length;
    const errors = Domain.AccountingEngine.validateIntegrity(db);

    el.innerHTML = `
      <div class="central-stat"><span>AKUN AKTIF</span><b>${Utils.num(active)}</b><small>${Utils.num(post)} akun posting</small></div>
      <div class="central-stat"><span>AKUN HEADER</span><b>${Utils.num(headers)}</b><small>${Utils.num(usedCount)} akun sudah dipakai</small></div>
      <div class="central-stat"><span>JURNAL</span><b>${Utils.num(journalCount)}</b><small>double-entry tercatat</small></div>
      <div class="central-stat"><span>ANGGARAN</span><b>${Utils.rupiah(budgetTotal)}</b><small>${Utils.num((db.budgets || []).length)} program</small></div>
      <div class="central-stat"><span>PENYIMPANAN</span><b>LOCAL</b><small>tersimpan di browser</small></div>
      <div class="central-stat"><span>INTEGRITAS</span><b>${errors.length ? 'PERIKSA' : 'OK'}</b><small>${errors.length ? Utils.num(errors.length) + ' temuan' : 'COA & jurnal tervalidasi'}</small></div>
    `;

    const badge = document.getElementById('systemHealthBadge');
    if (badge) {
      badge.textContent = errors.length ? 'PERIKSA' : 'SIAP';
      badge.className = 'mini-badge';
      badge.style.color = errors.length ? '#b42318' : '#067647';
    }
  }

  function renderAssetDashboardCard(db) {
    let host = document.getElementById('assetDashboardCard');
    const d = document.getElementById('dashboard');
    if (!host && d) {
      host = document.createElement('div');
      host.className = 'card section';
      host.id = 'assetDashboardCard';
      d.appendChild(host);
    }
    if (!host) return;

    const period = db.settings?.period || Utils.currentMonth();
    const [_, periodEnd] = Utils.periodBounds(period);
    const rows = db.assets || [];

    const totalCost = rows.reduce((s, a) => s + (Number(a.cost) || 0), 0);
    const totalAccum = rows.reduce((s, a) => s + Domain.DepreciationEngine.assetState(a, db, periodEnd, period).accumulated, 0);
    const totalBook = rows.reduce((s, a) => s + Domain.DepreciationEngine.assetState(a, db, periodEnd, period).book, 0);
    const activeCount = rows.filter(a => a.status === 'Aktif').length;

    host.innerHTML = `
      <div class="card-head">
        <div>
          <h3>Manajemen Aset Tetap</h3>
          <p>Nilai aset tetap dan penyusutan periode ${Utils.esc(period)}</p>
        </div>
        <button class="btn" onclick="window.App.Router.navigate('assets')">Lihat Register Aset →</button>
      </div>
      <div class="asset-summary-grid">
        <div><span>Nilai Perolehan</span><b>${Utils.rupiah(totalCost)}</b></div>
        <div><span>Akumulasi Penyusutan</span><b>${Utils.rupiah(totalAccum)}</b></div>
        <div><span>Nilai Buku</span><b>${Utils.rupiah(totalBook)}</b></div>
        <div><span>Aset Aktif</span><b>${activeCount} unit</b></div>
      </div>
    `;
  }

  Views.DashboardView = {
    render() {
      const db = Repositories.StorageRepository.getDB();
      const period = db.settings?.period || Utils.currentMonth();
      const [f, t] = Utils.periodBounds(period);

      const periodTot = Domain.AccountingEngine.totals(db, f, t);
      const rev = periodTot.Revenue;
      const exp = periodTot.Expense;
      const profit = rev - exp;

      const allTot = Domain.AccountingEngine.totals(db);
      const cash = (db.coa || [])
        .filter(a => a.code.startsWith('1101') || a.code.startsWith('1102'))
        .reduce((s, a) => s + Domain.AccountingEngine.normalBalance(a, Domain.AccountingEngine.sumAccount(db, a.code)), 0);

      const assets = allTot.Asset;
      const liabilities = allTot.Liability;
      const equity = allTot.Equity;
      const balanced = Math.abs(assets - (liabilities + equity + profit)) <= 1;
      const margin = rev ? (profit / rev) * 100 : 0;

      // Update Text Elements
      const setTxt = (id, v) => {
        const el = document.getElementById(id);
        if (el) el.textContent = v;
      };

      setTxt('mCash', Utils.rupiah(cash));
      setTxt('mRevenue', Utils.rupiah(rev));
      setTxt('mExpense', Utils.rupiah(exp));
      setTxt('mProfit', Utils.rupiah(profit));
      setTxt('mAssets', Utils.rupiah(assets));
      setTxt('profitPct', `${profit >= 0 ? 'Surplus ' : 'Defisit '} ${Math.abs(margin).toFixed(1)}%`);
      setTxt('mBalanceStatus', balanced ? 'SEIMBANG' : 'PERIKSA');
      setTxt('balanceInfo', balanced ? 'Aset = Liabilitas + Ekuitas' : 'Ada selisih pada persamaan akuntansi');
      setTxt('cashInfo', cash >= 0 ? 'Saldo kas tersedia' : 'Saldo kas bernilai negatif');

      const periodTx = (db.journals || []).filter(j => j.date >= f && j.date <= t);
      setTxt('revenueInfo', `${periodTx.length} transaksi periode`);
      setTxt('expenseInfo', rev ? `Beban ${((exp / rev) * 100).toFixed(1)}% dari penerimaan` : 'Belum ada penerimaan');
      setTxt('dashPeriod', `${period} • ${db.settings.standard || 'SAK EP'}`);

      // Summary Card
      const summaryEl = document.getElementById('summary');
      if (summaryEl) {
        summaryEl.innerHTML = `
          <div class="summary-row"><span>Total Aset</span><b>${Utils.rupiah(assets)}</b></div>
          <div class="summary-row"><span>Liabilitas</span><b>${Utils.rupiah(liabilities)}</b></div>
          <div class="summary-row"><span>Ekuitas/Dana</span><b>${Utils.rupiah(equity + profit)}</b></div>
          <div class="summary-row"><span>Surplus/(Defisit)</span><b>${Utils.rupiah(profit)}</b></div>
        `;
      }

      // Alerts
      const alertsEl = document.getElementById('alerts');
      if (alertsEl) {
        const alerts = [];
        if (!balanced) alerts.push('<p><span class="status-dot bad"></span><b>Perlu pemeriksaan:</b> neraca belum seimbang.</p>');
        else alerts.push('<p><span class="status-dot good"></span><b>Seimbang:</b> persamaan akuntansi terpenuhi.</p>');
        if (rev === 0) alerts.push('<p><span class="status-dot warn"></span>Belum ada penerimaan/pendapatan pada periode ini.</p>');
        if (cash < 0) alerts.push('<p><span class="status-dot bad"></span>Saldo kas & bank menunjukkan nilai negatif.</p>');
        alertsEl.innerHTML = alerts.join('');
      }

      // Activity Distribution
      const activityEl = document.getElementById('activity');
      if (activityEl) {
        const counts = { 'Penerimaan/Pendapatan': 0, 'Beban': 0, 'Pembelian': 0, 'Kas/Bank': 0, 'Lainnya': 0 };
        periodTx.forEach(j => {
          const s = (j.desc || '').toLowerCase();
          if (/penerimaan|pendapatan|spp|pendidikan|donasi|infak|hibah/.test(s)) counts['Penerimaan/Pendapatan']++;
          else if (/beban|gaji|listrik|sewa|transport|pemeliharaan/.test(s)) counts['Beban']++;
          else if (/pembelian|belanja/.test(s)) counts['Pembelian']++;
          else if ((j.lines || []).some(l => /^110[12]/.test(String(l.account)))) counts['Kas/Bank']++;
          else counts['Lainnya']++;
        });
        const totalTx = Math.max(periodTx.length, 1);
        activityEl.innerHTML = Object.entries(counts).map(([k, v]) => {
          const p = Math.round((v / totalTx) * 100);
          return `<div class="activity-row"><div class="activity-label">${k}</div>` +
            `<div class="activity-track"><div class="activity-fill" style="width:${Math.min(100, p)}%"></div></div><b>${p}%</b></div>`;
        }).join('') + `<div class="activity-note">${periodTx.length} transaksi tercatat pada periode ${period}.</div>`;
      }

      // Finance Mix
      const mixEl = document.getElementById('financeMix');
      if (mixEl) {
        const maxMix = Math.max(rev, exp, 1);
        mixEl.innerHTML = `
          <div class="mix-item"><div><span>Penerimaan/Pendapatan</span><b>${Utils.rupiah(rev)}</b></div>
            <div class="mix-track"><div class="mix-fill receive" style="width:${(rev / maxMix) * 100}%"></div></div></div>
          <div class="mix-item"><div><span>Beban</span><b>${Utils.rupiah(exp)}</b></div>
            <div class="mix-track"><div class="mix-fill expense" style="width:${(exp / maxMix) * 100}%"></div></div></div>
          <div class="mix-result"><span>Hasil periode</span><strong>${Utils.rupiah(profit)}</strong></div>
        `;
      }

      // Rankings
      const incomeRank = Domain.AccountingEngine.rankAccounts(db, 'Revenue', f, t, 10);
      const expenseRank = Domain.AccountingEngine.rankAccounts(db, 'Expense', f, t, 10);
      const incomeTotal = incomeRank.reduce((s, x) => s + x.value, 0);
      const expenseTotal = expenseRank.reduce((s, x) => s + x.value, 0);

      function rankHtml(rows, total, kind) {
        if (!rows.length) return '<div class="empty-ranking">Belum ada data pada periode ini.</div>';
        return rows.map((x, i) => {
          const pct = total ? (x.value / total) * 100 : 0;
          return `<div class="rank-row">
            <div class="rank-num">${i + 1}</div>
            <div class="rank-main"><div class="rank-name">${Utils.esc(x.name)}</div><div class="rank-code">${Utils.esc(x.code)}</div>
              <div class="rank-track"><div class="rank-fill ${kind}" style="width:${Math.min(100, pct)}%"></div></div>
            </div>
            <div class="rank-value"><b>${Utils.rupiah(x.value)}</b><span>${pct.toFixed(1)}%</span></div>
          </div>`;
        }).join('');
      }

      const inRankEl = document.getElementById('incomeRanking');
      if (inRankEl) inRankEl.innerHTML = rankHtml(incomeRank, incomeTotal, 'income');
      const expRankEl = document.getElementById('expenseRanking');
      if (expRankEl) expRankEl.innerHTML = rankHtml(expenseRank, expenseTotal, 'expense');

      // Ranking Bars Chart
      const rankingBarsEl = document.getElementById('rankingBars');
      if (rankingBarsEl) {
        const chartRows = [
          ...incomeRank.map(x => ({ name: x.name, penerimaan: x.value, beban: 0, pct: incomeTotal ? (x.value / incomeTotal) * 100 : 0 })),
          ...expenseRank.map(x => ({ name: x.name, penerimaan: 0, beban: x.value, pct: expenseTotal ? (x.value / expenseTotal) * 100 : 0 }))
        ].slice(0, 20);

        rankingBarsEl.innerHTML = chartRows.length ? chartRows.map((x, i) => {
          const v = x.penerimaan || x.beban;
          const pct = x.pct;
          const cls = x.penerimaan ? 'income' : 'expense';
          return `<div class="bar-rank"><div class="bar-rank-head"><span>${i + 1}. ${Utils.esc(x.name)}</span><b>${Utils.rupiah(v)} · ${pct.toFixed(1)}%</b></div><div class="bar-rank-track"><div class="bar-rank-fill ${cls}" style="width:${Math.min(100, pct)}%"></div></div></div>`;
        }).join('') : '<div class="empty-ranking">Belum ada data ranking.</div>';
      }

      // Recent Transactions
      const recentEl = document.getElementById('recent');
      if (recentEl) {
        const rec = (db.journals || []).slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8);
        if (!rec.length) {
          recentEl.innerHTML = '<div class="empty">Belum ada transaksi.</div>';
        } else {
          recentEl.innerHTML = `
            <div class="tablewrap"><table class="table"><thead><tr>
              <th>Tanggal</th><th>No. Bukti</th><th>Deskripsi</th><th class="num">Debit</th><th class="num">Kredit</th>
            </tr></thead><tbody>
            ${rec.map(j => {
              const d = (j.lines || []).reduce((s, x) => s + Number(x.debit || 0), 0);
              const c = (j.lines || []).reduce((s, x) => s + Number(x.credit || 0), 0);
              return `<tr><td>${j.date}</td><td>${Utils.esc(j.no)}</td><td>${Utils.esc(j.desc)}</td><td class="num">${Utils.rupiah(d)}</td><td class="num">${Utils.rupiah(c)}</td></tr>`;
            }).join('')}
            </tbody></table></div>
          `;
        }
      }

      // Central info & Canvas chart
      renderCentralInfo(db);
      renderAssetDashboardCard(db);
      drawBalanceChart(assets, liabilities, equity + profit);
    }
  };
})(window.App.UI.Views, window.App.Domain, window.App.Repositories, window.App.Utils);
