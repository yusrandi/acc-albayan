/**
 * AL BAYAN HIDAYATULLAH MAKASSAR — Storage Repository (Hybrid MySQL & LocalStorage)
 * Interface Adapter / Data Access Layer with Automatic MySQL Sync & Offline Fallback
 */
window.App = window.App || {};
window.App.Repositories = window.App.Repositories || {};

(function (Repositories, Domain) {
  const ROOT_KEY = 'finpro_accounting_v1';

  function normalize(db) {
    db = db || {};

    // Settings
    db.settings = db.settings || {};
    db.settings.name = db.settings.name || 'AL BAYAN HIDAYATULLAH MAKASSAR';
    db.settings.period = db.settings.period || new Date().toISOString().slice(0, 7);
    db.settings.standard = db.settings.standard || 'SAK Entitas Privat (EP)';

    // COA
    if (!Array.isArray(db.coa) || db.coa.length === 0) {
      db.coa = Domain.DEFAULT_COA.map(a => Domain.createAccount(a));
    } else {
      db.coa = db.coa.map(a => Domain.createAccount(a));
    }

    // Journals
    db.journals = Array.isArray(db.journals) ? db.journals : [];
    db.journals.forEach((j, i) => {
      j.id = String(j.id || ('JRN-' + (i + 1)));
      j.date = String(j.date || new Date().toISOString().slice(0, 10));
      j.no = String(j.no || ('JV-' + String(i + 1).padStart(5, '0')));
      j.desc = String(j.desc || '');
      j.lines = Array.isArray(j.lines) ? j.lines : [];
      j.meta = j.meta || {};

      j.lines.forEach(l => {
        l.account = String(l.account || l.code || '').trim();
        let d = Number(l.debit) || 0;
        let c = Number(l.credit) || 0;
        let amt = Number(l.amount) || 0;

        if (d === 0 && c === 0 && amt > 0) {
          if (String(l.dc || l.side || '').toUpperCase() === 'C') c = amt;
          else d = amt;
        }

        l.debit = Math.max(0, d);
        l.credit = Math.max(0, c);
        l.amount = l.debit || l.credit || 0;
        l.dc = l.debit > 0 && l.credit === 0 ? 'D' : (l.credit > 0 && l.debit === 0 ? 'C' : (String(l.dc || 'D').toUpperCase() === 'C' ? 'C' : 'D'));
      });
    });

    // Budgets
    db.budgets = Array.isArray(db.budgets) ? db.budgets.map(b => Domain.createBudget(b)) : [];

    // Assets
    db.assets = Array.isArray(db.assets) ? db.assets.map(a => Domain.createAsset(a)) : [];

    // Users & Session
    if (!Array.isArray(db.users) || !db.users.length) {
      db.users = [{ username: 'admin', password: 'admin123', role: 'Administrator', active: true }];
    }
    if (!db.session) {
      db.session = { loggedIn: false, username: '' };
    }

    return db;
  }

  class StorageRepository {
    constructor() {
      this.cache = null;
      this.isMySql = false;
    }

    async init() {
      try {
        const isOnline = await Repositories.ApiRepository.checkHealth();
        if (isOnline) {
          const remoteData = await Repositories.ApiRepository.fetchBootstrap();
          // Preserve local session if present
          const localSession = this.getLocalSession();
          this.cache = normalize({ ...remoteData, session: localSession });
          this.isMySql = true;
          this.updateUiBadge(true);
        } else {
          this.isMySql = false;
          this.updateUiBadge(false);
        }
      } catch (err) {
        console.warn('MySQL API server not reachable, using local storage:', err.message);
        this.isMySql = false;
        this.updateUiBadge(false);
      }
      return this.getDB();
    }

    updateUiBadge(online) {
      const badge = document.getElementById('dbModeBadge');
      if (badge) {
        if (online) {
          badge.textContent = '🟢 MySQL Database';
          badge.className = 'mini-badge';
          badge.style.color = '#067647';
          badge.style.background = '#ecfdf3';
          badge.title = 'Terhubung langsung ke MySQL (localhost:3001)';
        } else {
          badge.textContent = '🟡 LocalStorage (Offline)';
          badge.className = 'mini-badge';
          badge.style.color = '#b54708';
          badge.style.background = '#fffaeb';
          badge.title = 'Berjalan offline di browser. Jalankan backend server untuk mode MySQL.';
        }
      }
    }

    getLocalSession() {
      try {
        const raw = localStorage.getItem(ROOT_KEY);
        const parsed = raw ? JSON.parse(raw) : null;
        return parsed?.session || { loggedIn: false, username: '' };
      } catch (e) {
        return { loggedIn: false, username: '' };
      }
    }

    getDB() {
      if (this.cache) return this.cache;
      try {
        const raw = localStorage.getItem(ROOT_KEY);
        const parsed = raw ? JSON.parse(raw) : null;
        this.cache = normalize(parsed);
      } catch (e) {
        console.error('StorageRepository read error:', e);
        this.cache = normalize(null);
      }
      return this.cache;
    }

    saveDB(newDb) {
      const normalized = normalize(newDb || this.cache);
      try {
        localStorage.setItem(ROOT_KEY, JSON.stringify(normalized));
        this.cache = normalized;
        window.db = normalized;
      } catch (e) {
        console.error('StorageRepository write error:', e);
      }
      return this.cache;
    }

    resetDB() {
      localStorage.removeItem(ROOT_KEY);
      this.cache = null;
    }

    getAccounts() {
      return this.getDB().coa || [];
    }

    getPostingAccounts() {
      return this.getAccounts().filter(a => a.active !== false && a.postable !== false && !Domain.isHeader(a));
    }

    getJournals() {
      return this.getDB().journals || [];
    }

    getBudgets() {
      return this.getDB().budgets || [];
    }

    getAssets() {
      return this.getDB().assets || [];
    }

    getSettings() {
      return this.getDB().settings || {};
    }

    getUsedAccountCodes() {
      const counts = {};
      this.getJournals().forEach(j => {
        (j.lines || []).forEach(l => {
          const c = String(l.account || '');
          if (c) counts[c] = (counts[c] || 0) + 1;
        });
      });
      return counts;
    }
  }

  Repositories.StorageRepository = new StorageRepository();
})(window.App.Repositories, window.App.Domain);

// Synchronize window.db at start
window.db = window.App.Repositories.StorageRepository.getDB();
window.saveDB = () => window.App.Repositories.StorageRepository.saveDB(window.db);
window.save = window.saveDB;
