import { createClient } from '@supabase/supabase-js'
import { db } from '@kitchencloud/database'
import 'dotenv/config'

// pick up either SUPABASE_URL or (fallback) NEXT_PUBLIC_SUPABASE_URL:
const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl) {
  throw new Error('Missing SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL in env')
}
if (!serviceKey) {
  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY in env')
}

// Create admin client for seeding
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

// Test data
const testMerchants = [
  {
    email: 'bakery@test.com',
    password: 'Test123!',
    businessName: 'Artisan Bakery',
    phone: '+6591234567',
  },
  {
    email: 'kitchen@test.com',
    password: 'Test123!',
    businessName: 'Home Kitchen Delights',
    phone: '+6591234568',
  },
]

const testCustomers = [
  {
    email: 'john@customer.com',
    password: 'Test123!',
    name: 'John Doe',
    phone: '+6598765432',
  },
  {
    email: 'jane@customer.com',
    password: 'Test123!',
    name: 'Jane Smith',
    phone: '+6598765433',
  },
]

async function seedMerchants() {
  console.log('🏪 Seeding merchants...')
  
  for (const merchant of testMerchants) {
    try {
      // Create auth user
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: merchant.email,
        password: merchant.password,
        email_confirm: true,
        user_metadata: {
          userType: 'merchant',
          businessName: merchant.businessName,
          phone: merchant.phone,
        }
      })

    if (authError) {
      console.error(`\n❌ Failed to create merchant ${merchant.email}`)
      console.error('→ error.message :', authError.message)
      console.error('→ full error   :', authError)
      continue
    }
      console.log(`✅ Created merchant: ${merchant.email}`)
      
      // Verify merchant was created in database
      const dbMerchant = await db.merchant.findUnique({
        where: { id: authData.user.id }
      })
      
      if (dbMerchant) {
        console.log(`✅ Merchant synced to database: ${dbMerchant.businessName}`)
        
        // Update to active status for testing
        await db.merchant.update({
          where: { id: authData.user.id },
          data: { 
            status: 'ACTIVE',
            verified: true,
            verifiedAt: new Date()
          }
        })
      }
    } catch (error) {
      console.error(`Error creating merchant ${merchant.email}:`, error)
    }
  }
}

async function seedCustomers() {
  console.log('👥 Seeding customers...')
  
  for (const customer of testCustomers) {
    try {
      // Create auth user
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: customer.email,
        password: customer.password,
        email_confirm: true,
        user_metadata: {
          userType: 'customer',
          name: customer.name,
          phone: customer.phone,
        }
      })

      if (authError) {
        console.error(`\n❌ Failed to create customer ${customer.email}`)
        console.error('→ error.message :', authError.message)
        console.error('→ full error   :', authError)
        continue
      }

      console.log(`✅ Created customer: ${customer.email}`)
      
      // Verify customer was created in database
      const dbCustomer = await db.customer.findUnique({
        where: { id: authData.user.id }
      })
      
      if (dbCustomer) {
        console.log(`✅ Customer synced to database: ${dbCustomer.name}`)
        
        // Mark as verified for testing
        await db.customer.update({
          where: { id: authData.user.id },
          data: { 
            emailVerified: true,
            phoneVerified: true
          }
        })
      }
    } catch (error) {
      console.error(`Error creating customer ${customer.email}:`, error)
    }
  }
}

async function createTestProducts() {
  console.log('📦 Creating test products...')
  
  const merchants = await db.merchant.findMany({
    where: { email: { in: testMerchants.map(m => m.email) } }
  })
  
  for (const merchant of merchants) {
    // Create categories
    const bakeryCategory = await db.category.create({
      data: {
        merchantId: merchant.id,
        name: 'Baked Goods',
        slug: 'baked-goods',
        sortOrder: 1,
      }
    })
    
    // Create products
    await db.product.createMany({
      data: [
        {
          merchantId: merchant.id,
          categoryId: bakeryCategory.id,
          name: 'Chocolate Chip Cookies',
          slug: 'chocolate-chip-cookies',
          description: 'Freshly baked chocolate chip cookies',
          price: 12.50,
          status: 'ACTIVE',
          images: ['https://images.unsplash.com/photo-1558961363-fa8fdf82db35'],
        },
        {
          merchantId: merchant.id,
          categoryId: bakeryCategory.id,
          name: 'Sourdough Bread',
          slug: 'sourdough-bread',
          description: 'Artisanal sourdough bread',
          price: 8.00,
          status: 'ACTIVE',
          images: ['https://images.unsplash.com/photo-1549931319-a545dcf3bc73'],
        }
      ]
    })
    
    console.log(`✅ Created products for: ${merchant.businessName}`)
  }
}

async function main() {
  console.log('🌱 Starting database seed...\n')
  
  try {
    // Clean up existing test data
    console.log('🧹 Cleaning up existing test data...')
    
    const testEmails = [
      ...testMerchants.map(m => m.email),
      ...testCustomers.map(c => c.email)
    ]
    
    // Delete from Supabase auth
    const { data: users } = await supabaseAdmin.auth.admin.listUsers()
    for (const user of users.users) {
      if (testEmails.includes(user.email || '')) {
        await supabaseAdmin.auth.admin.deleteUser(user.id)
      }
    }
    
    // Seed data
    await seedMerchants()
    await seedCustomers()
    await createTestProducts()
    
    console.log('\n✅ Seeding completed!')
    console.log('\n📝 Test Accounts:')
    console.log('Merchants:')
    testMerchants.forEach(m => {
      console.log(`  - ${m.email} / ${m.password}`)
    })
    console.log('Customers:')
    testCustomers.forEach(c => {
      console.log(`  - ${c.email} / ${c.password}`)
    })
    
  } catch (error) {
    console.error('❌ Seeding failed:', error)
    process.exit(1)
  }
}

// Run the seed
main()