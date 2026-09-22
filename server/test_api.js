/**
 * AL BAYAN HIDAYATULLAH MAKASSAR — API & CRUD Test Suite
 * Comprehensive automated verification for all REST endpoints & MySQL database
 */
const http = require('http');

const BASE_URL = 'http://localhost:3001';

async function request(method, path, body = null) {
  const url = `${BASE_URL}${path}`;
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  if (body) {
    options.body = JSON.stringify(body);
  }
  const res = await fetch(url, options);
  let data;
  try {
    data = await res.json();
  } catch (e) {
    data = null;
  }
  return { status: res.status, data };
}


async function runTests() {
  console.log('=== MEMULAI PENGUJIAN MENYELURUH API & DATABASE MYSQL ===\n');
  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`  ✓ ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ ${name}:`, err.message);
      failed++;
    }
  }

  // 1. Health
  await test('1. Health Check Endpoint', async () => {
    const res = await request('GET', '/api/health');
    if (res.status !== 200 || res.data.database !== 'connected') {
      throw new Error(`Status ${res.status}: ${JSON.stringify(res.data)}`);
    }
  });

  // 2. Bootstrap
  await test('2. Bootstrap Endpoint (Data Inisialisasi)', async () => {
    const res = await request('GET', '/api/bootstrap');
    if (res.status !== 200 || !Array.isArray(res.data.coa) || res.data.coa.length === 0) {
      throw new Error('Data bootstrap tidak valid atau COA kosong.');
    }
    if (!res.data.settings || !Array.isArray(res.data.users)) {
      throw new Error('Data settings/users hilang.');
    }
  });

  // 3. Auth (Login)
  await test('3. Auth Login (admin / admin123)', async () => {
    const res = await request('POST', '/api/auth/login', { username: 'admin', password: 'admin123' });
    if (res.status !== 200 || !res.data.success) {
      throw new Error(`Login gagal: ${JSON.stringify(res.data)}`);
    }
  });

  await test('4. Auth Login Validasi Password Salah', async () => {
    const res = await request('POST', '/api/auth/login', { username: 'admin', password: 'wrongpassword' });
    if (res.status !== 401) {
      throw new Error(`Harusnya ditolak 401, tapi didapat status ${res.status}`);
    }
  });

  // 4. Settings
  await test('5. Settings Update & Save', async () => {
    const res = await request('POST', '/api/settings', {
      name: 'AL BAYAN HIDAYATULLAH MAKASSAR',
      period: '2026-09',
      standard: 'SAK Entitas Privat (EP)'
    });
    if (res.status !== 200 || !res.data.success) {
      throw new Error(`Update settings gagal: ${JSON.stringify(res.data)}`);
    }
  });

  // 5. COA CRUD
  const testAccount = {
    code: '9999',
    name: 'Akun Uji Coba Testing',
    type: 'Expense',
    normal: 'Debit',
    group: 'Beban Lainnya',
    active: true,
    postable: true
  };

  await test('6. COA: Create New Account', async () => {
    const res = await request('POST', '/api/coa', testAccount);
    if (res.status !== 200 || !res.data.success) {
      throw new Error(`Tambah akun gagal: ${JSON.stringify(res.data)}`);
    }
  });

  await test('7. COA: Update Existing Account', async () => {
    const res = await request('PUT', `/api/coa/${testAccount.code}`, {
      ...testAccount,
      name: 'Akun Uji Coba Diperbarui'
    });
    if (res.status !== 200 || !res.data.success) {
      throw new Error(`Update akun gagal: ${JSON.stringify(res.data)}`);
    }
  });

  await test('8. COA: Delete Account', async () => {
    const res = await request('DELETE', `/api/coa/${testAccount.code}`);
    if (res.status !== 200 || !res.data.success) {
      throw new Error(`Hapus akun gagal: ${JSON.stringify(res.data)}`);
    }
  });

  // 6. Budgets CRUD
  const testBudgetId = 'BUD-TEST-999';
  await test('9. Budgets: Create Budget Row', async () => {
    const res = await request('POST', '/api/budgets', {
      id: testBudgetId,
      unit: 'Pendidikan Santri',
      name: 'Pengadaan Kitab & Modul',
      plan: 5000000,
      actual: 1500000
    });
    if (res.status !== 200 || !res.data.success) {
      throw new Error(`Tambah anggaran gagal: ${JSON.stringify(res.data)}`);
    }
  });

  await test('10. Budgets: Delete Budget Row', async () => {
    const res = await request('DELETE', `/api/budgets/${testBudgetId}`);
    if (res.status !== 200 || !res.data.success) {
      throw new Error(`Hapus anggaran gagal: ${JSON.stringify(res.data)}`);
    }
  });

  // 7. Fixed Assets CRUD
  const testAssetId = 'AST-TEST-999';
  await test('11. Assets: Create Fixed Asset', async () => {
    const res = await request('POST', '/api/assets', {
      id: testAssetId,
      code: 'AST-TEST-999',
      name: 'Laptop Inventaris Uji Coba',
      category: 'Peralatan Kantor',
      status: 'Aktif',
      acquisitionDate: '2026-09-01',
      availableDate: '2026-09-01',
      cost: 12000000,
      residual: 1000000,
      usefulYears: 4,
      method: 'SL',
      assetAccount: '1204',
      accumAccount: '1293',
      expenseAccount: '5206',
      sourceAccount: '1102'
    });
    if (res.status !== 200 || !res.data.success) {
      throw new Error(`Tambah aset gagal: ${JSON.stringify(res.data)}`);
    }
  });

  await test('12. Assets: Delete Fixed Asset', async () => {
    const res = await request('DELETE', `/api/assets/${testAssetId}`);
    if (res.status !== 200 || !res.data.success) {
      throw new Error(`Hapus aset gagal: ${JSON.stringify(res.data)}`);
    }
  });

  // 8. Journals & Double-Entry Balance Enforcement
  const testJournalId = 'JRN-TEST-999';
  await test('13. Journals: Valid Double-Entry Transaction (Debit = Kredit)', async () => {
    const res = await request('POST', '/api/journals', {
      id: testJournalId,
      date: '2026-09-22',
      no: 'JV-TEST-999',
      desc: 'Transaksi Testing Penerimaan Donasi',
      lines: [
        { account: '1102', debit: 2500000, credit: 0, note: 'Bank Syariah' },
        { account: '4104', debit: 0, credit: 2500000, note: 'Pendapatan Hibah/Donasi' }
      ]
    });
    if (res.status !== 200 || !res.data.success) {
      throw new Error(`Simpan jurnal gagal: ${JSON.stringify(res.data)}`);
    }
  });

  await test('14. Journals: Tolak Jurnal Tidak Seimbang (Debit ≠ Kredit)', async () => {
    const res = await request('POST', '/api/journals', {
      id: 'JRN-UNBALANCED',
      date: '2026-09-22',
      no: 'JV-BAD',
      desc: 'Jurnal Cacat Sengaja Tidak Seimbang',
      lines: [
        { account: '1101', debit: 1000000, credit: 0 },
        { account: '4101', debit: 0, credit: 500000 } // Selisih 500rb
      ]
    });
    if (res.status !== 400) {
      throw new Error(`Jurnal tidak seimbang harus ditolak 400, tapi didapat ${res.status}`);
    }
  });

  await test('15. Journals: Delete Journal (Cascade)', async () => {
    const res = await request('DELETE', `/api/journals/${testJournalId}`);
    if (res.status !== 200 || !res.data.success) {
      throw new Error(`Hapus jurnal gagal: ${JSON.stringify(res.data)}`);
    }
  });

  console.log(`\n=== HASIL: ${passed} BERHASIL, ${failed} GAGAL ===`);
  if (failed === 0) {
    console.log('✓ SEMUA FITUR CRUD DAN LOGIKA INTEGRITAS DATABASE MYSQL BERFUNGSI 100% AMAN!\n');
  }
}

runTests().catch(console.error);
