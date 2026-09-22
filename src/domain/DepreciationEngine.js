/**
 * AL BAYAN HIDAYATULLAH MAKASSAR — Depreciation Engine
 * Domain Service for SAK EP Fixed Asset Depreciation & Carrying Value
 */
window.App = window.App || {};
window.App.Domain = window.App.Domain || {};

(function (Domain) {
  function monthsBetween(start, end) {
    const s = new Date(start + 'T00:00:00');
    const e = new Date(end + 'T00:00:00');
    return Math.max(0, (e.getFullYear() - s.getFullYear()) * 12 + e.getMonth() - s.getMonth() + 1);
  }

  function defaultAssetAccount(cat) {
    const c = String(cat || '').toLowerCase();
    if (c.includes('bangun')) return '1202';
    if (c.includes('kendaraan')) return '1203';
    if (c.includes('mesin')) return '1205';
    return '1204';
  }

  function defaultAccumAccount(cat) {
    const c = String(cat || '').toLowerCase();
    if (c.includes('bangun')) return '1291';
    if (c.includes('kendaraan')) return '1292';
    if (c.includes('mesin')) return '1294';
    return '1293';
  }

  function depToDate(a, toDate) {
    if (a.status === 'Dilepas') return 0;
    const start = new Date((a.availableDate || a.acquisitionDate) + 'T00:00:00');
    const end = new Date(toDate + 'T00:00:00');
    if (end < start) return 0;

    const depreciable = Math.max(0, a.cost - a.residual);
    const lifeMonths = Math.max(1, Math.round(a.usefulYears * 12));
    const elapsed = Math.min(lifeMonths, monthsBetween(a.availableDate || a.acquisitionDate, toDate));

    if (a.method === 'DB') {
      const rate = 2 / lifeMonths;
      let nbv = a.cost;
      let total = 0;
      for (let m = 1; m <= elapsed; m++) {
        const d = Math.min(Math.max(0, nbv - a.residual), nbv * rate);
        total += d;
        nbv -= d;
        if (nbv <= a.residual + 0.005) break;
      }
      return Math.min(depreciable, total);
    }

    if (a.method === 'UOP') {
      if (a.unitsTotal <= 0) return 0;
      return Math.min(depreciable, depreciable * (Math.min(a.unitsUsed, a.unitsTotal) / a.unitsTotal));
    }

    // Straight Line (SL)
    return Math.min(depreciable, depreciable * (elapsed / lifeMonths));
  }

  function postedDep(asset, db, period) {
    return (db.journals || [])
      .filter(j => j.meta && j.meta.assetId === asset.id && j.meta.kind === 'depreciation' && j.meta.period === period)
      .reduce((s, j) => {
        return s + (j.lines || [])
          .filter(l => String(l.account) === String(asset.expenseAccount) && String(l.dc || (Number(l.debit) > 0 ? 'D' : 'C')).toUpperCase() === 'D')
          .reduce((x, l) => x + (Number(l.amount) || Number(l.debit) || 0), 0);
      }, 0);
  }

  function accumulatedFromJournals(asset, db) {
    return (db.journals || [])
      .filter(j => j.meta && j.meta.assetId === asset.id && j.meta.kind === 'depreciation')
      .reduce((s, j) => {
        return s + (j.lines || [])
          .filter(l => String(l.account) === String(asset.accumAccount) && String(l.dc || (Number(l.credit) > 0 ? 'C' : 'D')).toUpperCase() === 'C')
          .reduce((x, l) => x + (Number(l.amount) || Number(l.credit) || 0), 0);
      }, 0);
  }

  function assetState(asset, db, periodEnd, currentPeriod = '') {
    const fromJournals = accumulatedFromJournals(asset, db);
    const accumulated = Math.min(Math.max(0, asset.cost - asset.residual), Math.max(0, fromJournals));
    const book = Math.max(asset.residual, asset.cost - accumulated);
    const plan = depToDate(asset, periodEnd);
    const period = currentPeriod ? postedDep(asset, db, currentPeriod) : 0;

    return { accumulated, book, plan, period };
  }

  Domain.DepreciationEngine = {
    monthsBetween,
    defaultAssetAccount,
    defaultAccumAccount,
    depToDate,
    postedDep,
    accumulatedFromJournals,
    assetState
  };
})(window.App.Domain);
