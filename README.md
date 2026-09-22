# AL BAYAN HIDAYATULLAH MAKASSAR — Sistem Keuangan & Anggaran
### *Clean Architecture & Dynamic MySQL Integration*

Aplikasi Sistem Informasi Akuntansi, Manajemen Aset Tetap, dan Dashboard Anggaran Yayasan Al Bayan Hidayatullah Makassar yang telah direfaktorisasi mengikuti prinsip **Clean Architecture & Clean Code** serta terintegrasi dinamis dengan **Database MySQL**.

---

## 🏛️ Struktur Arsitektur (Clean Architecture)

```
AL_BAYAN_HIDAYATULLAH_Dashboard_Anggaran/
├── index.html                   # Frontend UI Shell (Semantic Container)
├── build.js                     # Standalone compiler (HTML tunggal)
├── README.md                    # Dokumentasi arsitektur & panduan sistem
│
├── database/
│   └── schema.sql               # Skema MySQL, Foreign Keys, & Data Awal SAK EP
│
├── server/                      # [Backend REST API - Node.js Express]
│   ├── .env                     # Konfigurasi port & koneksi MySQL
│   ├── db.js                    # Connection Pool (mysql2/promise)
│   ├── package.json             # Dependensi Express, CORS, mysql2
│   └── server.js                # REST API Endpoints & ACID Transactions
│
├── css/                         # [Presentation Layer - Styles]
│   ├── variables.css            # Design tokens & color system
│   ├── base.css                 # Reset, typography, app shell, login & modal
│   ├── components.css           # Tombol, tabel, form, kartu, badge, alert
│   └── pages.css                # Tampilan khusus dashboard, spreadsheet, aset
│
├── src/
│   ├── app.js                   # Application Bootstrapper & Router
│   │
│   ├── domain/                  # [Enterprise Business Rules Layer]
│   │   ├── models.js            # Entitas: Account, Journal, Budget, Asset, User
│   │   ├── AccountingEngine.js  # Mesin akuntansi: debit-kredit, saldo normal, rasio
│   │   └── DepreciationEngine.js# Mesin depresiasi aset: Garis Lurus, Saldo Menurun, Unit
│   │
│   ├── repositories/            # [Interface Adapters - Data Layer]
│   │   ├── ApiRepository.js     # Client API penghubung frontend ke MySQL
│   │   ├── StorageRepository.js # Hybrid Repository (Auto-detect MySQL / Offline Fallback)
│   │   └── ExportImportRepository.js # Handler Excel workbook multi-sheet, PDF, CSV, JSON
│   │
│   ├── usecases/                # [Application Business Rules Layer]
│   │   ├── AuthUseCase.js       # Otentikasi login MySQL, session, ganti password
│   │   ├── JournalUseCase.js    # Validasi double-entry & transaksi jurnal MySQL
│   │   ├── BudgetUseCase.js     # Monitoring anggaran, realisasi, variansi MySQL
│   │   ├── AssetUseCase.js      # Register aset, posting perolehan & penyusutan MySQL
│   │   └── CoaUseCase.js        # Manajemen akun COA & migrasi histori aman MySQL
│   │
│   └── ui/                      # [Presentation Layer - Views & Helpers]
│       ├── utils.js             # Formatter rupiah, tanggal, sanitasi input
│       └── views/
│           ├── DashboardView.js # KPI keuangan, grafik posisi canvas, ranking
│           ├── BudgetView.js    # Hamparan spreadsheet anggaran editable live
│           ├── AssetView.js     # Register aset tetap & jadwal penyusutan
│           ├── JournalView.js   # Jurnal umum & wizard jurnal otomatis
│           ├── LedgerView.js    # Buku besar per akun dengan running balance
│           ├── CashView.js      # Buku kas & bank, visualisasi arus kas
│           ├── ReportsView.js   # Neraca Saldo, Laba Rugi, Posisi Keuangan, Ekuitas
│           ├── CoaView.js       # Manajemen bagan akun (COA) & template CSV
│           ├── EvaluationView.js# Analisis rasio keuangan (Likuiditas, Solvabilitas, ROA)
│           ├── SettingsView.js  # Pengaturan entitas, status MySQL & tombol migrasi
│           └── ExportsView.js   # Pusat export Excel/PDF & backup JSON
│
└── dist/
    └── index.html               # File standalone single-file (siap kirim/offline)
```

---

## 🚀 Cara Menjalankan

### 1. Pastikan MySQL Aktif (Homebrew)
Di Mac Anda, MySQL sudah aktif sebagai service Homebrew:
```bash
brew services start mysql
```
*Database name: `al_bayan_accounting` (User: `root`, Port: `3306`).*

### 2. Jalankan Backend Server (Node.js REST API)
Buka terminal dan jalankan:
```bash
cd server
npm start
```
Server akan aktif di: `http://localhost:3001` (terhubung ke MySQL).

### 3. Buka Frontend Aplikasi
Buka file `index.html` di browser Anda atau gunakan local web server:
```bash
python3 -m http.server 8000
# Buka http://localhost:8000 di browser
```

---

## 🔄 Fitur Dual-Mode (Online MySQL vs Offline LocalStorage)
* **Mode Online (`🟢 MySQL Database`)**:
  Ketika server backend aktif, aplikasi otomatis membaca dan menyimpan transaksi langsung ke database MySQL secara real-time.
* **Mode Offline (`🟡 LocalStorage`)**:
  Jika backend server belum dinyalakan, aplikasi tetap berjalan normal menggunakan memori lokal browser tanpa error.
* **Migrasi 1-Klik**:
  Tersedia tombol **"⇧ Migrasikan Data Local ke MySQL"** di menu **Pengaturan** untuk memindahkan seluruh data dari LocalStorage ke tabel-tabel MySQL dengan sekali klik.

---

## 🔑 Kredensial Default
- **Username**: `admin`
- **Password**: `admin123`
*(Tersimpan di tabel `users` MySQL dan dapat diubah kapan saja via menu Pengaturan).*
