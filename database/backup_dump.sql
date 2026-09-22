-- MySQL dump 10.13  Distrib 9.5.0, for macos26.1 (arm64)
--
-- Host: localhost    Database: al_bayan_accounting
-- ------------------------------------------------------
-- Server version	9.5.0

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `budgets`
--

DROP TABLE IF EXISTS `budgets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `budgets` (
  `id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `unit` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `plan_amount` decimal(18,2) DEFAULT '0.00',
  `actual_amount` decimal(18,2) DEFAULT '0.00',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `budgets`
--

LOCK TABLES `budgets` WRITE;
/*!40000 ALTER TABLE `budgets` DISABLE KEYS */;
/*!40000 ALTER TABLE `budgets` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `coa`
--

DROP TABLE IF EXISTS `coa`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `coa` (
  `code` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` enum('Asset','Liability','Equity','Revenue','Expense') COLLATE utf8mb4_unicode_ci NOT NULL,
  `normal` enum('Debit','Credit') COLLATE utf8mb4_unicode_ci NOT NULL,
  `group_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `active` tinyint(1) DEFAULT '1',
  `postable` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `coa`
--

LOCK TABLES `coa` WRITE;
/*!40000 ALTER TABLE `coa` DISABLE KEYS */;
INSERT INTO `coa` VALUES ('1000','ASET','Asset','Debit','',1,0,'2026-09-22 06:13:59'),('1100','Aset Lancar','Asset','Debit','',1,0,'2026-09-22 06:13:59'),('1101','Kas','Asset','Debit','',1,1,'2026-09-22 06:13:59'),('1102','Bank','Asset','Debit','',1,1,'2026-09-22 06:13:59'),('1103','Piutang Usaha','Asset','Debit','',1,1,'2026-09-22 06:13:59'),('1104','Piutang Lain-lain','Asset','Debit','',1,1,'2026-09-22 06:13:59'),('1105','Persediaan Barang Dagang','Asset','Debit','',1,1,'2026-09-22 06:13:59'),('1106','Persediaan Bahan','Asset','Debit','',1,1,'2026-09-22 06:13:59'),('1107','Uang Muka Pembelian','Asset','Debit','',1,1,'2026-09-22 06:13:59'),('1108','Biaya Dibayar Dimuka','Asset','Debit','',1,1,'2026-09-22 06:13:59'),('1109','Pajak Dibayar Dimuka','Asset','Debit','',1,1,'2026-09-22 06:13:59'),('1200','Aset Tetap','Asset','Debit','',1,0,'2026-09-22 06:13:59'),('1201','Tanah','Asset','Debit','',1,1,'2026-09-22 06:13:59'),('1202','Bangunan','Asset','Debit','',1,1,'2026-09-22 06:13:59'),('1203','Kendaraan','Asset','Debit','',1,1,'2026-09-22 06:13:59'),('1204','Peralatan Kantor','Asset','Debit','',1,1,'2026-09-22 06:13:59'),('1205','Mesin','Asset','Debit','',1,1,'2026-09-22 06:13:59'),('1291','Akumulasi Penyusutan Bangunan','Asset','Credit','',1,1,'2026-09-22 06:13:59'),('1292','Akumulasi Penyusutan Kendaraan','Asset','Credit','',1,1,'2026-09-22 06:13:59'),('1293','Akumulasi Penyusutan Peralatan','Asset','Credit','',1,1,'2026-09-22 06:13:59'),('1294','Akumulasi Penyusutan Mesin','Asset','Credit','',1,1,'2026-09-22 06:13:59'),('1300','Aset Tidak Lancar Lainnya','Asset','Debit','',1,0,'2026-09-22 06:13:59'),('1301','Investasi Jangka Panjang','Asset','Debit','',1,1,'2026-09-22 06:13:59'),('1302','Aset Takberwujud','Asset','Debit','',1,1,'2026-09-22 06:13:59'),('1391','Akumulasi Amortisasi','Asset','Credit','',1,1,'2026-09-22 06:13:59'),('2000','LIABILITAS','Liability','Credit','',1,0,'2026-09-22 06:13:59'),('2100','Liabilitas Jangka Pendek','Liability','Credit','',1,0,'2026-09-22 06:13:59'),('2101','Utang Usaha','Liability','Credit','',1,1,'2026-09-22 06:13:59'),('2102','Utang Gaji','Liability','Credit','',1,1,'2026-09-22 06:13:59'),('2103','Utang Pajak','Liability','Credit','',1,1,'2026-09-22 06:13:59'),('2104','Pendapatan Diterima Dimuka','Liability','Credit','',1,1,'2026-09-22 06:13:59'),('2105','Utang Biaya','Liability','Credit','',1,1,'2026-09-22 06:13:59'),('2106','Utang Lain-lain','Liability','Credit','',1,1,'2026-09-22 06:13:59'),('2200','Liabilitas Jangka Panjang','Liability','Credit','',1,0,'2026-09-22 06:13:59'),('2201','Pinjaman Bank Jangka Panjang','Liability','Credit','',1,1,'2026-09-22 06:13:59'),('2202','Liabilitas Sewa','Liability','Credit','',1,1,'2026-09-22 06:13:59'),('3000','EKUITAS','Equity','Credit','',1,0,'2026-09-22 06:13:59'),('3101','Modal Disetor','Equity','Credit','',1,1,'2026-09-22 06:13:59'),('3102','Modal Pemilik','Equity','Credit','',1,1,'2026-09-22 06:13:59'),('3201','Saldo Laba','Equity','Credit','',1,1,'2026-09-22 06:13:59'),('3202','Laba Tahun Berjalan','Equity','Credit','',1,1,'2026-09-22 06:13:59'),('3301','Prive','Equity','Debit','',1,1,'2026-09-22 06:13:59'),('3302','Pengambilan Modal','Equity','Debit','',1,1,'2026-09-22 06:13:59'),('4000','PENDAPATAN','Revenue','Credit','',1,0,'2026-09-22 06:13:59'),('4101','Pendapatan Pendidikan/Yayasan','Revenue','Credit','',1,1,'2026-09-22 06:13:59'),('4102','Pendapatan Jasa','Revenue','Credit','',1,1,'2026-09-22 06:13:59'),('4103','Pendapatan Sewa','Revenue','Credit','',1,1,'2026-09-22 06:13:59'),('4104','Pendapatan Hibah','Revenue','Credit','',1,1,'2026-09-22 06:13:59'),('4201','Pendapatan Lain-lain','Revenue','Credit','',1,1,'2026-09-22 06:13:59'),('5000','BEBAN','Expense','Debit','',1,0,'2026-09-22 06:13:59'),('5101','Harga Pokok Penjualan','Expense','Debit','',1,1,'2026-09-22 06:13:59'),('5102','Pembelian','Expense','Debit','',1,1,'2026-09-22 06:13:59'),('5201','Beban Gaji','Expense','Debit','',1,1,'2026-09-22 06:13:59'),('5202','Beban Sewa','Expense','Debit','',1,1,'2026-09-22 06:13:59'),('5203','Beban Listrik & Air','Expense','Debit','',1,1,'2026-09-22 06:13:59'),('5204','Beban Internet & Komunikasi','Expense','Debit','',1,1,'2026-09-22 06:13:59'),('5205','Beban Transportasi','Expense','Debit','',1,1,'2026-09-22 06:13:59'),('5206','Beban Penyusutan','Expense','Debit','',1,1,'2026-09-22 06:13:59'),('5207','Beban Perlengkapan','Expense','Debit','',1,1,'2026-09-22 06:13:59'),('5208','Beban Administrasi Bank','Expense','Debit','',1,1,'2026-09-22 06:13:59'),('5209','Beban Bunga','Expense','Debit','',1,1,'2026-09-22 06:13:59'),('5210','Beban Pemeliharaan','Expense','Debit','',1,1,'2026-09-22 06:13:59'),('5211','Beban Promosi & Marketing','Expense','Debit','',1,1,'2026-09-22 06:13:59'),('5212','Beban Pajak','Expense','Debit','',1,1,'2026-09-22 06:13:59'),('5213','Beban Asuransi','Expense','Debit','',1,1,'2026-09-22 06:13:59'),('5299','Beban Lain-lain','Expense','Debit','',1,1,'2026-09-22 06:13:59');
/*!40000 ALTER TABLE `coa` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `fixed_assets`
--

DROP TABLE IF EXISTS `fixed_assets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fixed_assets` (
  `id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT 'Aktif',
  `acquisition_date` date NOT NULL,
  `available_date` date NOT NULL,
  `cost` decimal(18,2) NOT NULL DEFAULT '0.00',
  `residual` decimal(18,2) DEFAULT '0.00',
  `useful_years` decimal(5,2) NOT NULL DEFAULT '5.00',
  `method` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT 'SL',
  `units_total` int DEFAULT '0',
  `units_used` int DEFAULT '0',
  `asset_account` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `accum_account` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `expense_account` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `source_account` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `location` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `responsible` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`),
  KEY `asset_account` (`asset_account`),
  KEY `accum_account` (`accum_account`),
  KEY `expense_account` (`expense_account`),
  CONSTRAINT `fixed_assets_ibfk_1` FOREIGN KEY (`asset_account`) REFERENCES `coa` (`code`) ON UPDATE CASCADE,
  CONSTRAINT `fixed_assets_ibfk_2` FOREIGN KEY (`accum_account`) REFERENCES `coa` (`code`) ON UPDATE CASCADE,
  CONSTRAINT `fixed_assets_ibfk_3` FOREIGN KEY (`expense_account`) REFERENCES `coa` (`code`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `fixed_assets`
--

LOCK TABLES `fixed_assets` WRITE;
/*!40000 ALTER TABLE `fixed_assets` DISABLE KEYS */;
/*!40000 ALTER TABLE `fixed_assets` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `journal_lines`
--

DROP TABLE IF EXISTS `journal_lines`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `journal_lines` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `journal_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `account_code` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `note` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `debit` decimal(18,2) DEFAULT '0.00',
  `credit` decimal(18,2) DEFAULT '0.00',
  `amount` decimal(18,2) DEFAULT '0.00',
  `dc` char(1) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'D',
  PRIMARY KEY (`id`),
  KEY `journal_id` (`journal_id`),
  KEY `account_code` (`account_code`),
  CONSTRAINT `journal_lines_ibfk_1` FOREIGN KEY (`journal_id`) REFERENCES `journals` (`id`) ON DELETE CASCADE,
  CONSTRAINT `journal_lines_ibfk_2` FOREIGN KEY (`account_code`) REFERENCES `coa` (`code`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `journal_lines`
--

LOCK TABLES `journal_lines` WRITE;
/*!40000 ALTER TABLE `journal_lines` DISABLE KEYS */;
/*!40000 ALTER TABLE `journal_lines` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `journals`
--

DROP TABLE IF EXISTS `journals`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `journals` (
  `id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `journal_no` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `journal_date` date NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `meta_json` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_journal_date` (`journal_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `journals`
--

LOCK TABLES `journals` WRITE;
/*!40000 ALTER TABLE `journals` DISABLE KEYS */;
/*!40000 ALTER TABLE `journals` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `settings`
--

DROP TABLE IF EXISTS `settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `settings` (
  `id` int NOT NULL DEFAULT '1',
  `name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'AL BAYAN HIDAYATULLAH MAKASSAR',
  `period` varchar(7) COLLATE utf8mb4_unicode_ci NOT NULL,
  `standard` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'SAK Entitas Privat (EP)',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `settings`
--

LOCK TABLES `settings` WRITE;
/*!40000 ALTER TABLE `settings` DISABLE KEYS */;
INSERT INTO `settings` VALUES (1,'AL BAYAN HIDAYATULLAH MAKASSAR','2026-09','SAK Entitas Privat (EP)','2026-09-22 06:13:59');
/*!40000 ALTER TABLE `settings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'Administrator',
  `active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'admin','admin123','Administrator',1,'2026-09-22 06:13:59');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-09-22 19:23:22
