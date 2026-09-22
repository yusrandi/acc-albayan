/**
 * AL BAYAN HIDAYATULLAH MAKASSAR — API Repository
 * Client adapter connecting the SPA to Node.js / MySQL Backend REST API
 */
window.App = window.App || {};
window.App.Repositories = window.App.Repositories || {};

(function (Repositories) {
  const getApiBase = () => {
    if (window.__API_URL__) return window.__API_URL__;
    const { protocol, hostname, port } = window.location;
    if (port === '3001' || port === '' || port === '80' || port === '443') {
      return '/api';
    }
    return `${protocol}//${hostname}:3001/api`;
  };

  const API_BASE = getApiBase();


  class ApiRepository {
    constructor() {
      this.isOnline = false;
    }

    async checkHealth() {
      try {
        const res = await fetch(`${API_BASE}/health`, { method: 'GET', signal: AbortSignal.timeout(2500) });
        const data = await res.json();
        this.isOnline = data.status === 'ok';
        return this.isOnline;
      } catch (e) {
        this.isOnline = false;
        return false;
      }
    }

    async fetchBootstrap() {
      const res = await fetch(`${API_BASE}/bootstrap`);
      if (!res.ok) throw new Error('Gagal mengambil data dari server MySQL.');
      return await res.json();
    }

    async login(username, password) {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login gagal.');
      return data.user;
    }

    async changePassword(oldUsername, oldPassword, newUsername, newPassword) {
      const res = await fetch(`${API_BASE}/auth/password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldUsername, oldPassword, newUsername, newPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ubah password gagal.');
      return data;
    }

    async saveSettings(settings) {
      const res = await fetch(`${API_BASE}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan pengaturan.');
      return data;
    }

    async saveAccount(oldCode, accountData) {
      const isUpdate = Boolean(oldCode);
      const url = isUpdate ? `${API_BASE}/coa/${encodeURIComponent(oldCode)}` : `${API_BASE}/coa`;
      const method = isUpdate ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(accountData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan akun COA.');
      return data;
    }

    async deleteAccount(code, replacementCode) {
      let url = `${API_BASE}/coa/${encodeURIComponent(code)}`;
      if (replacementCode) url += `?replacement=${encodeURIComponent(replacementCode)}`;

      const res = await fetch(url, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menghapus akun.');
      return data;
    }

    async postJournal(journalData) {
      const res = await fetch(`${API_BASE}/journals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(journalData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal memposting jurnal ke database.');
      return data;
    }

    async deleteJournal(id) {
      const res = await fetch(`${API_BASE}/journals/${encodeURIComponent(id)}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menghapus jurnal.');
      return data;
    }

    async saveBudget(budgetData) {
      const res = await fetch(`${API_BASE}/budgets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(budgetData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan data anggaran.');
      return data;
    }

    async deleteBudget(id) {
      const res = await fetch(`${API_BASE}/budgets/${encodeURIComponent(id)}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menghapus anggaran.');
      return data;
    }

    async saveAsset(assetData) {
      const res = await fetch(`${API_BASE}/assets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assetData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan aset ke database.');
      return data;
    }

    async deleteAsset(id) {
      const res = await fetch(`${API_BASE}/assets/${encodeURIComponent(id)}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menghapus aset.');
      return data;
    }

    async syncFromLocal(localDb) {
      const res = await fetch(`${API_BASE}/sync/from-local`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(localDb)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal migrasi data ke MySQL.');
      return data;
    }
  }

  Repositories.ApiRepository = new ApiRepository();
})(window.App.Repositories);
