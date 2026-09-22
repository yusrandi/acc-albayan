/**
 * AL BAYAN HIDAYATULLAH MAKASSAR — Chart of Accounts (COA) View
 * Master akun management, modal forms, CSV template & import/export
 */
window.App = window.App || {};
window.App.UI = window.App.UI || {};
window.App.UI.Views = window.App.UI.Views || {};

(function (Views, Domain, UseCases, Repositories, Utils) {
  Views.CoaView = {
    render() {
      const q = (document.getElementById('coaSearch')?.value || '').toLowerCase();
      const type = document.getElementById('coaType')?.value || '';
      const accounts = UseCases.CoaUseCase.getAccounts(q, type);
      const usedCounts = Repositories.StorageRepository.getUsedAccountCodes();

      const el = document.getElementById('coaTable');
      if (!el) return;

      el.innerHTML = `
        <div class="tablewrap"><table class="table">
          <thead><tr>
            <th>Kode</th><th>Nama Akun</th><th>Kelompok</th><th>Tipe</th><th>Normal</th><th>Posting</th><th>Status</th><th>Dipakai</th><th>Aksi</th>
          </tr></thead>
          <tbody>${accounts.map(a => `<tr>
            <td><b>${Utils.esc(a.code)}</b></td>
            <td>${Utils.esc(a.name)}</td>
            <td>${Utils.esc(a.group || '')}</td>
            <td>${a.type}</td>
            <td>${a.normal}</td>
            <td>${a.postable !== false ? '<span class="pill good">Posting</span>' : '<span class="pill warn">Header</span>'}</td>
            <td>${a.active !== false ? '<span class="pill good">Aktif</span>' : '<span class="pill bad">Nonaktif</span>'}</td>
            <td>${usedCounts[a.code] || 0} jurnal</td>
            <td>
              <button class="btn" onclick="window.App.UI.Views.CoaView.openForm('${Utils.esc(a.code)}')">Edit</button>
              <button class="btn danger" onclick="window.App.UI.Views.CoaView.delete('${Utils.esc(a.code)}')">Hapus</button>
              <button class="btn" onclick="window.App.UI.Views.CoaView.exportOne('${Utils.esc(a.code)}')">Ekspor</button>
            </td>
          </tr>`).join('') || '<tr><td colspan="9" class="empty">Belum ada akun.</td></tr>'}</tbody>
        </table></div>
      `;
    },

    openForm(code) {
      const db = Repositories.StorageRepository.getDB();
      const a = (db.coa || []).find(x => x.code === code) || {
        code: '',
        name: '',
        type: 'Asset',
        normal: 'Debit',
        group: '',
        active: true,
        postable: true
      };
      const used = Repositories.StorageRepository.getUsedAccountCodes()[a.code] || 0;

      window.App.Router.openModal(`
        <div class="modalhead">
          <h3>${code ? 'Edit' : 'Tambah'} Akun</h3>
          <button class="x" onclick="window.App.Router.closeModal()">×</button>
        </div>
        <div class="form" style="margin-top:15px">
          <div class="grid g2">
            <div class="field"><label>Kode Akun</label><input id="aCode" value="${Utils.esc(a.code)}" placeholder="Contoh: 1101"></div>
            <div class="field"><label>Nama Akun</label><input id="aName" value="${Utils.esc(a.name)}"></div>
            <div class="field"><label>Tipe</label>
              <select id="aType">
                ${Domain.ACCOUNT_TYPES.map(x => `<option ${x === a.type ? 'selected' : ''}>${x}</option>`).join('')}
              </select>
            </div>
            <div class="field"><label>Saldo Normal</label>
              <select id="aNormal">
                <option ${a.normal === 'Debit' ? 'selected' : ''}>Debit</option>
                <option ${a.normal === 'Credit' ? 'selected' : ''}>Credit</option>
              </select>
            </div>
            <div class="field"><label>Kategori / Kelompok</label><input id="aGroup" value="${Utils.esc(a.group || '')}" placeholder="Contoh: Aset Lancar"></div>
            <div class="field"><label>Status Akun</label>
              <select id="aActive">
                <option value="true" ${a.active !== false ? 'selected' : ''}>Aktif</option>
                <option value="false" ${a.active === false ? 'selected' : ''}>Nonaktif</option>
              </select>
            </div>
            <div class="field"><label>Status Posting</label>
              <select id="aPostable">
                <option value="true" ${a.postable !== false ? 'selected' : ''}>Bisa diposting</option>
                <option value="false" ${a.postable === false ? 'selected' : ''}>Header / Kelompok (Tidak diposting)</option>
              </select>
            </div>
            <div class="field"><label>Riwayat Transaksi</label><input value="${used} transaksi jurnal" disabled></div>
          </div>
          <div class="notice">Kode akun dapat diubah sewaktu-waktu. Bila akun sudah memiliki transaksi, seluruh referensi jurnal akan dipindahkan otomatis ke kode baru tanpa merusak histori.</div>
          <button class="btn primary" onclick="window.App.UI.Views.CoaView.submitForm('${Utils.esc(code || '')}')">Simpan Akun</button>
        </div>
      `);
    },

    submitForm(oldCode) {
      try {
        const data = {
          code: document.getElementById('aCode')?.value,
          name: document.getElementById('aName')?.value,
          type: document.getElementById('aType')?.value,
          normal: document.getElementById('aNormal')?.value,
          group: document.getElementById('aGroup')?.value,
          active: document.getElementById('aActive')?.value === 'true',
          postable: document.getElementById('aPostable')?.value === 'true'
        };

        UseCases.CoaUseCase.saveAccount(oldCode, data);
        window.App.Router.closeModal();
        window.App.Router.renderAll();
        alert('Akun berhasil disimpan.');
      } catch (err) {
        alert(err.message);
      }
    },

    delete(code) {
      const db = Repositories.StorageRepository.getDB();
      const a = (db.coa || []).find(x => x.code === code);
      if (!a) return;

      const used = Repositories.StorageRepository.getUsedAccountCodes()[code] || 0;
      if (used > 0) {
        const choices = Repositories.StorageRepository.getPostingAccounts().filter(x => x.code !== code);
        if (!choices.length) {
          alert('Tidak ada akun alternatif untuk mengalihkan transaksi.');
          return;
        }

        window.App.Router.openModal(`
          <div class="modalhead">
            <h3>Hapus Akun yang Sudah Memiliki Transaksi</h3>
            <button class="x" onclick="window.App.Router.closeModal()">×</button>
          </div>
          <div class="form" style="margin-top:15px">
            <p>Akun <b>${Utils.esc(code)} — ${Utils.esc(a.name)}</b> dipakai pada <b>${used}</b> transaksi jurnal. Pilih akun pengganti agar histori pembukuan tetap utuh dan seimbang.</p>
            <div class="field">
              <label>Alihkan seluruh transaksi ke akun:</label>
              <select id="deleteReplacement">
                ${choices.map(x => `<option value="${x.code}">${x.code} — ${Utils.esc(x.name)}</option>`).join('')}
              </select>
            </div>
            <button class="btn danger" onclick="window.App.UI.Views.CoaView.confirmDeleteUsed('${Utils.esc(code)}')">Alihkan Histori & Hapus</button>
          </div>
        `);
        return;
      }

      if (confirm(`Hapus akun ${code} (${a.name}) secara permanen?`)) {
        UseCases.CoaUseCase.deleteAccount(code);
        window.App.Router.renderAll();
      }
    },

    confirmDeleteUsed(code) {
      const repl = document.getElementById('deleteReplacement')?.value;
      if (!repl || repl === code) {
        alert('Pilih akun pengganti yang valid.');
        return;
      }
      if (!confirm(`Semua riwayat transaksi dari akun ${code} akan dialihkan ke ${repl}. Lanjutkan?`)) return;

      try {
        UseCases.CoaUseCase.deleteAccount(code, repl);
        window.App.Router.closeModal();
        window.App.Router.renderAll();
        alert('Akun berhasil dihapus dan seluruh histori transaksi berhasil dialihkan.');
      } catch (err) {
        alert(err.message);
      }
    },

    exportOne(code) {
      const db = Repositories.StorageRepository.getDB();
      const a = (db.coa || []).find(x => x.code === code);
      if (!a) return;

      const out = {
        exportedAt: new Date().toISOString(),
        account: { ...a },
        usage: { journalCount: Repositories.StorageRepository.getUsedAccountCodes()[code] || 0 },
        relatedJournals: (db.journals || []).filter(j => (j.lines || []).some(l => String(l.account) === code))
      };
      Utils.downloadFile(`akun-${code}-${Utils.today()}.json`, JSON.stringify(out, null, 2), 'application/json');
    },

    exportJSON() {
      const db = Repositories.StorageRepository.getDB();
      Utils.downloadFile(`COA-detail-${Utils.today()}.json`, JSON.stringify({ version: 7, exportedAt: new Date().toISOString(), coa: db.coa }, null, 2), 'application/json');
    },

    exportCSV() {
      const db = Repositories.StorageRepository.getDB();
      const headers = ['code', 'name', 'type', 'normal', 'group', 'active', 'postable'];
      const rows = [headers, ...(db.coa || []).map(a => [a.code, a.name, a.type, a.normal, a.group || '', a.active !== false, a.postable !== false])];
      const csv = rows.map(r => r.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(',')).join('\n');
      Utils.downloadFile(`COA-bulk-${Utils.today()}.csv`, csv, 'text/csv;charset=utf-8');
    },

    downloadTemplate() {
      const rows = [
        ['code', 'name', 'type', 'normal', 'group', 'active', 'postable'],
        ['6101', 'Contoh Akun Operasional', 'Expense', 'Debit', 'Beban Operasional', 'true', 'true']
      ];
      const csv = rows.map(r => r.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(',')).join('\n');
      Utils.downloadFile('template-import-COA.csv', csv, 'text/csv;charset=utf-8');
    },

    bindEvents() {
      const fileInput = document.getElementById('coaImportFile');
      if (fileInput) {
        fileInput.onchange = e => {
          const f = e.target.files[0];
          if (!f) return;
          const reader = new FileReader();
          reader.onload = () => {
            try {
              const text = reader.result;
              let imported = 0;
              if (f.name.toLowerCase().endsWith('.json')) {
                const parsed = JSON.parse(text);
                const arr = Array.isArray(parsed) ? parsed : (parsed.coa || [parsed.account]).filter(Boolean);
                arr.forEach(item => {
                  UseCases.CoaUseCase.saveAccount(item.code, item);
                  imported++;
                });
              } else {
                const rows = Repositories.ExportImportRepository.parseCSV(text);
                if (rows.length > 1) {
                  let head = rows[0].map(x => String(x).trim().toLowerCase());
                  if (head[0] !== 'code') rows.unshift(['code', 'name', 'type', 'normal', 'group', 'active', 'postable']);
                  head = rows[0].map(x => String(x).trim().toLowerCase());

                  for (let i = 1; i < rows.length; i++) {
                    const r = rows[i];
                    const obj = {};
                    head.forEach((k, idx) => obj[k] = String(r[idx] ?? '').trim());
                    if (obj.code && obj.name) {
                      UseCases.CoaUseCase.saveAccount(obj.code, obj);
                      imported++;
                    }
                  }
                }
              }
              window.App.Router.renderAll();
              alert(`${imported} akun berhasil diimpor/diperbarui.`);
            } catch (err) {
              alert('Import COA gagal: ' + err.message);
            }
            e.target.value = '';
          };
          reader.readAsText(f);
        };
      }
    }
  };
})(window.App.UI.Views, window.App.Domain, window.App.UseCases, window.App.Repositories, window.App.Utils);

// Global aliases for existing buttons
window.openAccount = code => window.App.UI.Views.CoaView.openForm(code);
window.deleteAccount = code => window.App.UI.Views.CoaView.delete(code);
window.exportOneAccount = code => window.App.UI.Views.CoaView.exportOne(code);
window.exportCOAJSON = () => window.App.UI.Views.CoaView.exportJSON();
window.exportCOACSV = () => window.App.UI.Views.CoaView.exportCSV();
window.downloadCOATemplate = () => window.App.UI.Views.CoaView.downloadTemplate();
window.renderCOA = () => window.App.UI.Views.CoaView.render();
