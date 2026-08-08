-- MySQL dump 10.13  Distrib 8.0.42, for Win64 (x86_64)
--
-- Host: localhost    Database: DalatShop
-- ------------------------------------------------------
-- Server version	8.0.42

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
-- Current Database: `DalatShop`
--

CREATE DATABASE /*!32312 IF NOT EXISTS*/ `DalatShop` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;

USE `DalatShop`;

--
-- Table structure for table `bulk_order_items`
--

DROP TABLE IF EXISTS `bulk_order_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bulk_order_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `bulkOrderId` int NOT NULL,
  `productId` varchar(50) DEFAULT NULL,
  `productName` varchar(255) DEFAULT NULL,
  `kg` decimal(10,2) DEFAULT NULL,
  `pricePerKg` decimal(15,2) DEFAULT NULL,
  `subtotal` decimal(15,2) DEFAULT NULL,
  `note` text,
  PRIMARY KEY (`id`),
  KEY `bulkOrderId` (`bulkOrderId`),
  CONSTRAINT `bulk_order_items_ibfk_1` FOREIGN KEY (`bulkOrderId`) REFERENCES `bulk_orders` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bulk_order_items`
--

LOCK TABLES `bulk_order_items` WRITE;
/*!40000 ALTER TABLE `bulk_order_items` DISABLE KEYS */;
INSERT INTO `bulk_order_items` VALUES (1,1,'1','Rau Cải Xanh',3.00,15000.00,45000.00,NULL),(2,1,'2','Rau Mùi Tươi',1.00,10000.00,10000.00,NULL),(3,1,'3','Cải Thảo Đà Lạt',1.00,18000.00,18000.00,NULL),(4,1,'5','Rau Ngổ Thơm',1.00,10000.00,10000.00,NULL),(5,2,'1','Rau Cải Xanh',1.50,15000.00,22500.00,NULL),(6,2,'2','Rau Mùi Tươi',2.00,10000.00,20000.00,NULL),(7,2,'3','Cải Thảo Đà Lạt',3.00,18000.00,54000.00,NULL),(8,3,'1','Rau Cải Xanh',50.00,15000.00,750000.00,NULL),(9,4,'21','Nấm Linh Chi Trắng',50.00,85000.00,4250000.00,NULL),(10,5,'21','Nấm Linh Chi Trắng',50.00,85000.00,4250000.00,NULL);
/*!40000 ALTER TABLE `bulk_order_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `bulk_orders`
--

DROP TABLE IF EXISTS `bulk_orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bulk_orders` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `orderCode` varchar(50) NOT NULL,
  `orderDate` varchar(50) DEFAULT NULL,
  `totalPrice` decimal(15,2) DEFAULT '0.00',
  `status` varchar(20) DEFAULT 'pending',
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `userId` (`userId`),
  CONSTRAINT `bulk_orders_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bulk_orders`
--

LOCK TABLES `bulk_orders` WRITE;
/*!40000 ALTER TABLE `bulk_orders` DISABLE KEYS */;
INSERT INTO `bulk_orders` VALUES (1,1,'DH40050138','03:00:50 17/6/2026',83000.00,'pending','2026-06-17 03:00:52'),(2,1,'DH40132634','03:02:12 17/6/2026',96500.00,'pending','2026-06-17 03:02:15'),(3,1,'DH26507237','14:08:27 13/7/2026',750000.00,'pending','2026-07-13 14:08:33'),(4,1,'DH26530300','14:08:50 13/7/2026',4250000.00,'delivered','2026-07-13 14:08:51'),(5,1,'DH26559187','14:09:19 13/7/2026',4250000.00,'delivered','2026-07-13 14:09:20');
/*!40000 ALTER TABLE `bulk_orders` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `categories`
--

DROP TABLE IF EXISTS `categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `categories` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `slug` varchar(100) NOT NULL,
  `imageUrl` varchar(255) DEFAULT NULL,
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `slug` (`slug`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `categories`
--

LOCK TABLES `categories` WRITE;
/*!40000 ALTER TABLE `categories` DISABLE KEYS */;
INSERT INTO `categories` VALUES (1,'Rau lá','leaf',NULL,'2026-05-10 05:00:44'),(2,'Củ','root',NULL,'2026-05-10 05:00:44'),(3,'Quả','fruit',NULL,'2026-05-10 05:00:44'),(4,'Rau thơm','herb',NULL,'2026-05-10 05:00:44'),(5,'Nấm','mushroom',NULL,'2026-05-10 05:00:44'),(6,'Hàng thịt','hang-thit','','2026-06-16 20:10:36');
/*!40000 ALTER TABLE `categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `inventory_flashsale`
--

DROP TABLE IF EXISTS `inventory_flashsale`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inventory_flashsale` (
  `id` int NOT NULL AUTO_INCREMENT,
  `productId` int NOT NULL,
  `discountPct` int DEFAULT '20',
  `isActive` tinyint(1) DEFAULT '0',
  `activatedAt` datetime DEFAULT NULL,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `productId` (`productId`),
  CONSTRAINT `inventory_flashsale_ibfk_1` FOREIGN KEY (`productId`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `inventory_flashsale`
--

LOCK TABLES `inventory_flashsale` WRITE;
/*!40000 ALTER TABLE `inventory_flashsale` DISABLE KEYS */;
INSERT INTO `inventory_flashsale` VALUES (1,1,20,1,'2026-06-05 08:08:12','2026-06-05 08:08:12'),(2,6,30,0,NULL,'2026-06-05 08:08:12'),(3,9,25,0,NULL,'2026-06-05 08:08:12');
/*!40000 ALTER TABLE `inventory_flashsale` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `inventory_logs`
--

DROP TABLE IF EXISTS `inventory_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inventory_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `productId` int NOT NULL,
  `productName` varchar(255) DEFAULT NULL,
  `type` enum('import','export','flashsale') NOT NULL,
  `quantity` int NOT NULL,
  `note` varchar(500) DEFAULT NULL,
  `supplier` varchar(255) DEFAULT NULL,
  `receiver` varchar(255) DEFAULT NULL,
  `price` bigint DEFAULT '0',
  `createdBy` int DEFAULT NULL,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_invlog_product` (`productId`),
  KEY `idx_invlog_type` (`type`),
  KEY `idx_invlog_createdat` (`createdAt`),
  CONSTRAINT `inventory_logs_ibfk_1` FOREIGN KEY (`productId`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=27 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `inventory_logs`
--

LOCK TABLES `inventory_logs` WRITE;
/*!40000 ALTER TABLE `inventory_logs` DISABLE KEYS */;
INSERT INTO `inventory_logs` VALUES (1,1,'Rau Cải Xanh','import',50,'Nhập hàng đầu tuần','Nông trại Đà Lạt',NULL,15000,1,'2026-05-30 08:08:12'),(2,2,'Rau Mùi Tươi','import',80,'Nhập lô hàng mới','HTX Rau sạch Lâm Đồng',NULL,12000,1,'2026-05-30 08:08:12'),(3,1,'Rau Cải Xanh','export',20,'Bán hàng - Đơn lẻ',NULL,NULL,0,1,'2026-05-30 08:08:12'),(4,3,'Cải Thảo Đà Lạt','import',40,'Nhập bổ sung','Nông trại Đà Lạt',NULL,18000,1,'2026-05-31 08:08:12'),(5,2,'Rau Mùi Tươi','export',15,'Bán hàng - Đơn sỉ',NULL,NULL,0,1,'2026-05-31 08:08:12'),(6,4,'Bắp Cải Xanh','export',30,'Bán hàng - Đơn lẻ',NULL,NULL,0,1,'2026-05-31 08:08:12'),(7,5,'Rau Ngổ Thơm','import',100,'Nhập hàng tuần mới','Công ty TNHH Rau Tươi',NULL,10000,1,'2026-06-01 08:08:12'),(8,6,'Cà Rốt Đà Lạt','import',60,'Nhập thêm hàng','HTX Rau sạch Lâm Đồng',NULL,22000,1,'2026-06-01 08:08:12'),(9,3,'Cải Thảo Đà Lạt','export',25,'Bán hàng - Đơn lẻ',NULL,NULL,0,1,'2026-06-01 08:08:12'),(10,5,'Rau Ngổ Thơm','export',10,'Hư hỏng - Loại bỏ',NULL,NULL,0,1,'2026-06-02 08:08:12'),(11,7,'Khoai Tây Đà Lạt','import',70,'Nhập hàng giữa tuần','Nông trại Đà Lạt',NULL,14000,1,'2026-06-02 08:08:12'),(12,1,'Rau Cải Xanh','export',35,'Bán hàng - Đơn sỉ nhà hàng',NULL,NULL,0,1,'2026-06-02 08:08:12'),(13,8,'Hành Lá Tươi','import',45,'Nhập hàng cuối tuần','Công ty TNHH Rau Tươi',NULL,16000,1,'2026-06-03 08:08:12'),(14,6,'Cà Rốt Đà Lạt','export',18,'Bán hàng - Đơn lẻ',NULL,NULL,0,1,'2026-06-03 08:08:12'),(15,7,'Khoai Tây Đà Lạt','export',22,'Chuyển kho - Chi nhánh 2',NULL,NULL,0,1,'2026-06-03 08:08:12'),(16,9,'Gừng Tươi Đà Lạt','import',55,'Nhập hàng hôm qua','HTX Rau sạch Lâm Đồng',NULL,19000,1,'2026-06-04 08:08:12'),(17,10,'Su Hào Đà Lạt','import',30,'Nhập hàng cao cấp','Nông trại Đà Lạt',NULL,25000,1,'2026-06-04 08:08:12'),(18,4,'Bắp Cải Xanh','export',40,'Bán hàng - Đơn sỉ siêu thị',NULL,NULL,0,1,'2026-06-04 08:08:12'),(19,1,'Rau Cải Xanh','import',90,'Nhập hàng sáng nay','Công ty TNHH Rau Tươi',NULL,13000,1,'2026-06-05 08:08:12'),(20,3,'Cải Thảo Đà Lạt','import',65,'Nhập hàng buổi sáng','Nông trại Đà Lạt',NULL,17000,1,'2026-06-05 08:08:12'),(21,2,'Rau Mùi Tươi','export',28,'Bán hàng - Đơn lẻ sáng nay',NULL,NULL,0,1,'2026-06-05 08:08:12'),(22,5,'Rau Ngổ Thơm','export',15,'Bán hàng - Đơn sỉ sáng nay',NULL,NULL,0,1,'2026-06-05 08:08:12'),(23,21,'Nấm Linh Chi Trắng','import',100,'','nấm Ánh Nguyên',NULL,60000,4,'2026-06-12 12:58:37'),(24,20,'Đậu Hà Lan Đà Lạt','import',50,'','Đậu hà lan',NULL,25000,4,'2026-06-12 12:59:02'),(25,21,'Nấm Linh Chi Trắng','export',20,'Bán hàng',NULL,'chị Trâm',0,4,'2026-06-12 12:59:45'),(26,2,'Rau Mùi Tươi','import',20,'','ádas',NULL,23000,4,'2026-07-13 15:55:01');
/*!40000 ALTER TABLE `inventory_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `order_items`
--

DROP TABLE IF EXISTS `order_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `order_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `orderId` int NOT NULL,
  `productId` int NOT NULL,
  `productName` varchar(255) DEFAULT NULL,
  `price` decimal(10,2) DEFAULT NULL,
  `quantity` int DEFAULT NULL,
  `note` text,
  PRIMARY KEY (`id`),
  KEY `orderId` (`orderId`),
  KEY `productId` (`productId`),
  CONSTRAINT `order_items_ibfk_1` FOREIGN KEY (`orderId`) REFERENCES `orders` (`id`),
  CONSTRAINT `order_items_ibfk_2` FOREIGN KEY (`productId`) REFERENCES `products` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `order_items`
--

LOCK TABLES `order_items` WRITE;
/*!40000 ALTER TABLE `order_items` DISABLE KEYS */;
INSERT INTO `order_items` VALUES (1,1,6,'Cà Rốt Đà Lạt',20000.00,1,NULL),(2,2,6,'Cà Rốt Đà Lạt',20000.00,2,NULL),(3,3,21,'Nấm Linh Chi Trắng',85000.00,86,NULL),(4,4,1,'Rau Cải Xanh',15000.00,1,NULL),(5,4,9,'Gừng Tươi Đà Lạt',30000.00,1,NULL),(6,5,1,'Rau Cải Xanh',15000.00,2,NULL),(7,5,4,'Bắp Cải Xanh',20000.00,3,NULL),(8,6,9,'Gừng Tươi Đà Lạt',30000.00,100,NULL),(9,7,2,'Rau Mùi Tươi',10000.00,2,NULL),(10,8,11,'Cà Chua Đà Lạt',22000.00,1,NULL),(11,9,21,'Nấm Linh Chi Trắng',85000.00,80,NULL),(12,10,21,'Nấm Linh Chi Trắng',85000.00,60,NULL),(13,11,9,'Gừng Tươi Đà Lạt',30000.00,120,NULL),(14,12,1,'Rau Cải Xanh',15000.00,1,NULL),(15,13,6,'Cà Rốt Đà Lạt',20000.00,1,NULL),(16,14,1,'Rau Cải Xanh',15000.00,2,NULL),(17,15,19,'Nấm Hương Đà Lạt',40000.00,2,NULL);
/*!40000 ALTER TABLE `order_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `orders`
--

DROP TABLE IF EXISTS `orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `orders` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int DEFAULT NULL,
  `totalAmount` decimal(10,2) DEFAULT NULL,
  `status` varchar(50) DEFAULT 'pending',
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `address` varchar(500) DEFAULT NULL,
  `note` text,
  `orderCode` varchar(50) DEFAULT NULL,
  `paymentMethod` varchar(100) DEFAULT NULL,
  `shippingAddress` varchar(500) DEFAULT NULL,
  `estimatedDelivery` date DEFAULT NULL,
  `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `userId` (`userId`),
  CONSTRAINT `orders_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `orders`
--

LOCK TABLES `orders` WRITE;
/*!40000 ALTER TABLE `orders` DISABLE KEYS */;
INSERT INTO `orders` VALUES (1,5,20000.00,'delivered','2026-05-26 03:01:43',NULL,NULL,'DH303411','Tiền mặt (COD)','thái bảo trâm - 0923123111 - 270A Âu cơ, liên nghĩa, đức trọng, Lâm Đồng',NULL,'2026-05-26 03:10:21'),(2,5,40000.00,'delivered','2026-05-26 03:16:25',NULL,NULL,'DH185723','Tiền mặt (COD)','thái bảo trâm - 0923123111 - 270a ấu cơ',NULL,'2026-05-26 03:16:40'),(3,5,7310000.00,'delivered','2026-05-26 03:24:10',NULL,NULL,'DH650078','Tiền mặt (COD)','thái bảo trâm - 0923123111 - 60 ấu cơ',NULL,'2026-05-26 03:24:22'),(4,1,45000.00,'pending','2026-06-02 00:48:56',NULL,NULL,'DH136306','Tiền mặt (COD)','tranduong - 0942771476 - 60 trần nhân tông',NULL,'2026-06-02 00:48:56'),(5,1,90000.00,'confirmed','2026-06-18 10:59:59',NULL,NULL,'DH199440','Tiền mặt (COD)','tranduong - 0942771476 - 60 trần nhân tông',NULL,'2026-06-18 11:10:06'),(6,5,3000000.00,'delivered','2026-06-18 12:01:46',NULL,NULL,'DH906524','Tiền mặt (COD)','thái bảo trâm - 0923123111 - 60 ấu cơ',NULL,'2026-06-18 12:02:19'),(7,NULL,20000.00,'pending','2026-07-10 20:11:30',NULL,NULL,'DH090123','Tiền mặt (COD)','duy - 0129301231 - 60 âu cơ',NULL,'2026-07-10 20:11:30'),(8,NULL,22000.00,'pending','2026-07-13 14:03:03',NULL,NULL,'DH183917','Tiền mặt (COD)','du - 092302131 - 60 âu cơ',NULL,'2026-07-13 14:03:03'),(9,1,6800000.00,'delivered','2026-07-13 14:21:48',NULL,NULL,'DH308365','cod','tranduong - 0942771476 - 60 tran nhantong',NULL,'2026-07-13 14:22:25'),(10,1,5100000.00,'delivered','2026-07-13 14:34:55',NULL,NULL,'DH095050','cod','tranduong - 0942771476 - 4324asd',NULL,'2026-07-13 14:35:11'),(11,NULL,3600000.00,'pending','2026-07-13 16:04:26',NULL,NULL,'DH467035','cod','Admin - 0900000000 - Aa',NULL,'2026-07-13 16:04:26'),(12,NULL,15000.00,'pending','2026-07-13 16:06:47',NULL,NULL,'DH607480','cod','Admin - 0900000000 - Aa',NULL,'2026-07-13 16:06:47'),(13,4,20000.00,'pending','2026-07-13 16:07:58',NULL,NULL,'DH678443','cod','Admin - 0900000000 - aa',NULL,'2026-07-13 16:07:58'),(14,NULL,27000.00,'pending','2026-07-13 16:10:04',NULL,NULL,'DH805567','cod','Admin - 0900000000 - Aa',NULL,'2026-07-13 16:10:04'),(15,1,80000.00,'pending','2026-07-13 16:11:20',NULL,NULL,'DH881613','cod','tranduong - 0942771476 - Baba',NULL,'2026-07-13 16:11:20');
/*!40000 ALTER TABLE `orders` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `otp_codes`
--

DROP TABLE IF EXISTS `otp_codes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `otp_codes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `phone` varchar(20) DEFAULT NULL,
  `otp_code` varchar(6) DEFAULT NULL,
  `expires_at` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `otp_codes`
--

LOCK TABLES `otp_codes` WRITE;
/*!40000 ALTER TABLE `otp_codes` DISABLE KEYS */;
/*!40000 ALTER TABLE `otp_codes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `products`
--

DROP TABLE IF EXISTS `products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `products` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) DEFAULT NULL,
  `price` varchar(20) DEFAULT NULL,
  `oldPrice` varchar(20) DEFAULT NULL,
  `cat` varchar(50) DEFAULT NULL,
  `imageUrl` varchar(255) DEFAULT NULL,
  `isFlashSale` tinyint(1) DEFAULT '0',
  `salePrice` varchar(20) DEFAULT NULL,
  `priceValue` int DEFAULT '0',
  `stock` int DEFAULT '0',
  `unit` varchar(20) DEFAULT 'kg',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `products`
--

LOCK TABLES `products` WRITE;
/*!40000 ALTER TABLE `products` DISABLE KEYS */;
INSERT INTO `products` VALUES (1,'Rau Cải Xanh','15000','15000','leaf','img4.jpg',1,'12000',15000,0,'kg'),(2,'Rau Mùi Tươi','10000',NULL,'leaf','img5.jpg',0,NULL,10000,20,'kg'),(3,'Cải Thảo Đà Lạt','18000','25000','leaf','img7.jpg',1,'18000',18000,0,'kg'),(4,'Bắp Cải Xanh','20000','28000','leaf','img11.jpg',1,'20000',20000,0,'kg'),(5,'Rau Ngổ Thơm','10000',NULL,'leaf','img22.jpg',0,NULL,10000,0,'kg'),(6,'Cà Rốt Đà Lạt','20000','25000','root','img6.jpg',1,'20000',20000,0,'kg'),(7,'Khoai Tây Đà Lạt','25000','32000','root','img8.jpg',1,'25000',25000,0,'kg'),(8,'Hành Lá Tươi','12000',NULL,'root','img13.jpg',0,NULL,12000,0,'kg'),(9,'Gừng Tươi Đà Lạt','30000','38000','root','img15.jpg',0,'30000',30000,0,'kg'),(10,'Su Hào Đà Lạt','18000','22000','root','img12.jpg',0,'18000',18000,0,'kg'),(11,'Cà Chua Đà Lạt','22000','28000','fruit','img9.jpg',1,'22000',22000,0,'kg'),(12,'Dưa Leo Đà Lạt','15000',NULL,'fruit','img10.jpg',0,NULL,15000,0,'kg'),(13,'Bí Đỏ Đà Lạt','22000','28000','fruit','img20.jpg',0,'22000',22000,0,'kg'),(14,'Dưa Chuột Baby','19000','25000','fruit','img21.jpg',1,'19000',18000,0,'kg'),(15,'Ngò Rí Đà Lạt','12000',NULL,'herb','img23.jpg',0,NULL,12000,0,'kg'),(16,'Rau Củ Sắc Màu','38000','48000','herb','img24.jpg',0,'38000',38000,0,'kg'),(17,'Hành Tây Đà Lạt','20000','26000','herb','img2.jpg',0,'20000',20000,0,'kg'),(18,'Nấm Bào Ngư Trắng','35000','45000','mushroom','img16.jpg',1,'35000',35000,0,'kg'),(19,'Nấm Hương Đà Lạt','40000','50000','mushroom','img17.jpg',1,'40000',40000,0,'kg'),(20,'Đậu Hà Lan Đà Lạt','28000',NULL,'mushroom','img18.jpg',0,NULL,28000,50,'kg'),(21,'Nấm Linh Chi Trắng','85000','100000','mushroom','img19.jpg',1,'85000',85000,80,'kg');
/*!40000 ALTER TABLE `products` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `promotions`
--

DROP TABLE IF EXISTS `promotions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `promotions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `code` varchar(50) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `discountType` enum('percent','fixed') DEFAULT 'percent',
  `discountValue` decimal(10,2) DEFAULT '0.00',
  `minOrderValue` decimal(10,2) DEFAULT '0.00',
  `maxUsage` int DEFAULT '0',
  `usedCount` int DEFAULT '0',
  `startDate` date DEFAULT NULL,
  `endDate` date DEFAULT NULL,
  `isActive` tinyint(1) DEFAULT '1',
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `promotions`
--

LOCK TABLES `promotions` WRITE;
/*!40000 ALTER TABLE `promotions` DISABLE KEYS */;
INSERT INTO `promotions` VALUES (1,'TEST10','Test','percent',10.00,0.00,0,0,NULL,NULL,1,'2026-05-13 16:50:59','2026-05-13 16:50:59'),(3,'TEST20','Test 2','percent',20.00,0.00,0,0,'2026-05-13','2026-07-13',1,'2026-05-13 17:05:41','2026-05-13 17:05:41'),(5,'NEWCODE99','Test mới','percent',15.00,0.00,0,0,'2026-05-13','2026-07-13',1,'2026-05-13 17:06:32','2026-05-13 17:06:32'),(6,'SUMMER','KHUYEN MÃI MÙA HÈ','percent',10.00,20000.00,100,2,'2026-05-13','2026-07-13',1,'2026-05-13 17:17:42','2026-05-13 17:17:42');
/*!40000 ALTER TABLE `promotions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_tokens`
--

DROP TABLE IF EXISTS `user_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_tokens` (
  `token` varchar(255) NOT NULL,
  `userId` int NOT NULL,
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`token`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_tokens`
--

LOCK TABLES `user_tokens` WRITE;
/*!40000 ALTER TABLE `user_tokens` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_tokens` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_vip_history`
--

DROP TABLE IF EXISTS `user_vip_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_vip_history` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `cycle_key` varchar(20) NOT NULL,
  `tier_key` varchar(20) DEFAULT NULL,
  `spending` decimal(12,2) DEFAULT '0.00',
  `points_earned` decimal(12,2) DEFAULT '0.00',
  `changed_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `user_vip_history_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_vip_history`
--

LOCK TABLES `user_vip_history` WRITE;
/*!40000 ALTER TABLE `user_vip_history` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_vip_history` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `email` varchar(150) NOT NULL,
  `phone` varchar(20) NOT NULL,
  `password` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `username` varchar(100) DEFAULT NULL,
  `address` text,
  `is_verified` tinyint(1) DEFAULT '0',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `role` varchar(20) DEFAULT 'user',
  `banned` tinyint(1) DEFAULT '0',
  `vipTier` varchar(20) DEFAULT NULL,
  `quarterlySpending` decimal(12,2) DEFAULT '0.00',
  `rewardPoints` decimal(12,2) DEFAULT '0.00',
  `vipQuarterKey` varchar(20) DEFAULT NULL,
  `vipTierUpdatedAt` datetime DEFAULT NULL,
  `session_token` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'tranduong','nd141003@gmail.com','0942771476','Trantranduong1@','2026-05-05 03:51:56','tranduong','60 Trần nhân tông',1,'2026-07-13 09:10:43','user',0,'gold',11900000.00,1445.00,'2026-Q3','2026-07-13 14:35:11','2d38a665-5db4-404a-aea1-fc436c92b972'),(2,'uesd1','nd1410023@gmail.com','0903231321','Trantranduong1@','2026-05-07 01:37:58','uesd1','66 nhân tông, liên nghĩa, đức trọng, Lâm Đồng',1,'2026-06-16 20:09:58','Admin',0,NULL,0.00,0.00,NULL,NULL,NULL),(3,'Admin','admin@freshveggies.com','0942771476','admin123','2026-05-09 07:29:17','Admin','',1,'2026-05-09 07:34:18','admin',0,NULL,0.00,0.00,NULL,NULL,NULL),(4,'Admin','admin@admin.com','0900000000','Admin@123','2026-05-10 04:49:24','admin',NULL,1,'2026-07-13 08:53:02','admin',0,NULL,0.00,0.00,'2026-Q3','2026-07-10 19:54:42','b3bd2db6-2888-4c1f-afc9-072e9a2c4817'),(5,'thái bảo trâm','nd141002@gmail.com','0923123111','Tranduong1@','2026-05-25 19:47:26','thái bảo trâm','270A Âu cơ, liên nghĩa, đức trọng, Lâm Đồng',1,'2026-06-18 05:02:36','user',0,'silver',7370000.00,7370.00,'2026-Q2','2026-05-26 03:26:21','b0739079-c2fe-4847-8dda-7cf534f1a707');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users_backup`
--

DROP TABLE IF EXISTS `users_backup`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users_backup` (
  `id` int NOT NULL DEFAULT '0',
  `name` varchar(100) NOT NULL,
  `email` varchar(150) NOT NULL,
  `phone` varchar(20) NOT NULL,
  `password` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `username` varchar(100) DEFAULT NULL,
  `address` text,
  `is_verified` tinyint(1) DEFAULT '0',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `role` varchar(20) DEFAULT 'user',
  `banned` tinyint(1) DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users_backup`
--

LOCK TABLES `users_backup` WRITE;
/*!40000 ALTER TABLE `users_backup` DISABLE KEYS */;
INSERT INTO `users_backup` VALUES (1,'tranduong','nd141003@gmail.com','0942771476','Trantranduong1@','2026-05-05 03:51:56','tranduong','70 trần phú, liên nghĩa, đức trọng, Lâm Đồng',1,'2026-05-05 03:52:23','user',0),(2,'uesd1','nd1410023@gmail.com','0903231321','Trantranduong1@','2026-05-07 01:37:58','uesd1','66 nhân tông, liên nghĩa, đức trọng, Lâm Đồng',1,'2026-05-07 01:38:25','user',0),(3,'Admin','admin@freshveggies.com','0942771476','admin123','2026-05-09 07:29:17','Admin','',1,'2026-05-09 07:34:18','admin',0),(4,'Admin','admin@admin.com','0900000000','Admin@123','2026-05-10 04:49:24','admin',NULL,1,'2026-05-10 04:49:24','admin',0);
/*!40000 ALTER TABLE `users_backup` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `vip_tiers`
--

DROP TABLE IF EXISTS `vip_tiers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `vip_tiers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tier_key` varchar(20) NOT NULL,
  `label` varchar(50) NOT NULL,
  `min_spending` decimal(12,2) NOT NULL,
  `discount_percent` decimal(5,2) NOT NULL DEFAULT '0.00',
  `points_multiplier` decimal(5,2) NOT NULL DEFAULT '1.00',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `tier_key` (`tier_key`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `vip_tiers`
--

LOCK TABLES `vip_tiers` WRITE;
/*!40000 ALTER TABLE `vip_tiers` DISABLE KEYS */;
INSERT INTO `vip_tiers` VALUES (1,'silver','Silver',5000000.00,5.00,1.00,'2026-05-15 15:39:44','2026-05-15 15:39:44'),(2,'gold','Gold',10000000.00,10.00,1.50,'2026-05-15 15:39:44','2026-05-15 15:39:44'),(3,'platinum','Platinum',20000000.00,15.00,2.00,'2026-05-15 15:39:44','2026-05-15 15:39:44');
/*!40000 ALTER TABLE `vip_tiers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping routines for database 'DalatShop'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-08-08 22:26:54
