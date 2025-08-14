import { PrismaClient, MerchantStatus, ProductStatus, DeliveryMethod, OrderStatus, PaymentStatus, PaymentMethod } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding test data...');

  // Create Merchant
  const merchant = await prisma.merchant.create({
    data: {
      email: 'merchant1@example.com',
      phone: '91234567',
      businessName: 'Test Kitchen',
      slug: 'test-kitchen',
      description: 'A sample merchant for testing',
      password: 'hashed_password_here',
      status: MerchantStatus.ACTIVE,
      halal: true,
      cuisineType: ['Malay', 'Western'],
      address: '123 Orchard Road',
      postalCode: '238888',
      latitude: 1.3048,
      longitude: 103.8318,
      deliveryAreas: ['Singapore'],
      paymentMethods: [PaymentMethod.PAYNOW, PaymentMethod.CASH],
      subscriptionTier: 'STARTER',
      subscriptionStatus: 'ACTIVE',
    },
  });

  // Create Category
  const category = await prisma.category.create({
    data: {
      merchantId: merchant.id,
      name: 'Mains',
      slug: 'mains',
      description: 'Main dishes',
    },
  });

  // Create Products
  const product1 = await prisma.product.create({
    data: {
      merchantId: merchant.id,
      categoryId: category.id,
      name: 'Nasi Lemak',
      slug: 'nasi-lemak',
      price: new Decimal(8.50),
      description: 'Fragrant coconut rice with sambal and fried chicken',
      status: ProductStatus.ACTIVE,
      trackInventory: true,
      inventory: 50,
      allergens: ['nuts'],
      dietaryInfo: ['halal'],
    },
  });

  const product2 = await prisma.product.create({
    data: {
      merchantId: merchant.id,
      categoryId: category.id,
      name: 'Chicken Rice',
      slug: 'chicken-rice',
      price: new Decimal(5.00),
      status: ProductStatus.ACTIVE,
      dietaryInfo: ['halal'],
    },
  });

  // Create Customer
  const customer = await prisma.customer.create({
    data: {
      phone: '98765432',
      name: 'John Doe',
      email: 'customer1@example.com',
      emailVerified: true,
    },
  });

  // Create Order
  const order = await prisma.order.create({
    data: {
      orderNumber: `ORD-${Math.floor(Math.random() * 10000)}`,
      merchantId: merchant.id,
      customerId: customer.id,
      deliveryMethod: DeliveryMethod.DELIVERY,
      deliveryFee: new Decimal(3.50),
      subtotal: new Decimal(13.50),
      total: new Decimal(17.00),
      status: OrderStatus.CONFIRMED,
      paymentStatus: PaymentStatus.COMPLETED,
      paymentMethod: PaymentMethod.PAYNOW,
      source: 'web',
      items: {
        create: [
          {
            productId: product1.id,
            productName: product1.name,
            productPrice: product1.price,
            quantity: 1,
            price: product1.price,
            total: product1.price,
          },
          {
            productId: product2.id,
            productName: product2.name,
            productPrice: product2.price,
            quantity: 1,
            price: product2.price,
            total: product2.price,
          },
        ],
      },
    },
  });

  console.log({ merchant, category, product1, product2, customer, order });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
