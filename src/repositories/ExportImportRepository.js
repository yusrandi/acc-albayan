/**
 * AL BAYAN HIDAYATULLAH MAKASSAR — Export & Import Repository
 * Adapters for Excel (multi-sheet workbook), PDF printing, CSV bulk, and JSON backup/restore
 */
window.App = window.App || {};
window.App.Repositories = window.App.Repositories || {};

(function (Repositories, Domain, Utils) {
  function xesc(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function csvCell(v) {
    v = String(v ?? '');
    return '"' + v.replace(/"/g, '""') + '"';
  }

  function parseCSV(text) {
    const rows = [];
    let row = [];
    let cell = '';
    let q = false;

    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      const nx = text[i + 1];
      if (ch === '"' && q && nx === '"') {
        cell += '"';
        i++;
        continue;
      }
      if (ch === '"') {
        q = !q;
        continue;
      }
      if ((ch === ',' || ch === ';') && !q) {
        row.push(cell);
        cell = '';
        continue;
      }
      if ((ch === '\n' || ch === '\r') && !q) {
        if (ch === '\r' && nx === '\n') i++;
        row.push(cell);
        if (row.some(x => x.trim() !== '')) rows.push(row);
        row = [];
        cell = '';
        continue;
      }
      cell += ch;
    }
    if (cell !== '' || row.length) {
      row.push(cell);
      if (row.some(x => x.trim() !== '')) rows.push(row);
    }
    return rows;
  }

  class ExportImportRepository {
    generateReportSheets(db) {
      const out = [];
      const [f, t] = Utils.periodBounds(db.settings?.period);
      const accounts = (db.coa || []).filter(a => a.active !== false && a.postable !== false && !Domain.isHeader(a));

      // 1. Neraca Saldo
      const trial = [['Kode', 'Akun', 'Tipe', 'Debit', 'Kredit']];
      accounts.forEach(a => {
        const v = Domain.AccountingEngine.sumAccount(db, a.code, f, t);
        trial.push([a.code, a.name, a.type, v > 0 ? v : 0, v < 0 ? -v : 0]);
      });
      out.push({ name: 'Neraca Saldo', headers: trial[0], rows: trial.slice(1) });

      // 2. Laba Rugi
      const rev = accounts
        .filter(a => a.type === 'Revenue')
        .map(a => [a.code, a.name, Domain.AccountingEngine.normalBalance(a, Domain.AccountingEngine.sumAccount(db, a.code, f, t))]);
      const exp = accounts
        .filter(a => a.type === 'Expense')
        .map(a => [a.code, a.name, Domain.AccountingEngine.normalBalance(a, Domain.AccountingEngine.sumAccount(db, a.code, f, t))]);
      const totalRev = rev.reduce((s, x) => s + x[2], 0);
      const totalExp = exp.reduce((s, x) => s + x[2], 0);
      out.push({
        name: 'Laba Rugi',
        headers: ['Kode', 'Akun', 'Nilai', 'Kelompok'],
        rows: [
          ...rev.map(x => [...x, 'Pendapatan']),
          ...exp.map(x => [...x, 'Beban']),
          ['', 'Laba Bersih', totalRev - totalExp, 'Hasil']
        ]
      });

      // 3. Neraca
      const bsTypes = ['Asset', 'Liability', 'Equity'];
      const bsRows = [];
      bsTypes.forEach(tp => {
        accounts
          .filter(a => a.type === tp)
          .forEach(a => {
            bsRows.push([
              a.code,
              a.name,
              tp,
              Domain.AccountingEngine.normalBalance(a, Domain.AccountingEngine.sumAccount(db, a.code, f, t))
            ]);
          });
      });
      out.push({ name: 'Neraca', headers: ['Kode', 'Akun', 'Kelompok', 'Nilai'], rows: bsRows });

      // 4. Arus Kas
      const cashCodes = accounts.filter(a => a.code.startsWith('1101') || a.code.startsWith('1102')).map(a => a.code);
      const cashRows = [];
      (db.journals || []).forEach(j => {
        (j.lines || []).forEach(l => {
          if (cashCodes.includes(l.account)) {
            cashRows.push([j.date, j.no, j.desc, l.account, l.debit || 0, l.credit || 0]);
          }
        });
      });
      out.push({ name: 'Arus Kas', headers: ['Tanggal', 'No Bukti', 'Deskripsi', 'Akun', 'Debit', 'Kredit'], rows: cashRows });

      // 5. Perubahan Ekuitas
      const eqRows = accounts
        .filter(a => a.type === 'Equity')
        .map(a => [a.code, a.name, Domain.AccountingEngine.normalBalance(a, Domain.AccountingEngine.sumAccount(db, a.code, f, t))]);
      out.push({ name: 'Perubahan Ekuitas', headers: ['Kode', 'Akun', 'Nilai'], rows: eqRows });

      // 6. Jurnal Umum
      const jr = [];
      (db.journals || []).forEach(j => {
        (j.lines || []).forEach(l => {
          jr.push([j.date, j.no, j.desc, l.account, l.debit || 0, l.credit || 0]);
        });
      });
      out.push({ name: 'Jurnal', headers: ['Tanggal', 'No Bukti', 'Deskripsi', 'Kode Akun', 'Debit', 'Kredit'], rows: jr });

      // 7. Buku Besar
      const led = [];
      accounts.forEach(a => {
        let bal = 0;
        (db.journals || [])
          .slice()
          .sort((x, y) => x.date.localeCompare(y.date))
          .forEach(j => {
            (j.lines || []).forEach(l => {
              if (l.account === a.code) {
                bal += Number(l.debit || 0) - Number(l.credit || 0);
                led.push([a.code, a.name, j.date, j.no, j.desc, l.debit || 0, l.credit || 0, Domain.AccountingEngine.normalBalance(a, bal)]);
              }
            });
          });
      });
      out.push({ name: 'Buku Besar', headers: ['Kode', 'Akun', 'Tanggal', 'No Bukti', 'Deskripsi', 'Debit', 'Kredit', 'Saldo'], rows: led });

      // 8. Anggaran
      const bRows = (db.budgets || []).map((b, i) => [
        i + 1,
        b.unit || '',
        b.name || '',
        Number(b.plan || 0),
        Number(b.actual || 0),
        Number(b.plan || 0) - Number(b.actual || 0)
      ]);
      out.push({ name: 'Anggaran', headers: ['No', 'Devisi/Unit', 'Program/Kegiatan', 'Anggaran', 'Realisasi', 'Sisa'], rows: bRows });

      // 9. Aset
      const aRows = (db.assets || []).map(a => [
        a.code,
        a.name,
        a.category,
        a.acquisitionDate,
        a.availableDate,
        a.cost,
        a.residual,
        a.usefulYears,
        a.method,
        a.location,
        a.responsible,
        a.status
      ]);
      out.push({
        name: 'Aset',
        headers: ['Kode', 'Nama', 'Kategori', 'Tanggal Perolehan', 'Tersedia', 'Nilai Perolehan', 'Nilai Residu', 'Umur Manfaat', 'Metode', 'Lokasi', 'Penanggung Jawab', 'Status'],
        rows: aRows
      });

      // 10. COA
      out.push({
        name: 'COA',
        headers: ['Kode', 'Nama Akun', 'Kelompok', 'Tipe', 'Saldo Normal', 'Aktif', 'Posting'],
        rows: (db.coa || []).map(a => [a.code, a.name, a.group || '', a.type, a.normal, a.active !== false, a.postable !== false])
      });

      return out;
    }

    exportAllExcel(db) {
      const sheets = this.generateReportSheets(db);
      let html = '<!DOCTYPE html><html><head><meta charset="utf-8"><style>' +
        'body{font-family:Arial}table{border-collapse:collapse;margin:20px 0}' +
        'th,td{border:1px solid #777;padding:6px 8px}' +
        'th{background:#dbeafe;font-weight:bold}' +
        '.sheet{page-break-after:always}h2{font-size:16px}</style></head><body>';

      sheets.forEach(sh => {
        html += `<div class="sheet"><h2>${xesc(sh.name)}</h2><table><thead><tr>` +
          sh.headers.map(h => `<th>${xesc(h)}</th>`).join('') +
          '</tr></thead><tbody>' +
          sh.rows.map(r => '<tr>' + r.map(v => `<td>${xesc(v)}</td>`).join('') + '</tr>').join('') +
          '</tbody></table></div>';
      });
      html += '</body></html>';

      Utils.downloadFile(`AL_BAYAN_HIDAYATULLAH_SEMUA_LAPORAN_${Utils.today()}.xls`, html, 'application/vnd.ms-excel;charset=utf-8');
    }

    exportSingleTableExcel(tableElement, title) {
      if (!tableElement) return alert('Tabel tidak ditemukan.');
      const table = tableElement.querySelector('table') || tableElement;
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:Arial}table{border-collapse:collapse}th,td{border:1px solid #777;padding:6px 8px}th{background:#dbeafe;font-weight:bold}</style></head><body><h2>${xesc(title)}</h2>${table.outerHTML}</body></html>`;
      Utils.downloadFile(`AL_BAYAN_${title.replace(/\s+/g, '_')}_${Utils.today()}.xls`, html, 'application/vnd.ms-excel;charset=utf-8');
    }

    exportAllPDF(db) {
      const sheets = this.generateReportSheets(db);
      let body = '';
      sheets.forEach(sh => {
        body += `<div class="sheet"><h1>AL BAYAN HIDAYATULLAH MAKASSAR</h1><h2>${xesc(sh.name)}</h2>` +
          `<p>Periode: ${xesc(db.settings?.period || '')} • Standar: ${xesc(db.settings?.standard || '')}</p>` +
          '<table><thead><tr>' +
          sh.headers.map(h => `<th>${xesc(h)}</th>`).join('') +
          '</tr></thead><tbody>' +
          sh.rows.map(r => '<tr>' + r.map(v => `<td>${xesc(v)}</td>`).join('') + '</tr>').join('') +
          '</tbody></table></div>';
      });
      this.printHTMLDocument('AL BAYAN — Semua Laporan', body);
    }

    exportSinglePDF(element, title) {
      if (!element) return alert('Laporan tidak ditemukan.');
      this.printHTMLDocument(title, element.innerHTML);
    }

    printHTMLDocument(title, body) {
      const w = window.open('', '_blank', 'width=1200,height=800');
      if (!w) return alert('Popup diblokir browser. Izinkan popup untuk mencetak/menyimpan PDF.');
      w.document.write(
        `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${xesc(title)}</title>` +
        '<style>@page{size:A4 landscape;margin:12mm}body{font-family:Arial,sans-serif;color:#111;font-size:11px}' +
        'h1{font-size:18px;margin:0 0 5px}h2{font-size:15px;margin:18px 0 6px}.sheet{page-break-after:always}' +
        '.tablewrap{overflow:visible}table{width:100%;border-collapse:collapse;margin:8px 0}' +
        'th,td{border:1px solid #999;padding:5px 6px;text-align:left}th{background:#eee}' +
        'td.num,th.num{text-align:right}.num{text-align:right}.no-print{display:none!important}</style></head>' +
        `<body>${body}</body></html>`
      );
      w.document.close();
      w.focus();
      setTimeout(() => w.print(), 400);
    }

    exportFullJSON(db) {
      const data = {
        ...db,
        backupVersion: 7,
        exportedAt: new Date().toISOString()
      };
      Utils.downloadFile(`AL_BAYAN_FULL_BACKUP_${Utils.today()}.json`, JSON.stringify(data, null, 2), 'application/json');
    }

    parseCSV(text) {
      return parseCSV(text);
    }
  }

  Repositories.ExportImportRepository = new ExportImportRepository();
})(window.App.Repositories, window.App.Domain, window.App.Utils);
