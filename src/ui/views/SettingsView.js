/**
 * AL BAYAN HIDAYATULLAH MAKASSAR — Settings View
 * System preferences, entity profile, security, and database maintenance
 */
window.App = window.App || {};
window.App.UI = window.App.UI || {};
window.App.UI.Views = window.App.UI.Views || {};

(function (Views, Domain, UseCases, Repositories, Utils) {
  Views.SettingsView = {
    render() {
      const db = Repositories.StorageRepository.getDB();
      const settings = db.settings || {};

      const nameEl = document.getElementById('setName');
      const periodEl = document.getElementById('setPeriod');
      const standardEl = document.getElementById('setStandard');

      if (nameEl) nameEl.value = settings.name || 'AL BAYAN HIDAYATULLAH MAKASSAR';
      if (periodEl) periodEl.value = settings.period || Utils.currentMonth();
      if (standardEl) standardEl.value = settings.standard || 'SAK Entitas Privat (EP)';

      // Update Database Status in Settings Page
      const dbStatusEl = document.getElementById('dbStatusDetail');
      if (dbStatusEl) {
        if (Repositories.StorageRepository.isMySql) {
          dbStatusEl.innerHTML = '<span style="color:#087443;font-weight:700">🟢 Terhubung ke MySQL (localhost:3001)</span>. Seluruh perubahan otomatis tersimpan di database MySQL.';
        } else {
          dbStatusEl.innerHTML = '<span style="color:#b54708;font-weight:700">🟡 Mode Offline (LocalStorage)</span>. Backend server belum aktif, data disimpan di browser.';
        }
      }
    },

    async save() {
      const db = Repositories.StorageRepository.getDB();
      const name = document.getElementById('setName')?.value || 'AL BAYAN HIDAYATULLAH MAKASSAR';
      const period = document.getElementById('setPeriod')?.value || Utils.currentMonth();
      const standard = document.getElementById('setStandard')?.value || 'SAK Entitas Privat (EP)';

      db.settings = { name, period, standard };

      if (Repositories.StorageRepository.isMySql) {
        try {
          await Repositories.ApiRepository.saveSettings(db.settings);
        } catch (err) {
          console.error('MySQL save settings error:', err);
        }
      }

      Repositories.StorageRepository.saveDB(db);
      window.App.Router.renderAll();
      alert('Pengaturan entitas dan periode berhasil disimpan.');
    },

    openPasswordModal() {
      const db = Repositories.StorageRepository.getDB();
      const session = UseCases.AuthUseCase.getSession();
      const currentUser = (db.users || []).find(x => x.username === session.username) || db.users[0];

      window.App.Router.openModal(`
        <div class="modalhead">
          <h3>Kelola Pengguna & Kata Sandi</h3>
          <button class="x" onclick="window.App.Router.closeModal()">×</button>
        </div>
        <div class="form" style="margin-top:15px">
          <div class="field"><label>Username</label><input id="newUser" value="${Utils.esc(currentUser.username)}"></div>
          <div class="field"><label>Password Lama</label><input id="oldPass" type="password" placeholder="Masukkan password saat ini"></div>
          <div class="field"><label>Password Baru</label><input id="newPass" type="password" placeholder="Minimal 6 karakter"></div>
          <div class="field"><label>Konfirmasi Password Baru</label><input id="newPass2" type="password" placeholder="Ulangi password baru"></div>
          <button class="btn primary" onclick="window.App.UI.Views.SettingsView.submitPassword('${Utils.esc(currentUser.username)}')">Simpan Perubahan</button>
        </div>
      `);
    },

    async submitPassword(oldUser) {
      const oldPass = document.getElementById('oldPass')?.value;
      const newUser = document.getElementById('newUser')?.value;
      const newPass = document.getElementById('newPass')?.value;
      const newPass2 = document.getElementById('newPass2')?.value;

      try {
        const u = await UseCases.AuthUseCase.changePassword(oldUser, oldPass, newUser, newPass, newPass2);
        const userChip = document.getElementById('currentUser');
        if (userChip) userChip.textContent = u.username;
        window.App.Router.closeModal();
        alert('Username dan kata sandi berhasil diperbarui.');
      } catch (err) {
        alert(err.message);
      }
    },

    reset() {
      if (confirm('PERINGATAN: Seluruh data COA, jurnal umum, anggaran, aset, dan pengaturan akan dihapus dan direset ke standar awal. Apakah Anda yakin ingin melanjutkan?')) {
        Repositories.StorageRepository.resetDB();
        location.reload();
      }
    },

    runIntegrityCheck() {
      const db = Repositories.StorageRepository.getDB();
      const errors = Domain.AccountingEngine.validateIntegrity(db);
      if (!errors.length) {
        alert('✓ PEMERIKSAAN BERHASIL\n\nCOA, saldo normal, jurnal debit/kredit seimbang, dan relasi akun terverifikasi tanpa error.');
      } else {
        alert(`⚠ DITEMUKAN ${errors.length} MASALAH:\n\n` + errors.slice(0, 25).join('\n'));
      }
    },

    async syncToMySql() {
      if (!confirm('Migrasi ini akan menyalin seluruh data dari LocalStorage ke database MySQL di localhost:3001. Lanjutkan?')) return;
      try {
        const localDb = Repositories.StorageRepository.getDB();
        const res = await Repositories.ApiRepository.syncFromLocal(localDb);
        alert(res.message || 'Data berhasil disinkronkan ke MySQL!');
        await Repositories.StorageRepository.init();
        window.App.Router.renderAll();
      } catch (err) {
        alert('Gagal migrasi ke MySQL: ' + err.message);
      }
    }
  };
})(window.App.UI.Views, window.App.Domain, window.App.UseCases, window.App.Repositories, window.App.Utils);

// Global aliases
window.saveSettings = () => window.App.UI.Views.SettingsView.save();
window.openPassword = () => window.App.UI.Views.SettingsView.openPasswordModal();
window.saveUserPassword = oldUser => window.App.UI.Views.SettingsView.submitPassword(oldUser);
window.resetData = () => window.App.UI.Views.SettingsView.reset();
window.runAccountingIntegrityCheck = () => window.App.UI.Views.SettingsView.runIntegrityCheck();
window.syncLocalToMySql = () => window.App.UI.Views.SettingsView.syncToMySql();
