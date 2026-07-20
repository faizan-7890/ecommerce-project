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
  status: string;
  images: ProductImage[];
  variants: ProductVariant[];
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
