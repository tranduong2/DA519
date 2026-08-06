import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, Order, OrderStatus } from '@/types';
import { getOrders } from '@/services/orderService';
import { useOrderStore } from '@/store/orderStore';
import { useUserStore } from '@/store/userStore';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'OrderList'>;

const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
  preparing: 'Đang chuẩn bị',
  on_the_way: 'Đang giao',
  delivered: 'Đã giao',
  cancelled: 'Đã hủy',
};

const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  pending: '#ff9800',
  confirmed: '#2196f3',
  preparing: '#9c27b0',
  on_the_way: '#00bcd4',
  delivered: '#4caf50',
  cancelled: '#f44336',
};

export default function OrderListScreen() {
  const navigation = useNavigation<NavProp>();
  const user = useUserStore((state) => state.user);
  const { orders, loading, setOrders, setLoading, error, setError } = useOrderStore();
  const [refreshing, setRefreshing] = useState(false);

  const token = useUserStore((state) => state.token);

  const loadOrders = async () => {
    if (!user?.email) {
      setError('Vui lòng đăng nhập để xem đơn hàng');
      return;
    }

    if (!token) {
      setError('Token xác thực không tìm thấy');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const fetchedOrders = await getOrders(token);
      setOrders(fetchedOrders);
    } catch (err: any) {
      setError(err.message || 'Lỗi khi tải đơn hàng');
      console.error('Error loading orders:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadOrders();
    }, [user?.email])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadOrders();
  };

  const handleOrderPress = (order: Order) => {
    navigation.navigate('OrderDetail', { orderId: order.id });
  };

  if (loading && orders.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2e7d32" />
          <Text style={styles.loadingText}>Đang tải đơn hàng...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Quản Lý Đơn Hàng</Text>
          <Text style={styles.subtitle}>Theo dõi và quản lý các đơn hàng của bạn</Text>
        </View>

        {/* Error Message */}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Empty State */}
        {orders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📦</Text>
            <Text style={styles.emptyTitle}>Chưa có đơn hàng</Text>
            <Text style={styles.emptySubtitle}>
              Bạn chưa có đơn hàng nào. Hãy đặt hàng ngay!
            </Text>
            <TouchableOpacity
              style={styles.shopBtn}
              onPress={() => navigation.navigate('Home')}
            >
              <Text style={styles.shopBtnText}>Mua hàng ngay</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* Order List */
          <View style={styles.ordersList}>
            {orders.map((order) => (
              <TouchableOpacity
                key={order.id}
                style={styles.orderCard}
                onPress={() => handleOrderPress(order)}
                activeOpacity={0.7}
              >
                {/* Order Header */}
                <View style={styles.orderHeader}>
                  <View style={styles.orderCodeContainer}>
                    <Text style={styles.orderCode}>{order.orderCode}</Text>
                    <Text style={styles.orderDate}>
                      {new Date(order.createdAt).toLocaleDateString('vi-VN')}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: ORDER_STATUS_COLORS[order.status] },
                    ]}
                  >
                    <Text style={styles.statusText}>
                      {ORDER_STATUS_LABELS[order.status]}
                    </Text>
                  </View>
                </View>

                {/* Order Items Summary */}
                <View style={styles.itemsSummary}>
                  <Text style={styles.itemsCount}>
                    {order.items.length} sản phẩm
                  </Text>
                  <Text style={styles.totalAmount}>
                    {order.totalAmount.toLocaleString('vi-VN')} đ
                  </Text>
                </View>

                {/* Order Address */}
                <View style={styles.addressContainer}>
                  <Text style={styles.addressLabel}>📍 Địa chỉ giao:</Text>
                  <Text style={styles.addressText} numberOfLines={2}>
                    {order.shippingAddress}
                  </Text>
                </View>

                {/* Estimated Delivery */}
                {order.estimatedDelivery && (
                  <View style={styles.deliveryContainer}>
                    <Text style={styles.deliveryLabel}>
                      📅 Dự kiến giao: {order.estimatedDelivery}
                    </Text>
                  </View>
                )}

                {/* View Details Arrow */}
                <View style={styles.arrowContainer}>
                  <Text style={styles.arrow}>→</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4faf4',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },

  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e8f5e9',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1b5e20',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#666',
  },

  errorContainer: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    backgroundColor: '#ffebee',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#f44336',
  },
  errorText: {
    fontSize: 13,
    color: '#c62828',
  },

  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2e7d32',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#888',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  shopBtn: {
    backgroundColor: '#2e7d32',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  shopBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },

  ordersList: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 12,
  },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#2e7d32',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },

  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderCodeContainer: {
    flex: 1,
  },
  orderCode: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1b5e20',
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 12,
    color: '#999',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginLeft: 8,
  },
  statusText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },

  itemsSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f8e9',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f8e9',
    marginBottom: 10,
  },
  itemsCount: {
    fontSize: 12,
    color: '#666',
  },
  totalAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2e7d32',
  },

  addressContainer: {
    marginBottom: 10,
  },
  addressLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2e7d32',
    marginBottom: 4,
  },
  addressText: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },

  deliveryContainer: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f8e9',
  },
  deliveryLabel: {
    fontSize: 12,
    color: '#666',
  },

  arrowContainer: {
    position: 'absolute',
    right: 16,
    top: '50%',
    transform: [{ translateY: -12 }],
  },
  arrow: {
    fontSize: 20,
    color: '#c8e6c9',
  },
});
