// scripts/seed-products-complete.ts
import { 
  PrismaClient, 
  ProductStatus, 
  ModifierGroupType, 
  PriceAdjustmentType,
  ModifierScope 
} from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting complete product seed with variants and modifiers...')

  // Clean up existing data for a fresh start
  console.log('🧹 Clearing existing product data...')
  await prisma.orderItemCustomization.deleteMany()
  await prisma.productModifierGroupCategory.deleteMany()
  await prisma.productModifier.deleteMany()
  await prisma.productModifierGroup.deleteMany()
  await prisma.productVariant.deleteMany()
  await prisma.productView.deleteMany()
  await prisma.orderItem.deleteMany()
  await prisma.product.deleteMany()
  await prisma.category.deleteMany()
  console.log('✅ Cleanup complete')

  // Get the merchants
  const merchants = await prisma.merchant.findMany({
    where: {
      email: {
        in: [
          'mdm.wongs@kitchencloud.sg',
          'kaklong@kitchencloud.sg',
          'priya.sweets@kitchencloud.sg'
        ]
      }
    }
  })

  if (merchants.length === 0) {
    console.log('⚠️  No merchants found. Please run seed-merchants.ts first.')
    return
  }

  // ====================================
  // MERCHANT 1: MDM WONG'S KITCHEN
  // ====================================
  const mdmWong = merchants.find(m => m.email === 'mdm.wongs@kitchencloud.sg')
  if (mdmWong) {
    console.log(`\n🥢 Setting up ${mdmWong.businessName}...`)

    // Create categories
    const dimSumCategory = await prisma.category.create({
      data: {
        merchantId: mdmWong.id,
        name: 'Dim Sum',
        slug: 'dim-sum',
        description: 'Handmade dim sum, steamed fresh to order',
        sortOrder: 1,
        isActive: true
      }
    })

    const noodlesCategory = await prisma.category.create({
      data: {
        merchantId: mdmWong.id,
        name: 'Noodles & Rice',
        slug: 'noodles-rice',
        description: 'Wok-fried noodles and fragrant rice dishes',
        sortOrder: 2,
        isActive: true
      }
    })

    const soupsCategory = await prisma.category.create({
      data: {
        merchantId: mdmWong.id,
        name: 'Soups',
        slug: 'soups',
        description: 'Traditional slow-cooked Chinese soups',
        sortOrder: 3,
        isActive: true
      }
    })

    // Create merchant-wide modifier groups
    await prisma.productModifierGroup.create({
      data: {
        merchantId: mdmWong.id,
        name: 'Packaging Options',
        description: 'Choose your preferred packaging',
        type: ModifierGroupType.SINGLE_SELECT,
        required: false,
        scope: ModifierScope.MERCHANT,
        sortOrder: 99,
        modifiers: {
          create: [
            {
              name: 'Standard Packaging',
              priceAdjustment: 0,
              priceType: PriceAdjustmentType.FIXED,
              isDefault: true,
              sortOrder: 1
            },
            {
              name: 'Eco-Friendly Packaging',
              description: 'Biodegradable containers',
              priceAdjustment: 1.00,
              priceType: PriceAdjustmentType.FIXED,
              sortOrder: 2
            },
            {
              name: 'Premium Gift Box',
              description: 'Perfect for gifting',
              priceAdjustment: 5.00,
              priceType: PriceAdjustmentType.FIXED,
              imageUrl: 'https://via.placeholder.com/100x100/8B0000/FFFFFF?text=Gift',
              sortOrder: 3
            }
          ]
        }
      }
    })

    // Product 1: Har Gow with variants and modifiers
    const harGow = await prisma.product.create({
      data: {
        merchantId: mdmWong.id,
        categoryId: dimSumCategory.id,
        sku: 'MW-DS-001',
        name: 'Har Gow (Crystal Shrimp Dumplings)',
        slug: 'har-gow-shrimp-dumplings',
        description: 'Delicate translucent dumplings filled with fresh prawns and bamboo shoots',
        images: ['https://via.placeholder.com/400x400/FFA500/FFFFFF?text=Har+Gow'],
        price: 6.80,
        trackInventory: true,
        inventory: 200,
        status: ProductStatus.ACTIVE,
        featured: true,
        allergens: ['shellfish'],
        preparationTime: 15,
        servingSize: 'Per basket',
        tags: ['bestseller', 'signature', 'steamed'],
        variants: {
          create: [
            {
              sku: 'MW-DS-001-S',
              name: '3 Pieces',
              options: { portion: '3pcs' },
              priceAdjustment: -2.00,
              inventory: 100,
              isDefault: false,
              sortOrder: 1
            },
            {
              sku: 'MW-DS-001-M',
              name: '4 Pieces',
              options: { portion: '4pcs' },
              priceAdjustment: 0,
              inventory: 150,
              isDefault: true,
              sortOrder: 2
            },
            {
              sku: 'MW-DS-001-L',
              name: '6 Pieces',
              options: { portion: '6pcs' },
              priceAdjustment: 3.20,
              inventory: 80,
              isDefault: false,
              sortOrder: 3
            }
          ]
        },
        modifierGroups: {
          create: [
            {
              merchantId: mdmWong.id,
              name: 'Sauce Options',
              type: ModifierGroupType.MULTI_SELECT,
              required: false,
              maxSelect: 3,
              sortOrder: 1,
              modifiers: {
                create: [
                  {
                    name: 'Soy Sauce',
                    priceAdjustment: 0,
                    priceType: PriceAdjustmentType.FIXED,
                    sortOrder: 1
                  },
                  {
                    name: 'Chili Oil',
                    priceAdjustment: 0,
                    priceType: PriceAdjustmentType.FIXED,
                    sortOrder: 2
                  },
                  {
                    name: 'Black Vinegar',
                    priceAdjustment: 0,
                    priceType: PriceAdjustmentType.FIXED,
                    sortOrder: 3
                  },
                  {
                    name: 'Extra Ginger Strips',
                    priceAdjustment: 0.50,
                    priceType: PriceAdjustmentType.FIXED,
                    sortOrder: 4
                  }
                ]
              }
            }
          ]
        }
      }
    })
    console.log(`  ✓ Created: ${harGow.name} (3 variants, 4 sauce modifiers)`)

    // Product 2: Wonton Noodle Soup with modifiers
    const wontonNoodles = await prisma.product.create({
      data: {
        merchantId: mdmWong.id,
        categoryId: noodlesCategory.id,
        sku: 'MW-ND-002',
        name: 'Wonton Noodle Soup',
        slug: 'wonton-noodle-soup',
        description: 'Handmade shrimp wontons in rich broth with springy egg noodles',
        images: ['https://via.placeholder.com/400x400/FFD700/FFFFFF?text=Wonton+Noodles'],
        price: 12.80,
        status: ProductStatus.ACTIVE,
        featured: true,
        allergens: ['shellfish', 'eggs', 'gluten'],
        preparationTime: 20,
        tags: ['comfort-food', 'signature'],
        variants: {
          create: [
            {
              sku: 'MW-ND-002-S',
              name: 'Small Bowl',
              options: { size: 'small' },
              priceAdjustment: -3.00,
              inventory: 0,
              isDefault: false,
              sortOrder: 1
            },
            {
              sku: 'MW-ND-002-R',
              name: 'Regular Bowl',
              options: { size: 'regular' },
              priceAdjustment: 0,
              inventory: 0,
              isDefault: true,
              sortOrder: 2
            },
            {
              sku: 'MW-ND-002-L',
              name: 'Large Bowl',
              options: { size: 'large' },
              priceAdjustment: 4.00,
              inventory: 0,
              isDefault: false,
              sortOrder: 3
            }
          ]
        },
        modifierGroups: {
          create: [
            {
              merchantId: mdmWong.id,
              name: 'Noodle Type',
              type: ModifierGroupType.SINGLE_SELECT,
              required: true,
              sortOrder: 1,
              modifiers: {
                create: [
                  {
                    name: 'Egg Noodles (Traditional)',
                    priceAdjustment: 0,
                    priceType: PriceAdjustmentType.FIXED,
                    isDefault: true,
                    sortOrder: 1
                  },
                  {
                    name: 'Flat Rice Noodles (Hor Fun)',
                    priceAdjustment: 0,
                    priceType: PriceAdjustmentType.FIXED,
                    sortOrder: 2
                  },
                  {
                    name: 'Vermicelli (Bee Hoon)',
                    priceAdjustment: 0,
                    priceType: PriceAdjustmentType.FIXED,
                    sortOrder: 3
                  },
                  {
                    name: 'Kway Teow',
                    priceAdjustment: 1.00,
                    priceType: PriceAdjustmentType.FIXED,
                    sortOrder: 4
                  }
                ]
              }
            },
            {
              merchantId: mdmWong.id,
              name: 'Extra Toppings',
              type: ModifierGroupType.MULTI_SELECT,
              required: false,
              sortOrder: 2,
              modifiers: {
                create: [
                  {
                    name: 'Extra Wontons (3 pcs)',
                    priceAdjustment: 4.50,
                    priceType: PriceAdjustmentType.FIXED,
                    sortOrder: 1
                  },
                  {
                    name: 'Char Siu',
                    priceAdjustment: 5.00,
                    priceType: PriceAdjustmentType.FIXED,
                    sortOrder: 2
                  },
                  {
                    name: 'Bok Choy',
                    priceAdjustment: 2.00,
                    priceType: PriceAdjustmentType.FIXED,
                    sortOrder: 3
                  },
                  {
                    name: 'Soft Boiled Egg',
                    priceAdjustment: 2.50,
                    priceType: PriceAdjustmentType.FIXED,
                    sortOrder: 4
                  }
                ]
              }
            },
            {
              merchantId: mdmWong.id,
              name: 'Soup Preferences',
              type: ModifierGroupType.MULTI_SELECT,
              required: false,
              sortOrder: 3,
              modifiers: {
                create: [
                  {
                    name: 'Less Oil',
                    priceAdjustment: 0,
                    priceType: PriceAdjustmentType.FIXED,
                    sortOrder: 1
                  },
                  {
                    name: 'No MSG',
                    priceAdjustment: 0,
                    priceType: PriceAdjustmentType.FIXED,
                    sortOrder: 2
                  },
                  {
                    name: 'Extra Soup',
                    priceAdjustment: 1.00,
                    priceType: PriceAdjustmentType.FIXED,
                    sortOrder: 3
                  }
                ]
              }
            }
          ]
        }
      }
    })
    console.log(`  ✓ Created: ${wontonNoodles.name} (3 variants, 10 modifiers)`)

    // Product 3: Double-boiled Soup
    const soup = await prisma.product.create({
      data: {
        merchantId: mdmWong.id,
        categoryId: soupsCategory.id,
        sku: 'MW-SP-003',
        name: 'Double-boiled Herbal Chicken Soup',
        slug: 'herbal-chicken-soup',
        description: '6-hour slow-cooked soup with Chinese herbs and free-range chicken',
        images: ['https://via.placeholder.com/400x400/8B4513/FFFFFF?text=Herbal+Soup'],
        price: 18.80,
        status: ProductStatus.ACTIVE,
        allergens: ['chicken'],
        dietaryInfo: ['gluten-free'],
        preparationTime: 10,
        tags: ['healthy', 'traditional'],
        requirePreorder: true,
        preorderDays: 1,
        modifierGroups: {
          create: [
            {
              merchantId: mdmWong.id,
              name: 'Serving Options',
              type: ModifierGroupType.SINGLE_SELECT,
              required: true,
              sortOrder: 1,
              modifiers: {
                create: [
                  {
                    name: 'Single Serving',
                    priceAdjustment: 0,
                    priceType: PriceAdjustmentType.FIXED,
                    isDefault: true,
                    sortOrder: 1
                  },
                  {
                    name: 'Family Pot (4 servings)',
                    priceAdjustment: 35.00,
                    priceType: PriceAdjustmentType.FIXED,
                    sortOrder: 2
                  }
                ]
              }
            }
          ]
        }
      }
    })
    console.log(`  ✓ Created: ${soup.name} (no variants, 2 modifiers)`)
  }

  // ====================================
  // MERCHANT 2: KAK LONG'S FUSION KITCHEN
  // ====================================
  const kakLong = merchants.find(m => m.email === 'kaklong@kitchencloud.sg')
  if (kakLong) {
    console.log(`\n🌶️  Setting up ${kakLong.businessName}...`)

    // Create categories
    const burgersCategory = await prisma.category.create({
      data: {
        merchantId: kakLong.id,
        name: 'Fusion Burgers',
        slug: 'fusion-burgers',
        description: 'East meets West between two buns',
        sortOrder: 1,
        isActive: true
      }
    })

    const pastaCategory = await prisma.category.create({
      data: {
        merchantId: kakLong.id,
        name: 'Asian Pasta',
        slug: 'asian-pasta',
        description: 'Italian pasta with Southeast Asian soul',
        sortOrder: 2,
        isActive: true
      }
    })

    const risoCategory = await prisma.category.create({
      data: {
        merchantId: kakLong.id,
        name: 'Fusion Rice',
        slug: 'fusion-rice',
        description: 'Creative rice dishes',
        sortOrder: 3,
        isActive: true
      }
    })

    // Create merchant-wide halal dietary modifier
    await prisma.productModifierGroup.create({
      data: {
        merchantId: kakLong.id,
        name: 'Dietary Preferences',
        type: ModifierGroupType.MULTI_SELECT,
        required: false,
        scope: ModifierScope.MERCHANT,
        sortOrder: 100,
        modifiers: {
          create: [
            {
              name: 'Make it Vegetarian',
              description: 'Replace meat with mock meat',
              priceAdjustment: 0,
              priceType: PriceAdjustmentType.FIXED,
              sortOrder: 1
            },
            {
              name: 'Gluten-Free Option',
              priceAdjustment: 3.00,
              priceType: PriceAdjustmentType.FIXED,
              sortOrder: 2
            }
          ]
        }
      }
    })

    // Product 1: Rendang Beef Burger
    const rendangBurger = await prisma.product.create({
      data: {
        merchantId: kakLong.id,
        categoryId: burgersCategory.id,
        sku: 'KLF-BG-001',
        name: 'Rendang Beef Burger',
        slug: 'rendang-beef-burger',
        description: 'Juicy beef patty glazed with rendang sauce, served with artisanal sourdough bun',
        images: ['https://via.placeholder.com/400x400/8B4513/FFFFFF?text=Rendang+Burger'],
        price: 18.90,
        status: ProductStatus.ACTIVE,
        featured: true,
        allergens: ['gluten', 'soy'],
        dietaryInfo: ['halal'],
        spiceLevel: 3,
        preparationTime: 25,
        tags: ['signature', 'spicy'],
        modifierGroups: {
          create: [
            {
              merchantId: kakLong.id,
              name: 'Spice Level',
              type: ModifierGroupType.SINGLE_SELECT,
              required: true,
              sortOrder: 1,
              modifiers: {
                create: [
                  {
                    name: 'Mild',
                    priceAdjustment: 0,
                    priceType: PriceAdjustmentType.FIXED,
                    sortOrder: 1
                  },
                  {
                    name: 'Medium (Recommended)',
                    priceAdjustment: 0,
                    priceType: PriceAdjustmentType.FIXED,
                    isDefault: true,
                    sortOrder: 2
                  },
                  {
                    name: 'Spicy',
                    priceAdjustment: 0,
                    priceType: PriceAdjustmentType.FIXED,
                    sortOrder: 3
                  },
                  {
                    name: 'Kak Long Fire 🔥',
                    description: 'Challenge accepted!',
                    priceAdjustment: 1.50,
                    priceType: PriceAdjustmentType.FIXED,
                    sortOrder: 4
                  }
                ]
              }
            },
            {
              merchantId: kakLong.id,
              name: 'Patty Options',
              type: ModifierGroupType.SINGLE_SELECT,
              required: true,
              sortOrder: 2,
              modifiers: {
                create: [
                  {
                    name: 'Single Patty',
                    priceAdjustment: 0,
                    priceType: PriceAdjustmentType.FIXED,
                    isDefault: true,
                    sortOrder: 1
                  },
                  {
                    name: 'Double Patty',
                    priceAdjustment: 8.00,
                    priceType: PriceAdjustmentType.FIXED,
                    sortOrder: 2
                  },
                  {
                    name: 'Impossible Patty (Plant-based)',
                    priceAdjustment: 4.00,
                    priceType: PriceAdjustmentType.FIXED,
                    sortOrder: 3
                  }
                ]
              }
            },
            {
              merchantId: kakLong.id,
              name: 'Add-ons',
              type: ModifierGroupType.MULTI_SELECT,
              required: false,
              sortOrder: 3,
              modifiers: {
                create: [
                  {
                    name: 'Extra Cheese',
                    priceAdjustment: 2.50,
                    priceType: PriceAdjustmentType.FIXED,
                    sortOrder: 1
                  },
                  {
                    name: 'Fried Egg',
                    priceAdjustment: 2.00,
                    priceType: PriceAdjustmentType.FIXED,
                    sortOrder: 2
                  },
                  {
                    name: 'Turkey Bacon',
                    priceAdjustment: 4.00,
                    priceType: PriceAdjustmentType.FIXED,
                    sortOrder: 3
                  },
                  {
                    name: 'Caramelized Onions',
                    priceAdjustment: 1.50,
                    priceType: PriceAdjustmentType.FIXED,
                    sortOrder: 4
                  }
                ]
              }
            },
            {
              merchantId: kakLong.id,
              name: 'Sides',
              type: ModifierGroupType.SINGLE_SELECT,
              required: false,
              sortOrder: 4,
              modifiers: {
                create: [
                  {
                    name: 'No Sides',
                    priceAdjustment: -3.00,
                    priceType: PriceAdjustmentType.FIXED,
                    sortOrder: 1
                  },
                  {
                    name: 'Regular Fries',
                    priceAdjustment: 0,
                    priceType: PriceAdjustmentType.FIXED,
                    isDefault: true,
                    sortOrder: 2
                  },
                  {
                    name: 'Sweet Potato Fries',
                    priceAdjustment: 2.00,
                    priceType: PriceAdjustmentType.FIXED,
                    sortOrder: 3
                  },
                  {
                    name: 'Asian Slaw',
                    priceAdjustment: 1.50,
                    priceType: PriceAdjustmentType.FIXED,
                    sortOrder: 4
                  }
                ]
              }
            }
          ]
        }
      }
    })
    console.log(`  ✓ Created: ${rendangBurger.name} (no variants, 15 modifiers)`)

    // Product 2: Laksa Carbonara
    const laksaCarbonara = await prisma.product.create({
      data: {
        merchantId: kakLong.id,
        categoryId: pastaCategory.id,
        sku: 'KLF-PS-002',
        name: 'Laksa Carbonara',
        slug: 'laksa-carbonara',
        description: 'Creamy carbonara infused with laksa spices, prawns, and cockles',
        images: ['https://via.placeholder.com/400x400/FF6347/FFFFFF?text=Laksa+Pasta'],
        price: 16.90,
        status: ProductStatus.ACTIVE,
        featured: true,
        allergens: ['shellfish', 'dairy', 'eggs', 'gluten'],
        dietaryInfo: ['halal'],
        spiceLevel: 2,
        preparationTime: 20,
        tags: ['bestseller', 'fusion', 'creamy'],
        variants: {
          create: [
            {
              sku: 'KLF-PS-002-REG',
              name: 'Regular Portion',
              options: { size: 'regular' },
              priceAdjustment: 0,
              inventory: 0,
              isDefault: true,
              sortOrder: 1
            },
            {
              sku: 'KLF-PS-002-LRG',
              name: 'Large Portion',
              options: { size: 'large' },
              priceAdjustment: 5.00,
              inventory: 0,
              isDefault: false,
              sortOrder: 2
            }
          ]
        },
        modifierGroups: {
          create: [
            {
              merchantId: kakLong.id,
              name: 'Pasta Type',
              type: ModifierGroupType.SINGLE_SELECT,
              required: true,
              sortOrder: 1,
              modifiers: {
                create: [
                  {
                    name: 'Spaghetti',
                    priceAdjustment: 0,
                    priceType: PriceAdjustmentType.FIXED,
                    isDefault: true,
                    sortOrder: 1
                  },
                  {
                    name: 'Fettuccine',
                    priceAdjustment: 1.00,
                    priceType: PriceAdjustmentType.FIXED,
                    sortOrder: 2
                  },
                  {
                    name: 'Penne',
                    priceAdjustment: 0,
                    priceType: PriceAdjustmentType.FIXED,
                    sortOrder: 3
                  },
                  {
                    name: 'Shirataki Noodles (Low Carb)',
                    priceAdjustment: 3.00,
                    priceType: PriceAdjustmentType.FIXED,
                    sortOrder: 4
                  }
                ]
              }
            },
            {
              merchantId: kakLong.id,
              name: 'Extra Proteins',
              type: ModifierGroupType.MULTI_SELECT,
              required: false,
              sortOrder: 2,
              modifiers: {
                create: [
                  {
                    name: 'Extra Prawns',
                    priceAdjustment: 6.00,
                    priceType: PriceAdjustmentType.FIXED,
                    sortOrder: 1
                  },
                  {
                    name: 'Grilled Chicken',
                    priceAdjustment: 5.00,
                    priceType: PriceAdjustmentType.FIXED,
                    sortOrder: 2
                  },
                  {
                    name: 'Fish Cake Slices',
                    priceAdjustment: 3.00,
                    priceType: PriceAdjustmentType.FIXED,
                    sortOrder: 3
                  }
                ]
              }
            }
          ]
        }
      }
    })
    console.log(`  ✓ Created: ${laksaCarbonara.name} (2 variants, 7 modifiers)`)

    // Product 3: Nasi Lemak Risotto
    const nasiLemakRisotto = await prisma.product.create({
      data: {
        merchantId: kakLong.id,
        categoryId: risoCategory.id,
        sku: 'KLF-RC-003',
        name: 'Nasi Lemak Risotto',
        slug: 'nasi-lemak-risotto',
        description: 'Creamy coconut risotto with sambal, ikan bilis, peanuts, and soft-boiled egg',
        images: ['https://via.placeholder.com/400x400/228B22/FFFFFF?text=NL+Risotto'],
        price: 15.90,
        status: ProductStatus.ACTIVE,
        allergens: ['nuts', 'eggs', 'fish'],
        dietaryInfo: ['halal'],
        spiceLevel: 2,
        preparationTime: 25,
        tags: ['innovative', 'local-fusion'],
        modifierGroups: {
          create: [
            {
              merchantId: kakLong.id,
              name: 'Protein Choice',
              type: ModifierGroupType.SINGLE_SELECT,
              required: true,
              sortOrder: 1,
              modifiers: {
                create: [
                  {
                    name: 'Ayam Berempah',
                    priceAdjustment: 0,
                    priceType: PriceAdjustmentType.FIXED,
                    isDefault: true,
                    sortOrder: 1
                  },
                  {
                    name: 'Beef Rendang',
                    priceAdjustment: 3.00,
                    priceType: PriceAdjustmentType.FIXED,
                    sortOrder: 2
                  },
                  {
                    name: 'Sambal Prawns',
                    priceAdjustment: 4.00,
                    priceType: PriceAdjustmentType.FIXED,
                    sortOrder: 3
                  },
                  {
                    name: 'Vegetarian (Tempeh)',
                    priceAdjustment: -2.00,
                    priceType: PriceAdjustmentType.FIXED,
                    sortOrder: 4
                  }
                ]
              }
            },
            {
              merchantId: kakLong.id,
              name: 'Sambal Level',
              type: ModifierGroupType.SINGLE_SELECT,
              required: false,
              sortOrder: 2,
              modifiers: {
                create: [
                  {
                    name: 'Regular Sambal',
                    priceAdjustment: 0,
                    priceType: PriceAdjustmentType.FIXED,
                    isDefault: true,
                    sortOrder: 1
                  },
                  {
                    name: 'Extra Sambal',
                    priceAdjustment: 1.00,
                    priceType: PriceAdjustmentType.FIXED,
                    sortOrder: 2
                  },
                  {
                    name: 'No Sambal',
                    priceAdjustment: 0,
                    priceType: PriceAdjustmentType.FIXED,
                    sortOrder: 3
                  }
                ]
              }
            }
          ]
        }
      }
    })
    console.log(`  ✓ Created: ${nasiLemakRisotto.name} (no variants, 7 modifiers)`)
  }

  // ====================================
  // MERCHANT 3: PRIYA'S SWEET CORNER
  // ====================================
  const priya = merchants.find(m => m.email === 'priya.sweets@kitchencloud.sg')
  if (priya) {
    console.log(`\n🍬 Setting up ${priya.businessName}...`)

    // Create categories
    const sweetsCategory = await prisma.category.create({
      data: {
        merchantId: priya.id,
        name: 'Traditional Sweets',
        slug: 'traditional-sweets',
        description: 'Authentic Indian mithai',
        sortOrder: 1,
        isActive: true
      }
    })

    const savoryCategory = await prisma.category.create({
      data: {
        merchantId: priya.id,
        name: 'Savory Snacks',
        slug: 'savory-snacks',
        description: 'Crispy and spicy treats',
        sortOrder: 2,
        isActive: true
      }
    })

    const combosCategory = await prisma.category.create({
      data: {
        merchantId: priya.id,
        name: 'Gift Sets',
        slug: 'gift-sets',
        description: 'Perfect for celebrations',
        sortOrder: 3,
        isActive: true
      }
    })

    // Product 1: Assorted Ladoo Box
    const ladooBox = await prisma.product.create({
      data: {
        merchantId: priya.id,
        categoryId: sweetsCategory.id,
        sku: 'PSC-SW-001',
        name: 'Assorted Ladoo Box',
        slug: 'assorted-ladoo-box',
        description: 'Handcrafted ladoos made with pure ghee and premium ingredients',
        images: ['https://via.placeholder.com/400x400/FFA500/FFFFFF?text=Ladoo+Box'],
        price: 22.00,
        status: ProductStatus.ACTIVE,
        featured: true,
        allergens: ['nuts', 'dairy'],
        dietaryInfo: ['vegetarian'],
        servingSize: '500g',
        preparationTime: 90,
        requirePreorder: true,
        preorderDays: 1,
        shelfLife: '7 days',
        storageInstructions: 'Store in airtight container',
        tags: ['bestseller', 'festive'],
        variants: {
          create: [
            {
              sku: 'PSC-SW-001-250',
              name: '250g Box',
              options: { weight: '250g', pieces: '6' },
              priceAdjustment: -10.00,
              inventory: 20,
              isDefault: false,
              sortOrder: 1
            },
            {
              sku: 'PSC-SW-001-500',
              name: '500g Box',
              options: { weight: '500g', pieces: '12' },
              priceAdjustment: 0,
              inventory: 15,
              isDefault: true,
              sortOrder: 2
            },
            {
              sku: 'PSC-SW-001-1KG',
              name: '1kg Box',
              options: { weight: '1kg', pieces: '25' },
              priceAdjustment: 20.00,
              inventory: 10,
              isDefault: false,
              sortOrder: 3
            }
          ]
        },
        modifierGroups: {
          create: [
            {
              merchantId: priya.id,
              name: 'Ladoo Selection',
              type: ModifierGroupType.MULTI_SELECT,
              required: true,
              minSelect: 2,
              maxSelect: 4,
              sortOrder: 1,
              modifiers: {
                create: [
                  {
                    name: 'Besan Ladoo',
                    description: 'Classic chickpea flour ladoo',
                    priceAdjustment: 0,
                    priceType: PriceAdjustmentType.FIXED,
                    isDefault: true,
                    sortOrder: 1
                  },
                  {
                    name: 'Motichoor Ladoo',
                    description: 'Tiny pearl-like drops',
                    priceAdjustment: 2.00,
                    priceType: PriceAdjustmentType.FIXED,
                    sortOrder: 2
                  },
                  {
                    name: 'Coconut Ladoo',
                    description: 'Fresh coconut and condensed milk',
                    priceAdjustment: 0,
                    priceType: PriceAdjustmentType.FIXED,
                    isDefault: true,
                    sortOrder: 3
                  },
                  {
                    name: 'Rava Ladoo',
                    description: 'Semolina and cardamom',
                    priceAdjustment: 0,
                    priceType: PriceAdjustmentType.FIXED,
                    sortOrder: 4
                  },
                  {
                    name: 'Dry Fruit Ladoo',
                    description: 'Premium nuts and dates',
                    priceAdjustment: 5.00,
                    priceType: PriceAdjustmentType.FIXED,
                    sortOrder: 5
                  }
                ]
              }
            },
            {
              merchantId: priya.id,
              name: 'Packaging',
              type: ModifierGroupType.SINGLE_SELECT,
              required: false,
              sortOrder: 2,
              modifiers: {
                create: [
                  {
                    name: 'Regular Box',
                    priceAdjustment: 0,
                    priceType: PriceAdjustmentType.FIXED,
                    isDefault: true,
                    sortOrder: 1
                  },
                  {
                    name: 'Premium Gift Box',
                    description: 'With greeting card',
                    priceAdjustment: 8.00,
                    priceType: PriceAdjustmentType.FIXED,
                    sortOrder: 2
                  }
                ]
              }
            }
          ]
        }
      }
    })
    console.log(`  ✓ Created: ${ladooBox.name} (3 variants, 7 modifiers)`)

    // Product 2: Samosa Platter
    const samosaPlatter = await prisma.product.create({
      data: {
        merchantId: priya.id,
        categoryId: savoryCategory.id,
        sku: 'PSC-SV-002',
        name: 'Mini Samosa Platter',
        slug: 'mini-samosa-platter',
        description: 'Crispy triangular pastries with spiced fillings',
        images: ['https://via.placeholder.com/400x400/8B4513/FFFFFF?text=Samosas'],
        price: 15.00,
        status: ProductStatus.ACTIVE,
        allergens: ['gluten'],
        dietaryInfo: ['vegetarian'],
        spiceLevel: 2,
        preparationTime: 45,
        tags: ['party-favorite', 'crispy'],
        variants: {
          create: [
            {
              sku: 'PSC-SV-002-12',
              name: '12 Pieces',
              options: { quantity: '12' },
              priceAdjustment: 0,
              inventory: 0,
              isDefault: true,
              sortOrder: 1
            },
            {
              sku: 'PSC-SV-002-24',
              name: '24 Pieces',
              options: { quantity: '24' },
              priceAdjustment: 12.00,
              inventory: 0,
              isDefault: false,
              sortOrder: 2
            }
          ]
        },
        modifierGroups: {
          create: [
            {
              merchantId: priya.id,
              name: 'Filling Type',
              type: ModifierGroupType.MULTI_SELECT,
              required: true,
              minSelect: 1,
              maxSelect: 3,
              sortOrder: 1,
              modifiers: {
                create: [
                  {
                    name: 'Classic Potato',
                    priceAdjustment: 0,
                    priceType: PriceAdjustmentType.FIXED,
                    isDefault: true,
                    sortOrder: 1
                  },
                  {
                    name: 'Paneer & Spinach',
                    priceAdjustment: 2.00,
                    priceType: PriceAdjustmentType.FIXED,
                    sortOrder: 2
                  },
                  {
                    name: 'Mixed Vegetable',
                    priceAdjustment: 0,
                    priceType: PriceAdjustmentType.FIXED,
                    sortOrder: 3
                  },
                  {
                    name: 'Cheese & Corn',
                    priceAdjustment: 3.00,
                    priceType: PriceAdjustmentType.FIXED,
                    sortOrder: 4
                  }
                ]
              }
            },
            {
              merchantId: priya.id,
              name: 'Chutneys',
              type: ModifierGroupType.MULTI_SELECT,
              required: false,
              maxSelect: 3,
              sortOrder: 2,
              modifiers: {
                create: [
                  {
                    name: 'Mint Chutney',
                    priceAdjustment: 1.50,
                    priceType: PriceAdjustmentType.FIXED,
                    sortOrder: 1
                  },
                  {
                    name: 'Tamarind Chutney',
                    priceAdjustment: 1.50,
                    priceType: PriceAdjustmentType.FIXED,
                    sortOrder: 2
                  },
                  {
                    name: 'Spicy Tomato Chutney',
                    priceAdjustment: 1.50,
                    priceType: PriceAdjustmentType.FIXED,
                    sortOrder: 3
                  }
                ]
              }
            }
          ]
        }
      }
    })
    console.log(`  ✓ Created: ${samosaPlatter.name} (2 variants, 7 modifiers)`)

    // Product 3: Festival Gift Hamper
    const giftHamper = await prisma.product.create({
      data: {
        merchantId: priya.id,
        categoryId: combosCategory.id,
        sku: 'PSC-GF-003',
        name: 'Festival Gift Hamper',
        slug: 'festival-gift-hamper',
        description: 'Curated selection of sweets and savories for special occasions',
        images: ['https://via.placeholder.com/400x400/9370DB/FFFFFF?text=Gift+Hamper'],
        price: 58.00,
        status: ProductStatus.ACTIVE,
        allergens: ['nuts', 'dairy', 'gluten'],
        dietaryInfo: ['vegetarian'],
        preparationTime: 180,
        requirePreorder: true,
        preorderDays: 2,
        tags: ['premium', 'gifting'],
        modifierGroups: {
          create: [
            {
              merchantId: priya.id,
              name: 'Hamper Size',
              type: ModifierGroupType.SINGLE_SELECT,
              required: true,
              sortOrder: 1,
              modifiers: {
                create: [
                  {
                    name: 'Small (5 items)',
                    priceAdjustment: -20.00,
                    priceType: PriceAdjustmentType.FIXED,
                    sortOrder: 1
                  },
                  {
                    name: 'Medium (8 items)',
                    priceAdjustment: 0,
                    priceType: PriceAdjustmentType.FIXED,
                    isDefault: true,
                    sortOrder: 2
                  },
                  {
                    name: 'Large (12 items)',
                    priceAdjustment: 30.00,
                    priceType: PriceAdjustmentType.FIXED,
                    sortOrder: 3
                  }
                ]
              }
            },
            {
              merchantId: priya.id,
              name: 'Occasion Theme',
              type: ModifierGroupType.SINGLE_SELECT,
              required: false,
              sortOrder: 2,
              modifiers: {
                create: [
                  {
                    name: 'Standard Packaging',
                    priceAdjustment: 0,
                    priceType: PriceAdjustmentType.FIXED,
                    isDefault: true,
                    sortOrder: 1
                  },
                  {
                    name: 'Diwali Special',
                    description: 'With diyas and decorations',
                    priceAdjustment: 12.00,
                    priceType: PriceAdjustmentType.FIXED,
                    sortOrder: 2
                  },
                  {
                    name: 'Wedding Theme',
                    description: 'Elegant gold packaging',
                    priceAdjustment: 15.00,
                    priceType: PriceAdjustmentType.FIXED,
                    sortOrder: 3
                  },
                  {
                    name: 'Corporate Branding',
                    description: 'Custom logo printing',
                    priceAdjustment: 20.00,
                    priceType: PriceAdjustmentType.FIXED,
                    sortOrder: 4
                  }
                ]
              }
            },
            {
              merchantId: priya.id,
              name: 'Add-on Items',
              type: ModifierGroupType.MULTI_SELECT,
              required: false,
              sortOrder: 3,
              modifiers: {
                create: [
                  {
                    name: 'Dry Fruit Box (200g)',
                    priceAdjustment: 18.00,
                    priceType: PriceAdjustmentType.FIXED,
                    sortOrder: 1
                  },
                  {
                    name: 'Personalized Card',
                    priceAdjustment: 5.00,
                    priceType: PriceAdjustmentType.FIXED,
                    sortOrder: 2
                  },
                  {
                    name: 'Silver Coin (10g)',
                    priceAdjustment: 65.00,
                    priceType: PriceAdjustmentType.FIXED,
                    sortOrder: 3
                  }
                ]
              }
            }
          ]
        }
      }
    })
    console.log(`  ✓ Created: ${giftHamper.name} (no variants, 10 modifiers)`)
  }

  // ====================================
  // SUMMARY
  // ====================================
  const productCount = await prisma.product.count()
  const variantCount = await prisma.productVariant.count()
  const modifierGroupCount = await prisma.productModifierGroup.count()
  const modifierCount = await prisma.productModifier.count()

  console.log('\n' + '='.repeat(60))
  console.log('🎉 Products, variants & modifiers seeded successfully!')
  console.log('='.repeat(60))
  console.log(`📊 Summary:`)
  console.log(`   - Total products created: ${productCount}`)
  console.log(`   - Total variants created: ${variantCount}`)
  console.log(`   - Total modifier groups: ${modifierGroupCount}`)
  console.log(`   - Total modifiers: ${modifierCount}`)
  
  console.log('\n📝 Features Demonstrated:')
  console.log('   ✓ Product variants (size, portion, weight)')
  console.log('   ✓ Single-select modifiers (required choices)')
  console.log('   ✓ Multi-select modifiers (optional add-ons)')
  console.log('   ✓ Price adjustments (both positive and negative)')
  console.log('   ✓ Merchant-wide modifier groups')
  console.log('   ✓ Minimum/maximum selection rules')
  console.log('   ✓ Default selections')
  console.log('   ✓ Inventory tracking per variant')
  console.log('   ✓ Pre-order requirements')
  console.log('   ✓ Different dietary requirements (Halal, Vegetarian)')
  
  console.log('\n🔗 Test URLs:')
  console.log('   Mdm Wong\'s: http://localhost:3000/merchant/mdm-wongs-kitchen')
  console.log('   Kak Long\'s: http://localhost:3000/merchant/kak-longs-fusion')
  console.log('   Priya\'s:    http://localhost:3000/merchant/priyas-sweet-corner')
  
  console.log('\n💡 Testing Scenarios:')
  console.log('   - Products with variants only (e.g., Laksa Carbonara)')
  console.log('   - Products with modifiers only (e.g., Rendang Burger)')
  console.log('   - Products with both (e.g., Har Gow, Ladoo Box)')
  console.log('   - Required vs optional modifier groups')
  console.log('   - Multi-select with min/max limits')
  console.log('   - Merchant-wide modifiers (packaging, dietary)')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })