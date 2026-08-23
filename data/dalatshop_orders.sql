-- MySQL dump 10.13  Distrib 8.0.42, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: dalatshop
-- ------------------------------------------------------
-- Server version	8.0.42

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `orders`
--

DROP TABLE IF EXISTS `orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `orders` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
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
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `orders`
--

LOCK TABLES `orders` WRITE;
/*!40000 ALTER TABLE `orders` DISABLE KEYS */;
INSERT INTO `orders` VALUES (1,1,20000.00,'pending','2026-05-09 13:43:32',NULL,NULL,'ORDER_1778308855613','cod','60 trânnf nhân tông',NULL,'2026-05-09 13:43:32'),(2,1,20000.00,'confirmed','2026-05-09 13:45:28',NULL,NULL,'DH128311','Tiền mặt (COD)','tranduong - 0942771476 - 60 trânnf nhân tông',NULL,'2026-05-12 14:07:32'),(3,1,180000.00,'confirmed','2026-05-09 14:02:35',NULL,NULL,'DH155007','Tiền mặt (COD)','tranduong - 0942771476 - 60 trânnf nhân tông',NULL,'2026-05-12 14:07:36'),(4,2,495000.00,'confirmed','2026-05-09 14:21:16',NULL,NULL,'DH276316','Tiền mặt (COD)','uesd1 - 0903231321 - 66 ấu cơ\n',NULL,'2026-05-10 11:50:18'),(5,1,20000.00,'pending','2026-05-13 16:53:06',NULL,NULL,'DH986093','Tiền mặt (COD)','tranduong - 0942771476 - 60 trần nhân tông',NULL,'2026-05-13 16:53:06'),(6,1,140000.00,'pending','2026-05-13 17:19:03',NULL,NULL,'DH543015','Tiền mặt (COD)','tranduong - 0942771476 - 60 TRẦN NHÂN TÔNG',NULL,'2026-05-13 17:19:03'),(7,1,90000.00,'confirmed','2026-05-13 17:19:51',NULL,NULL,'DH591855','Tiền mặt (COD)','tranduong - 0942771476 - 60 TRẦN NHÂN TÔNG',NULL,'2026-05-13 17:20:32');
/*!40000 ALTER TABLE `orders` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-05-15 19:09:52
