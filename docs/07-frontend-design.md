# 7. Frontend Design

## 7.1 Technology Stack
- **Framework**: Next.js 16 (App Router + React 19)
- **Styling**: Vanilla CSS design tokens + TailwindCSS v3
- **Animations**: Framer Motion
- **Icons & Images**: Next.js `<Image>` with webp/avif support and responsive `sizes`

## 7.2 Core Component Architecture
```
[RootLayout]
  ├── [ErrorBoundary]
  ├── [ToastProvider]
  ├── [WishlistProvider]
  └── [CartProvider]
        ├── [Header] (Logo, Live Search Autocomplete, Wishlist Badge, Cart Slider, User Profile Button)
        ├── [Page Content]
        │     ├── Home / Catalog Grid ([ProductCard])
        │     ├── Product Detail Page ([JSON-LD Schema], Variant Selectors, Reviews)
        │     ├── Wishlist Page (/wishlist)
        │     ├── Order Detail Page (/orders/[id] - 4-step Stepper)
        │     └── Admin Dashboard (/admin - Revenue Charts, Product Modals)
        └── [Footer]
```
