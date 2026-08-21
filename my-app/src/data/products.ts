export const imageMap: Record<string, any> = {
  "img4.jpg":      require("../assets/img4.jpg"),
  "img6.jpg":      require("../assets/img6.jpg"),
  "img7.jpg":      require("../assets/img7.jpg"),
  "img8.jpg":      require("../assets/img8.jpg"),
  "img9.jpg":      require("../assets/img9.jpg"),
  "img10.jpg":     require("../assets/img10.jpg"),
  "img11.jpg":     require("../assets/img11.jpg"),
  "img12.jpg":     require("../assets/img12.jpg"),
  "img13.jpg":     require("../assets/img13.jpg"),
  "img15.jpg":     require("../assets/img15.jpg"),
  "img16.jpg":     require("../assets/img16.jpg"),
  "img17.jpg":     require("../assets/img17.jpg"),
  "img18.jpg":     require("../assets/img18.jpg"),
  "img19.jpg":     require("../assets/img19.jpg"),
  "img20.jpg":     require("../assets/img20.jpg"),
  "img21.jpg":     require("../assets/img21.jpg"),
  "img22.jpg":     require("../assets/img22.jpg"),
};

export type StaticProduct = {
  id: string;
  name: string;
  price: number;
  oldPrice?: number;
  salePrice?: number;
  cat: string;
  imageUrl: string;
  image: any;
  isFeatured?: boolean;
  isFlashSale?: boolean;
};

// Dữ liệu dự phòng cho bản website tĩnh trên GitHub Pages.
export const staticProducts: StaticProduct[] = [
  { id: "1", name: "Rau cải xanh", price: 15000, oldPrice: 18000, salePrice: 12000, cat: "leaf", imageUrl: "img4.jpg", image: imageMap["img4.jpg"], isFeatured: true, isFlashSale: true },
  { id: "2", name: "Cà rốt Đà Lạt", price: 20000, oldPrice: 25000, salePrice: 16000, cat: "root", imageUrl: "img6.jpg", image: imageMap["img6.jpg"], isFeatured: true, isFlashSale: true },
  { id: "3", name: "Xà lách hữu cơ", price: 18000, oldPrice: 22000, cat: "leaf", imageUrl: "img7.jpg", image: imageMap["img7.jpg"], isFeatured: true },
  { id: "4", name: "Khoai tây Đà Lạt", price: 30000, oldPrice: 38000, salePrice: 24000, cat: "root", imageUrl: "img8.jpg", image: imageMap["img8.jpg"], isFlashSale: true },
  { id: "5", name: "Cà chua bi", price: 25000, oldPrice: 30000, cat: "fruit", imageUrl: "img9.jpg", image: imageMap["img9.jpg"], isFeatured: true },
  { id: "6", name: "Dưa leo tươi", price: 15000, oldPrice: 18000, salePrice: 12000, cat: "fruit", imageUrl: "img10.jpg", image: imageMap["img10.jpg"], isFlashSale: true },
  { id: "7", name: "Bắp cải xanh", price: 22000, oldPrice: 28000, cat: "leaf", imageUrl: "img11.jpg", image: imageMap["img11.jpg"] },
  { id: "8", name: "Hành tây", price: 28000, oldPrice: 35000, cat: "root", imageUrl: "img12.jpg", image: imageMap["img12.jpg"] },
  { id: "9", name: "Củ cải trắng", price: 20000, oldPrice: 25000, cat: "root", imageUrl: "img13.jpg", image: imageMap["img13.jpg"] },
  { id: "10", name: "Gừng tươi", price: 35000, oldPrice: 42000, salePrice: 28000, cat: "herb", imageUrl: "img15.jpg", image: imageMap["img15.jpg"], isFlashSale: true },
  { id: "11", name: "Nấm bào ngư", price: 55000, oldPrice: 65000, cat: "mushroom", imageUrl: "img16.jpg", image: imageMap["img16.jpg"], isFeatured: true },
  { id: "12", name: "Nấm hương", price: 60000, oldPrice: 72000, salePrice: 48000, cat: "mushroom", imageUrl: "img17.jpg", image: imageMap["img17.jpg"], isFlashSale: true },
  { id: "13", name: "Nấm linh chi", price: 85000, oldPrice: 100000, cat: "mushroom", imageUrl: "img19.jpg", image: imageMap["img19.jpg"] },
  { id: "14", name: "Bí đỏ Đà Lạt", price: 25000, oldPrice: 30000, cat: "fruit", imageUrl: "img20.jpg", image: imageMap["img20.jpg"] },
  { id: "15", name: "Mướp xanh", price: 18000, oldPrice: 22000, cat: "fruit", imageUrl: "img21.jpg", image: imageMap["img21.jpg"] },
  { id: "16", name: "Rau mùi", price: 12000, oldPrice: 15000, cat: "herb", imageUrl: "img22.jpg", image: imageMap["img22.jpg"] },
];

export const staticFlashSaleProducts = staticProducts.filter((product) => product.isFlashSale);

// export const products = [
//   { id: "1",  name: "Rau cải xanh",  price: "15.000đ", oldPrice: "18.000đ",  cat: "leaf",     image: require("../assets/img4.jpg") },
//   { id: "2",  name: "Cà rốt Đà Lạt", price: "20.000đ", oldPrice: "25.000đ",  cat: "root",     image: require("../assets/img6.jpg") },
//   { id: "3",  name: "Xà lách",       price: "18.000đ", oldPrice: "22.000đ",  cat: "leaf",     image: require("../assets/img7.jpg") },
//   { id: "4",  name: "Khoai tây",     price: "30.000đ", oldPrice: "38.000đ",  cat: "root",     image: require("../assets/img8.jpg") },
//   { id: "5",  name: "Cà chua bi",    price: "25.000đ", oldPrice: "30.000đ",  cat: "fruit",    image: require("../assets/img9.jpg") },
//   { id: "6",  name: "Dưa leo",       price: "15.000đ", oldPrice: "18.000đ",  cat: "fruit",    image: require("../assets/img10.jpg") },
//   { id: "7",  name: "Bắp cải",       price: "22.000đ", oldPrice: "28.000đ",  cat: "leaf",     image: require("../assets/img11.jpg") },
//   { id: "8",  name: "Hành tây",      price: "28.000đ", oldPrice: "35.000đ",  cat: "root",     image: require("../assets/img12.jpg") },
//   { id: "9",  name: "Củ cải trắng",  price: "20.000đ", oldPrice: "25.000đ",  cat: "root",     image: require("../assets/img13.jpg") },
//   { id: "10", name: "Gừng tươi",     price: "35.000đ", oldPrice: "42.000đ",  cat: "herb",     image: require("../assets/img15.jpg") },
//   { id: "11", name: "Nấm bào ngư",   price: "55.000đ", oldPrice: "65.000đ",  cat: "mushroom", image: require("../assets/img16.jpg") },
//   { id: "12", name: "Nấm hương",     price: "60.000đ", oldPrice: "72.000đ",  cat: "mushroom", image: require("../assets/img17.jpg") },
//   { id: "13", name: "Nấm linh chi",  price: "85.000đ", oldPrice: "100.000đ", cat: "mushroom", image: require("../assets/img19.jpg") },
//   { id: "14", name: "Bí đỏ Đà Lạt",  price: "25.000đ", oldPrice: "30.000đ",  cat: "fruit",    image: require("../assets/img20.jpg") },
//   { id: "15", name: "Mướt xanh",     price: "18.000đ", oldPrice: "22.000đ",  cat: "fruit",    image: require("../assets/img21.jpg") },
//   { id: "16", name: "Rau mùi",       price: "12.000đ", oldPrice: "15.000đ",  cat: "herb",     image: require("../assets/img22.jpg") },
// ];
