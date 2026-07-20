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

export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  emailVerified: boolean;
}

export interface ProductImage {
  id: number;
  url: string;
}

export interface ProductVariant {
  id: number;
  sku: string;
  price: number | string | null;
  stock: number;
  size?: string | null;
  color?: string | null;
  material?: string | null;
}

export interface Product {
  id: number;
  name: string;
  slug: string;
  description: string;
  brand?: string;
  basePrice: number | string;
  discountPrice?: number | string;
  status?: string;
  images: ProductImage[];
  variants: ProductVariant[];
  lowStockThreshold?: number;
  categoryId?: number;
}

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
