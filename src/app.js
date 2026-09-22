/**
 * AL BAYAN HIDAYATULLAH MAKASSAR — Application Entrypoint & Router
 * Clean Architecture Application Bootstrapper
 */
window.App = window.App || {};

(function (App) {
  const PAGE_TITLES = {
    dashboard: 'Dashboard Keuangan',
    evaluation: 'Evaluasi & Rasio Keuangan',
    journal: 'Jurnal Umum (Double-Entry)',
    ledger: 'Buku Besar Akun',
    cash: 'Buku Kas & Bank',
    trial: 'Neraca Saldo (Trial Balance)',
    income: 'Laporan Laba Rugi',
    balance: 'Laporan Posisi Keuangan (Neraca)',
    cashflow: 'Laporan Arus Kas',
    equity: 'Laporan Perubahan Ekuitas',
    budget: 'Anggaran vs Realisasi Program',
    assets: 'Manajemen Aset Tetap',
    coa: 'Bagan Akun Standar (COA)',
    settings: 'Pengaturan Entitas & Keamanan',
    exports: 'Pusat Export / Import Laporan'
  };

  class Router {
    constructor() {
      this.currentPage = 'dashboard';
    }

    navigate(pageId) {
      if (!pageId) pageId = 'dashboard';
      this.currentPage = pageId;

      // Hide all pages, show target
      document.querySelectorAll('.page').forEach(el => el.classList.remove('active'));
      const targetPage = document.getElementById(pageId);
      if (targetPage) targetPage.classList.add('active');

      // Update active nav button
      document.querySelectorAll('.nav button').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.page === pageId);
      });

      // Update Page Title
      const titleEl = document.getElementById('pageTitle');
      if (titleEl) {
        titleEl.textContent = PAGE_TITLES[pageId] || pageId;
      }

      this.renderAll();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    openModal(html) {
      const modal = document.getElementById('modal');
      const box = document.getElementById('modalBox');
      if (modal && box) {
        box.innerHTML = html;
        modal.classList.add('open');
      }
    }

    closeModal() {
      const modal = document.getElementById('modal');
      if (modal) modal.classList.remove('open');
    }

    renderAll() {
      const session = App.UseCases.AuthUseCase.getSession();
      const loginScreen = document.getElementById('loginScreen');
      const userChip = document.getElementById('currentUser');
      const periodText = document.getElementById('periodText');
      const db = App.Repositories.StorageRepository.getDB();

      if (session && session.loggedIn) {
        if (loginScreen) loginScreen.style.display = 'none';
        if (userChip) userChip.textContent = session.username;
      } else {
        if (loginScreen) loginScreen.style.display = 'flex';
      }

      if (periodText && db.settings) {
        periodText.textContent = `${db.settings.name} • ${db.settings.period} • ${db.settings.standard}`;
      }

      // Update DB indicator
      App.Repositories.StorageRepository.updateUiBadge(App.Repositories.StorageRepository.isMySql);

      // Render Views safely
      const Views = App.UI.Views;
      try { Views.DashboardView?.render(); } catch (e) { console.error('DashboardView error:', e); }
      try { Views.BudgetView?.render(); } catch (e) { console.error('BudgetView error:', e); }
      try { Views.AssetView?.render(); } catch (e) { console.error('AssetView error:', e); }
      try { Views.JournalView?.render(); } catch (e) { console.error('JournalView error:', e); }
      try { Views.LedgerView?.render(); } catch (e) { console.error('LedgerView error:', e); }
      try { Views.CashView?.render(); } catch (e) { console.error('CashView error:', e); }
      try { Views.ReportsView?.render(); } catch (e) { console.error('ReportsView error:', e); }
      try { Views.CoaView?.render(); } catch (e) { console.error('CoaView error:', e); }
      try { Views.EvaluationView?.render(); } catch (e) { console.error('EvaluationView error:', e); }
      try { Views.SettingsView?.render(); } catch (e) { console.error('SettingsView error:', e); }
      try { Views.ExportsView?.render(); } catch (e) { console.error('ExportsView error:', e); }
    }

    async init() {
      // Nav buttons binding
      document.querySelectorAll('.nav button[data-page]').forEach(btn => {
        btn.onclick = () => this.navigate(btn.dataset.page);
      });

      // View events binding
      App.UI.Views.AssetView?.bindEvents();
      App.UI.Views.CoaView?.bindEvents();
      App.UI.Views.ExportsView?.bindEvents();

      // Modal background click to close
      const modal = document.getElementById('modal');
      if (modal) {
        modal.addEventListener('click', e => {
          if (e.target === modal) this.closeModal();
        });
      }

      // Check MySQL connection & Bootstrap
      try {
        await App.Repositories.StorageRepository.init();
      } catch (e) {
        console.warn('Repository init error:', e);
      }

      // Initial page navigation
      this.navigate('dashboard');
    }
  }

  App.Router = new Router();

  // Authentication Handlers
  window.login = async function () {
    const userIn = document.getElementById('loginUser');
    const passIn = document.getElementById('loginPass');
    const msgEl = document.getElementById('loginMsg');

    try {
      if (msgEl) msgEl.textContent = 'Memproses masuk...';
      await App.UseCases.AuthUseCase.login(userIn?.value, passIn?.value);
      if (msgEl) msgEl.textContent = '';
      App.Router.renderAll();
    } catch (err) {
      if (msgEl) msgEl.textContent = err.message;
    }
  };

  window.logout = function () {
    App.UseCases.AuthUseCase.logout();
    const passIn = document.getElementById('loginPass');
    const msgEl = document.getElementById('loginMsg');
    if (passIn) passIn.value = '';
    if (msgEl) msgEl.textContent = '';
    const screen = document.getElementById('loginScreen');
    if (screen) screen.style.display = 'flex';
  };

  window.showPage = function (p) {
    App.Router.navigate(p);
  };

  window.openModal = function () {
    const modal = document.getElementById('modal');
    if (modal) modal.classList.add('open');
  };

  window.closeModal = function () {
    App.Router.closeModal();
  };

  window.renderAll = function () {
    App.Router.renderAll();
  };

  window.accounts = function () {
    return App.Repositories.StorageRepository.getPostingAccounts();
  };

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => App.Router.init());
  } else {
    App.Router.init();
  }
})(window.App);
