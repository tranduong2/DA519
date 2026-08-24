export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'on_the_way'
  | 'delivered'
  | 'cancelled';

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  imageUrl?: string;
  note?: string;
}

export interface Order {
  id: string;
  userId: string;
  orderCode: string;
  items: OrderItem[];
  totalAmount: number;
  status: OrderStatus;
  paymentMethod: 'cod' | 'bank';
  shippingAddress: string;
  createdAt: string;
  updatedAt: string;
  estimatedDelivery?: string;
}

export type VipTierKey = 'silver' | 'gold' | 'platinum';

export interface VipTierConfig {
  key: VipTierKey;
  label: string;
  minSpending: number;
  discountPercent: number;
  pointsMultiplier: number;
}

export interface VipStatus {
  tier: VipTierKey | null;
  tierLabel: string;
  quarterlySpending: number;
  rewardPoints: number;
  quarterKey: string;
  nextResetAt: string;
  tiers: VipTierConfig[];
}

export type RootStackParamList = {
  Home: undefined;
  ProductDetail: { productId: string };
  Cart: undefined;
  Checkout: undefined;
  Profile: undefined; 
  Payment: {
    payMethod: 'cod' | 'bank';
    orderId: string;
    totalAmount: number;
  };
  OrderTracking: {
    orderId: string;
    payMethod: 'cod' | 'bank';
    totalAmount: number;
  };
  OrderList: undefined;
  OrderDetail: { orderId: string };
  InvoiceScreen: {
    checkedItems: {
      product: {
        id: string | number;
        name: string;
        price: string | number;
        cat: string;
        imageUrl?: string;
      };
      kg: number;
      note: string;
    }[];
    orderCode: string;
    orderDate: string;
  };
  BulkOrder: undefined;
  BulkOrderTracking: undefined;
  Admin: { initialTab?: 'orders' | 'bulk' } | undefined;
  StoreInvoiceTotals: undefined;
  StoreInvoiceStatement: { storeKey: string; storeName: string };
  AdminOrderDetail: { orderId: number; type: 'normal' | 'bulk' };
  ManageProfile: undefined;
  ManageProducts: undefined;
  ManageCategories: undefined;
  ManagePromotions: undefined;
    Inventory: undefined;
  VIPMembership: undefined;
  FlashSaleAdmin: undefined;
  Success: undefined;
  Login: undefined;
  Register: undefined;
  UserProfileSetup: {
    name: string;
    email: string;
    phone: string;
  };
};
