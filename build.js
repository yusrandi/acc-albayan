/**
 * AL BAYAN HIDAYATULLAH MAKASSAR — Standalone Distribution Builder
 * Compiles modular CSS and JS into a single standalone HTML file inside dist/
 * Usage: node build.js
 */
const fs = require('fs');
const path = require('path');

const ROOT_DIR = __dirname;
const DIST_DIR = path.join(ROOT_DIR, 'dist');

if (!fs.existsSync(DIST_DIR)) {
  fs.mkdirSync(DIST_DIR, { recursive: true });
}

// 1. Read CSS files in order
const cssFiles = [
  'css/variables.css',
  'css/base.css',
  'css/components.css',
  'css/pages.css'
];
const bundleCss = cssFiles.map(file => {
  return `/* === ${file} === */\n` + fs.readFileSync(path.join(ROOT_DIR, file), 'utf8');
}).join('\n\n');

// 2. Read JS files in order
const jsFiles = [
  'src/ui/utils.js',
  'src/domain/models.js',
  'src/domain/AccountingEngine.js',
  'src/domain/DepreciationEngine.js',
  'src/repositories/ApiRepository.js',
  'src/repositories/StorageRepository.js',
  'src/repositories/ExportImportRepository.js',
  'src/usecases/AuthUseCase.js',
  'src/usecases/JournalUseCase.js',
  'src/usecases/BudgetUseCase.js',
  'src/usecases/AssetUseCase.js',
  'src/usecases/CoaUseCase.js',
  'src/ui/views/DashboardView.js',
  'src/ui/views/BudgetView.js',
  'src/ui/views/AssetView.js',
  'src/ui/views/JournalView.js',
  'src/ui/views/LedgerView.js',
  'src/ui/views/CashView.js',
  'src/ui/views/ReportsView.js',
  'src/ui/views/CoaView.js',
  'src/ui/views/EvaluationView.js',
  'src/ui/views/SettingsView.js',
  'src/ui/views/ExportsView.js',
  'src/app.js'
];
const bundleJs = jsFiles.map(file => {
  return `/* === ${file} === */\n` + fs.readFileSync(path.join(ROOT_DIR, file), 'utf8');
}).join('\n\n');

// 3. Read index.html shell and replace links & scripts with inline bundles
let html = fs.readFileSync(path.join(ROOT_DIR, 'index.html'), 'utf8');

// Replace CSS link tags
const cssRegex = /<!-- Modular Design System Stylesheets -->[\s\S]*?<\/head>/;
html = html.replace(cssRegex, `<style>\n${bundleCss}\n</style>\n</head>`);

// Replace JS script tags
const jsRegex = /<!-- Clean Architecture Scripts Loading -->[\s\S]*?<\/body>/;
html = html.replace(jsRegex, `<script>\n${bundleJs}\n</script>\n</body>`);

const targetPath = path.join(DIST_DIR, 'index.html');
fs.writeFileSync(targetPath, html, 'utf8');

console.log('✓ Build standalone berhasil dibuat: ' + targetPath);
console.log(`  Ukuran file: ${(fs.statSync(targetPath).size / 1024).toFixed(1)} KB`);
