/**
 * AL BAYAN HIDAYATULLAH MAKASSAR — General Ledger View
 * Account mutasi history and running balance calculation
 */
window.App = window.App || {};
window.App.UI = window.App.UI || {};
window.App.UI.Views = window.App.UI.Views || {};

(function (Views, Domain, Repositories, Utils) {
  Views.LedgerView = {
    render() {
      const accounts = Repositories.StorageRepository.getPostingAccounts();
      const sel = document.getElementById('ledgerAccount');
      if (!sel || !accounts.length) return;

      const currentCode = sel.value || accounts[0]?.code;
      sel.innerHTML = accounts.map(a => `<option value="${Utils.esc(a.code)}" ${a.code === currentCode ? 'selected' : ''}>${Utils.esc(a.code)} — ${Utils.esc(a.name)}</option>`).join('');
      sel.value = currentCode;

      const selectedAccount = accounts.find(x => x.code === sel.value) || accounts[0];
      const journals = Repositories.StorageRepository.getJournals();

      let balance = 0;
      const rows = [];

      journals
        .slice()
        .sort((x, y) => x.date.localeCompare(y.date))
        .forEach(j => {
          (j.lines || []).forEach(l => {
            if (String(l.account) === String(selectedAccount.code)) {
              const net = (Number(l.debit) || 0) - (Number(l.credit) || 0);
              balance += net;
              rows.push(`<tr>
                <td>${j.date}</td>
                <td><b>${Utils.esc(j.no)}</b></td>
                <td>${Utils.esc(j.desc)}</td>
                <td class="num">${Utils.rupiah(l.debit)}</td>
                <td class="num">${Utils.rupiah(l.credit)}</td>
                <td class="num font-bold"><b>${Utils.rupiah(Domain.AccountingEngine.normalBalance(selectedAccount, balance))}</b></td>
              </tr>`);
            }
          });
        });

      const tableEl = document.getElementById('ledgerTable');
      if (tableEl) {
        tableEl.innerHTML = `
          <h3>${selectedAccount.code} — ${Utils.esc(selectedAccount.name)}</h3>
          <div class="tablewrap"><table class="table">
            <thead><tr>
              <th>Tanggal</th><th>No. Bukti</th><th>Deskripsi</th><th class="num">Debit</th><th class="num">Kredit</th><th class="num">Saldo Akhir</th>
            </tr></thead>
            <tbody>${rows.join('') || '<tr><td colspan="6" class="empty">Belum ada mutasi transaksi untuk akun ini.</td></tr>'}</tbody>
          </table></div>
        `;
      }
    }
  };
})(window.App.UI.Views, window.App.Domain, window.App.Repositories, window.App.Utils);

// Global alias
window.renderLedger = () => window.App.UI.Views.LedgerView.render();
