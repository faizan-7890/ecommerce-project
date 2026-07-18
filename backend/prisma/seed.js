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

  // 3. Seed Categories
  const fashionCat = await prisma.category.upsert({
    where: { name: 'Fashion' },
    update: {},
    create: { name: 'Fashion', description: 'Curated premium garments and apparel' },
  });

  const accessoriesCat = await prisma.category.upsert({
    where: { name: 'Accessories' },
    update: {},
    create: { name: 'Accessories', description: 'Timeless statement accessories' },
  });

  const electronicsCat = await prisma.category.upsert({
    where: { name: 'Electronics' },
    update: {},
    create: { name: 'Electronics', description: 'Groundbreaking personal hardware gadgets' },
  });

  console.log('Seeded Categories.');

  // 4. Seed Products with Variants and Images
  // Product 1: Premium Leather Jacket
  await prisma.product.upsert({
    where: { slug: 'premium-leather-jacket' },
    update: {},
    create: {
      name: 'Premium Leather Jacket',
      slug: 'premium-leather-jacket',
      description: 'Handcrafted from 100% full-grain leather, this jacket provides a timeless silhouette, heavy-duty silver hardware, and double-stitched quilting.',
      brand: 'Veloce',
      basePrice: 199.99,
      categoryId: fashionCat.id,
      lowStockThreshold: 3,
      status: 'active',
      images: {
        create: [
          { url: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?q=80&w=600&auto=format&fit=crop' },
        ],
      },
      variants: {
        create: [
          { sku: 'VEL-JAC-BLK-S', size: 'S', color: 'Black', stock: 10 },
          { sku: 'VEL-JAC-BLK-M', size: 'M', color: 'Black', stock: 15 },
          { sku: 'VEL-JAC-BLK-L', size: 'L', color: 'Black', stock: 5 },
        ],
      },
    },
  });

  // Product 2: Chronograph Watch
  await prisma.product.upsert({
    where: { slug: 'chronograph-luxury-watch' },
    update: {},
    create: {
      name: 'Chronograph Luxury Watch',
      slug: 'chronograph-luxury-watch',
      description: 'An elite statement timepiece featuring double-dome sapphire crystal, Japanese quartz movement, and custom link stainless steel bands.',
      brand: 'Veloce',
      basePrice: 299.99,
      discountPrice: 249.99, // Flat discount active
      categoryId: accessoriesCat.id,
      lowStockThreshold: 4,
      status: 'active',
      images: {
        create: [
          { url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=600&auto=format&fit=crop' },
        ],
      },
      variants: {
        create: [
          { sku: 'VEL-WTC-GLD-OS', size: 'One Size', color: 'Gold', stock: 12 },
          { sku: 'VEL-WTC-SLV-OS', size: 'One Size', color: 'Silver', stock: 8 },
        ],
      },
    },
  });

  // Product 3: ANC Headphones
  await prisma.product.upsert({
    where: { slug: 'wireless-anc-headphones' },
    update: {},
    create: {
      name: 'Wireless ANC Headphones',
      slug: 'wireless-anc-headphones',
      description: 'Experience pure sonic fidelity with our flagship Active Noise Cancelling headphones, 40h battery lifespan, and custom tuned spatial drivers.',
      brand: 'Sonic',
      basePrice: 149.99,
      categoryId: electronicsCat.id,
      lowStockThreshold: 5,
      status: 'active',
      images: {
        create: [
          { url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=600&auto=format&fit=crop' },
        ],
      },
      variants: {
        create: [
          { sku: 'SNC-HDP-BLK', size: 'Standard', color: 'Black', stock: 25 },
          { sku: 'SNC-HDP-WHT', size: 'Standard', color: 'White', stock: 20 },
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
      minOrderAmount: 50.00,
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
      discountValue: 20.00,
      minOrderAmount: 100.00,
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
