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

export type {
  Role,
  User,
  ProductImage,
  Category,
  ProductVariant,
  Product,
  Address,
  OrderItem,
  Payment,
  Refund,
  Order,
  CartItem,
  Cart,
  Coupon,
  ApiError,
} from '@/types';

export interface CouponPreview {
  code: string;
  discountAmount: number;
  discountType?: string;
}
