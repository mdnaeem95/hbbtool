const { PrismaClient, MerchantStatus, PaymentMethod } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  await prisma.merchant.createMany({
    data: [
      {
        email: 'merchant1@example.com',
        phone: '+65 9123 4567',
        password: 'hashedpassword', // hash if you use auth
        businessName: 'Nasi Lemak Corner',
        slug: 'nasi-lemak-corner',
        description: 'Serving authentic Malay nasi lemak since 1995.',
        logoUrl: 'https://via.placeholder.com/150',
        halal: true,
        cuisineType: ['Malay'],
        address: '1 Raffles Place, Singapore 048616',
        postalCode: '048616',
        latitude: 1.2831,
        longitude: 103.8519,
        showExactLocation: true,
        deliveryEnabled: true,
        pickupEnabled: true,
        deliveryFee: 3.50,
        minimumOrder: 10,
        deliveryRadius: 5,
        preparationTime: 20,
        paymentMethods: [PaymentMethod.PAYNOW, PaymentMethod.CASH],
        status: MerchantStatus.ACTIVE,
        verified: true,
      },
      {
        email: 'merchant2@example.com',
        phone: '+65 9876 5432',
        password: 'hashedpassword',
        businessName: 'Little India Curry House',
        slug: 'little-india-curry-house',
        description: 'Delicious Indian curries and tandoori specials.',
        logoUrl: 'https://via.placeholder.com/150',
        halal: true,
        cuisineType: ['Indian'],
        address: '60 Buffalo Road, Singapore 219804',
        postalCode: '219804',
        latitude: 1.3070,
        longitude: 103.8520,
        showExactLocation: true,
        deliveryEnabled: true,
        pickupEnabled: true,
        deliveryFee: 4.00,
        minimumOrder: 15,
        deliveryRadius: 7,
        preparationTime: 25,
        paymentMethods: [PaymentMethod.PAYNOW, PaymentMethod.CASH],
        status: MerchantStatus.ACTIVE,
        verified: true,
      },
      {
        email: 'merchant3@example.com',
        phone: '+65 9000 1111',
        password: 'hashedpassword',
        businessName: 'Katong Laksa Express',
        slug: 'katong-laksa-express',
        description: 'Famous laksa with rich coconut broth.',
        logoUrl: 'https://via.placeholder.com/150',
        halal: false,
        cuisineType: ['Peranakan'],
        address: '328 Katong Laksa, Singapore',
        postalCode: '437435',
        latitude: 1.3066,
        longitude: 103.9047,
        showExactLocation: true,
        deliveryEnabled: true,
        pickupEnabled: true,
        deliveryFee: 2.50,
        minimumOrder: 8,
        deliveryRadius: 3,
        preparationTime: 15,
        paymentMethods: [PaymentMethod.CASH],
        status: MerchantStatus.ACTIVE,
        verified: true,
      },
    ],
  })
}

main()
  .then(() => {
    console.log('✅ Seed data inserted')
  })
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
