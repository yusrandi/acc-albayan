/**
 * AL BAYAN HIDAYATULLAH MAKASSAR — Journal Use Case
 * Double-entry validation and transaction posting to MySQL and LocalStorage
 */
window.App = window.App || {};
window.App.UseCases = window.App.UseCases || {};

(function (UseCases, Domain, Repositories, Utils) {
  class JournalUseCase {
    constructor(repo, apiRepo) {
      this.repo = repo;
      this.apiRepo = apiRepo;
    }

    async postJournal(data) {
      const db = this.repo.getDB();
      const coaMap = new Map((db.coa || []).map(a => [String(a.code), a]));

      const lines = Array.isArray(data.lines) ? data.lines : [];
      if (lines.length < 2) {
        throw new Error('Jurnal harus memiliki minimal 2 baris.');
      }

      let debit = 0;
      let credit = 0;

      const normalized = lines.map(x => {
        const code = String(x.account || x.code || '').trim();
        const a = coaMap.get(code);
        if (!a) throw new Error(`Akun ${code} tidak ditemukan.`);
        if (a.postable === false || Domain.isHeader(a)) {
          throw new Error(`Akun ${code} (${a.name}) adalah akun kelompok/header dan tidak boleh diposting.`);
        }

        const d = Math.max(0, Number(x.debit) || 0);
        const c = Math.max(0, Number(x.credit) || 0);
        const amt = Number(x.amount) || (d || c) || 0;
        const dc = String(x.dc || (d > 0 ? 'D' : 'C')).toUpperCase();

        if (d > 0 && c === 0) debit += d;
        else if (c > 0 && d === 0) credit += c;
        else if (dc === 'D') debit += amt;
        else credit += amt;

        return {
          account: code,
          note: String(x.note || '').trim(),
          debit: d || (dc === 'D' ? amt : 0),
          credit: c || (dc === 'C' ? amt : 0),
          amount: amt,
          dc: (d > 0 ? 'D' : (c > 0 ? 'C' : dc))
        };
      }).filter(x => x.debit > 0 || x.credit > 0);

      if (normalized.length < 2) {
        throw new Error('Jurnal minimal memiliki 1 baris debit dan 1 baris kredit bernilai > 0.');
      }

      if (Math.abs(debit - credit) > 0.005) {
        throw new Error(`Jurnal tidak seimbang: Total Debit ${Utils.rupiah(debit)} ≠ Total Kredit ${Utils.rupiah(credit)}.`);
      }

      const journal = Domain.createJournal({
        id: data.id || ('JRN-' + Date.now()),
        date: data.date || Utils.today(),
        no: data.no || ('JV-' + String((db.journals?.length || 0) + 1).padStart(5, '0')),
        desc: String(data.desc || 'Transaksi'),
        lines: normalized,
        meta: data.meta || {}
      });

      // Update in MySQL if online
      if (this.repo.isMySql) {
        try {
          await this.apiRepo.postJournal(journal);
        } catch (err) {
          console.error('MySQL postJournal error:', err);
          throw new Error('Gagal menyimpan jurnal ke database MySQL: ' + err.message);
        }
      }

      // Update local cache
      const idx = (db.journals || []).findIndex(x => x.id === journal.id);
      if (idx >= 0) {
        db.journals[idx] = journal;
      } else {
        db.journals.push(journal);
      }
      this.repo.saveDB(db);

      return journal;
    }

    async deleteJournal(id) {
      if (this.repo.isMySql) {
        try {
          await this.apiRepo.deleteJournal(id);
        } catch (err) {
          console.error('MySQL deleteJournal error:', err);
        }
      }
      const db = this.repo.getDB();
      db.journals = (db.journals || []).filter(j => j.id !== id);
      this.repo.saveDB(db);
    }

    findCode(preferred, type, fallback) {
      const accounts = this.repo.getPostingAccounts();
      const a = accounts.find(x => x.code === preferred) || accounts.find(x => x.type === type);
      return a ? a.code : (accounts[0]?.code || fallback);
    }

    buildAutoJournalDraft(type, amount, desc, main, contra) {
      let debit = main;
      let credit = contra;
      let description = desc || 'Jurnal otomatis';

      switch (type) {
        case 'sale_cash':
          debit = this.findCode('1101', 'Asset', main);
          credit = this.findCode('4101', 'Revenue', contra);
          description = desc || 'Penerimaan/pendapatan tunai';
          break;
        case 'sale_credit':
          debit = this.findCode('1103', 'Asset', main);
          credit = this.findCode('4101', 'Revenue', contra);
          description = desc || 'Penerimaan/pendapatan kredit';
          break;
        case 'purchase_cash':
          debit = this.findCode('1104', 'Asset', main);
          credit = this.findCode('1101', 'Asset', contra);
          description = desc || 'Pembelian tunai';
          break;
        case 'purchase_credit':
          debit = this.findCode('1104', 'Asset', main);
          credit = this.findCode('2101', 'Liability', contra);
          description = desc || 'Pembelian kredit';
          break;
        case 'expense_cash':
          debit = this.findCode('', 'Expense', main);
          credit = this.findCode('1101', 'Asset', contra);
          description = desc || 'Pembayaran beban';
          break;
        case 'receive_receivable':
          debit = this.findCode('1101', 'Asset', main);
          credit = this.findCode('1103', 'Asset', contra);
          description = desc || 'Penerimaan piutang';
          break;
        case 'pay_payable':
          debit = this.findCode('2101', 'Liability', main);
          credit = this.findCode('1101', 'Asset', contra);
          description = desc || 'Pembayaran utang';
          break;
        case 'capital_cash':
          debit = this.findCode('1101', 'Asset', main);
          credit = this.findCode('3101', 'Equity', contra);
          description = desc || 'Setoran modal';
          break;
        case 'withdrawal':
          debit = this.findCode('3301', 'Equity', main);
          credit = this.findCode('1101', 'Asset', contra);
          description = desc || 'Prive';
          break;
        case 'loan_received':
          debit = this.findCode('1101', 'Asset', main);
          credit = this.findCode('2201', 'Liability', contra);
          description = desc || 'Penerimaan pinjaman';
          break;
        case 'loan_payment':
          debit = this.findCode('2201', 'Liability', main);
          credit = this.findCode('1101', 'Asset', contra);
          description = desc || 'Pembayaran pinjaman';
          break;
        case 'transfer':
          debit = main;
          credit = contra;
          description = desc || 'Transfer kas/bank';
          break;
        case 'depreciation':
          debit = this.findCode('5206', 'Expense', main);
          credit = this.findCode('1291', 'Asset', contra);
          description = desc || 'Beban penyusutan';
          break;
      }

      return { debit, credit, desc: description, amount: Number(amount) || 0 };
    }

    async postAutoJournal(date, no, draft) {
      if (!draft.amount || draft.amount <= 0) {
        throw new Error('Nilai transaksi harus lebih besar dari 0.');
      }

      return await this.postJournal({
        date: date || Utils.today(),
        no: no || ('AUTO-' + String((this.repo.getJournals().length || 0) + 1).padStart(5, '0')),
        desc: draft.desc,
        lines: [
          { account: draft.debit, note: 'Debit otomatis', debit: draft.amount, credit: 0 },
          { account: draft.credit, note: 'Kredit otomatis', debit: 0, credit: draft.amount }
        ]
      });
    }
  }

  UseCases.JournalUseCase = new JournalUseCase(Repositories.StorageRepository, Repositories.ApiRepository);
})(window.App.UseCases, window.App.Domain, window.App.Repositories, window.App.Utils);
