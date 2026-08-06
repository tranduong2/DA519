import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Alert,
  Modal,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, Order, OrderStatus } from '@/types';
import { getOrderById, cancelOrder } from '@/services/orderService';
import { useOrderStore } from '@/store/orderStore';
import { useUserStore } from '@/store/userStore';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'OrderDetail'>;
type RoutePropType = RouteProp<RootStackParamList, 'OrderDetail'>;

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

const TRACKING_STEPS: OrderStatus[] = [
  'pending',
  'confirmed',
  'preparing',
  'on_the_way',
  'delivered',
];

export default function OrderDetailScreen() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RoutePropType>();
  const { orderId } = route.params;
  const { selectedOrder, setSelectedOrder, loading, setLoading, error, setError } =
    useOrderStore();
  const user = useUserStore((state) => state.user);
const token = user?.token ?? null;
  const [cancelling, setCancelling] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  const loadOrderDetail = async () => {
    if (!user?.email) {
      setError('Vui lòng đăng nhập');
      return;
    }

    if (!token) {
      setError('Token xác thực không tìm thấy');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const order = await getOrderById(token, orderId);
      setSelectedOrder(order);
    } catch (err: any) {
      setError(err.message || 'Lỗi khi tải thông tin đơn hàng');
      console.error('Error loading order:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrderDetail();
  }, [orderId]);

  const handleCancelOrder = async () => {
    setShowCancelModal(false);
    try {
      setCancelling(true);
      if (!token) throw new Error('Token not found');
      const cancelledOrder = await cancelOrder(token, orderId);
      setSelectedOrder(cancelledOrder);
      Alert.alert('Thành công', 'Đơn hàng đã được hủy');
    } catch (err: any) {
      Alert.alert('Lỗi', err.message || 'Không thể hủy đơn hàng');
    } finally {
      setCancelling(false);
    }
  };

  const handleTrackOrder = () => {
    if (selectedOrder) {
      navigation.navigate('OrderTracking', {
        orderId: selectedOrder.id,
        payMethod: selectedOrder.paymentMethod,
        totalAmount: selectedOrder.totalAmount,
      });
    }
  };

  const getTrackingProgress = (status: OrderStatus): number => {
    return (TRACKING_STEPS.indexOf(status) + 1) / TRACKING_STEPS.length;
  };

  if (loading && !selectedOrder) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2e7d32" />
          <Text style={styles.loadingText}>Đang tải...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!selectedOrder) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error || 'Không tìm thấy đơn hàng'}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={loadOrderDetail}
          >
            <Text style={styles.retryBtnText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const canCancel = selectedOrder.status === 'pending' || selectedOrder.status === 'confirmed';
  const isDelivered = selectedOrder.status === 'delivered';
  const progressValue = getTrackingProgress(selectedOrder.status);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header with Status */}
        <View style={styles.headerCard}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.orderCode}>{selectedOrder.orderCode}</Text>
              <Text style={styles.orderDate}>
                {new Date(selectedOrder.createdAt).toLocaleDateString('vi-VN', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </Text>
            </View>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: ORDER_STATUS_COLORS[selectedOrder.status] },
              ]}
            >
              <Text style={styles.statusText}>
                {ORDER_STATUS_LABELS[selectedOrder.status]}
              </Text>
            </View>
          </View>

          {/* Progress Bar */}
          {!isDelivered && selectedOrder.status !== 'cancelled' && (
            <View style={styles.progressSection}>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${progressValue * 100}%` },
                  ]}
                />
              </View>
              <Text style={styles.progressText}>
                {Math.round(progressValue * 100)}% hoàn thành
              </Text>
            </View>
          )}
        </View>

        {/* Order Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📦 Chi tiết đơn hàng</Text>
          <View style={styles.itemsList}>
            {selectedOrder.items.map((item, index) => (
              <View key={index} style={styles.itemCard}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.productName}</Text>
                  <Text style={styles.itemQuantity}>
                    Số lượng: {item.quantity}
                  </Text>
                  {item.note && (
                    <Text style={styles.itemNote}>Ghi chú: {item.note}</Text>
                  )}
                </View>
                <Text style={styles.itemPrice}>
                  {(item.price * item.quantity).toLocaleString('vi-VN')} đ
                </Text>
              </View>
            ))}
          </View>

          {/* Price Summary */}
          <View style={styles.priceSummary}>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Tổng cộng:</Text>
              <Text style={styles.priceValue}>
                {selectedOrder.totalAmount.toLocaleString('vi-VN')} đ
              </Text>
            </View>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Phương thức thanh toán:</Text>
              <Text style={styles.priceValue}>
                {selectedOrder.paymentMethod === 'cod'
                  ? 'Thanh toán khi nhận hàng'
                  : 'Chuyển khoản ngân hàng'}
              </Text>
            </View>
          </View>
        </View>

        {/* Shipping Address */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📍 Địa chỉ giao hàng</Text>
          <View style={styles.addressCard}>
            <Text style={styles.addressText}>
              {selectedOrder.shippingAddress}
            </Text>
          </View>
        </View>

        {/* Estimated Delivery */}
        {selectedOrder.estimatedDelivery && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📅 Dự kiến giao</Text>
            <View style={styles.deliveryCard}>
              <Text style={styles.deliveryText}>
                {selectedOrder.estimatedDelivery}
              </Text>
            </View>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          {!isDelivered && selectedOrder.status !== 'cancelled' && (
            <TouchableOpacity
              style={styles.trackBtn}
              onPress={handleTrackOrder}
            >
              <Text style={styles.trackBtnText}>Theo dõi đơn hàng</Text>
            </TouchableOpacity>
          )}

          {canCancel && (
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => setShowCancelModal(true)}
              disabled={cancelling}
            >
              <Text style={styles.cancelBtnText}>
                {cancelling ? 'Đang xử lý...' : 'Hủy đơn hàng'}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backBtnText}>Quay lại</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Cancel Confirmation Modal */}
      <Modal visible={showCancelModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Xác nhận hủy đơn hàng</Text>
            <Text style={styles.modalMessage}>
              Bạn chắc chắn muốn hủy đơn hàng này không?
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setShowCancelModal(false)}
              >
                <Text style={styles.modalCancelText}>Không</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirm}
                onPress={handleCancelOrder}
              >
                <Text style={styles.modalConfirmText}>Có, hủy đơn hàng</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4faf4',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
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

  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  errorText: {
    fontSize: 14,
    color: '#f44336',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: '#2e7d32',
    borderRadius: 8,
  },
  retryBtnText: {
    color: '#fff',
    fontWeight: '700',
  },

  headerCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#2e7d32',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderCode: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1b5e20',
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 12,
    color: '#999',
  },
  statusBadge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },

  progressSection: {
    marginTop: 12,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#e8f5e9',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2e7d32',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 11,
    color: '#666',
    textAlign: 'right',
  },

  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1b5e20',
    marginBottom: 12,
  },

  itemsList: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  itemCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f8e9',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2e7d32',
    marginBottom: 4,
  },
  itemQuantity: {
    fontSize: 12,
    color: '#666',
  },
  itemNote: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
    fontStyle: 'italic',
  },
  itemPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1b5e20',
    marginLeft: 12,
  },

  priceSummary: {
    backgroundColor: '#f1f8e9',
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  priceLabel: {
    fontSize: 12,
    color: '#666',
  },
  priceValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2e7d32',
  },

  addressCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#2e7d32',
  },
  addressText: {
    fontSize: 13,
    color: '#2e7d32',
    lineHeight: 20,
  },

  deliveryCard: {
    backgroundColor: '#e3f2fd',
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#2196f3',
  },
  deliveryText: {
    fontSize: 13,
    color: '#1565c0',
    fontWeight: '600',
  },

  actionButtons: {
    gap: 12,
    marginTop: 20,
    marginBottom: 40,
  },
  trackBtn: {
    backgroundColor: '#2e7d32',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  trackBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  cancelBtn: {
    backgroundColor: '#f44336',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  backBtn: {
    backgroundColor: '#fff',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#c8e6c9',
  },
  backBtnText: {
    color: '#2e7d32',
    fontSize: 14,
    fontWeight: '700',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '80%',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1b5e20',
    marginBottom: 8,
  },
  modalMessage: {
    fontSize: 13,
    color: '#666',
    marginBottom: 24,
    lineHeight: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#c8e6c9',
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2e7d32',
  },
  modalConfirm: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#f44336',
    alignItems: 'center',
  },
  modalConfirmText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
});
