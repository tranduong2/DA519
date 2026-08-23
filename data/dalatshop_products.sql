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
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `products`
--

LOCK TABLES `products` WRITE;
/*!40000 ALTER TABLE `products` DISABLE KEYS */;
INSERT INTO `products` VALUES (1,'Rau cải xanh','15.000đ','18.000đ','leaf','img4.jpg',0,NULL,15000),(2,'Rau Muống','15.000đ','18.000đ','leaf','img5.jpg',0,NULL,15000),(3,'Cà rốt Đà Lạt','20.000đ','25.000đ','root','img6.jpg',1,'18.000đ',20000),(4,'Xà lách','18.000đ','22.000đ','leaf','img7.jpg',0,NULL,18000),(5,'Khoai tây','30.000đ','38.000đ','root','img8.jpg',1,'27.000đ',30000),(6,'Cà chua bi','25.000đ','30.000đ','fruit','img9.jpg',1,'23.000đ',25000),(7,'Dưa leo','15.000đ','18.000đ','fruit','img10.jpg',0,NULL,15000),(8,'Bắp cải','22.000đ','28.000đ','leaf','img11.jpg',0,NULL,22000),(9,'Hành lá','28.000đ','35.000đ','herb','img12.jpg',0,NULL,28000),(10,'Củ cải trắng','20.000đ','25.000đ','root','img13.jpg',0,NULL,20000),(11,'Gừng tươi','35.000đ','42.000đ','root','img15.jpg',1,'32.000đ',35000),(12,'Nấm bào ngư','55.000đ','65.000đ','mushroom','img16.jpg',1,'50.000đ',55000),(13,'Nấm hương','60.000đ','72.000đ','mushroom','img17.jpg',1,'54.000đ',60000),(14,'Nấm kim Châm','60.000đ','72.000đ','mushroom','img18.jpg',1,'54.000đ',60000),(15,'Nấm linh chi','85.000đ','100.000đ','mushroom','img19.jpg',1,'77.000đ',85000),(16,'Bí đỏ Đà Lạt','25.000đ','30.000đ','fruit','img20.jpg',0,NULL,25000),(17,'Mướt xanh','18.000đ','22.000đ','fruit','img21.jpg',0,NULL,18000),(18,'Rau mùi','12.000đ','15.000đ','herb','img22.jpg',0,NULL,12000),(19,'lá Quế','12.000đ','15.000đ','herb','img24.jpg',0,NULL,12000),(20,'Rau ngò','25.000đ','15.000đ','herb','img23.jpg',0,'',12000);
/*!40000 ALTER TABLE `products` ENABLE KEYS */;
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
