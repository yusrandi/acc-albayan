-- =============================================================================
-- AL BAYAN HIDAYATULLAH MAKASSAR — Database Schema (MySQL)
-- Sistem Informasi Akuntansi & Dashboard Anggaran
-- =============================================================================

CREATE DATABASE IF NOT EXISTS al_bayan_accounting
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE al_bayan_accounting;

-- 1. Tabel Pengguna Sistem (Users)
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'Administrator',
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 2. Tabel Pengaturan Entitas (Settings)
CREATE TABLE IF NOT EXISTS settings (
  id INT PRIMARY KEY DEFAULT 1,
  name VARCHAR(150) NOT NULL DEFAULT 'AL BAYAN HIDAYATULLAH MAKASSAR',
  period VARCHAR(7) NOT NULL,
  standard VARCHAR(100) NOT NULL DEFAULT 'SAK Entitas Privat (EP)',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 3. Tabel Bagan Akun (Chart of Accounts - COA)
CREATE TABLE IF NOT EXISTS coa (
  code VARCHAR(20) PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  type ENUM('Asset', 'Liability', 'Equity', 'Revenue', 'Expense') NOT NULL,
  normal ENUM('Debit', 'Credit') NOT NULL,
  group_name VARCHAR(100) DEFAULT '',
  active BOOLEAN DEFAULT TRUE,
  postable BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 4. Tabel Jurnal Umum (Journals Header)
CREATE TABLE IF NOT EXISTS journals (
  id VARCHAR(50) PRIMARY KEY,
  journal_no VARCHAR(50) NOT NULL,
  journal_date DATE NOT NULL,
  description TEXT,
  meta_json JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_journal_date (journal_date)
) ENGINE=InnoDB;

-- 5. Tabel Baris Jurnal Double-Entry (Journal Lines)
CREATE TABLE IF NOT EXISTS journal_lines (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  journal_id VARCHAR(50) NOT NULL,
  account_code VARCHAR(20) NOT NULL,
  note VARCHAR(255) DEFAULT '',
  debit DECIMAL(18, 2) DEFAULT 0.00,
  credit DECIMAL(18, 2) DEFAULT 0.00,
  amount DECIMAL(18, 2) DEFAULT 0.00,
  dc CHAR(1) NOT NULL DEFAULT 'D',
  FOREIGN KEY (journal_id) REFERENCES journals(id) ON DELETE CASCADE,
  FOREIGN KEY (account_code) REFERENCES coa(code) ON UPDATE CASCADE
) ENGINE=InnoDB;

-- 6. Tabel Anggaran vs Realisasi (Budgets)
CREATE TABLE IF NOT EXISTS budgets (
  id VARCHAR(50) PRIMARY KEY,
  unit VARCHAR(100) NOT NULL,
  name VARCHAR(200) NOT NULL,
  plan_amount DECIMAL(18, 2) DEFAULT 0.00,
  actual_amount DECIMAL(18, 2) DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 7. Tabel Register Aset Tetap (Fixed Assets)
CREATE TABLE IF NOT EXISTS fixed_assets (
  id VARCHAR(50) PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(200) NOT NULL,
  category VARCHAR(100) NOT NULL,
  status VARCHAR(30) DEFAULT 'Aktif',
  acquisition_date DATE NOT NULL,
  available_date DATE NOT NULL,
  cost DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
  residual DECIMAL(18, 2) DEFAULT 0.00,
  useful_years DECIMAL(5, 2) NOT NULL DEFAULT 5.00,
  method VARCHAR(10) DEFAULT 'SL',
  units_total INT DEFAULT 0,
  units_used INT DEFAULT 0,
  asset_account VARCHAR(20) NOT NULL,
  accum_account VARCHAR(20) NOT NULL,
  expense_account VARCHAR(20) NOT NULL,
  source_account VARCHAR(20) NOT NULL,
  location VARCHAR(150) DEFAULT '',
  responsible VARCHAR(100) DEFAULT '',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (asset_account) REFERENCES coa(code) ON UPDATE CASCADE,
  FOREIGN KEY (accum_account) REFERENCES coa(code) ON UPDATE CASCADE,
  FOREIGN KEY (expense_account) REFERENCES coa(code) ON UPDATE CASCADE
) ENGINE=InnoDB;

-- =============================================================================
-- DATA AWAL STANDAR (SEEDS)
-- =============================================================================

-- Inisialisasi User Default
INSERT INTO users (username, password, role, active)
VALUES ('admin', 'admin123', 'Administrator', TRUE)
ON DUPLICATE KEY UPDATE username = username;

-- Inisialisasi Settings Default
INSERT INTO settings (id, name, period, standard)
VALUES (1, 'AL BAYAN HIDAYATULLAH MAKASSAR', DATE_FORMAT(NOW(), '%Y-%m'), 'SAK Entitas Privat (EP)')
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- Inisialisasi Bagan Akun Standar (COA SAK EP)
INSERT IGNORE INTO coa (code, name, type, normal, postable) VALUES
('1000','ASET','Asset','Debit', FALSE),
('1100','Aset Lancar','Asset','Debit', FALSE),
('1101','Kas','Asset','Debit', TRUE),
('1102','Bank','Asset','Debit', TRUE),
('1103','Piutang Usaha','Asset','Debit', TRUE),
('1104','Piutang Lain-lain','Asset','Debit', TRUE),
('1105','Persediaan Barang Dagang','Asset','Debit', TRUE),
('1106','Persediaan Bahan','Asset','Debit', TRUE),
('1107','Uang Muka Pembelian','Asset','Debit', TRUE),
('1108','Biaya Dibayar Dimuka','Asset','Debit', TRUE),
('1109','Pajak Dibayar Dimuka','Asset','Debit', TRUE),
('1200','Aset Tetap','Asset','Debit', FALSE),
('1201','Tanah','Asset','Debit', TRUE),
('1202','Bangunan','Asset','Debit', TRUE),
('1203','Kendaraan','Asset','Debit', TRUE),
('1204','Peralatan Kantor','Asset','Debit', TRUE),
('1205','Mesin','Asset','Debit', TRUE),
('1291','Akumulasi Penyusutan Bangunan','Asset','Credit', TRUE),
('1292','Akumulasi Penyusutan Kendaraan','Asset','Credit', TRUE),
('1293','Akumulasi Penyusutan Peralatan','Asset','Credit', TRUE),
('1294','Akumulasi Penyusutan Mesin','Asset','Credit', TRUE),
('1300','Aset Tidak Lancar Lainnya','Asset','Debit', FALSE),
('1301','Investasi Jangka Panjang','Asset','Debit', TRUE),
('1302','Aset Takberwujud','Asset','Debit', TRUE),
('1391','Akumulasi Amortisasi','Asset','Credit', TRUE),
('2000','LIABILITAS','Liability','Credit', FALSE),
('2100','Liabilitas Jangka Pendek','Liability','Credit', FALSE),
('2101','Utang Usaha','Liability','Credit', TRUE),
('2102','Utang Gaji','Liability','Credit', TRUE),
('2103','Utang Pajak','Liability','Credit', TRUE),
('2104','Pendapatan Diterima Dimuka','Liability','Credit', TRUE),
('2105','Utang Biaya','Liability','Credit', TRUE),
('2106','Utang Lain-lain','Liability','Credit', TRUE),
('2200','Liabilitas Jangka Panjang','Liability','Credit', FALSE),
('2201','Pinjaman Bank Jangka Panjang','Liability','Credit', TRUE),
('2202','Liabilitas Sewa','Liability','Credit', TRUE),
('3000','EKUITAS','Equity','Credit', FALSE),
('3101','Modal Disetor','Equity','Credit', TRUE),
('3102','Modal Pemilik','Equity','Credit', TRUE),
('3201','Saldo Laba','Equity','Credit', TRUE),
('3202','Laba Tahun Berjalan','Equity','Credit', TRUE),
('3301','Prive','Equity','Debit', TRUE),
('3302','Pengambilan Modal','Equity','Debit', TRUE),
('4000','PENDAPATAN','Revenue','Credit', FALSE),
('4101','Pendapatan Pendidikan/Yayasan','Revenue','Credit', TRUE),
('4102','Pendapatan Jasa','Revenue','Credit', TRUE),
('4103','Pendapatan Sewa','Revenue','Credit', TRUE),
('4104','Pendapatan Hibah','Revenue','Credit', TRUE),
('4201','Pendapatan Lain-lain','Revenue','Credit', TRUE),
('5000','BEBAN','Expense','Debit', FALSE),
('5101','Harga Pokok Penjualan','Expense','Debit', TRUE),
('5102','Pembelian','Expense','Debit', TRUE),
('5201','Beban Gaji','Expense','Debit', TRUE),
('5202','Beban Sewa','Expense','Debit', TRUE),
('5203','Beban Listrik & Air','Expense','Debit', TRUE),
('5204','Beban Internet & Komunikasi','Expense','Debit', TRUE),
('5205','Beban Transportasi','Expense','Debit', TRUE),
('5206','Beban Penyusutan','Expense','Debit', TRUE),
('5207','Beban Perlengkapan','Expense','Debit', TRUE),
('5208','Beban Administrasi Bank','Expense','Debit', TRUE),
('5209','Beban Bunga','Expense','Debit', TRUE),
('5210','Beban Pemeliharaan','Expense','Debit', TRUE),
('5211','Beban Promosi & Marketing','Expense','Debit', TRUE),
('5212','Beban Pajak','Expense','Debit', TRUE),
('5213','Beban Asuransi','Expense','Debit', TRUE),
('5299','Beban Lain-lain','Expense','Debit', TRUE);
