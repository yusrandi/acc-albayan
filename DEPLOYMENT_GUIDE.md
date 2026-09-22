# Panduan Deployment ke Production (VPS) — AL BAYAN HIDAYATULLAH MAKASSAR

Panduan ini berisi langkah demi langkah untuk mendeploy aplikasi akuntansi ini ke VPS (Ubuntu 22.04 / 24.04 LTS).

---

## 1. Spesifikasi Minimum VPS yang Disarankan
- **OS**: Ubuntu 22.04 LTS / 24.04 LTS
- **RAM**: Minimal 1 GB (Disarankan 2 GB + 1 GB Swap)
- **CPU**: 1 Core vCPU
- **Disk**: 20 GB SSD

---

## 2. Persiapan Server VPS

Hubungkan SSH ke VPS Anda:
```bash
ssh root@IP_VPS_ANDA
```

Update repositori dan paket sistem:
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git ufw unzip
```

---

## 3. Instalasi Node.js, MySQL & Nginx

### A. Install Node.js 20 LTS
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v # Pastikan v20.x.x
```

### B. Install PM2 (Process Manager agar server tidak mati)
```bash
sudo npm install -g pm2
```

### C. Install MySQL Server
```bash
sudo apt install -y mysql-server
sudo mysql_secure_installation
```

Buat database dan user MySQL:
```bash
sudo mysql -u root -p
```
Lalu jalankan query SQL berikut (ganti `PasswordKuatAnda123!` dengan password aman):
```sql
CREATE DATABASE al_bayan_accounting CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'albayan_user'@'localhost' IDENTIFIED BY 'PasswordKuatAnda123!';
GRANT ALL PRIVILEGES ON al_bayan_accounting.* TO 'albayan_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### D. Install Nginx
```bash
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

---

## 4. Upload & Konfigurasi Kode di VPS

### A. Clone atau Upload Folder Proyek
Misalnya diletakkan di `/var/www/albayan-accounting`:
```bash
sudo mkdir -p /var/www/albayan-accounting
sudo chown -R $USER:$USER /var/www/albayan-accounting
```
Upload file via Git, SCP, atau SFTP ke folder tersebut.

### B. Import Database Schema
Jalankan file skema SQL ke database yang sudah dibuat:
```bash
mysql -u albayan_user -p al_bayan_accounting < /home/ubuntu/acc-albayan/database/schema.sql
```

### C. Install Dependencies Backend
```bash
cd /home/ubuntu/acc-albayan/server
npm install --omit=dev
```

### D. Konfigurasi Environment (`.env`)
Salin file `.env.example` ke `.env`:
```bash
cp .env.example .env
nano .env
```
Sesuaikan isinya:
```env
PORT=3001
NODE_ENV=production

DB_HOST=localhost
DB_PORT=3306
DB_USER=albayan_user
DB_PASSWORD=PasswordKuatAnda123!
DB_NAME=al_bayan_accounting
```
Simpan dengan `Ctrl + O`, lalu keluar dengan `Ctrl + X`.

---

## 5. Menjalankan Aplikasi dengan PM2

Kembali ke root project:
```bash
cd /home/ubuntu/acc-albayan
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```
*(Jalankan perintah `sudo env PATH=...` yang disarankan oleh output `pm2 startup` agar aplikasi otomatis menyala saat VPS di-reboot).*

Cek status:
```bash
pm2 status
pm2 logs albayan-accounting
```

---

## 6. Konfigurasi Nginx (Domain & Reverse Proxy)

Salin template konfigurasi:
```bash
sudo cp /home/ubuntu/acc-albayan/deploy/nginx.conf /etc/nginx/sites-available/albayan
sudo nano /etc/nginx/sites-available/albayan
```
Ganti `your-domain.com` dengan nama domain Anda (atau biarkan IP VPS).

Aktifkan konfigurasi:
```bash
sudo ln -s /etc/nginx/sites-available/albayan /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

---

## 7. Pasang SSL Gratis (HTTPS) dengan Certbot

Jika Anda sudah mengarahkan domain ke IP VPS:
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```
Certbot akan otomatis mengonfigurasi sertifikat HTTPS dan perpanjangan otomatis.

---

## 8. Konfigurasi Firewall (UFW)
```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

---

## Selesai!
Aplikasi akuntansi Al Bayan Hidayatullah kini sudah aktif di production:
- **Akses Web**: `https://your-domain.com` (atau `http://IP_VPS`)
- **Login Default**:
  - Username: `admin`
  - Password: `admin123`
- Database tersambung secara aman di MySQL lokal VPS dengan mode ACID transaction penuh.
