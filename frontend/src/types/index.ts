export interface Role {
  id: number;
  name: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  roleId: number;
  role?: Role;
  emailVerified: boolean;
}

export interface ProductImage {
  id: number;
  url: string;
  productId?: number;
}

export interface Category {
  id: number;
  name: string;
  description: string | null;
}

export interface ProductVariant {
  id: number;
  productId: number;
  sku: string;
  price: number | null;
  stock: number;
  size: string | null;
  color: string | null;
  material: string | null;
}

export interface Product {
  id: number;
  name: string;
  slug: string;
  description: string;
  brand: string;
  basePrice: number;
  discountPrice: number;
  categoryId: number;
  category?: Category;
  lowStockThreshold: number;
  weight?: number | null;
  dimensions?: string | null;
  status: string;
  images: ProductImage[];
  variants: ProductVariant[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Address {
  id: number;
  fullName: string;
  phoneNumber: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  addressType: string;
  isDefault: boolean;
}

export interface OrderItem {
  id: number;
  orderId: number;
  productId: number;
  variantId: number | null;
  productNameSnapshot: string;
  productPriceSnapshot: number;
  quantity: number;
  product?: Product;
  variant?: ProductVariant;
}

export interface Payment {
  id: number;
  amount: number;
  status: string;
  method: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  transactionId?: string;
}

export interface Refund {
  id: number;
  amount: number;
  status: string;
  reason: string;
  razorpayRefundId?: string;
}

export interface Order {
  id: number;
  orderNumber: string;
  userId: number;
  orderStatus: string;
  paymentStatus: string;
  shipmentStatus: string;
  refundStatus: string;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  shippingAmount: number;
  total: number;
  shippingAddressSnapshot: unknown; // Can be typed further if needed
  billingAddressSnapshot: unknown;
  items: OrderItem[];
  payments: Payment[];
  refunds: Refund[];
  trackingNumber?: string | null;
  createdAt: string;
}

export interface CartItem {
  id: number;
  cartId: number;
  productId: number;
  variantId: number | null;
  quantity: number;
  product: Product;
  variant?: ProductVariant;
}

export interface Cart {
  id: number;
  userId: number;
  items: CartItem[];
}

export interface Coupon {
  id: number;
  code: string;
  discountType: string;
  discountValue: number;
  minOrderAmount: number;
  usageLimit: number | null;
  expirationDate: string | null;
  isActive: boolean;
}

export interface ApiError {
  message: string;
}

export interface Review {
  id: number;
  userId: number;
  productId: number;
  rating: number;
  comment: string | null;
  createdAt: string;
  user?: Pick<User, 'id' | 'name' | 'email'>;
}

export interface ProductListResponse {
  products: Product[];
  page: number;
  limit: number;
  totalPages: number;
  totalProducts: number;
}

export interface AdminLowStockProduct {
  name: string;
  sku: string;
  stock: number;
  threshold: number;
}

export interface AdminBestSeller {
  id: number;
  name: string;
  totalQty: number;
  revenue: number;
}

export interface AdminAuditLog {
  id: number;
  action: string;
  description: string;
  timestamp: string;
  user?: Pick<User, 'name'>;
}

export interface AdminStats {
  totalRevenue: number;
  totalOrders: number;
  pendingOrders: number;
  totalProducts: number;
  totalUsers: number;
  revenueChart: { date: string; revenue: number; orders?: number }[];
  lowStockProducts: AdminLowStockProduct[];
  bestSellers: AdminBestSeller[];
  auditLogs: AdminAuditLog[];
  recentOrders: {
    id: number;
    orderNumber: string;
    total: number;
    orderStatus: string;
    paymentStatus: string;
    createdAt: string;
    userName: string;
  }[];
}

export interface AdminCategory extends Category {
  productCount: number;
}

export interface AdminOrderSummary {
  id: number;
  orderNumber: string;
  userId: number;
  user?: { name: string; email: string };
  total: number;
  orderStatus: string;
  paymentStatus: string;
  shipmentStatus: string;
  itemCount: number;
  items: Pick<OrderItem, 'id' | 'productNameSnapshot' | 'quantity'>[];
  createdAt: string;
}

export interface AdminOrdersResponse {
  orders: AdminOrderSummary[];
  total: number;
  page: number;
  totalPages: number;
}

export interface AdminCoupon extends Coupon {
  usageCount: number;
}
