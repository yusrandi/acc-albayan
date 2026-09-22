/**
 * AL BAYAN HIDAYATULLAH MAKASSAR — Export & Import Center View
 * Export all reports to multi-sheet Excel / printable PDF and system backup/restore
 */
window.App = window.App || {};
window.App.UI = window.App.UI || {};
window.App.UI.Views = window.App.UI.Views || {};

(function (Views, Repositories, UseCases) {
  Views.ExportsView = {
    render() {
      const el = document.getElementById('exportReportStatus');
      if (el) {
        el.textContent = 'Export Excel mencakup seluruh laporan dan data master dalam satu workbook. Import Excel dipakai untuk memperbarui COA, Anggaran, dan Aset. PDF adalah format laporan siap cetak/arsip.';
      }
    },

    exportAllExcel() {
      const db = Repositories.StorageRepository.getDB();
      Repositories.ExportImportRepository.exportAllExcel(db);
      const e = document.getElementById('exportReportStatus');
      if (e) e.textContent = 'Export Excel berhasil: seluruh laporan dan data master telah diunduh dalam satu workbook.';
    },

    exportSingleExcel(elementId, title) {
      const el = document.getElementById(elementId);
      Repositories.ExportImportRepository.exportSingleTableExcel(el, title);
    },

    exportAllPDF() {
      const db = Repositories.StorageRepository.getDB();
      Repositories.ExportImportRepository.exportAllPDF(db);
    },

    exportSinglePDF(elementId, title) {
      const el = document.getElementById(elementId);
      Repositories.ExportImportRepository.exportSinglePDF(el, title);
    },

    exportBackupJSON() {
      const db = Repositories.StorageRepository.getDB();
      Repositories.ExportImportRepository.exportFullJSON(db);
    },

    bindEvents() {
      // JSON Backup Restore
      const importInput = document.getElementById('importFile');
      if (importInput) {
        importInput.onchange = e => {
          const f = e.target.files[0];
          if (!f) return;
          const reader = new FileReader();
          reader.onload = () => {
            try {
              const data = JSON.parse(reader.result);
              if (!Array.isArray(data.coa) || !Array.isArray(data.journals)) {
                throw new Error('Format file backup JSON tidak lengkap.');
              }
              if (!confirm('Memulihkan backup akan menimpa data yang ada saat ini. Lanjutkan?')) return;
              Repositories.StorageRepository.saveDB(data);
              window.App.Router.renderAll();
              alert('Data backup sistem berhasil dipulihkan.');
            } catch (err) {
              alert('Pemulihan backup gagal: ' + err.message);
            }
            e.target.value = '';
          };
          reader.readAsText(f);
        };
      }

      // Excel Import
      const excelInput = document.getElementById('excelImportFile');
      if (excelInput) {
        excelInput.onchange = e => {
          const f = e.target.files[0];
          if (!f) return;
          const reader = new FileReader();
          reader.onload = () => {
            try {
              const text = reader.result;
              const doc = new DOMParser().parseFromString(text, 'text/html');
              const tables = [...doc.querySelectorAll('table')];
              let importedSheets = [];

              if (tables.length) {
                tables.forEach(table => {
                  const rows = [...table.rows].map(tr => [...tr.cells].map(c => c.textContent.trim()));
                  if (!rows.length) return;
                  const h = rows[0].map(x => x.toLowerCase());

                  // COA
                  if (h.includes('kode') && h.includes('nama akun') && h.includes('tipe')) {
                    for (let i = 1; i < rows.length; i++) {
                      const r = rows[i];
                      const code = r[h.indexOf('kode')];
                      const name = r[h.indexOf('nama akun')];
                      const type = r[h.indexOf('tipe')];
                      if (code && name) {
                        UseCases.CoaUseCase.saveAccount(code, { code, name, type });
                      }
                    }
                    importedSheets.push('COA');
                  }

                  // Anggaran
                  if (h.includes('devisi/unit') && h.includes('program/kegiatan') && h.includes('anggaran')) {
                    for (let i = 1; i < rows.length; i++) {
                      const r = rows[i];
                      const unit = r[h.indexOf('devisi/unit')];
                      const name = r[h.indexOf('program/kegiatan')];
                      const plan = Number(String(r[h.indexOf('anggaran')]).replace(/[^0-9.-]/g, '')) || 0;
                      const actual = Number(String(r[h.indexOf('realisasi')]).replace(/[^0-9.-]/g, '')) || 0;
                      if (name) {
                        UseCases.BudgetUseCase.saveBudget({ unit, name, plan, actual });
                      }
                    }
                    importedSheets.push('Anggaran');
                  }

                  // Aset
                  if (h.includes('kode') && h.includes('nama') && h.includes('nilai perolehan')) {
                    for (let i = 1; i < rows.length; i++) {
                      const r = rows[i];
                      const code = r[h.indexOf('kode')];
                      const name = r[h.indexOf('nama')];
                      const cost = Number(String(r[h.indexOf('nilai perolehan')]).replace(/[^0-9.-]/g, '')) || 0;
                      if (code && name) {
                        UseCases.AssetUseCase.saveAsset({ code, name, cost });
                      }
                    }
                    importedSheets.push('Aset');
                  }
                });
              }

              window.App.Router.renderAll();
              alert(importedSheets.length ? 'Import Excel berhasil: ' + [...new Set(importedSheets)].join(', ') : 'Tidak ditemukan tabel master yang sesuai.');
            } catch (err) {
              alert('Import Excel gagal: ' + err.message);
            }
            e.target.value = '';
          };
          reader.readAsText(f);
        };
      }

      // PDF Archive
      const pdfInput = document.getElementById('pdfImportFile');
      if (pdfInput) {
        pdfInput.onchange = e => {
          const f = e.target.files[0];
          if (!f) return;
          try {
            const key = 'abyan_pdf_archive_v1';
            const arr = JSON.parse(localStorage.getItem(key) || '[]');
            arr.push({ name: f.name, size: f.size, importedAt: new Date().toISOString() });
            localStorage.setItem(key, JSON.stringify(arr.slice(-50)));
            alert(`PDF ${f.name} berhasil diarsipkan ke memori lokal.`);
          } catch (err) {
            alert('Arsip PDF gagal: ' + err.message);
          }
          e.target.value = '';
        };
      }
    }
  };
})(window.App.UI.Views, window.App.Repositories, window.App.UseCases);

// Global aliases
window.exportAllReportsExcel = () => window.App.UI.Views.ExportsView.exportAllExcel();
window.exportCurrentReportExcel = (id, name) => window.App.UI.Views.ExportsView.exportSingleExcel(id, name);
window.exportAllReportsPDF = () => window.App.UI.Views.ExportsView.exportAllPDF();
window.exportCurrentReportPDF = (id, name) => window.App.UI.Views.ExportsView.exportSinglePDF(id, name);
window.exportData = () => window.App.UI.Views.ExportsView.exportBackupJSON();
