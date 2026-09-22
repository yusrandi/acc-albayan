/**
 * AL BAYAN HIDAYATULLAH MAKASSAR — Fixed Asset Use Case
 * Register, valuation, depreciation posting, and MySQL persistence
 */
window.App = window.App || {};
window.App.UseCases = window.App.UseCases || {};

(function (UseCases, Domain, Repositories, Utils) {
  class AssetUseCase {
    constructor(repo, apiRepo, journalUseCase) {
      this.repo = repo;
      this.apiRepo = apiRepo;
      this.journalUseCase = journalUseCase;
    }

    getAssets() {
      return this.repo.getAssets();
    }

    async saveAsset(data, postAcq = false) {
      const db = this.repo.getDB();
      db.assets = Array.isArray(db.assets) ? db.assets : [];

      const code = String(data.code || '').trim();
      const name = String(data.name || '').trim();
      const cost = Number(data.cost) || 0;
      const residual = Number(data.residual) || 0;
      const usefulYears = Number(data.usefulYears) || 0;

      if (!code || !name) throw new Error('Kode dan nama aset wajib diisi.');
      if (cost <= 0) throw new Error('Nilai perolehan harus lebih dari 0.');
      if (residual < 0 || residual > cost) throw new Error('Nilai residu tidak valid.');
      if (usefulYears <= 0) throw new Error('Umur manfaat harus lebih dari 0 tahun.');
      if (data.availableDate < data.acquisitionDate) {
        throw new Error('Tanggal tersedia tidak boleh sebelum tanggal perolehan.');
      }

      const duplicate = db.assets.some(x => x.code === code && x.id !== data.id);
      if (duplicate) throw new Error(`Kode aset ${code} sudah digunakan.`);

      const asset = Domain.createAsset(data);
      const isNew = !data.id || !db.assets.some(x => x.id === data.id);

      if (this.repo.isMySql) {
        try {
          await this.apiRepo.saveAsset(asset);
        } catch (err) {
          console.error('MySQL saveAsset error:', err);
        }
      }

      if (!isNew) {
        const idx = db.assets.findIndex(x => x.id === data.id);
        db.assets[idx] = asset;
      } else {
        db.assets.push(asset);
      }

      this.repo.saveDB(db);

      if (postAcq && isNew) {
        await this.postAcquisition(asset);
      }

      return asset;
    }

    async postAcquisition(asset) {
      const db = this.repo.getDB();
      const existing = (db.journals || []).some(j => j.meta && j.meta.assetId === asset.id && j.meta.kind === 'acquisition');
      if (existing) throw new Error('Jurnal perolehan untuk aset ini sudah pernah dibuat.');

      await this.journalUseCase.postJournal({
        date: asset.acquisitionDate,
        desc: `Perolehan aset tetap ${asset.code} - ${asset.name}`,
        lines: [
          { account: asset.assetAccount, debit: asset.cost, credit: 0, note: 'Nilai perolehan aset' },
          { account: asset.sourceAccount, debit: 0, credit: asset.cost, note: 'Sumber dana perolehan' }
        ],
        meta: { kind: 'acquisition', assetId: asset.id, assetCode: asset.code }
      });
    }

    async postDepreciation(assetId) {
      const db = this.repo.getDB();
      const asset = (db.assets || []).find(x => x.id === assetId);
      if (!asset) throw new Error('Aset tidak ditemukan.');

      const period = db.settings?.period || Utils.currentMonth();
      const [_, periodEnd] = Utils.periodBounds(period);
      const state = Domain.DepreciationEngine.assetState(asset, db, periodEnd, period);

      const due = Math.max(0, state.plan - state.accumulated);
      if (due <= 0.005) {
        throw new Error('Tidak ada beban penyusutan yang perlu diposting untuk aset ini pada periode ' + period);
      }

      if (state.period > 0) {
        throw new Error(`Penyusutan periode ${period} untuk aset ini sudah pernah diposting sebesar ${Utils.rupiah(state.period)}.`);
      }

      const amt = Math.round(due * 100) / 100;
      await this.journalUseCase.postJournal({
        date: periodEnd,
        desc: `Penyusutan ${asset.code} - ${asset.name}`,
        lines: [
          { account: asset.expenseAccount, debit: amt, credit: 0, note: `Beban penyusutan periode ${period}` },
          { account: asset.accumAccount, debit: 0, credit: amt, note: `Akumulasi penyusutan periode ${period}` }
        ],
        meta: { kind: 'depreciation', assetId: asset.id, assetCode: asset.code, period }
      });

      return amt;
    }

    async postAllDepreciation() {
      const db = this.repo.getDB();
      const period = db.settings?.period || Utils.currentMonth();
      const [_, periodEnd] = Utils.periodBounds(period);

      let count = 0;
      let total = 0;
      const errors = [];

      for (const a of (db.assets || []).filter(x => x.status === 'Aktif')) {
        const state = Domain.DepreciationEngine.assetState(a, db, periodEnd, period);
        const due = Math.max(0, state.plan - state.accumulated);

        if (due > 0.005 && state.period === 0) {
          try {
            const amt = Math.round(due * 100) / 100;
            await this.journalUseCase.postJournal({
              date: periodEnd,
              desc: `Penyusutan ${a.code} - ${a.name}`,
              lines: [
                { account: a.expenseAccount, debit: amt, credit: 0, note: `Beban penyusutan ${period}` },
                { account: a.accumAccount, debit: 0, credit: amt, note: `Akumulasi penyusutan ${period}` }
              ],
              meta: { kind: 'depreciation', assetId: a.id, assetCode: a.code, period }
            });
            count++;
            total += amt;
          } catch (err) {
            errors.push(`${a.code}: ${err.message}`);
          }
        }
      }

      return { count, total, errors };
    }

    async deleteAsset(assetId) {
      const db = this.repo.getDB();
      const hasJournals = (db.journals || []).some(j => j.meta && j.meta.assetId === assetId);
      if (hasJournals) {
        throw new Error('Aset sudah memiliki catatan jurnal. Ubah status menjadi "Dilepas" atau "Fully Depreciated" untuk menjaga riwayat audit.');
      }

      if (this.repo.isMySql) {
        try {
          await this.apiRepo.deleteAsset(assetId);
        } catch (err) {
          console.error('MySQL deleteAsset error:', err);
        }
      }

      db.assets = (db.assets || []).filter(x => x.id !== assetId);
      this.repo.saveDB(db);
    }

    getAssetSummary() {
      const db = this.repo.getDB();
      const period = db.settings?.period || Utils.currentMonth();
      const [_, periodEnd] = Utils.periodBounds(period);
      const rows = db.assets || [];

      const totalCost = rows.reduce((s, a) => s + (Number(a.cost) || 0), 0);
      const totalAccum = rows.reduce((s, a) => s + Domain.DepreciationEngine.assetState(a, db, periodEnd, period).accumulated, 0);
      const totalBook = rows.reduce((s, a) => s + Domain.DepreciationEngine.assetState(a, db, periodEnd, period).book, 0);
      const periodDep = rows.reduce((s, a) => s + Domain.DepreciationEngine.postedDep(a, db, period), 0);

      const activeCount = rows.filter(a => a.status === 'Aktif').length;
      const unpostedCount = rows.filter(a => {
        if (a.status !== 'Aktif') return false;
        const st = Domain.DepreciationEngine.assetState(a, db, periodEnd, period);
        return Math.max(0, st.plan - st.accumulated) > 0.005 && st.period === 0;
      }).length;

      return { totalCost, totalAccum, totalBook, periodDep, activeCount, unpostedCount, period };
    }
  }

  UseCases.AssetUseCase = new AssetUseCase(Repositories.StorageRepository, Repositories.ApiRepository, UseCases.JournalUseCase);
})(window.App.UseCases, window.App.Domain, window.App.Repositories, window.App.Utils);
