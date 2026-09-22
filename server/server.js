/**
 * AL BAYAN HIDAYATULLAH MAKASSAR — REST API Server
 * Express backend integrating MySQL with the accounting system
 */
require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;
const FRONTEND_DIR = path.join(__dirname, '..');

app.use(cors());
app.use(express.json({ limit: '20mb' }));

// Serve frontend static assets (CSS, JS, assets)
app.use(express.static(FRONTEND_DIR));

// Root endpoint: Pisahkan perilaku berdasarkan Host header
app.get('/', (req, res) => {
  const host = (req.headers.host || '').toLowerCase();
  // 1. Jika diakses lewat api.* -> Tampilkan status JSON API murni
  if (host.startsWith('api.')) {
    return res.json({
      status: 'online',
      service: 'AL BAYAN HIDAYATULLAH MAKASSAR Accounting REST API',
      version: '1.0.0',
      healthCheck: '/api/health'
    });
  }
  // 2. Jika diakses lewat domain utama (accalbayan.com) atau localhost -> Tampilkan Frontend UI
  res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
});



// 1. Health check
app.get('/api/health', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT 1 as connected');
    res.json({ status: 'ok', database: 'connected', time: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// 2. Bootstrap (Load all data for SPA initialization)
app.get('/api/bootstrap', async (req, res) => {
  try {
    const [settingsRows] = await db.query('SELECT * FROM settings LIMIT 1');
    const [usersRows] = await db.query('SELECT id, username, role, active FROM users');
    const [coaRows] = await db.query('SELECT * FROM coa ORDER BY code ASC');
    const [budgetsRows] = await db.query('SELECT id, unit, name, plan_amount as plan, actual_amount as actual FROM budgets ORDER BY id ASC');
    const [assetsRows] = await db.query('SELECT * FROM fixed_assets ORDER BY code ASC');

    // Fetch journals and their lines
    const [journalsRows] = await db.query('SELECT * FROM journals ORDER BY journal_date DESC, id DESC');
    const [linesRows] = await db.query('SELECT * FROM journal_lines ORDER BY id ASC');

    const linesByJournal = {};
    linesRows.forEach(l => {
      linesByJournal[l.journal_id] = linesByJournal[l.journal_id] || [];
      linesByJournal[l.journal_id].push({
        account: l.account_code,
        note: l.note,
        debit: Number(l.debit) || 0,
        credit: Number(l.credit) || 0,
        amount: Number(l.amount) || 0,
        dc: l.dc
      });
    });

    const journals = journalsRows.map(j => ({
      id: j.id,
      date: j.journal_date ? (j.journal_date.toISOString ? j.journal_date.toISOString().slice(0, 10) : String(j.journal_date).slice(0, 10)) : '',
      no: j.journal_no,
      desc: j.description,
      meta: j.meta_json ? (typeof j.meta_json === 'string' ? JSON.parse(j.meta_json) : j.meta_json) : {},
      lines: linesByJournal[j.id] || []
    }));

    const assets = assetsRows.map(a => ({
      id: a.id,
      code: a.code,
      name: a.name,
      category: a.category,
      status: a.status,
      acquisitionDate: a.acquisition_date ? (a.acquisition_date.toISOString ? a.acquisition_date.toISOString().slice(0, 10) : String(a.acquisition_date).slice(0, 10)) : '',
      availableDate: a.available_date ? (a.available_date.toISOString ? a.available_date.toISOString().slice(0, 10) : String(a.available_date).slice(0, 10)) : '',
      cost: Number(a.cost) || 0,
      residual: Number(a.residual) || 0,
      usefulYears: Number(a.useful_years) || 5,
      method: a.method || 'SL',
      unitsTotal: Number(a.units_total) || 0,
      unitsUsed: Number(a.units_used) || 0,
      assetAccount: a.asset_account,
      accumAccount: a.accum_account,
      expenseAccount: a.expense_account,
      sourceAccount: a.source_account,
      location: a.location || '',
      responsible: a.responsible || '',
      notes: a.notes || ''
    }));

    const coa = coaRows.map(a => ({
      code: a.code,
      name: a.name,
      type: a.type,
      normal: a.normal,
      group: a.group_name || '',
      active: Boolean(a.active),
      postable: Boolean(a.postable)
    }));

    res.json({
      settings: settingsRows[0] || { name: 'AL BAYAN HIDAYATULLAH MAKASSAR', period: new Date().toISOString().slice(0, 7), standard: 'SAK Entitas Privat (EP)' },
      users: usersRows,
      coa,
      journals,
      budgets: budgetsRows,
      assets
    });
  } catch (err) {
    console.error('Bootstrap error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 3. Authentication
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const [rows] = await db.query('SELECT * FROM users WHERE username = ? AND password = ? AND active = TRUE', [username, password]);
    if (!rows.length) {
      return res.status(401).json({ error: 'Username atau password salah.' });
    }
    res.json({ success: true, user: { username: rows[0].username, role: rows[0].role } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/password', async (req, res) => {
  const { oldUsername, oldPassword, newUsername, newPassword } = req.body;
  try {
    const [rows] = await db.query('SELECT * FROM users WHERE username = ? AND password = ?', [oldUsername, oldPassword]);
    if (!rows.length) {
      return res.status(400).json({ error: 'Password lama salah.' });
    }
    await db.query('UPDATE users SET username = ?, password = ? WHERE username = ?', [newUsername, newPassword, oldUsername]);
    res.json({ success: true, username: newUsername });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Settings
app.post('/api/settings', async (req, res) => {
  const { name, period, standard } = req.body;
  try {
    await db.query(
      'INSERT INTO settings (id, name, period, standard) VALUES (1, ?, ?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name), period = VALUES(period), standard = VALUES(standard)',
      [name, period, standard]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. COA
app.post('/api/coa', async (req, res) => {
  const { code, name, type, normal, group, active, postable } = req.body;
  try {
    await db.query(
      'INSERT INTO coa (code, name, type, normal, group_name, active, postable) VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name), type = VALUES(type), normal = VALUES(normal), group_name = VALUES(group_name), active = VALUES(active), postable = VALUES(postable)',
      [code, name, type, normal, group || '', active !== false, postable !== false]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/coa/:oldCode', async (req, res) => {
  const oldCode = req.params.oldCode;
  const { code, name, type, normal, group, active, postable } = req.body;
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    if (oldCode !== code) {
      // Re-link references in journals and assets
      await conn.query('UPDATE coa SET code = ?, name = ?, type = ?, normal = ?, group_name = ?, active = ?, postable = ? WHERE code = ?', [
        code, name, type, normal, group || '', active !== false, postable !== false, oldCode
      ]);
    } else {
      await conn.query('UPDATE coa SET name = ?, type = ?, normal = ?, group_name = ?, active = ?, postable = ? WHERE code = ?', [
        name, type, normal, group || '', active !== false, postable !== false, oldCode
      ]);
    }
    await conn.commit();
    res.json({ success: true });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

app.delete('/api/coa/:code', async (req, res) => {
  const code = req.params.code;
  const replacement = req.query.replacement;
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();
    const [usedRows] = await conn.query('SELECT count(*) as count FROM journal_lines WHERE account_code = ?', [code]);
    const count = usedRows[0].count;

    if (count > 0) {
      if (!replacement || replacement === code) {
        await conn.rollback();
        return res.status(400).json({ error: `Akun dipakai pada ${count} jurnal. Tentukan akun pengganti.` });
      }
      await conn.query('UPDATE journal_lines SET account_code = ? WHERE account_code = ?', [replacement, code]);
    }

    await conn.query('DELETE FROM coa WHERE code = ?', [code]);
    await conn.commit();
    res.json({ success: true });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// 6. Journals (ACID Transaction)
app.post('/api/journals', async (req, res) => {
  const { id, date, no, desc, lines, meta } = req.body;
  if (!lines || lines.length < 2) {
    return res.status(400).json({ error: 'Jurnal minimal harus memiliki 2 baris.' });
  }

  let totalD = 0;
  let totalC = 0;
  lines.forEach(l => {
    totalD += Number(l.debit) || 0;
    totalC += Number(l.credit) || 0;
  });

  if (Math.abs(totalD - totalC) > 0.005) {
    return res.status(400).json({ error: `Jurnal tidak seimbang. Debit Rp ${totalD} ≠ Kredit Rp ${totalC}.` });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const jId = id || ('JRN-' + Date.now());
    await conn.query(
      'INSERT INTO journals (id, journal_no, journal_date, description, meta_json) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE journal_no = VALUES(journal_no), journal_date = VALUES(journal_date), description = VALUES(description), meta_json = VALUES(meta_json)',
      [jId, no || ('JV-' + Date.now()), date, desc, meta ? JSON.stringify(meta) : null]
    );

    // Delete old lines if updating
    await conn.query('DELETE FROM journal_lines WHERE journal_id = ?', [jId]);

    // Insert lines
    for (const l of lines) {
      const debit = Number(l.debit) || 0;
      const credit = Number(l.credit) || 0;
      const amt = Number(l.amount) || debit || credit;
      const dc = String(l.dc || (debit > 0 ? 'D' : 'C')).toUpperCase();

      await conn.query(
        'INSERT INTO journal_lines (journal_id, account_code, note, debit, credit, amount, dc) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [jId, l.account, l.note || '', debit, credit, amt, dc]
      );
    }

    await conn.commit();
    res.json({ success: true, id: jId });
  } catch (err) {
    await conn.rollback();
    console.error('Save journal error:', err);
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

app.delete('/api/journals/:id', async (req, res) => {
  const id = req.params.id;
  try {
    await db.query('DELETE FROM journals WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Budgets
app.post('/api/budgets', async (req, res) => {
  const { id, unit, name, plan, actual } = req.body;
  const bId = id || ('BUD-' + Date.now());
  try {
    await db.query(
      'INSERT INTO budgets (id, unit, name, plan_amount, actual_amount) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE unit = VALUES(unit), name = VALUES(name), plan_amount = VALUES(plan_amount), actual_amount = VALUES(actual_amount)',
      [bId, unit || '', name || '', Number(plan) || 0, Number(actual) || 0]
    );
    res.json({ success: true, id: bId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/budgets/:id', async (req, res) => {
  const id = req.params.id;
  try {
    await db.query('DELETE FROM budgets WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 8. Fixed Assets
app.post('/api/assets', async (req, res) => {
  const a = req.body;
  const aId = a.id || ('AST-' + Date.now());

  try {
    await db.query(
      `INSERT INTO fixed_assets (
        id, code, name, category, status, acquisition_date, available_date,
        cost, residual, useful_years, method, units_total, units_used,
        asset_account, accum_account, expense_account, source_account,
        location, responsible, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        code = VALUES(code), name = VALUES(name), category = VALUES(category), status = VALUES(status),
        acquisition_date = VALUES(acquisition_date), available_date = VALUES(available_date),
        cost = VALUES(cost), residual = VALUES(residual), useful_years = VALUES(useful_years),
        method = VALUES(method), units_total = VALUES(units_total), units_used = VALUES(units_used),
        asset_account = VALUES(asset_account), accum_account = VALUES(accum_account),
        expense_account = VALUES(expense_account), source_account = VALUES(source_account),
        location = VALUES(location), responsible = VALUES(responsible), notes = VALUES(notes)`,
      [
        aId, a.code, a.name, a.category || 'Peralatan Kantor', a.status || 'Aktif',
        a.acquisitionDate, a.availableDate, Number(a.cost) || 0, Number(a.residual) || 0,
        Number(a.usefulYears) || 5, a.method || 'SL', Number(a.unitsTotal) || 0, Number(a.unitsUsed) || 0,
        a.assetAccount, a.accumAccount, a.expenseAccount, a.sourceAccount,
        a.location || '', a.responsible || '', a.notes || ''
      ]
    );
    res.json({ success: true, id: aId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/assets/:id', async (req, res) => {
  const id = req.params.id;
  try {
    await db.query('DELETE FROM fixed_assets WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 9. One-Click Sync From LocalStorage to MySQL
app.post('/api/sync/from-local', async (req, res) => {
  const localDb = req.body;
  if (!localDb) return res.status(400).json({ error: 'Data kosong.' });

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Settings
    if (localDb.settings) {
      await conn.query(
        'INSERT INTO settings (id, name, period, standard) VALUES (1, ?, ?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name), period = VALUES(period), standard = VALUES(standard)',
        [localDb.settings.name, localDb.settings.period, localDb.settings.standard]
      );
    }

    // 2. COA
    if (Array.isArray(localDb.coa)) {
      for (const a of localDb.coa) {
        await conn.query(
          'INSERT INTO coa (code, name, type, normal, group_name, active, postable) VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name), type = VALUES(type), normal = VALUES(normal), group_name = VALUES(group_name), active = VALUES(active), postable = VALUES(postable)',
          [a.code, a.name, a.type, a.normal, a.group || '', a.active !== false, a.postable !== false]
        );
      }
    }

    // 3. Budgets
    if (Array.isArray(localDb.budgets)) {
      for (const b of localDb.budgets) {
        await conn.query(
          'INSERT INTO budgets (id, unit, name, plan_amount, actual_amount) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE unit = VALUES(unit), name = VALUES(name), plan_amount = VALUES(plan_amount), actual_amount = VALUES(actual_amount)',
          [b.id, b.unit || '', b.name || '', Number(b.plan) || 0, Number(b.actual) || 0]
        );
      }
    }

    // 4. Assets
    if (Array.isArray(localDb.assets)) {
      for (const a of localDb.assets) {
        await conn.query(
          `INSERT INTO fixed_assets (
            id, code, name, category, status, acquisition_date, available_date,
            cost, residual, useful_years, method, units_total, units_used,
            asset_account, accum_account, expense_account, source_account,
            location, responsible, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            code = VALUES(code), name = VALUES(name), category = VALUES(category), status = VALUES(status),
            cost = VALUES(cost), residual = VALUES(residual), useful_years = VALUES(useful_years),
            method = VALUES(method), asset_account = VALUES(asset_account), accum_account = VALUES(accum_account),
            expense_account = VALUES(expense_account), source_account = VALUES(source_account)`,
          [
            a.id, a.code, a.name, a.category, a.status || 'Aktif',
            a.acquisitionDate, a.availableDate, Number(a.cost) || 0, Number(a.residual) || 0,
            Number(a.usefulYears) || 5, a.method || 'SL', Number(a.unitsTotal) || 0, Number(a.unitsUsed) || 0,
            a.assetAccount, a.accumAccount, a.expenseAccount, a.sourceAccount,
            a.location || '', a.responsible || '', a.notes || ''
          ]
        );
      }
    }

    // 5. Journals
    if (Array.isArray(localDb.journals)) {
      for (const j of localDb.journals) {
        await conn.query(
          'INSERT INTO journals (id, journal_no, journal_date, description, meta_json) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE journal_no = VALUES(journal_no), journal_date = VALUES(journal_date), description = VALUES(description), meta_json = VALUES(meta_json)',
          [j.id, j.no, j.date, j.desc, j.meta ? JSON.stringify(j.meta) : null]
        );
        await conn.query('DELETE FROM journal_lines WHERE journal_id = ?', [j.id]);

        for (const l of (j.lines || [])) {
          const debit = Number(l.debit) || 0;
          const credit = Number(l.credit) || 0;
          const amt = Number(l.amount) || debit || credit;
          const dc = String(l.dc || (debit > 0 ? 'D' : 'C')).toUpperCase();

          await conn.query(
            'INSERT INTO journal_lines (journal_id, account_code, note, debit, credit, amount, dc) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [j.id, l.account, l.note || '', debit, credit, amt, dc]
          );
        }
      }
    }

    await conn.commit();
    res.json({ success: true, message: 'Seluruh data lokal berhasil dimigrasi ke database MySQL!' });
  } catch (err) {
    await conn.rollback();
    console.error('Sync error:', err);
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// Fallback untuk rute non-API
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  const host = (req.headers.host || '').toLowerCase();
  if (host.startsWith('api.')) {
    return res.status(404).json({ error: 'API Endpoint not found' });
  }
  res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✓ AL BAYAN Accounting Backend API aktif di http://localhost:${PORT}`);
});
