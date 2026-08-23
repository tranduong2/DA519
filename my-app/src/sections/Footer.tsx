import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function Footer() {
  const links = {
    'Liên Kết': ['Trang chủ', 'Danh mục', 'Khuyến mãi', 'Blog'],
    'Hỗ Trợ': ['Hướng dẫn mua hàng', 'Chính sách đổi trả', 'Vận chuyển', 'FAQ'],
  };

  return (
    <View style={styles.container}>
      <Text style={styles.brand}>🌿 FreshVeggies</Text>
      <Text style={styles.desc}>Cung cấp rau củ quả tươi sạch, an toàn từ nông trại đến bàn ăn của bạn.</Text>
      <View style={styles.cols}>
        {Object.entries(links).map(([section, items]) => (
          <View key={section} style={styles.col}>
            <Text style={styles.colTitle}>{section}</Text>
            {items.map(item => (
              <Text key={item} style={styles.colItem}>{item}</Text>
            ))}
          </View>
        ))}
        <View style={styles.col}>
          <Text style={styles.colTitle}>Liên Hệ</Text>
          <Text style={styles.colItem}>📍 60 Trần Nhân Tông,Liên Nghĩa,Đức Trọng, Lâm Đồng</Text>
          <Text style={styles.colItem}>📞 0914960478</Text>
          <Text style={styles.colItem}>📞 0918748568</Text>
          <Text style={styles.colItem}>✉️ nd141003@gmail.com</Text>
        </View>
      </View>
      <View style={styles.divider} />
      <Text style={styles.copy}>© 2026 FreshVeggies. Tất cả quyền được bảo lưu. 🌱</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#fff', padding: 20, borderTopWidth: 1, borderTopColor: '#e8f5e9' },
  brand: { fontSize: 16, fontWeight: '700', color: '#2e7d32', marginBottom: 6 },
  desc: { fontSize: 12, color: '#757575', lineHeight: 18, marginBottom: 16 },
  cols: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  col: { minWidth: 100, flex: 1 },
  colTitle: { fontSize: 13, fontWeight: '700', color: '#212121', marginBottom: 8 },
  colItem: { fontSize: 12, color: '#757575', marginBottom: 4, lineHeight: 18 },
  divider: { height: 1, backgroundColor: '#e8f5e9', marginVertical: 14 },
  copy: { fontSize: 11, color: '#9e9e9e', textAlign: 'center' },
});