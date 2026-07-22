/** Shared API domain types for the Veloce storefront */

export type OrderStatus =
  | 'pending'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'returned';

export type PaymentStatus =
  | 'unpaid'
  | 'authorized'
  | 'paid'
  | 'failed'
  | 'refunded'
  | 'partially_refunded';

export type { Category, Product, ProductImage, ProductVariant, Order, OrderItem, Payment, Address, Coupon, Cart, CartItem } from '@/types';

export interface OrderItem {
  id: number;
  productId: number;
  variantId?: number | null;
  productNameSnapshot: string;
  productPriceSnapshot: number | string;
  quantity: number;
  product?: Product;
  variant?: ProductVariant | null;
}

export interface Payment {
  id: number;
  orderId: number;
  amount: number | string;
  status: PaymentStatus | string;
  method: string;
  razorpayOrderId?: string | null;
  razorpayPaymentId?: string | null;
  transactionId?: string | null;
}

export interface Order {
  id: number;
  orderNumber: string;
  userId: number;
  orderStatus: OrderStatus | string;
  paymentStatus: PaymentStatus | string;
  shipmentStatus?: string;
  refundStatus?: string;
  subtotal: number | string;
  discountAmount: number | string;
  taxAmount: number | string;
  shippingAmount: number | string;
  total: number | string;
  items: OrderItem[];
  payments?: Payment[];
  createdAt?: string;
}

export interface CouponPreview {
  code: string;
  discountAmount: number;
  discountType?: string;
}
