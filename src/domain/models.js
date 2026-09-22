/**
 * AL BAYAN HIDAYATULLAH MAKASSAR — Domain Models & Entities
 * Enterprise Business Rules Layer
 */
window.App = window.App || {};
window.App.Domain = window.App.Domain || {};

(function (Domain) {
  const ACCOUNT_TYPES = ['Asset', 'Liability', 'Equity', 'Revenue', 'Expense'];
  const NORMAL_BALANCES = ['Debit', 'Credit'];
  const HEADER_CODES = new Set(['1000', '1100', '1200', '1300', '2000', '2100', '2200', '3000', '4000', '5000']);

  const DEFAULT_COA = [
    ['1000', 'ASET', 'Asset', 'Debit'],
    ['1100', 'Aset Lancar', 'Asset', 'Debit'],
    ['1101', 'Kas', 'Asset', 'Debit'],
    ['1102', 'Bank', 'Asset', 'Debit'],
    ['1103', 'Piutang Usaha', 'Asset', 'Debit'],
    ['1104', 'Piutang Lain-lain', 'Asset', 'Debit'],
    ['1105', 'Persediaan Barang Dagang', 'Asset', 'Debit'],
    ['1106', 'Persediaan Bahan', 'Asset', 'Debit'],
    ['1107', 'Uang Muka Pembelian', 'Asset', 'Debit'],
    ['1108', 'Biaya Dibayar Dimuka', 'Asset', 'Debit'],
    ['1109', 'Pajak Dibayar Dimuka', 'Asset', 'Debit'],
    ['1200', 'Aset Tetap', 'Asset', 'Debit'],
    ['1201', 'Tanah', 'Asset', 'Debit'],
    ['1202', 'Bangunan', 'Asset', 'Debit'],
    ['1203', 'Kendaraan', 'Asset', 'Debit'],
    ['1204', 'Peralatan Kantor', 'Asset', 'Debit'],
    ['1205', 'Mesin', 'Asset', 'Debit'],
    ['1291', 'Akumulasi Penyusutan Bangunan', 'Asset', 'Credit'],
    ['1292', 'Akumulasi Penyusutan Kendaraan', 'Asset', 'Credit'],
    ['1293', 'Akumulasi Penyusutan Peralatan', 'Asset', 'Credit'],
    ['1294', 'Akumulasi Penyusutan Mesin', 'Asset', 'Credit'],
    ['1300', 'Aset Tidak Lancar Lainnya', 'Asset', 'Debit'],
    ['1301', 'Investasi Jangka Panjang', 'Asset', 'Debit'],
    ['1302', 'Aset Takberwujud', 'Asset', 'Debit'],
    ['1391', 'Akumulasi Amortisasi', 'Asset', 'Credit'],
    ['2000', 'LIABILITAS', 'Liability', 'Credit'],
    ['2100', 'Liabilitas Jangka Pendek', 'Liability', 'Credit'],
    ['2101', 'Utang Usaha', 'Liability', 'Credit'],
    ['2102', 'Utang Gaji', 'Liability', 'Credit'],
    ['2103', 'Utang Pajak', 'Liability', 'Credit'],
    ['2104', 'Pendapatan Diterima Dimuka', 'Liability', 'Credit'],
    ['2105', 'Utang Biaya', 'Liability', 'Credit'],
    ['2106', 'Utang Lain-lain', 'Liability', 'Credit'],
    ['2200', 'Liabilitas Jangka Panjang', 'Liability', 'Credit'],
    ['2201', 'Pinjaman Bank Jangka Panjang', 'Liability', 'Credit'],
    ['2202', 'Liabilitas Sewa', 'Liability', 'Credit'],
    ['3000', 'EKUITAS', 'Equity', 'Credit'],
    ['3101', 'Modal Disetor', 'Equity', 'Credit'],
    ['3102', 'Modal Pemilik', 'Equity', 'Credit'],
    ['3201', 'Saldo Laba', 'Equity', 'Credit'],
    ['3202', 'Laba Tahun Berjalan', 'Equity', 'Credit'],
    ['3301', 'Prive', 'Equity', 'Debit'],
    ['3302', 'Pengambilan Modal', 'Equity', 'Debit'],
    ['4000', 'PENDAPATAN', 'Revenue', 'Credit'],
    ['4101', 'Pendapatan Pendidikan/Yayasan', 'Revenue', 'Credit'],
    ['4102', 'Pendapatan Jasa', 'Revenue', 'Credit'],
    ['4103', 'Pendapatan Sewa', 'Revenue', 'Credit'],
    ['4104', 'Pendapatan Hibah', 'Revenue', 'Credit'],
    ['4201', 'Pendapatan Lain-lain', 'Revenue', 'Credit'],
    ['5000', 'BEBAN', 'Expense', 'Debit'],
    ['5101', 'Harga Pokok Penjualan', 'Expense', 'Debit'],
    ['5102', 'Pembelian', 'Expense', 'Debit'],
    ['5201', 'Beban Gaji', 'Expense', 'Debit'],
    ['5202', 'Beban Sewa', 'Expense', 'Debit'],
    ['5203', 'Beban Listrik & Air', 'Expense', 'Debit'],
    ['5204', 'Beban Internet & Komunikasi', 'Expense', 'Debit'],
    ['5205', 'Beban Transportasi', 'Expense', 'Debit'],
    ['5206', 'Beban Penyusutan', 'Expense', 'Debit'],
    ['5207', 'Beban Perlengkapan', 'Expense', 'Debit'],
    ['5208', 'Beban Administrasi Bank', 'Expense', 'Debit'],
    ['5209', 'Beban Bunga', 'Expense', 'Debit'],
    ['5210', 'Beban Pemeliharaan', 'Expense', 'Debit'],
    ['5211', 'Beban Promosi & Marketing', 'Expense', 'Debit'],
    ['5212', 'Beban Pajak', 'Expense', 'Debit'],
    ['5213', 'Beban Asuransi', 'Expense', 'Debit'],
    ['5299', 'Beban Lain-lain', 'Expense', 'Debit']
  ].map(x => ({
    code: x[0],
    name: x[1],
    type: x[2],
    normal: x[3],
    group: '',
    active: true,
    postable: !HEADER_CODES.has(x[0])
  }));

  function isHeader(account) {
    if (!account) return true;
    if (account.postable === false) return true;
    const code = String(account.code || '').trim();
    if (HEADER_CODES.has(code)) return true;
    const group = String(account.group || '').toLowerCase();
    return ['header', 'group', 'subgroup'].includes(group);
  }

  function getNormalBalance(accountOrType) {
    const type = typeof accountOrType === 'string' ? accountOrType : accountOrType?.type;
    return ['Asset', 'Expense'].includes(type) ? 'Debit' : 'Credit';
  }

  function createAccount(data) {
    const code = String(data.code || '').trim();
    const name = String(data.name || '').trim();
    const type = ACCOUNT_TYPES.includes(data.type) ? data.type : 'Asset';
    const normal = NORMAL_BALANCES.includes(data.normal) ? data.normal : getNormalBalance(type);
    const group = String(data.group || '').trim();
    const active = data.active !== false;
    const postable = data.postable !== undefined ? Boolean(data.postable) : !HEADER_CODES.has(code);

    return { code, name, type, normal, group, active, postable };
  }

  function createJournal(data) {
    return {
      id: String(data.id || ('j' + Date.now() + Math.random().toString(16).slice(2))),
      date: String(data.date || new Date().toISOString().slice(0, 10)),
      no: String(data.no || 'JV-00001'),
      desc: String(data.desc || ''),
      lines: Array.isArray(data.lines) ? data.lines : [],
      meta: data.meta || {}
    };
  }

  function createBudget(data) {
    return {
      id: String(data.id || ('BUD-' + Date.now() + Math.random().toString(16).slice(2))),
      unit: String(data.unit || data.devisi || data.division || '').trim(),
      name: String(data.name || data.activity || data.kegiatan || data.account || '').trim(),
      plan: Math.max(0, Number(data.plan ?? data.budget ?? data.amount ?? 0) || 0),
      actual: Math.max(0, Number(data.actual ?? data.realization ?? data.realisasi ?? 0) || 0)
    };
  }

  function createAsset(data) {
    return {
      id: String(data.id || ('AST-' + Date.now() + Math.random().toString(16).slice(2))),
      code: String(data.code || 'AST-0001').trim(),
      name: String(data.name || 'Aset Tetap').trim(),
      category: String(data.category || 'Peralatan Kantor').trim(),
      location: String(data.location || '').trim(),
      responsible: String(data.responsible || '').trim(),
      acquisitionDate: String(data.acquisitionDate || data.date || new Date().toISOString().slice(0, 10)),
      availableDate: String(data.availableDate || data.acquisitionDate || new Date().toISOString().slice(0, 10)),
      cost: Math.max(0, Number(data.cost ?? data.amount ?? 0) || 0),
      residual: Math.max(0, Number(data.residual ?? 0) || 0),
      usefulYears: Math.max(0.01, Number(data.usefulYears ?? 5) || 5),
      method: ['SL', 'DB', 'UOP'].includes(data.method) ? data.method : 'SL',
      unitsTotal: Math.max(0, Number(data.unitsTotal ?? 0) || 0),
      unitsUsed: Math.max(0, Number(data.unitsUsed ?? 0) || 0),
      assetAccount: String(data.assetAccount || '1204'),
      accumAccount: String(data.accumAccount || '1293'),
      expenseAccount: String(data.expenseAccount || '5206'),
      sourceAccount: String(data.sourceAccount || '1102'),
      status: ['Aktif', 'Dilepas', 'Fully Depreciated'].includes(data.status) ? data.status : 'Aktif',
      notes: String(data.notes || '')
    };
  }

  Domain.ACCOUNT_TYPES = ACCOUNT_TYPES;
  const NORMAL_BALANCES_ARR = NORMAL_BALANCES;
  Domain.NORMAL_BALANCES = NORMAL_BALANCES_ARR;
  Domain.HEADER_CODES = HEADER_CODES;
  Domain.DEFAULT_COA = DEFAULT_COA;
  Domain.isHeader = isHeader;
  Domain.getNormalBalance = getNormalBalance;
  Domain.createAccount = createAccount;
  Domain.createJournal = createJournal;
  Domain.createBudget = createBudget;
  Domain.createAsset = createAsset;
})(window.App.Domain);
