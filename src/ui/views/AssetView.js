/**
 * AL BAYAN HIDAYATULLAH MAKASSAR — Fixed Asset View
 * Register, depreciation scheduling, posting, and asset reporting
 */
window.App = window.App || {};
window.App.UI = window.App.UI || {};
window.App.UI.Views = window.App.UI.Views || {};

(function (Views, Domain, UseCases, Repositories, Utils) {
  function getAccountOptions(type, selected) {
    const accounts = Repositories.StorageRepository.getPostingAccounts();
    return accounts
      .filter(a => !type || a.type === type)
      .map(a => `<option value="${Utils.esc(a.code)}" ${a.code === selected ? 'selected' : ''}>${Utils.esc(a.code)} — ${Utils.esc(a.name)}</option>`)
      .join('');
  }

  function getFilteredAssets() {
    const q = (document.getElementById('assetSearch')?.value || '').toLowerCase();
    const st = document.getElementById('assetStatusFilter')?.value || '';

    return Repositories.StorageRepository.getAssets().filter(a => {
      const matchQ = !q || (a.code + ' ' + a.name + ' ' + (a.location || '') + ' ' + (a.responsible || '')).toLowerCase().includes(q);
      const matchSt = !st || a.status === st;
      return matchQ && matchSt;
    });
  }

  Views.AssetView = {
    render() {
      const summary = UseCases.AssetUseCase.getAssetSummary();
      const db = Repositories.StorageRepository.getDB();
      const period = summary.period;
      const [_, periodEnd] = Utils.periodBounds(period);

      // KPI Cards
      const setTxt = (id, v) => {
        const el = document.getElementById(id);
        if (el) el.textContent = v;
      };

      setTxt('assetCostKpi', Utils.rupiah(summary.totalCost));
      setTxt('assetAccumKpi', Utils.rupiah(summary.totalAccum));
      setTxt('assetBookKpi', Utils.rupiah(summary.totalBook));
      setTxt('assetPeriodDepKpi', Utils.rupiah(summary.periodDep));

      // Summary Card
      const sm = document.getElementById('assetDepSummary');
      if (sm) {
        sm.innerHTML = `
          <div class="asset-summary-grid">
            <div><span>Aset Aktif</span><b>${summary.activeCount}</b></div>
            <div><span>Belum Posting Periode</span><b>${summary.unpostedCount}</b></div>
            <div><span>Nilai Buku Total</span><b>${Utils.rupiah(summary.totalBook)}</b></div>
            <div><span>Periode Pelaporan</span><b>${Utils.esc(period)}</b></div>
          </div>
        `;
      }

      // Asset Table
      const rows = getFilteredAssets();
      const el = document.getElementById('assetTable');
      if (el) {
        el.innerHTML = rows.length ? `
          <div class="asset-table-wrap">
            <table class="table asset-table">
              <thead><tr>
                <th>Kode</th><th>Aset</th><th>Kategori</th><th>Perolehan</th><th>Metode</th><th>Umur</th>
                <th class="num">Perolehan</th><th class="num">Akum. Penyusutan</th><th class="num">Nilai Buku</th>
                <th>Progress</th><th>Status</th><th>Aksi</th>
              </tr></thead>
              <tbody>${rows.map(a => {
                const s = Domain.DepreciationEngine.assetState(a, db, periodEnd, period);
                const depPct = a.cost ? Math.min(100, (s.accumulated / Math.max(a.cost - a.residual, 1)) * 100) : 0;
                const methodLabel = a.method === 'SL' ? 'Garis Lurus' : (a.method === 'DB' ? 'Saldo Menurun' : 'Unit Produksi');

                return `<tr>
                  <td><b>${Utils.esc(a.code)}</b><div class="asset-mini">${Utils.esc(a.location || '')}</div></td>
                  <td>${Utils.esc(a.name)}<div class="asset-mini">${Utils.esc(a.responsible || '')}</div></td>
                  <td>${Utils.esc(a.category)}</td>
                  <td>${Utils.esc(a.availableDate)}</td>
                  <td>${methodLabel}</td>
                  <td>${a.usefulYears} th</td>
                  <td class="num">${Utils.rupiah(a.cost)}</td>
                  <td class="num">${Utils.rupiah(s.accumulated)}</td>
                  <td class="num"><b>${Utils.rupiah(s.book)}</b></td>
                  <td><span class="asset-mini">${depPct.toFixed(1)}%</span><div class="asset-progress"><i style="width:${depPct}%"></i></div></td>
                  <td><span class="asset-badge ${a.status === 'Aktif' ? 'good' : (a.status === 'Dilepas' ? 'bad' : '')}">${Utils.esc(a.status)}</span></td>
                  <td>
                    <button class="btn" onclick="window.App.UI.Views.AssetView.openForm('${Utils.esc(a.id)}')">Edit</button>
                    <button class="btn good" onclick="window.App.UI.Views.AssetView.postDepreciation('${Utils.esc(a.id)}')">Susut</button>
                    <button class="btn" onclick="window.App.UI.Views.AssetView.exportOne('${Utils.esc(a.id)}')">Ekspor</button>
                    <button class="btn danger" onclick="window.App.UI.Views.AssetView.delete('${Utils.esc(a.id)}')">Hapus</button>
                  </td>
                </tr>`;
              }).join('')}</tbody>
            </table>
          </div>
        ` : '<div class="empty-ranking">Belum ada aset. Klik Tambah Aset untuk membuat register.</div>';
      }

      // Schedule Table
      const schedEl = document.getElementById('assetScheduleTable');
      if (schedEl) {
        schedEl.innerHTML = rows.length ? `
          <div class="tablewrap"><table class="table"><thead><tr>
            <th>Kode</th><th>Nama</th><th>Dasar Penyusutan</th><th>Umur</th><th>Metode</th><th>Akumulasi</th><th>Nilai Buku</th><th>Beban Periode</th><th>Status</th>
          </tr></thead><tbody>
          ${rows.map(a => {
            const s = Domain.DepreciationEngine.assetState(a, db, periodEnd, period);
            const method = a.method === 'SL' ? 'Garis Lurus' : (a.method === 'DB' ? 'Saldo Menurun' : 'Unit Produksi');
            return `<tr>
              <td>${Utils.esc(a.code)}</td>
              <td>${Utils.esc(a.name)}</td>
              <td>${Utils.rupiah(Math.max(0, a.cost - a.residual))}</td>
              <td>${a.usefulYears} tahun</td>
              <td>${method}</td>
              <td>${Utils.rupiah(s.accumulated)}</td>
              <td>${Utils.rupiah(s.book)}</td>
              <td>${Utils.rupiah(Math.max(0, s.plan - s.accumulated))}</td>
              <td>${s.book <= a.residual + 0.005 ? 'Fully Depreciated' : 'Aktif'}</td>
            </tr>`;
          }).join('')}
          </tbody></table></div>
        ` : '<div class="empty-ranking">Jadwal belum tersedia.</div>';
      }
    },

    openForm(id) {
      const assets = Repositories.StorageRepository.getAssets();
      const a = assets.find(x => x.id === id) || {
        id: '',
        code: '',
        name: '',
        category: 'Peralatan Kantor',
        location: '',
        responsible: '',
        acquisitionDate: Utils.today(),
        availableDate: Utils.today(),
        cost: 0,
        residual: 0,
        usefulYears: 5,
        method: 'SL',
        unitsTotal: 0,
        unitsUsed: 0,
        assetAccount: '1204',
        accumAccount: '1293',
        expenseAccount: '5206',
        sourceAccount: '1102',
        status: 'Aktif',
        notes: ''
      };
      const editing = Boolean(id);

      window.App.Router.openModal(`
        <div class="modalhead">
          <h3>${editing ? 'Edit' : 'Tambah'} Aset Tetap</h3>
          <button class="x" onclick="window.App.Router.closeModal()">×</button>
        </div>
        <div class="asset-form-grid form" style="margin-top:15px">
          <div class="field"><label>Kode Aset</label><input id="astCode" value="${Utils.esc(a.code)}" placeholder="AST-0001"></div>
          <div class="field"><label>Nama Aset</label><input id="astName" value="${Utils.esc(a.name)}"></div>
          <div class="field"><label>Kategori</label>
            <select id="astCat">
              <option ${a.category === 'Tanah' ? 'selected' : ''}>Tanah</option>
              <option ${a.category === 'Bangunan' ? 'selected' : ''}>Bangunan</option>
              <option ${a.category === 'Kendaraan' ? 'selected' : ''}>Kendaraan</option>
              <option ${a.category === 'Peralatan Kantor' ? 'selected' : ''}>Peralatan Kantor</option>
              <option ${a.category === 'Mesin' ? 'selected' : ''}>Mesin</option>
              <option ${a.category === 'Peralatan Lainnya' ? 'selected' : ''}>Peralatan Lainnya</option>
            </select>
          </div>
          <div class="field"><label>Status</label>
            <select id="astStatus">
              <option ${a.status === 'Aktif' ? 'selected' : ''}>Aktif</option>
              <option ${a.status === 'Dilepas' ? 'selected' : ''}>Dilepas</option>
              <option ${a.status === 'Fully Depreciated' ? 'selected' : ''}>Fully Depreciated</option>
            </select>
          </div>
          <div class="field"><label>Tanggal Perolehan</label><input id="astAcq" type="date" value="${Utils.esc(a.acquisitionDate)}"></div>
          <div class="field"><label>Tersedia Untuk Digunakan</label><input id="astAvail" type="date" value="${Utils.esc(a.availableDate)}"></div>
          <div class="field"><label>Nilai Perolehan (Rp)</label><input id="astCost" type="number" min="0" step="0.01" value="${a.cost}"></div>
          <div class="field"><label>Nilai Residu (Rp)</label><input id="astResidual" type="number" min="0" step="0.01" value="${a.residual}"></div>
          <div class="field"><label>Umur Manfaat (tahun)</label><input id="astLife" type="number" min="0.01" step="0.01" value="${a.usefulYears}"></div>
          <div class="field"><label>Metode Penyusutan</label>
            <select id="astMethod">
              <option value="SL" ${a.method === 'SL' ? 'selected' : ''}>Garis Lurus</option>
              <option value="DB" ${a.method === 'DB' ? 'selected' : ''}>Saldo Menurun</option>
              <option value="UOP" ${a.method === 'UOP' ? 'selected' : ''}>Unit Produksi</option>
            </select>
          </div>
          <div class="field"><label>Total Unit Produksi</label><input id="astUnitsTotal" type="number" min="0" step="1" value="${a.unitsTotal}"></div>
          <div class="field"><label>Unit Produksi Terpakai Kumulatif</label><input id="astUnitsUsed" type="number" min="0" step="1" value="${a.unitsUsed}"></div>
          <div class="field"><label>Akun Aset</label><select id="astAssetAccount">${getAccountOptions('Asset', a.assetAccount)}</select></div>
          <div class="field"><label>Akumulasi Penyusutan</label><select id="astAccumAccount">${getAccountOptions('Asset', a.accumAccount)}</select></div>
          <div class="field"><label>Beban Penyusutan</label><select id="astExpenseAccount">${getAccountOptions('Expense', a.expenseAccount)}</select></div>
          <div class="field"><label>Sumber Perolehan (Kas/Bank/Utang)</label><select id="astSourceAccount">${getAccountOptions('', a.sourceAccount)}</select></div>
          <div class="field"><label>Lokasi</label><input id="astLocation" value="${Utils.esc(a.location)}"></div>
          <div class="field"><label>Penanggung Jawab</label><input id="astResponsible" value="${Utils.esc(a.responsible)}"></div>
          <div class="field full"><label>Catatan</label><textarea id="astNotes" rows="3">${Utils.esc(a.notes)}</textarea></div>
          <div class="field full asset-policy"><b>Kebijakan:</b> SAK EP Bab 17 menetapkan sistem memakai biaya perolehan sebagai dasar, mengurangi akumulasi penyusutan, dan memulai penyusutan saat aset tersedia untuk digunakan.</div>
          <div class="field full">
            <button class="btn primary" onclick="window.App.UI.Views.AssetView.submitForm('${Utils.esc(a.id)}')">Simpan Master Aset</button>
            ${!editing ? ` <button class="btn good" onclick="window.App.UI.Views.AssetView.submitForm('${Utils.esc(a.id)}', true)">Simpan + Catat Perolehan</button>` : ''}
          </div>
        </div>
      `);
    },

    submitForm(id, postAcq = false) {
      try {
        const data = {
          id: id || '',
          code: document.getElementById('astCode')?.value,
          name: document.getElementById('astName')?.value,
          category: document.getElementById('astCat')?.value,
          status: document.getElementById('astStatus')?.value,
          acquisitionDate: document.getElementById('astAcq')?.value,
          availableDate: document.getElementById('astAvail')?.value,
          cost: Number(document.getElementById('astCost')?.value) || 0,
          residual: Number(document.getElementById('astResidual')?.value) || 0,
          usefulYears: Number(document.getElementById('astLife')?.value) || 5,
          method: document.getElementById('astMethod')?.value,
          unitsTotal: Number(document.getElementById('astUnitsTotal')?.value) || 0,
          unitsUsed: Number(document.getElementById('astUnitsUsed')?.value) || 0,
          assetAccount: document.getElementById('astAssetAccount')?.value,
          accumAccount: document.getElementById('astAccumAccount')?.value,
          expenseAccount: document.getElementById('astExpenseAccount')?.value,
          sourceAccount: document.getElementById('astSourceAccount')?.value,
          location: document.getElementById('astLocation')?.value,
          responsible: document.getElementById('astResponsible')?.value,
          notes: document.getElementById('astNotes')?.value
        };

        UseCases.AssetUseCase.saveAsset(data, postAcq);
        window.App.Router.closeModal();
        window.App.Router.renderAll();
        alert('Master aset berhasil disimpan' + (postAcq ? ' beserta jurnal perolehannya.' : '.'));
      } catch (err) {
        alert(err.message);
      }
    },

    postDepreciation(id) {
      try {
        const amt = UseCases.AssetUseCase.postDepreciation(id);
        window.App.Router.renderAll();
        alert(`Beban penyusutan ${Utils.rupiah(amt)} berhasil diposting ke jurnal umum.`);
      } catch (err) {
        alert(err.message);
      }
    },

    postAllDepreciation() {
      const res = UseCases.AssetUseCase.postAllDepreciation();
      window.App.Router.renderAll();
      alert(`Posting penyusutan selesai:\n${res.count} aset berhasil diposting, Total ${Utils.rupiah(res.total)}` +
        (res.errors.length ? `\n\nCatatan:\n${res.errors.join('\n')}` : ''));
    },

    delete(id) {
      const asset = Repositories.StorageRepository.getAssets().find(x => x.id === id);
      if (!confirm(`Hapus master aset ${asset?.code || id}?`)) return;
      try {
        UseCases.AssetUseCase.deleteAsset(id);
        window.App.Router.renderAll();
      } catch (err) {
        alert(err.message);
      }
    },

    exportOne(id) {
      const db = Repositories.StorageRepository.getDB();
      const a = (db.assets || []).find(x => x.id === id);
      if (!a) return;
      const [_, periodEnd] = Utils.periodBounds(db.settings?.period);
      const out = {
        ...a,
        calculated: Domain.DepreciationEngine.assetState(a, db, periodEnd),
        journals: (db.journals || []).filter(j => j.meta && j.meta.assetId === id)
      };
      Utils.downloadFile(`aset-${a.code}-${Utils.today()}.json`, JSON.stringify(out, null, 2), 'application/json');
    },

    exportCSV() {
      const assets = Repositories.StorageRepository.getAssets();
      const headers = ['id', 'code', 'name', 'category', 'status', 'acquisitionDate', 'availableDate', 'cost', 'residual', 'usefulYears', 'method', 'unitsTotal', 'unitsUsed', 'assetAccount', 'accumAccount', 'expenseAccount', 'sourceAccount', 'location', 'responsible', 'notes'];
      const rows = [headers, ...assets.map(a => headers.map(h => a[h] ?? ''))];
      const csv = rows.map(r => r.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(',')).join('\n');
      Utils.downloadFile(`ASET-TETAP-bulk-${Utils.today()}.csv`, csv, 'text/csv;charset=utf-8');
    },

    exportJSON() {
      const db = Repositories.StorageRepository.getDB();
      const [_, periodEnd] = Utils.periodBounds(db.settings?.period);
      const out = (db.assets || []).map(a => ({
        ...a,
        calculated: Domain.DepreciationEngine.assetState(a, db, periodEnd)
      }));
      Utils.downloadFile(`ASET-TETAP-detail-${Utils.today()}.json`, JSON.stringify({ version: 2, exportedAt: new Date().toISOString(), assets: out }, null, 2), 'application/json');
    },

    bindEvents() {
      const fileInput = document.getElementById('assetImportFile');
      if (fileInput) {
        fileInput.onchange = e => {
          const f = e.target.files[0];
          if (!f) return;
          const reader = new FileReader();
          reader.onload = () => {
            try {
              const text = reader.result;
              let importedCount = 0;
              if (f.name.toLowerCase().endsWith('.json')) {
                const parsed = JSON.parse(text);
                const arr = Array.isArray(parsed) ? parsed : (parsed.assets || []);
                arr.forEach(item => {
                  UseCases.AssetUseCase.saveAsset(item);
                  importedCount++;
                });
              } else {
                const rows = Repositories.ExportImportRepository.parseCSV(text);
                if (rows.length > 1) {
                  const head = rows[0].map(x => String(x).trim());
                  for (let i = 1; i < rows.length; i++) {
                    const r = rows[i];
                    const obj = {};
                    head.forEach((k, idx) => obj[k] = r[idx] ?? '');
                    if (obj.code && obj.name) {
                      UseCases.AssetUseCase.saveAsset(obj);
                      importedCount++;
                    }
                  }
                }
              }
              window.App.Router.renderAll();
              alert(`${importedCount} aset berhasil diimpor.`);
            } catch (err) {
              alert('Import aset gagal: ' + err.message);
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
window.openAssetForm = id => window.App.UI.Views.AssetView.openForm(id);
window.saveAsset = (id, postAcq) => window.App.UI.Views.AssetView.submitForm(id, postAcq);
window.postAssetDepreciation = id => window.App.UI.Views.AssetView.postDepreciation(id);
window.postAllAssetDepreciation = () => window.App.UI.Views.AssetView.postAllDepreciation();
window.deleteAsset = id => window.App.UI.Views.AssetView.delete(id);
window.exportOneAsset = id => window.App.UI.Views.AssetView.exportOne(id);
window.exportAssetsCSV = () => window.App.UI.Views.AssetView.exportCSV();
window.exportAssetsJSON = () => window.App.UI.Views.AssetView.exportJSON();
window.renderAssets = () => window.App.UI.Views.AssetView.render();
window.renderAssetSummary = () => window.App.UI.Views.AssetView.render();
