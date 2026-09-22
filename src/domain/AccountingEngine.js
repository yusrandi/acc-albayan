/**
 * AL BAYAN HIDAYATULLAH MAKASSAR — Accounting Engine
 * Domain Service for Financial Math & Standard Accounting Rules
 */
window.App = window.App || {};
window.App.Domain = window.App.Domain || {};

(function (Domain) {
  function getActivePostingAccounts(db) {
    return (db.coa || []).filter(a => a.active !== false && a.postable !== false && !Domain.isHeader(a));
  }

  function normalBalance(account, val) {
    if (!account) return val;
    return account.normal === 'Debit' ? val : -val;
  }

  function sumAccount(db, code, fromDate = null, toDate = null) {
    let balance = 0;
    (db.journals || []).forEach(j => {
      if (fromDate && j.date < fromDate) return;
      if (toDate && j.date > toDate) return;
      (j.lines || []).forEach(l => {
        if (String(l.account) === String(code)) {
          balance += (Number(l.debit) || 0) - (Number(l.credit) || 0);
        }
      });
    });
    return balance;
  }

  function totals(db, fromDate = null, toDate = null) {
    const res = { Asset: 0, Liability: 0, Equity: 0, Revenue: 0, Expense: 0 };
    const accounts = (db.coa || []).filter(a => a.active !== false);
    accounts.forEach(a => {
      const net = sumAccount(db, a.code, fromDate, toDate);
      res[a.type] += normalBalance(a, net);
    });
    return res;
  }

  function rankAccounts(db, type, fromDate, toDate, limit = 10) {
    const map = {};
    (db.coa || [])
      .filter(a => a.type === type && a.active !== false && a.postable !== false && !Domain.isHeader(a))
      .forEach(a => {
        map[a.code] = { code: a.code, name: a.name, value: 0 };
      });

    (db.journals || [])
      .filter(j => j.date >= fromDate && j.date <= toDate)
      .forEach(j => {
        (j.lines || []).forEach(l => {
          const item = map[String(l.account)];
          if (!item) return;
          const amt = Number(l.amount) || Number(l.debit) || Number(l.credit) || 0;
          const dc = String(l.dc || (Number(l.debit) > 0 ? 'D' : 'C')).toUpperCase();
          if (type === 'Revenue') {
            item.value += (dc === 'C' ? amt : -amt);
          } else {
            item.value += (dc === 'D' ? amt : -amt);
          }
        });
      });

    return Object.values(map)
      .filter(x => x.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, limit);
  }

  function calculateCashFlowSummary(db, fromDate, toDate) {
    const tx = (db.journals || []).filter(j => j.date >= fromDate && j.date <= toDate);
    let masuk = 0;
    let keluar = 0;

    tx.forEach(j => {
      (j.lines || []).forEach(l => {
        const code = String(l.account || '');
        const v = Number(l.amount) || (Number(l.debit) || 0) || (Number(l.credit) || 0);
        if (!/^1101|^1102/.test(code)) return;
        const dc = String(l.dc || (Number(l.debit) > 0 ? 'D' : 'C')).toUpperCase();
        if (dc === 'D') masuk += v;
        else keluar += v;
      });
    });

    const net = masuk - keluar;
    const total = Math.max(masuk + keluar, 1);
    const pIn = (masuk / total) * 100;
    const pOut = (keluar / total) * 100;

    return { masuk, keluar, net, pIn, pOut };
  }

  function calculateEquitySummary(db, fromDate, toDate) {
    const coa = (db.coa || []).filter(a => a.type === 'Equity' && a.postable !== false && !Domain.isHeader(a));
    const vals = {};
    coa.forEach(a => {
      vals[a.code] = { code: a.code, name: a.name, value: 0 };
    });

    (db.journals || [])
      .filter(j => j.date >= fromDate && j.date <= toDate)
      .forEach(j => {
        (j.lines || []).forEach(l => {
          const item = vals[String(l.account)];
          if (!item) return;
          const amt = Number(l.amount) || (Number(l.debit) || 0) || (Number(l.credit) || 0);
          const dc = String(l.dc || (Number(l.debit) > 0 ? 'D' : 'C')).toUpperCase();
          item.value += (dc === 'C' ? amt : -amt);
        });
      });

    const rows = Object.values(vals)
      .filter(x => x.value !== 0)
      .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
      .slice(0, 10);
    const total = rows.reduce((s, x) => s + Math.max(0, x.value), 0) || 1;

    return { rows, total };
  }

  function calculateRatios(db, fromDate, toDate) {
    const periodTotals = totals(db, fromDate, toDate);
    const allTotals = totals(db);
    const rev = periodTotals.Revenue;
    const exp = periodTotals.Expense;
    const profit = rev - exp;

    const currentAssets = (db.coa || [])
      .filter(a => a.type === 'Asset' && (a.code.startsWith('11') || (a.group || '').toLowerCase().includes('lancar')))
      .reduce((s, a) => s + normalBalance(a, sumAccount(db, a.code, fromDate, toDate)), 0);

    const currentLiab = (db.coa || [])
      .filter(a => a.type === 'Liability' && (a.code.startsWith('21') || (a.group || '').toLowerCase().includes('pendek')))
      .reduce((s, a) => s + normalBalance(a, sumAccount(db, a.code, fromDate, toDate)), 0) || periodTotals.Liability;

    const cash = (db.coa || [])
      .filter(a => a.code.startsWith('1101') || a.code.startsWith('1102'))
      .reduce((s, a) => s + normalBalance(a, sumAccount(db, a.code, fromDate, toDate)), 0);

    return [
      { name: 'Current Ratio', value: currentLiab ? (currentAssets / currentLiab) : 0, isRatio: true },
      { name: 'Debt to Asset', value: allTotals.Asset ? (allTotals.Liability / allTotals.Asset) * 100 : 0, isRatio: false },
      { name: 'Net Profit Margin', value: rev ? (profit / rev) * 100 : 0, isRatio: false },
      { name: 'ROA', value: allTotals.Asset ? (profit / allTotals.Asset) * 100 : 0, isRatio: false }
    ];
  }

  function validateIntegrity(db) {
    const errors = [];
    const coa = Array.isArray(db.coa) ? db.coa : [];
    const byCode = new Map();

    coa.forEach(a => {
      const c = String(a.code || '').trim();
      if (!c) errors.push('Ada akun tanpa kode.');
      else if (byCode.has(c)) errors.push('Kode akun ganda: ' + c);
      else byCode.set(c, a);
      if (!a.name) errors.push('Akun ' + c + ' belum memiliki nama.');
    });

    (db.journals || []).forEach((j, i) => {
      const lines = Array.isArray(j.lines) ? j.lines : [];
      let d = 0;
      let c = 0;
      lines.forEach(l => {
        const code = String(l.account || l.code || '');
        const a = byCode.get(code);
        const debit = Number(l.debit) || 0;
        const credit = Number(l.credit) || 0;
        const amt = Number(l.amount) || debit || credit || 0;
        const dc = String(l.dc || (debit > 0 ? 'D' : 'C')).toUpperCase();

        if (!a) errors.push(`Jurnal ${j.id || i + 1} memakai akun yang tidak ada (${code}).`);
        else if (Domain.isHeader(a)) errors.push(`Jurnal ${j.id || i + 1} memakai akun header/non-posting: ${a.code}`);
        if (amt < 0) errors.push(`Jurnal ${j.id || i + 1} memiliki nilai negatif.`);

        if (dc === 'D') d += amt;
        if (dc === 'C') c += amt;
      });

      if (lines.length && Math.abs(d - c) > 0.005) {
        errors.push(`Jurnal ${j.id || j.no || i + 1} tidak seimbang: Debit ${d} ≠ Kredit ${c}.`);
      }
    });

    return errors;
  }

  Domain.AccountingEngine = {
    getActivePostingAccounts,
    normalBalance,
    sumAccount,
    totals,
    rankAccounts,
    calculateCashFlowSummary,
    calculateEquitySummary,
    calculateRatios,
    validateIntegrity
  };
})(window.App.Domain);
