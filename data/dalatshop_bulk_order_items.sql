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
) ENGINE=InnoDB AUTO_INCREMENT=50 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bulk_order_items`
--

LOCK TABLES `bulk_order_items` WRITE;
/*!40000 ALTER TABLE `bulk_order_items` DISABLE KEYS */;
INSERT INTO `bulk_order_items` VALUES (1,1,'1','Rau cải xanh',2.00,15000.00,30000.00,NULL),(2,2,'1','Rau cải xanh',2.00,15000.00,30000.00,NULL),(3,3,'1','Rau cải xanh',2.00,15000.00,30000.00,NULL),(4,4,'1','Rau cải xanh',2.00,15000.00,30000.00,NULL),(5,5,'1','Rau cải xanh',2.00,15000.00,30000.00,NULL),(6,6,'1','Rau cải xanh',2.00,15000.00,30000.00,NULL),(7,7,'1','Rau cải xanh',2.00,15000.00,30000.00,NULL),(8,8,'1','Rau cải xanh',2.00,15000.00,30000.00,NULL),(9,9,'1','Rau cải xanh',2.00,15000.00,30000.00,NULL),(10,10,'1','Rau cải xanh',1.00,15000.00,15000.00,NULL),(11,11,'1','Rau cải xanh',1.00,15000.00,15000.00,NULL),(12,12,'1','Rau cải xanh',1.00,15000.00,15000.00,NULL),(13,13,'1','Rau cải xanh',1.00,15000.00,15000.00,NULL),(14,14,'1','Rau cải xanh',1.00,15000.00,15000.00,NULL),(15,15,'1','Rau cải xanh',1.00,15000.00,15000.00,NULL),(16,16,'1','Rau cải xanh',1.00,15000.00,15000.00,NULL),(17,17,'1','Rau cải xanh',1.00,15000.00,15000.00,NULL),(18,18,'1','Rau cải xanh',1.00,15000.00,15000.00,NULL),(19,19,'1','Rau cải xanh',1.00,15000.00,15000.00,NULL),(20,20,'1','Rau cải xanh',1.00,15000.00,15000.00,NULL),(21,21,'1','Rau cải xanh',1.00,15000.00,15000.00,NULL),(22,22,'1','Rau cải xanh',1.00,15000.00,15000.00,NULL),(23,23,'1','Rau cải xanh',1.00,15000.00,15000.00,NULL),(24,24,'1','Rau cải xanh',1.00,15000.00,15000.00,NULL),(25,25,'1','Rau cải xanh',1.00,15000.00,15000.00,NULL),(26,26,'1','Rau cải xanh',1.00,15000.00,15000.00,NULL),(27,27,'1','Rau cải xanh',1.00,15000.00,15000.00,NULL),(28,28,'1','Rau cải xanh',1.00,15000.00,15000.00,NULL),(29,29,'1','Rau cải xanh',1.00,15000.00,15000.00,NULL),(30,30,'1','Rau cải xanh',1.00,15000.00,15000.00,NULL),(31,31,'1','Rau cải xanh',1.00,15000.00,15000.00,NULL),(32,32,'1','Rau cải xanh',1.00,15000.00,15000.00,NULL),(33,33,'1','Rau cải xanh',1.00,15000.00,15000.00,NULL),(34,34,'1','Rau cải xanh',1.00,15000.00,15000.00,NULL),(35,35,'1','Rau cải xanh',1.00,15000.00,15000.00,NULL),(36,36,'1','Rau cải xanh',1.00,15000.00,15000.00,NULL),(37,37,'1','Rau cải xanh',1.00,15000.00,15000.00,NULL),(38,38,'1','Rau cải xanh',1.00,15000.00,15000.00,NULL),(39,39,'1','Rau cải xanh',1.00,15000.00,15000.00,NULL),(40,40,'1','Rau cải xanh',1.00,15000.00,15000.00,NULL),(41,41,'1','Rau cải xanh',1.00,15000.00,15000.00,NULL),(42,42,'1','Rau cải xanh',1.00,15000.00,15000.00,NULL),(43,43,'1','Rau cải xanh',1.00,15000.00,15000.00,NULL),(44,44,'1','Rau cải xanh',1.00,15000.00,15000.00,NULL),(45,45,'1','Rau cải xanh',1.00,15000.00,15000.00,NULL),(46,46,'1','Rau cải xanh',1.00,15000.00,15000.00,NULL),(47,47,'1','Rau cải xanh',1.00,15000.00,15000.00,NULL),(48,48,'1','Rau cải xanh',1.00,15000.00,15000.00,NULL),(49,49,'2','Rau Muống',1.00,15000.00,15000.00,NULL);
/*!40000 ALTER TABLE `bulk_order_items` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-05-15 19:09:53
