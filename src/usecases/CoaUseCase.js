/**
 * AL BAYAN HIDAYATULLAH MAKASSAR — Chart of Accounts (COA) Use Case
 * Account management, safe renaming, and MySQL persistence
 */
window.App = window.App || {};
window.App.UseCases = window.App.UseCases || {};

(function (UseCases, Domain, Repositories) {
  class CoaUseCase {
    constructor(repo, apiRepo) {
      this.repo = repo;
      this.apiRepo = apiRepo;
    }

    getAccounts(filterText = '', filterType = '') {
      const q = String(filterText || '').toLowerCase();
      const type = String(filterType || '');

      return this.repo.getAccounts()
        .filter(a => {
          const matchQuery = !q || (a.code + ' ' + a.name + ' ' + (a.group || '')).toLowerCase().includes(q);
          const matchType = !type || a.type === type;
          return matchQuery && matchType;
        })
        .sort((a, b) => a.code.localeCompare(b.code));
    }

    async saveAccount(oldCode, data) {
      const db = this.repo.getDB();
      const code = String(data.code || '').trim();
      const name = String(data.name || '').trim();

      if (!code || !name) throw new Error('Kode dan nama akun wajib diisi.');
      if (!Domain.ACCOUNT_TYPES.includes(data.type)) throw new Error('Tipe akun tidak valid.');
      if (!Domain.NORMAL_BALANCES.includes(data.normal)) throw new Error('Saldo normal tidak valid.');

      const duplicate = db.coa.some(a => a.code === code && a.code !== oldCode);
      if (duplicate) throw new Error(`Kode akun ${code} sudah digunakan.`);

      const account = Domain.createAccount(data);

      if (this.repo.isMySql) {
        try {
          await this.apiRepo.saveAccount(oldCode, account);
        } catch (err) {
          console.error('MySQL saveAccount error:', err);
        }
      }

      const idx = db.coa.findIndex(a => a.code === oldCode);
      if (idx >= 0) {
        db.coa[idx] = account;
        if (oldCode && oldCode !== code) {
          (db.journals || []).forEach(j => {
            (j.lines || []).forEach(l => {
              if (String(l.account) === oldCode) {
                l.account = code;
              }
            });
          });
        }
      } else {
        db.coa.push(account);
      }

      this.repo.saveDB(db);
      return account;
    }

    async deleteAccount(code, replacementCode = null) {
      const db = this.repo.getDB();
      const usedCounts = this.repo.getUsedAccountCodes();
      const used = usedCounts[code] || 0;

      if (used > 0) {
        if (!replacementCode || replacementCode === code) {
          throw new Error(`Akun ${code} dipakai pada ${used} jurnal. Tentukan akun pengganti.`);
        }
        (db.journals || []).forEach(j => {
          (j.lines || []).forEach(l => {
            if (String(l.account) === code) {
              l.account = replacementCode;
            }
          });
        });
      }

      if (this.repo.isMySql) {
        try {
          await this.apiRepo.deleteAccount(code, replacementCode);
        } catch (err) {
          console.error('MySQL deleteAccount error:', err);
        }
      }

      db.coa = db.coa.filter(a => a.code !== code);
      this.repo.saveDB(db);
    }
  }

  UseCases.CoaUseCase = new CoaUseCase(Repositories.StorageRepository, Repositories.ApiRepository);
})(window.App.UseCases, window.App.Domain, window.App.Repositories);
