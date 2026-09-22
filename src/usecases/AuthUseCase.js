/**
 * AL BAYAN HIDAYATULLAH MAKASSAR — Auth Use Case
 * Multi-user authentication supporting both MySQL DB and LocalStorage
 */
window.App = window.App || {};
window.App.UseCases = window.App.UseCases || {};

(function (UseCases, Repositories) {
  class AuthUseCase {
    constructor(repo, apiRepo) {
      this.repo = repo;
      this.apiRepo = apiRepo;
    }

    async login(username, password) {
      const u = String(username || '').trim();
      const p = String(password || '');

      if (this.repo.isMySql) {
        try {
          const user = await this.apiRepo.login(u, p);
          const db = this.repo.getDB();
          db.session = { loggedIn: true, username: user.username };
          this.repo.saveDB(db);
          return user;
        } catch (err) {
          throw err;
        }
      }

      // Local fallback
      const db = this.repo.getDB();
      const found = (db.users || []).find(x => x.username === u && x.password === p && x.active !== false);
      if (!found) {
        throw new Error('Username atau password salah.');
      }

      db.session = { loggedIn: true, username: found.username };
      this.repo.saveDB(db);
      return found;
    }

    logout() {
      const db = this.repo.getDB();
      db.session = { loggedIn: false, username: '' };
      this.repo.saveDB(db);
    }

    async changePassword(oldUsername, oldPassword, newUsername, newPassword, confirmPassword) {
      const newU = String(newUsername || '').trim();
      if (!newU) throw new Error('Username wajib diisi.');
      if (newPassword.length < 6) throw new Error('Password baru minimal 6 karakter.');
      if (newPassword !== confirmPassword) throw new Error('Konfirmasi password tidak cocok.');

      if (this.repo.isMySql) {
        await this.apiRepo.changePassword(oldUsername, oldPassword, newU, newPassword);
      }

      const db = this.repo.getDB();
      const u = (db.users || []).find(x => x.username === oldUsername);
      if (u) {
        u.username = newU;
        u.password = newPassword;
      }
      db.session.username = newU;
      this.repo.saveDB(db);
      return { username: newU };
    }

    getSession() {
      const db = this.repo.getDB();
      return db.session || { loggedIn: false, username: '' };
    }
  }

  UseCases.AuthUseCase = new AuthUseCase(Repositories.StorageRepository, Repositories.ApiRepository);
})(window.App.UseCases, window.App.Repositories);
