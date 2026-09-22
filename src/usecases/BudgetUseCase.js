/**
 * AL BAYAN HIDAYATULLAH MAKASSAR — Budget Use Case
 * Budget monitoring, realization tracking, and MySQL persistence
 */
window.App = window.App || {};
window.App.UseCases = window.App.UseCases || {};

(function (UseCases, Domain, Repositories) {
  class BudgetUseCase {
    constructor(repo, apiRepo) {
      this.repo = repo;
      this.apiRepo = apiRepo;
    }

    getBudgets() {
      return this.repo.getBudgets();
    }

    async saveBudget(data) {
      const db = this.repo.getDB();
      db.budgets = Array.isArray(db.budgets) ? db.budgets : [];

      const unit = String(data.unit || '').trim();
      const name = String(data.name || '').trim();
      const plan = Number(data.plan) || 0;
      const actual = Number(data.actual) || 0;

      if (!name) throw new Error('Nama kegiatan/program/akun wajib diisi.');
      if (plan < 0 || !Number.isFinite(plan)) throw new Error('Nilai rencana anggaran tidak valid.');
      if (actual < 0 || !Number.isFinite(actual)) throw new Error('Nilai realisasi tidak valid.');

      const item = Domain.createBudget({
        id: data.id || ('BUD-' + Date.now()),
        unit,
        name,
        plan,
        actual
      });

      if (this.repo.isMySql) {
        try {
          await this.apiRepo.saveBudget(item);
        } catch (err) {
          console.error('MySQL saveBudget error:', err);
        }
      }

      const idx = db.budgets.findIndex(x => x.id === item.id);
      if (idx >= 0) {
        db.budgets[idx] = item;
      } else {
        db.budgets.push(item);
      }

      this.repo.saveDB(db);
      return item;
    }

    async deleteBudget(id) {
      if (this.repo.isMySql) {
        try {
          await this.apiRepo.deleteBudget(id);
        } catch (err) {
          console.error('MySQL deleteBudget error:', err);
        }
      }
      const db = this.repo.getDB();
      db.budgets = (db.budgets || []).filter(x => x.id !== id);
      this.repo.saveDB(db);
    }

    getBudgetSummary() {
      const rows = this.getBudgets();
      const plan = rows.reduce((s, x) => s + (Number(x.plan) || 0), 0);
      const actual = rows.reduce((s, x) => s + (Number(x.actual) || 0), 0);
      const remain = plan - actual;
      const pct = plan ? (actual / plan) * 100 : 0;
      const over = rows.reduce((s, x) => s + Math.max(0, (Number(x.actual) || 0) - (Number(x.plan) || 0)), 0);

      return { plan, actual, remain, pct, over, rows };
    }
  }

  UseCases.BudgetUseCase = new BudgetUseCase(Repositories.StorageRepository, Repositories.ApiRepository);
})(window.App.UseCases, window.App.Domain, window.App.Repositories);
