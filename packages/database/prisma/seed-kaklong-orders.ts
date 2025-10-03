// seed-kak-long-orders.ts
import { 
  PrismaClient, 
  OrderStatus, 
  DeliveryMethod, 
  PaymentMethod,
  PaymentStatus 
} from '@prisma/client'

const prisma = new PrismaClient()

async function seedKakLongOrders() {
  console.log('🌟 Seeding orders for Kak Long\'s Fusion Kitchen...')
  
  try {
    // Find Kak Long's merchant
    const merchant = await prisma.merchant.findFirst({
      where: { email: 'kaklong@kitchencloud.sg' }
    })

    if (!merchant) {
      console.error('❌ Kak Long\'s Fusion Kitchen not found!')
      return
    }

    // Get products
    const products = await prisma.product.findMany({
      where: { merchantId: merchant.id }
    })

    if (products.length === 0) {
      console.error('❌ No products found for merchant!')
      return
    }

    const rendangBurger = products.find(p => p.slug === 'rendang-beef-burger') || products[0]
    const laksaCarbonara = products.find(p => p.slug === 'laksa-carbonara') || products[1]
    const nasiLemakRisotto = products.find(p => p.slug === 'nasi-lemak-risotto') || products[2]

    // Create test customers
    const customers = []
    const customerData = [
      { email: 'ahmad.test@gmail.com', name: 'Ahmad Ibrahim', phone: '91234567' },
      { email: 'siti.test@gmail.com', name: 'Siti Nurhaliza', phone: '92345678' },
      { email: 'john.test@gmail.com', name: 'John Tan', phone: '93456789' },
      { email: 'mary.test@gmail.com', name: 'Mary Lim', phone: '94567890' },
      { email: 'raj.test@gmail.com', name: 'Raj Kumar', phone: '95678901' },
    ]

    for (const data of customerData) {
      const customer = await prisma.customer.upsert({
        where: { phone: data.phone },
        update: { name: data.name, email: data.email },
        create: data
      })
      customers.push(customer)
    }

    // Create delivery addresses
    const addresses = []
    const addressData = [
      { label: 'Home', line1: 'Blk 301 Jurong East Street 32', line2: '#05-123', postalCode: '600301' },
      { label: 'Home', line1: 'Blk 456 Jurong West Avenue 1', line2: '#12-456', postalCode: '640456' },
      { label: 'Office', line1: 'Blk 123 Clementi Avenue 2', line2: '#10-234', postalCode: '120123' },
      { label: 'Home', line1: 'Blk 567 Bukit Batok West Ave 6', line2: '#14-890', postalCode: '650567' },
      { label: 'Home', line1: 'Blk 789 Choa Chu Kang Avenue 7', line2: '#06-345', postalCode: '680789' },
    ]

    for (let i = 0; i < addressData.length; i++) {
      const existing = await prisma.address.findFirst({
        where: {
          customerId: customers[i]?.id,
          postalCode: addressData[i]?.postalCode
        }
      })

      if (!existing) {
        const address = await prisma.address.create({
            data: {
                label: addressData[i]?.label!,
                line1: addressData[i]?.line1!,
                line2: addressData[i]?.line2!,
                postalCode: addressData[i]?.postalCode!,
                customerId: customers[i]?.id!, // Now guaranteed to be a string
                country: 'SG'
            }
        })
        addresses.push(address)
      } else {
        addresses.push(existing)
      }
    }

    // Helper to set time
    const setTime = (hours: number) => {
      const date = new Date()
      date.setHours(hours, 0, 0, 0)
      return date
    }

    // Create orders
    const orders = []
    let orderCounter = 1001

    // Order 1: READY for delivery (Jurong East)
    orders.push(await prisma.order.create({
      data: {
        merchantId: merchant.id,
        customerId: customers[0]?.id,
        orderNumber: `KLF-${new Date().getFullYear()}${String(orderCounter++).padStart(4, '0')}`,
        status: OrderStatus.READY,
        paymentStatus: PaymentStatus.COMPLETED,
        paymentMethod: PaymentMethod.PAYNOW,
        deliveryMethod: DeliveryMethod.DELIVERY,
        deliveryAddressId: addresses[0]?.id,
        scheduledFor: setTime(13), // 1pm
        customerName: customers[0]?.name,
        customerEmail: customers[0]?.email,
        customerPhone: customers[0]?.phone,
        subtotal: 37.80,
        deliveryFee: 3.50,
        total: 41.30,
        deliveryNotes: 'Please call when arrive, baby sleeping',
        items: {
          create: [{
            productId: rendangBurger?.id!,
            productName: rendangBurger?.name!,
            productPrice: rendangBurger?.price!,
            quantity: 2,
            price: rendangBurger?.price!,
            total: rendangBurger?.price.toNumber()! * 2
          }]
        }
      }
    }))

    // Order 2: READY for delivery (Jurong West)
    orders.push(await prisma.order.create({
      data: {
        merchantId: merchant.id,
        customerId: customers[1]?.id,
        orderNumber: `KLF-${new Date().getFullYear()}${String(orderCounter++).padStart(4, '0')}`,
        status: OrderStatus.READY,
        paymentStatus: PaymentStatus.COMPLETED,
        paymentMethod: PaymentMethod.PAYNOW,
        deliveryMethod: DeliveryMethod.DELIVERY,
        deliveryAddressId: addresses[1]?.id,
        scheduledFor: setTime(13),
        customerName: customers[1]?.name,
        customerEmail: customers[1]?.email,
        customerPhone: customers[1]?.phone,
        subtotal: laksaCarbonara?.price!,
        deliveryFee: 3.50,
        total: laksaCarbonara?.price.toNumber()! + 3.50,
        deliveryNotes: 'Gate code: #1234',
        items: {
          create: [{
            productId: laksaCarbonara?.id!,
            productName: laksaCarbonara?.name!,
            productPrice: laksaCarbonara?.price!,
            quantity: 1,
            price: laksaCarbonara?.price!,
            total: laksaCarbonara?.price!
          }]
        }
      }
    }))

    // Order 3: OUT_FOR_DELIVERY (Clementi)
    orders.push(await prisma.order.create({
      data: {
        merchantId: merchant.id,
        customerId: customers[2]?.id,
        orderNumber: `KLF-${new Date().getFullYear()}${String(orderCounter++).padStart(4, '0')}`,
        status: OrderStatus.OUT_FOR_DELIVERY,
        paymentStatus: PaymentStatus.COMPLETED,
        paymentMethod: PaymentMethod.PAYNOW,
        deliveryMethod: DeliveryMethod.DELIVERY,
        deliveryAddressId: addresses[2]?.id,
        scheduledFor: setTime(14), // 2pm
        customerName: customers[2]?.name,
        customerEmail: customers[2]?.email,
        customerPhone: customers[2]?.phone,
        subtotal: rendangBurger?.price.toNumber()! + laksaCarbonara?.price.toNumber()!,
        deliveryFee: 3.50,
        total: rendangBurger?.price.toNumber()! + laksaCarbonara?.price.toNumber()! + 3.50,
        items: {
          create: [
            {
              productId: rendangBurger?.id!,
              productName: rendangBurger?.name!,
              productPrice: rendangBurger?.price!,
              quantity: 1,
              price: rendangBurger?.price!,
              total: rendangBurger?.price!
            },
            {
              productId: laksaCarbonara?.id!,
              productName: laksaCarbonara?.name!,
              productPrice: laksaCarbonara?.price!,
              quantity: 1,
              price: laksaCarbonara?.price!,
              total: laksaCarbonara?.price!
            }
          ]
        }
      }
    }))

    // Order 4: READY for delivery (Bukit Batok)
    orders.push(await prisma.order.create({
      data: {
        merchantId: merchant.id,
        customerId: customers[3]?.id,
        orderNumber: `KLF-${new Date().getFullYear()}${String(orderCounter++).padStart(4, '0')}`,
        status: OrderStatus.READY,
        paymentStatus: PaymentStatus.COMPLETED,
        paymentMethod: PaymentMethod.PAYNOW,
        deliveryMethod: DeliveryMethod.DELIVERY,
        deliveryAddressId: addresses[3]?.id,
        scheduledFor: setTime(14),
        customerName: customers[3]?.name,
        customerEmail: customers[3]?.email,
        customerPhone: customers[3]?.phone,
        subtotal: rendangBurger?.price!,
        deliveryFee: 3.50,
        total: rendangBurger?.price.toNumber()! + 3.50,
        deliveryNotes: 'Leave at door if no one home',
        items: {
          create: [{
            productId: rendangBurger?.id!,
            productName: rendangBurger?.name!,
            productPrice: rendangBurger?.price!,
            quantity: 1,
            price: rendangBurger?.price!,
            total: rendangBurger?.price!
          }]
        }
      }
    }))

    // Order 5: READY for delivery (Choa Chu Kang)
    orders.push(await prisma.order.create({
      data: {
        merchantId: merchant.id,
        customerId: customers[4]?.id,
        orderNumber: `KLF-${new Date().getFullYear()}${String(orderCounter++).padStart(4, '0')}`,
        status: OrderStatus.READY,
        paymentStatus: PaymentStatus.COMPLETED,
        paymentMethod: PaymentMethod.PAYNOW,
        deliveryMethod: DeliveryMethod.DELIVERY,
        deliveryAddressId: addresses[4]?.id,
        scheduledFor: setTime(15), // 3pm
        customerName: customers[4]?.name,
        customerEmail: customers[4]?.email,
        customerPhone: customers[4]?.phone,
        subtotal: nasiLemakRisotto ? nasiLemakRisotto.price.toNumber() * 3 : rendangBurger?.price.toNumber()! * 3,
        deliveryFee: 3.50,
        total: (nasiLemakRisotto ? nasiLemakRisotto.price.toNumber() * 3 : rendangBurger?.price.toNumber()! * 3) + 3.50,
        items: {
          create: [{
            productId: nasiLemakRisotto?.id || rendangBurger?.id!,
            productName: nasiLemakRisotto?.name || rendangBurger?.name!,
            productPrice: nasiLemakRisotto?.price || rendangBurger?.price!,
            quantity: 3,
            price: nasiLemakRisotto?.price || rendangBurger?.price!,
            total: nasiLemakRisotto ? nasiLemakRisotto.price.toNumber() * 3 : rendangBurger?.price.toNumber()! * 3
          }]
        }
      }
    }))

    // Additional READY orders for evening batch
    for (let i = 0; i < 3; i++) {
      orders.push(await prisma.order.create({
        data: {
          merchantId: merchant.id,
          customerId: customers[i]?.id,
          orderNumber: `KLF-${new Date().getFullYear()}${String(orderCounter++).padStart(4, '0')}`,
          status: OrderStatus.READY,
          paymentStatus: PaymentStatus.COMPLETED,
          paymentMethod: PaymentMethod.PAYNOW,
          deliveryMethod: DeliveryMethod.DELIVERY,
          deliveryAddressId: addresses[i]?.id,
          scheduledFor: setTime(18), // 6pm batch
          customerName: `Evening Customer ${i + 1}`,
          customerEmail: `evening${i}@test.com`,
          customerPhone: `9800000${i}`,
          subtotal: rendangBurger?.price!,
          deliveryFee: 3.50,
          total: rendangBurger?.price.toNumber()! + 3.50,
          items: {
            create: [{
              productId: rendangBurger?.id!,
              productName: rendangBurger?.name!,
              productPrice: rendangBurger?.price!,
              quantity: 1,
              price: rendangBurger?.price!,
              total: rendangBurger?.price!
            }]
          }
        }
      }))
    }

    // One PICKUP order
    orders.push(await prisma.order.create({
      data: {
        merchantId: merchant.id,
        customerId: customers[0]?.id,
        orderNumber: `KLF-${new Date().getFullYear()}${String(orderCounter++).padStart(4, '0')}`,
        status: OrderStatus.PREPARING,
        paymentStatus: PaymentStatus.COMPLETED,
        paymentMethod: PaymentMethod.PAYNOW,
        deliveryMethod: DeliveryMethod.PICKUP,
        scheduledFor: setTime(14),
        customerName: 'Pickup Customer',
        customerEmail: 'pickup@test.com',
        customerPhone: '98000001',
        subtotal: rendangBurger?.price!,
        deliveryFee: 0,
        total: rendangBurger?.price!,
        customerNotes: 'Will arrive in blue Honda',
        items: {
          create: [{
            productId: rendangBurger?.id!,
            productName: rendangBurger?.name!,
            productPrice: rendangBurger?.price!,
            quantity: 1,
            price: rendangBurger?.price!,
            total: rendangBurger?.price!
          }]
        }
      }
    }))

    // One PENDING payment order
    orders.push(await prisma.order.create({
      data: {
        merchantId: merchant.id,
        customerId: customers[1]?.id,
        orderNumber: `KLF-${new Date().getFullYear()}${String(orderCounter++).padStart(4, '0')}`,
        status: OrderStatus.PENDING,
        paymentStatus: PaymentStatus.PENDING,
        deliveryMethod: DeliveryMethod.PICKUP,
        scheduledFor: setTime(15),
        customerName: 'Pending Customer',
        customerEmail: 'pending@test.com',
        customerPhone: '98000002',
        subtotal: laksaCarbonara?.price.toNumber()! * 2,
        deliveryFee: 0,
        total: laksaCarbonara?.price.toNumber()! * 2,
        items: {
          create: [{
            productId: laksaCarbonara?.id!,
            productName: laksaCarbonara?.name!,
            productPrice: laksaCarbonara?.price!,
            quantity: 2,
            price: laksaCarbonara?.price!,
            total: laksaCarbonara?.price.toNumber()! * 2
          }]
        }
      }
    }))

    // Create 3 COMPLETED orders for analytics
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    
    for (let i = 0; i < 3; i++) {
      await prisma.order.create({
        data: {
          merchantId: merchant.id,
          customerId: customers[i]?.id,
          orderNumber: `KLF-${new Date().getFullYear()}${String(3001 + i).padStart(4, '0')}`,
          status: OrderStatus.COMPLETED,
          paymentStatus: PaymentStatus.COMPLETED,
          paymentMethod: PaymentMethod.PAYNOW,
          deliveryMethod: DeliveryMethod.DELIVERY,
          deliveryAddressId: addresses[i]?.id,
          scheduledFor: yesterday,
          customerName: `Yesterday Customer ${i + 1}`,
          customerEmail: `yesterday${i}@test.com`,
          customerPhone: `9700000${i}`,
          subtotal: rendangBurger?.price.toNumber()! * (i + 1),
          deliveryFee: 3.50,
          total: (rendangBurger?.price.toNumber()! * (i + 1)) + 3.50,
          deliveredAt: yesterday,
          items: {
            create: [{
              productId: rendangBurger?.id!,
              productName: rendangBurger?.name!,
              productPrice: rendangBurger?.price!,
              quantity: i + 1,
              price: rendangBurger?.price!,
              total: rendangBurger?.price.toNumber()! * (i + 1)
            }]
          }
        }
      })
    }

    // Summary
    console.log(`\n✅ Created ${orders.length} orders successfully!`)
    
    const summary = await prisma.order.groupBy({
      by: ['status', 'deliveryMethod'],
      where: { merchantId: merchant.id },
      _count: { _all: true }
    })
    
    console.log('\n📊 Order Summary:')
    summary.forEach(item => {
      console.log(`   ${item.status} (${item.deliveryMethod}): ${item._count._all}`)
    })

    const readyDelivery = await prisma.order.count({
      where: {
        merchantId: merchant.id,
        status: OrderStatus.READY,
        deliveryMethod: DeliveryMethod.DELIVERY
      }
    })

    console.log(`\n🚚 Ready for delivery: ${readyDelivery} orders`)
    console.log('Navigate to /dashboard/orders → Delivery Routes tab to test!')

  } catch (error) {
    console.error('❌ Error seeding orders:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
seedKakLongOrders()