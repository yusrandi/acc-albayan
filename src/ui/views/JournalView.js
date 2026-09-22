/**
 * AL BAYAN HIDAYATULLAH MAKASSAR — Journal View
 * General journal, double-entry wizard, manual journal form, and transaction search
 */
window.App = window.App || {};
window.App.UI = window.App.UI || {};
window.App.UI.Views = window.App.UI.Views || {};

(function (Views, UseCases, Repositories, Utils) {
  function updateModalTotals() {
    const rows = [...document.querySelectorAll('#jLines .jrow')];
    const d = rows.reduce((s, r) => s + Number(r.children[2]?.value || 0), 0);
    const c = rows.reduce((s, r) => s + Number(r.children[3]?.value || 0), 0);

    const totDEl = document.getElementById('totD');
    const totCEl = document.getElementById('totC');
    if (totDEl) totDEl.textContent = Utils.rupiah(d);
    if (totCEl) totCEl.textContent = Utils.rupiah(c);
  }

  function addModalLine(line = { account: '', note: '', debit: 0, credit: 0 }) {
    const accounts = Repositories.StorageRepository.getPostingAccounts();
    const defaultAcc = accounts[0]?.code || '1101';

    const row = document.createElement('div');
    row.className = 'jrow';
    row.innerHTML = `
      <select>
        ${accounts.map(a => `<option value="${Utils.esc(a.code)}" ${a.code === (line.account || defaultAcc) ? 'selected' : ''}>${Utils.esc(a.code)} — ${Utils.esc(a.name)}</option>`).join('')}
      </select>
      <input placeholder="Catatan baris" value="${Utils.esc(line.note || '')}">
      <input type="number" min="0" step="0.01" value="${line.debit || 0}">
      <input type="number" min="0" step="0.01" value="${line.credit || 0}">
      <button class="btn danger" onclick="this.parentElement.remove(); window.App.UI.Views.JournalView.updateTotals()">×</button>
    `;

    row.querySelectorAll('input').forEach(x => x.oninput = updateModalTotals);
    const container = document.getElementById('jLines');
    if (container) container.appendChild(row);
  }

  Views.JournalView = {
    updateTotals: updateModalTotals,
    addLine: addModalLine,

    render() {
      const q = (document.getElementById('journalSearch')?.value || '').toLowerCase();
      const journals = Repositories.StorageRepository.getJournals();
      const rows = journals
        .filter(j => [j.no, j.date, j.desc].join(' ').toLowerCase().includes(q))
        .slice()
        .sort((a, b) => b.date.localeCompare(a.date));

      const el = document.getElementById('journalTable');
      if (!el) return;

      if (!rows.length) {
        el.innerHTML = '<div class="empty">Belum ada transaksi jurnal.</div>';
        return;
      }

      el.innerHTML = `
        <div class="tablewrap"><table class="table">
          <thead><tr>
            <th>Tanggal</th><th>No. Bukti</th><th>Deskripsi</th><th class="num">Debit</th><th class="num">Kredit</th><th>Aksi</th>
          </tr></thead>
          <tbody>${rows.map(j => {
            const d = (j.lines || []).reduce((s, x) => s + Number(x.debit || 0), 0);
            const c = (j.lines || []).reduce((s, x) => s + Number(x.credit || 0), 0);
            return `<tr>
              <td>${j.date}</td>
              <td><b>${Utils.esc(j.no)}</b></td>
              <td>${Utils.esc(j.desc)}</td>
              <td class="num">${Utils.rupiah(d)}</td>
              <td class="num">${Utils.rupiah(c)}</td>
              <td>
                <button class="btn" onclick="window.App.UI.Views.JournalView.openManual('${Utils.esc(j.id)}')">Edit</button>
                <button class="btn danger" onclick="window.App.UI.Views.JournalView.delete('${Utils.esc(j.id)}')">Hapus</button>
              </td>
            </tr>`;
          }).join('')}</tbody>
        </table></div>
      `;
    },

    openManual(id) {
      const journals = Repositories.StorageRepository.getJournals();
      const accounts = Repositories.StorageRepository.getPostingAccounts();
      const j = journals.find(x => x.id === id) || {
        id: '',
        date: Utils.today(),
        no: 'JV-' + String(journals.length + 1).padStart(5, '0'),
        desc: '',
        lines: [
          { account: accounts[0]?.code || '1101', debit: 0, credit: 0, note: '' },
          { account: accounts[1]?.code || '4101', debit: 0, credit: 0, note: '' }
        ]
      };

      window.App.Router.openModal(`
        <div class="modalhead">
          <h3>${id ? 'Edit Jurnal' : 'Jurnal Umum Baru'}</h3>
          <button class="x" onclick="window.App.Router.closeModal()">×</button>
        </div>
        <div class="form" style="margin-top:15px">
          <div class="grid g3">
            <div class="field"><label>Tanggal</label><input id="jDate" type="date" value="${Utils.esc(j.date)}"></div>
            <div class="field"><label>No. Bukti</label><input id="jNo" value="${Utils.esc(j.no)}"></div>
            <div class="field"><label>Deskripsi Transaksi</label><input id="jDesc" value="${Utils.esc(j.desc)}" placeholder="Keterangan transaksi"></div>
          </div>
          <div id="jLines"></div>
          <button class="btn" onclick="window.App.UI.Views.JournalView.addLine()">+ Tambah Baris Akun</button>
          <div class="journal-total">
            <span>Total Debit: <b id="totD">Rp0</b></span>
            <span>Total Kredit: <b id="totC">Rp0</b></span>
          </div>
          <button class="btn primary" onclick="window.App.UI.Views.JournalView.submitManual('${Utils.esc(j.id || '')}')">Simpan Jurnal</button>
        </div>
      `);

      const container = document.getElementById('jLines');
      if (container) {
        container.innerHTML = '';
        (j.lines || []).forEach(l => addModalLine(l));
      }
      updateModalTotals();
    },

    submitManual(id) {
      const rows = [...document.querySelectorAll('#jLines .jrow')];
      const lines = rows.map(r => ({
        account: r.children[0]?.value,
        note: r.children[1]?.value,
        debit: Number(r.children[2]?.value || 0),
        credit: Number(r.children[3]?.value || 0)
      }));

      const date = document.getElementById('jDate')?.value;
      const no = document.getElementById('jNo')?.value;
      const desc = document.getElementById('jDesc')?.value;

      try {
        UseCases.JournalUseCase.postJournal({ id, date, no, desc, lines });
        window.App.Router.closeModal();
        window.App.Router.renderAll();
      } catch (e) {
        alert(e.message);
      }
    },

    delete(id) {
      if (!confirm('Hapus transaksi jurnal ini?')) return;
      UseCases.JournalUseCase.deleteJournal(id);
      window.App.Router.renderAll();
    },

    openAuto() {
      const accounts = Repositories.StorageRepository.getPostingAccounts();
      const opts = accounts.map(a => `<option value="${Utils.esc(a.code)}">${Utils.esc(a.code)} — ${Utils.esc(a.name)}</option>`).join('');
      const count = Repositories.StorageRepository.getJournals().length;

      window.App.Router.openModal(`
        <div class="modalhead">
          <h3>Jurnal Otomatis — Debit & Kredit Cepat</h3>
          <button class="x" onclick="window.App.Router.closeModal()">×</button>
        </div>
        <div class="form" style="margin-top:15px">
          <div class="grid g3">
            <div class="field"><label>Tanggal</label><input id="ajDate" type="date" value="${Utils.today()}"></div>
            <div class="field"><label>No. Bukti</label><input id="ajNo" value="AUTO-${String(count + 1).padStart(5, '0')}"></div>
            <div class="field"><label>Jenis Transaksi</label>
              <select id="ajType" onchange="window.App.UI.Views.JournalView.previewAuto()">
                <option value="sale_cash">Penerimaan/Pendapatan Tunai</option>
                <option value="sale_credit">Penerimaan/Pendapatan Kredit</option>
                <option value="purchase_cash">Pembelian Tunai</option>
                <option value="purchase_credit">Pembelian Kredit</option>
                <option value="expense_cash">Pembayaran Beban</option>
                <option value="receive_receivable">Penerimaan Piutang</option>
                <option value="pay_payable">Pembayaran Utang</option>
                <option value="capital_cash">Setoran Modal</option>
                <option value="withdrawal">Prive</option>
                <option value="loan_received">Penerimaan Pinjaman</option>
                <option value="loan_payment">Pembayaran Pinjaman</option>
                <option value="transfer">Transfer Kas/Bank</option>
                <option value="depreciation">Penyusutan</option>
              </select>
            </div>
          </div>
          <div class="grid g2">
            <div class="field"><label>Nilai Transaksi (Rp)</label><input id="ajAmount" type="number" min="0" step="0.01" value="0" oninput="window.App.UI.Views.JournalView.previewAuto()"></div>
            <div class="field"><label>Keterangan</label><input id="ajDesc" placeholder="Contoh: Penerimaan SPP / donasi pendidikan santri"></div>
          </div>
          <div class="grid g2">
            <div class="field"><label>Akun Utama (Debit)</label><select id="ajMain" onchange="window.App.UI.Views.JournalView.previewAuto()">${opts}</select></div>
            <div class="field"><label>Akun Lawan (Kredit)</label><select id="ajContra" onchange="window.App.UI.Views.JournalView.previewAuto()">${opts}</select></div>
          </div>
          <div class="notice">Sistem otomatis menyusun jurnal berpasangan (double-entry), memvalidasi keseimbangan Debit = Kredit, dan langsung memutakhirkan Buku Besar serta Laporan Keuangan.</div>
          <div id="ajPreview" style="margin-top:14px"></div>
          <button class="btn primary" onclick="window.App.UI.Views.JournalView.submitAuto()">Simpan Jurnal Otomatis</button>
        </div>
      `);

      this.previewAuto();
    },

    previewAuto() {
      const type = document.getElementById('ajType')?.value;
      const amount = Number(document.getElementById('ajAmount')?.value) || 0;
      const desc = document.getElementById('ajDesc')?.value;
      const main = document.getElementById('ajMain')?.value;
      const contra = document.getElementById('ajContra')?.value;

      const draft = UseCases.JournalUseCase.buildAutoJournalDraft(type, amount, desc, main, contra);
      const accounts = Repositories.StorageRepository.getAccounts();

      const mainEl = document.getElementById('ajMain');
      const contraEl = document.getElementById('ajContra');
      if (mainEl && mainEl.value !== draft.debit) mainEl.value = draft.debit;
      if (contraEl && contraEl.value !== draft.credit) contraEl.value = draft.credit;

      const previewEl = document.getElementById('ajPreview');
      if (previewEl) {
        const dName = accounts.find(a => a.code === draft.debit)?.name || '';
        const cName = accounts.find(a => a.code === draft.credit)?.name || '';
        previewEl.innerHTML = `
          <h4>Preview Jurnal Berpasangan</h4>
          <table class="table">
            <thead><tr><th>Akun</th><th class="num">Debit</th><th class="num">Kredit</th></tr></thead>
            <tbody>
              <tr><td>${draft.debit} — ${Utils.esc(dName)}</td><td class="num">${Utils.rupiah(amount)}</td><td></td></tr>
              <tr><td>${draft.credit} — ${Utils.esc(cName)}</td><td></td><td class="num">${Utils.rupiah(amount)}</td></tr>
            </tbody>
          </table>
          <p style="font-size:12px;color:#667085;margin-top:6px">Deskripsi: ${Utils.esc(draft.desc)}</p>
        `;
      }
      window._autoJournalDraft = draft;
    },

    submitAuto() {
      const draft = window._autoJournalDraft;
      if (!draft || draft.amount <= 0) {
        alert('Nilai transaksi harus lebih besar dari 0.');
        return;
      }
      const date = document.getElementById('ajDate')?.value;
      const no = document.getElementById('ajNo')?.value;

      try {
        UseCases.JournalUseCase.postAutoJournal(date, no, draft);
        window.App.Router.closeModal();
        window.App.Router.renderAll();
      } catch (err) {
        alert(err.message);
      }
    }
  };
})(window.App.UI.Views, window.App.UseCases, window.App.Repositories, window.App.Utils);

// Global aliases for existing buttons
window.openJournal = cashOnly => window.App.UI.Views.JournalView.openManual();
window.editJournal = id => window.App.UI.Views.JournalView.openManual(id);
window.deleteJournal = id => window.App.UI.Views.JournalView.delete(id);
window.openAutoJournal = () => window.App.UI.Views.JournalView.openAuto();
window.autoJournalPreview = () => window.App.UI.Views.JournalView.previewAuto();
window.saveAutoJournal = () => window.App.UI.Views.JournalView.submitAuto();
window.addJLine = () => window.App.UI.Views.JournalView.addLine();
window.renderJournal = () => window.App.UI.Views.JournalView.render();
