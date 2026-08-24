import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { RootStackParamList } from './types';
import { navigationRef } from './navigationRef';
import Header from '@/sections/Header';
import { useUserStore } from '@/store/userStore';

import HomeScreen from '@/screens/HomeScreen';
import ProductDetail from '@/sections/ProductDetail';
import CartScreen from '@/screens/CartScreen';
import CheckoutScreen from '@/screens/CheckoutScreen';
import PaymentScreen from '@/screens/PaymentScreen';
import SuccessScreen from '@/screens/SuccessScreen';
import LoginScreen from '@/screens/Loginscreen';
import RegisterScreen from '@/screens/RegisterScreen';
import OrderTrackingScreen from '@/screens/Ordertrackingscreen';
import OrderListScreen from '@/screens/OrderListScreen';
import OrderDetailScreen from '@/screens/OrderDetailScreen';
import UserProfileSetupScreen from '@/screens/UserProfileSetupScreen';
import BulkOrderScreen from '@/screens/BulkOrderScreen';
import BulkOrderTrackingScreen from '@/screens/BulkOrderTrackingScreen';
import AdminScreen from '@/screens/AdminScreen';
import AdminOrderDetailScreen from '@/screens/AdminOrderDetailScreen';
import ManageProfile from '@/screens/ManageProfile';
import InvoiceScreen from '@/screens/InvoiceScreen';
import ManageCategories from '@/screens/ManageCategories';
import ManageProducts from '@/screens/ManageProducts';
import ManagePromotions from '@/screens/Managepromotions';
import ProfileScreen from '@/screens/ProfileScreen';
import VIPMembershipScreen from '@/screens/VIPMembershipScreen';
import Promotion1Screen from '@/screens/Promotion1Screen';
import FlashSaleAdmin from '@/screens/Flashsaleadmin';
import TaiKhoanScreen from '@/screens/Taikhoanscreen';
import InventoryScreen from '@/screens/Inventoryscreen';
import StoreInvoiceTotalsScreen from '@/screens/StoreInvoiceTotalsScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const user = useUserStore(state => state.user);

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          header: () => <Header />,
        }}
      >
        <Stack.Screen name="Home"             component={HomeScreen} />
        <Stack.Screen name="ProductDetail"    component={ProductDetail} />
        <Stack.Screen name="Cart"             component={CartScreen} />
        <Stack.Screen name="Checkout"         component={CheckoutScreen} />
        <Stack.Screen name="Payment"          component={PaymentScreen} />
        <Stack.Screen name="Success"          component={SuccessScreen} />
        <Stack.Screen name="OrderTracking"    component={OrderTrackingScreen} />
        <Stack.Screen name="OrderList"        component={OrderListScreen} />
        <Stack.Screen name="OrderDetail"      component={OrderDetailScreen} />
        <Stack.Screen name="BulkOrder"        component={BulkOrderScreen} />
        <Stack.Screen name="BulkOrderTracking" component={BulkOrderTrackingScreen} />
        <Stack.Screen name="Admin"            component={AdminScreen} />
        <Stack.Screen name="StoreInvoiceTotals" component={StoreInvoiceTotalsScreen} />
        <Stack.Screen name="AdminOrderDetail" component={AdminOrderDetailScreen} options={{ headerShown: false }} />
        <Stack.Screen name="ManageProfile"    component={ManageProfile} />
        <Stack.Screen name="ManageProducts"   component={ManageProducts} />
        <Stack.Screen name="ManageCategories" component={ManageCategories} />
        <Stack.Screen name="ManagePromotions" component={ManagePromotions} />
      <Stack.Screen name="FlashSaleAdmin" component={FlashSaleAdmin} />
      <Stack.Screen name="Promotion"        component={Promotion1Screen} /> 
        <Stack.Screen name="VIPMembership"    component={VIPMembershipScreen} />
        <Stack.Screen name="Profile"          component={ProfileScreen} />
        <Stack.Screen name="InvoiceScreen"    component={InvoiceScreen}          options={{ headerShown: false }} />
        <Stack.Screen name="Login"            component={LoginScreen}            options={{ headerShown: false }} />
        <Stack.Screen name="Register"         component={RegisterScreen}         options={{ headerShown: false }} />
        <Stack.Screen name="UserProfileSetup" component={UserProfileSetupScreen} options={{ headerShown: false }} />
        <Stack.Screen name="TaiKhoan" component={TaiKhoanScreen} />
          <Stack.Screen name="Inventory" component={InventoryScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
