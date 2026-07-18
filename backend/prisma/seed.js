const { prisma } = require('../src/config/db');
const bcrypt = require('bcryptjs');

async function main() {
  // 1. Seed Roles
  const customerRole = await prisma.role.upsert({
    where: { name: 'CUSTOMER' },
    update: {},
    create: { name: 'CUSTOMER' },
  });

  const adminRole = await prisma.role.upsert({
    where: { name: 'ADMIN' },
    update: {},
    create: { name: 'ADMIN' },
  });

  console.log('Seeded Roles.');

  // 2. Seed Users
  const salt = await bcrypt.genSalt(10);
  const adminPassword = await bcrypt.hash('admin123', salt);
  const customerPassword = await bcrypt.hash('password123', salt);

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@veloce.com' },
    update: { password: adminPassword },
    create: {
      name: 'Veloce Admin',
      email: 'admin@veloce.com',
      password: adminPassword,
      roleId: adminRole.id,
      emailVerified: true,
    },
  });

  const customerUser = await prisma.user.upsert({
    where: { email: 'john@example.com' },
    update: { password: customerPassword },
    create: {
      name: 'John Doe',
      email: 'john@example.com',
      password: customerPassword,
      roleId: customerRole.id,
      emailVerified: true,
      cart: {
        create: {},
      },
    },
  });

  console.log('Seeded Users: admin@veloce.com and john@example.com');

  // 3. Seed Recommended Categories
  const catShirts = await prisma.category.upsert({
    where: { name: 'Anime-Inspired T-Shirts' },
    update: {},
    create: { name: 'Anime-Inspired T-Shirts', description: 'Original minimalist and graphic anime tees.' },
  });

  const catOversized = await prisma.category.upsert({
    where: { name: 'Oversized T-Shirts' },
    update: {},
    create: { name: 'Oversized T-Shirts', description: 'Loose-fit comfort streetwear tees.' },
  });

  const catStreetwear = await prisma.category.upsert({
    where: { name: 'Japanese Streetwear' },
    update: {},
    create: { name: 'Japanese Streetwear', description: 'Modern streetwear designs inspired by Harajuku trends.' },
  });

  const catAccessories = await prisma.category.upsert({
    where: { name: 'Anime Accessories' },
    update: {},
    create: { name: 'Anime Accessories', description: 'Pins, canvas patches, keychains, and tote bags.' },
  });

  const catHoodies = await prisma.category.upsert({
    where: { name: 'Hoodies' },
    update: {},
    create: { name: 'Hoodies', description: 'Heavyweight cozy fleece hoodies featuring original artwork.' },
  });

  const catLimited = await prisma.category.upsert({
    where: { name: 'Limited Edition Collections' },
    update: {},
    create: { name: 'Limited Edition Collections', description: 'Extremely limited edition drops and varsity jackets.' },
  });

  console.log('Seeded Categories.');

  // 4. Seed Products with Variants and local/external Images
  // Product 1: Super Saiyan Aura Black Hoodie (Hoodies)
  await prisma.product.upsert({
    where: { slug: 'super-saiyan-aura-hoodie' },
    update: {},
    create: {
      name: 'Super Saiyan Aura Black Hoodie',
      slug: 'super-saiyan-aura-hoodie',
      description: 'Premium heavy-weight black hoodie featuring original artistic Saiyan-inspired energy line-art on the back. Dual sleeve details.',
      brand: 'Veloce Original',
      basePrice: 1899.00,
      categoryId: catHoodies.id,
      lowStockThreshold: 5,
      status: 'active',
      images: {
        create: [
          { url: '/images/saiyan-hoodie.png' },
        ],
      },
      variants: {
        create: [
          { sku: 'VEL-SAI-BLK-S', size: 'S', color: 'Black', stock: 10, price: 1899.00 },
          { sku: 'VEL-SAI-BLK-M', size: 'M', color: 'Black', stock: 15, price: 1899.00 },
          { sku: 'VEL-SAI-BLK-L', size: 'L', color: 'Black', stock: 10, price: 1899.00 },
          { sku: 'VEL-SAI-BLK-XL', size: 'XL', color: 'Black', stock: 5, price: 1899.00 },
        ],
      },
    },
  });

  // Product 2: Sun God Gear 5 Varsity Jacket (Limited Edition Collections)
  await prisma.product.upsert({
    where: { slug: 'sun-god-gear-5-varsity-jacket' },
    update: {},
    create: {
      name: 'Sun God Gear 5 Varsity Jacket',
      slug: 'sun-god-gear-5-varsity-jacket',
      description: 'Exclusive limited-edition black-and-white wool-blend varsity jacket celebrating the legendary Sun God Gear 5 form with custom embroidery patches.',
      brand: 'Veloce Original',
      basePrice: 2499.00,
      categoryId: catLimited.id,
      lowStockThreshold: 3,
      status: 'active',
      images: {
        create: [
          { url: '/images/luffy-jacket.png' },
        ],
      },
      variants: {
        create: [
          { sku: 'VEL-SUN-WHT-S', size: 'S', color: 'White-Black', stock: 5, price: 2499.00 },
          { sku: 'VEL-SUN-WHT-M', size: 'M', color: 'White-Black', stock: 10, price: 2499.00 },
          { sku: 'VEL-SUN-WHT-L', size: 'L', color: 'White-Black', stock: 5, price: 2499.00 },
          { sku: 'VEL-SUN-WHT-XL', size: 'XL', color: 'White-Black', stock: 5, price: 2499.00 },
        ],
      },
    },
  });

  // Product 3: Copy Ninja Kakashi Bomber Jacket (Japanese Streetwear)
  await prisma.product.upsert({
    where: { slug: 'copy-ninja-kakashi-bomber-jacket' },
    update: {},
    create: {
      name: 'Copy Ninja Kakashi Bomber Jacket',
      slug: 'copy-ninja-kakashi-bomber-jacket',
      description: 'Harajuku streetwear bomber jacket featuring premium Kakashi graphic art prints and side zip sleeve pockets.',
      brand: 'Veloce Original',
      basePrice: 2199.00,
      categoryId: catStreetwear.id,
      lowStockThreshold: 4,
      status: 'active',
      images: {
        create: [
          { url: '/images/kakashi-jacket.png' },
        ],
      },
      variants: {
        create: [
          { sku: 'VEL-KKH-BLK-S', size: 'S', color: 'Black', stock: 8, price: 2199.00 },
          { sku: 'VEL-KKH-BLK-M', size: 'M', color: 'Black', stock: 12, price: 2199.00 },
          { sku: 'VEL-KKH-BLK-L', size: 'L', color: 'Black', stock: 8, price: 2199.00 },
          { sku: 'VEL-KKH-BLK-XL', size: 'XL', color: 'Black', stock: 4, price: 2199.00 },
        ],
      },
    },
  });

  // Product 4: Neo Tokyo Oversized T-Shirt (Oversized T-Shirts)
  await prisma.product.upsert({
    where: { slug: 'neo-tokyo-oversized-t-shirt' },
    update: {},
    create: {
      name: 'Neo Tokyo Oversized T-Shirt',
      slug: 'neo-tokyo-oversized-t-shirt',
      description: 'Premium oversized black T-shirt featuring original futuristic anime-inspired artwork.',
      brand: 'Veloce Original',
      basePrice: 899.00,
      categoryId: catOversized.id,
      lowStockThreshold: 5,
      status: 'active',
      images: {
        create: [
          { url: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=600&auto=format&fit=crop' },
        ],
      },
      variants: {
        create: [
          { sku: 'VELOCE-NEO-BLK-S', size: 'S', color: 'Black', stock: 10, price: 899.00 },
          { sku: 'VELOCE-NEO-BLK-M', size: 'M', color: 'Black', stock: 15, price: 899.00 },
          { sku: 'VELOCE-NEO-BLK-L', size: 'L', color: 'Black', stock: 10, price: 899.00 },
          { sku: 'VELOCE-NEO-BLK-XL', size: 'XL', color: 'Black', stock: 5, price: 899.00 },
        ],
      },
    },
  });

  // Product 5: Shadow Warrior Graphic Tee (Anime-Inspired T-Shirts)
  await prisma.product.upsert({
    where: { slug: 'shadow-warrior-graphic-tee' },
    update: {},
    create: {
      name: 'Shadow Warrior Graphic Tee',
      slug: 'shadow-warrior-graphic-tee',
      description: 'Comfortable combed cotton T-shirt with an original custom dark ninja/warrior graphic illustration.',
      brand: 'Veloce Original',
      basePrice: 799.00,
      categoryId: catShirts.id,
      lowStockThreshold: 5,
      status: 'active',
      images: {
        create: [
          { url: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?q=80&w=600&auto=format&fit=crop' },
        ],
      },
      variants: {
        create: [
          { sku: 'VELOCE-SHD-BLK-S', size: 'S', color: 'Black', stock: 5, price: 799.00 },
          { sku: 'VELOCE-SHD-BLK-M', size: 'M', color: 'Black', stock: 10, price: 799.00 },
          { sku: 'VELOCE-SHD-BLK-L', size: 'L', color: 'Black', stock: 10, price: 799.00 },
          { sku: 'VELOCE-SHD-BLK-XL', size: 'XL', color: 'Black', stock: 5, price: 799.00 },
        ],
      },
    },
  });

  // Product 6: Chibi Cat Streetwear Tee (Japanese Streetwear)
  await prisma.product.upsert({
    where: { slug: 'chibi-cat-streetwear-tee' },
    update: {},
    create: {
      name: 'Chibi Cat Streetwear Tee',
      slug: 'chibi-cat-streetwear-tee',
      description: 'Soft ringspun cotton T-shirt featuring a cute original chibi cat Harajuku streetwear design.',
      brand: 'Veloce Original',
      basePrice: 699.00,
      categoryId: catStreetwear.id,
      lowStockThreshold: 5,
      status: 'active',
      images: {
        create: [
          { url: 'https://images.unsplash.com/photo-1562157873-818bc0726f68?q=80&w=600&auto=format&fit=crop' },
        ],
      },
      variants: {
        create: [
          { sku: 'VELOCE-CAT-WHT-S', size: 'S', color: 'White', stock: 10, price: 699.00 },
          { sku: 'VELOCE-CAT-WHT-M', size: 'M', color: 'White', stock: 15, price: 699.00 },
          { sku: 'VELOCE-CAT-WHT-L', size: 'L', color: 'White', stock: 15, price: 699.00 },
          { sku: 'VELOCE-CAT-WHT-XL', size: 'XL', color: 'White', stock: 10, price: 699.00 },
        ],
      },
    },
  });

  // Product 7: Retro Anime Canvas Tote Bag (Anime Accessories)
  await prisma.product.upsert({
    where: { slug: 'retro-anime-canvas-tote-bag' },
    update: {},
    create: {
      name: 'Retro Anime Canvas Tote Bag',
      slug: 'retro-anime-canvas-tote-bag',
      description: 'Heavy-duty organic canvas shoulder tote featuring retro 90s style original anime typography print.',
      brand: 'Veloce Original',
      basePrice: 499.00,
      categoryId: catAccessories.id,
      lowStockThreshold: 10,
      status: 'active',
      images: {
        create: [
          { url: 'https://images.unsplash.com/photo-1544816155-12df9643f363?q=80&w=600&auto=format&fit=crop' },
        ],
      },
      variants: {
        create: [
          { sku: 'VEL-TOTE-OS', size: 'One Size', color: 'Natural', stock: 50, price: 499.00 },
        ],
      },
    },
  });

  console.log('Seeded Products and Variants.');

  // 5. Seed Coupons
  await prisma.coupon.upsert({
    where: { code: 'WELCOME10' },
    update: {},
    create: {
      code: 'WELCOME10',
      discountType: 'percentage',
      discountValue: 10.00,
      minOrderAmount: 500.00,
      usageLimit: 100,
      isActive: true,
    },
  });

  await prisma.coupon.upsert({
    where: { code: 'SAVE20' },
    update: {},
    create: {
      code: 'SAVE20',
      discountType: 'fixed',
      discountValue: 200.00,
      minOrderAmount: 1000.00,
      usageLimit: 50,
      isActive: true,
    },
  });

  console.log('Seeded Coupons.');
  console.log('Database Seeding Successful.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
