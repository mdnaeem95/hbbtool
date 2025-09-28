import { 
  PrismaClient, 
  ProductStatus, 
  ModifierGroupType,
  ModifierScope
} from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Adding products with modifiers to existing merchants...')

  // Get the merchants we created
  const merchants = await prisma.merchant.findMany({
    where: {
      slug: {
        in: ['mdm-wongs-kitchen', 'kak-longs-fusion', 'priyas-sweet-corner']
      }
    }
  })

  if (merchants.length === 0) {
    console.log('❌ No merchants found. Please run seed-merchants.ts first.')
    return
  }

  // Add products to each merchant
  for (const merchant of merchants) {
    console.log(`\n📦 Adding products for ${merchant.businessName}...`)

    if (merchant.slug === 'mdm-wongs-kitchen') {
      await addMdmWongsProducts(merchant.id)
    } else if (merchant.slug === 'kak-longs-fusion') {
      await addKakLongsProducts(merchant.id)
    } else if (merchant.slug === 'priyas-sweet-corner') {
      await addPriyasProducts(merchant.id)
    }
  }

  console.log('\n✅ Products and modifiers added successfully!')
}

async function addMdmWongsProducts(merchantId: string) {
  // Check if categories exist, create if not
  let dimSumCategory = await prisma.category.findFirst({
    where: { merchantId, slug: 'dim-sum' }
  })
  
  if (!dimSumCategory) {
    dimSumCategory = await prisma.category.create({
      data: {
        merchantId,
        name: 'Dim Sum',
        slug: 'dim-sum',
        description: 'Handmade dim sum, steamed to perfection',
        sortOrder: 1,
        isActive: true
      }
    })
  }

  // Add Product 1: Char Siu Bao
  const charSiuBao = await prisma.product.create({
    data: {
      merchantId,
      categoryId: dimSumCategory.id,
      name: 'Char Siu Bao (BBQ Pork Buns)',
      slug: 'char-siu-bao',
      description: 'Fluffy steamed buns filled with honey-glazed BBQ pork. 2 pieces per order.',
      price: 5.80,
      images: ['https://via.placeholder.com/600x400/FFE4B5/8B0000?text=Char+Siu+Bao'],
      status: ProductStatus.ACTIVE,
      featured: true,
      allergens: ['gluten'],
      preparationTime: 15,
      trackInventory: true,
      inventory: 80,
      tags: ['steamed', 'pork', 'buns']
    }
  })

  // Add modifiers for Char Siu Bao
  await prisma.productModifierGroup.create({
    data: {
      merchantId,
      productId: charSiuBao.id,
      name: 'Quantity',
      type: ModifierGroupType.SINGLE_SELECT,
      required: true,
      scope: ModifierScope.PRODUCT,
      sortOrder: 1,
      isActive: true,
      modifiers: {
        create: [
          { name: '2 pieces', sortOrder: 1, isDefault: true, priceAdjustment: 0 },
          { name: '4 pieces', sortOrder: 2, priceAdjustment: 5.00 },
          { name: '6 pieces', sortOrder: 3, priceAdjustment: 9.50 }
        ]
      }
    }
  })

  // Add Product 2: Wonton Soup
  const wontonSoup = await prisma.product.create({
    data: {
      merchantId,
      categoryId: dimSumCategory.id,
      name: 'Prawn Wonton Soup',
      slug: 'wonton-soup',
      description: 'Handmade prawn wontons in clear chicken broth with bok choy',
      price: 9.80,
      images: ['https://via.placeholder.com/600x400/FFFACD/000000?text=Wonton+Soup'],
      status: ProductStatus.ACTIVE,
      allergens: ['shellfish', 'gluten'],
      preparationTime: 10,
      trackInventory: false,
      tags: ['soup', 'wontons', 'prawns']
    }
  })

  // Add modifiers for Wonton Soup
  await prisma.productModifierGroup.create({
    data: {
      merchantId,
      productId: wontonSoup.id,
      name: 'Noodle Options',
      type: ModifierGroupType.SINGLE_SELECT,
      required: false,
      scope: ModifierScope.PRODUCT,
      sortOrder: 1,
      isActive: true,
      modifiers: {
        create: [
          { name: 'No Noodles', sortOrder: 1, isDefault: true, priceAdjustment: 0 },
          { name: 'Add Egg Noodles', sortOrder: 2, priceAdjustment: 2.50 },
          { name: 'Add Rice Noodles', sortOrder: 3, priceAdjustment: 2.50 },
          { name: 'Add Kway Teow', sortOrder: 4, priceAdjustment: 3.00 }
        ]
      }
    }
  })

  await prisma.productModifierGroup.create({
    data: {
      merchantId,
      productId: wontonSoup.id,
      name: 'Extra Toppings',
      type: ModifierGroupType.MULTI_SELECT,
      required: false,
      maxSelect: 3,
      scope: ModifierScope.PRODUCT,
      sortOrder: 2,
      isActive: true,
      modifiers: {
        create: [
          { name: 'Extra Wontons (3 pcs)', sortOrder: 1, priceAdjustment: 4.50 },
          { name: 'Add Fish Ball', sortOrder: 2, priceAdjustment: 3.00 },
          { name: 'Add Mushrooms', sortOrder: 3, priceAdjustment: 2.00 }
        ]
      }
    }
  })

  console.log('✅ Added 2 products with modifiers to Mdm Wong\'s Kitchen')
}

async function addKakLongsProducts(merchantId: string) {
  // Check/create category
  let fusionCategory = await prisma.category.findFirst({
    where: { merchantId, slug: 'fusion-mains' }
  })
  
  if (!fusionCategory) {
    fusionCategory = await prisma.category.create({
      data: {
        merchantId,
        name: 'Fusion Mains',
        slug: 'fusion-mains',
        description: 'Where East meets West',
        sortOrder: 1,
        isActive: true
      }
    })
  }

  // Add Product 1: Nasi Lemak Burger
  const nasiLemakBurger = await prisma.product.create({
    data: {
      merchantId,
      categoryId: fusionCategory.id,
      name: 'Nasi Lemak Burger',
      slug: 'nasi-lemak-burger',
      description: 'Coconut rice patty, sambal mayo, ikan bilis, cucumber, topped with fried egg',
      price: 16.90,
      images: ['https://via.placeholder.com/600x400/228B22/FFFFFF?text=NL+Burger'],
      status: ProductStatus.ACTIVE,
      featured: true,
      allergens: ['gluten', 'egg', 'fish'],
      dietaryInfo: ['halal'],
      spiceLevel: 2,
      preparationTime: 25,
      trackInventory: false,
      tags: ['burger', 'fusion', 'nasi-lemak', 'innovative']
    }
  })

  // Modifiers for Nasi Lemak Burger
  await prisma.productModifierGroup.create({
    data: {
      merchantId,
      productId: nasiLemakBurger.id,
      name: 'Rice Patty Type',
      type: ModifierGroupType.SINGLE_SELECT,
      required: true,
      scope: ModifierScope.PRODUCT,
      sortOrder: 1,
      isActive: true,
      modifiers: {
        create: [
          { name: 'Original Coconut Rice', sortOrder: 1, isDefault: true, priceAdjustment: 0 },
          { name: 'Blue Pea Rice', sortOrder: 2, priceAdjustment: 1.50 },
          { name: 'Turmeric Rice', sortOrder: 3, priceAdjustment: 1.00 }
        ]
      }
    }
  })

  await prisma.productModifierGroup.create({
    data: {
      merchantId,
      productId: nasiLemakBurger.id,
      name: 'Protein Add-Ons',
      type: ModifierGroupType.MULTI_SELECT,
      required: false,
      maxSelect: 3,
      scope: ModifierScope.PRODUCT,
      sortOrder: 2,
      isActive: true,
      modifiers: {
        create: [
          { name: 'Add Rendang Beef', sortOrder: 1, priceAdjustment: 5.50 },
          { name: 'Add Ayam Goreng', sortOrder: 2, priceAdjustment: 4.50 },
          { name: 'Add Otah', sortOrder: 3, priceAdjustment: 3.50 },
          { name: 'Extra Sambal', sortOrder: 4, priceAdjustment: 1.00 }
        ]
      }
    }
  })

  // Add Product 2: Milo Dinosaur Pancakes
  const miloPancakes = await prisma.product.create({
    data: {
      merchantId,
      categoryId: fusionCategory.id,
      name: 'Milo Dinosaur Pancakes',
      slug: 'milo-dinosaur-pancakes',
      description: 'Fluffy pancakes with Milo powder, condensed milk, and Milo ice cream',
      price: 12.90,
      images: ['https://via.placeholder.com/600x400/8B4513/FFFFFF?text=Milo+Pancakes'],
      status: ProductStatus.ACTIVE,
      allergens: ['dairy', 'gluten', 'egg'],
      dietaryInfo: ['halal'],
      preparationTime: 20,
      trackInventory: false,
      tags: ['dessert', 'pancakes', 'milo', 'local-twist']
    }
  })

  // Modifiers for pancakes
  await prisma.productModifierGroup.create({
    data: {
      merchantId,
      productId: miloPancakes.id,
      name: 'Stack Size',
      type: ModifierGroupType.SINGLE_SELECT,
      required: true,
      scope: ModifierScope.PRODUCT,
      sortOrder: 1,
      isActive: true,
      modifiers: {
        create: [
          { name: '2 Pancakes', sortOrder: 1, priceAdjustment: -3.00 },
          { name: '3 Pancakes', sortOrder: 2, isDefault: true, priceAdjustment: 0 },
          { name: '5 Pancakes', sortOrder: 3, priceAdjustment: 4.50 }
        ]
      }
    }
  })

  await prisma.productModifierGroup.create({
    data: {
      merchantId,
      productId: miloPancakes.id,
      name: 'Extra Toppings',
      type: ModifierGroupType.MULTI_SELECT,
      required: false,
      scope: ModifierScope.PRODUCT,
      sortOrder: 2,
      isActive: true,
      modifiers: {
        create: [
          { name: 'Extra Milo Powder', sortOrder: 1, priceAdjustment: 1.50 },
          { name: 'Add Bananas', sortOrder: 2, priceAdjustment: 2.50 },
          { name: 'Add Nutella', sortOrder: 3, priceAdjustment: 3.00 },
          { name: 'Add Whipped Cream', sortOrder: 4, priceAdjustment: 2.00 },
          { name: 'Add Peanut Butter', sortOrder: 5, priceAdjustment: 2.50 }
        ]
      }
    }
  })

  console.log('✅ Added 2 products with modifiers to Kak Long\'s Fusion Kitchen')
}

async function addPriyasProducts(merchantId: string) {
  // Check/create category
  let sweetsCategory = await prisma.category.findFirst({
    where: { merchantId, slug: 'traditional-sweets' }
  })
  
  if (!sweetsCategory) {
    sweetsCategory = await prisma.category.create({
      data: {
        merchantId,
        name: 'Traditional Sweets',
        slug: 'traditional-sweets',
        description: 'Classic Indian mithai',
        sortOrder: 1,
        isActive: true
      }
    })
  }

  // Add Product 1: Rasmalai
  const rasmalai = await prisma.product.create({
    data: {
      merchantId,
      categoryId: sweetsCategory.id,
      name: 'Rasmalai',
      slug: 'rasmalai',
      description: 'Soft cottage cheese dumplings soaked in sweet, cardamom-flavored milk',
      price: 8.00,
      images: ['https://via.placeholder.com/600x400/FFEFD5/8B4513?text=Rasmalai'],
      status: ProductStatus.ACTIVE,
      featured: true,
      allergens: ['dairy', 'nuts'],
      dietaryInfo: ['vegetarian'],
      preparationTime: 180,
      requirePreorder: true,
      preorderDays: 1,
      trackInventory: true,
      inventory: 25,
      tags: ['milk-based', 'traditional', 'dessert']
    }
  })

  // Modifiers for Rasmalai
  await prisma.productModifierGroup.create({
    data: {
      merchantId,
      productId: rasmalai.id,
      name: 'Serving Size',
      type: ModifierGroupType.SINGLE_SELECT,
      required: true,
      scope: ModifierScope.PRODUCT,
      sortOrder: 1,
      isActive: true,
      modifiers: {
        create: [
          { name: '2 pieces', sortOrder: 1, isDefault: true, priceAdjustment: 0 },
          { name: '4 pieces', sortOrder: 2, priceAdjustment: 7.00 },
          { name: '6 pieces (Family Pack)', sortOrder: 3, priceAdjustment: 14.00 }
        ]
      }
    }
  })

  await prisma.productModifierGroup.create({
    data: {
      merchantId,
      productId: rasmalai.id,
      name: 'Garnish Options',
      type: ModifierGroupType.MULTI_SELECT,
      required: false,
      scope: ModifierScope.PRODUCT,
      sortOrder: 2,
      isActive: true,
      modifiers: {
        create: [
          { name: 'Extra Pistachios', sortOrder: 1, priceAdjustment: 2.00 },
          { name: 'Add Almonds', sortOrder: 2, priceAdjustment: 2.00 },
          { name: 'Add Saffron', sortOrder: 3, priceAdjustment: 4.00 },
          { name: 'Rose Petals', sortOrder: 4, priceAdjustment: 1.50 }
        ]
      }
    }
  })

  // Add Product 2: Mysore Pak
  const mysorePak = await prisma.product.create({
    data: {
      merchantId,
      categoryId: sweetsCategory.id,
      name: 'Mysore Pak',
      slug: 'mysore-pak',
      description: 'Melt-in-mouth gram flour fudge with generous amounts of ghee',
      price: 10.00,
      images: ['https://via.placeholder.com/600x400/FFD700/8B4513?text=Mysore+Pak'],
      status: ProductStatus.ACTIVE,
      allergens: ['dairy'],
      dietaryInfo: ['vegetarian'],
      preparationTime: 240,
      requirePreorder: true,
      preorderDays: 2,
      trackInventory: true,
      inventory: 15,
      tags: ['ghee', 'traditional', 'south-indian']
    }
  })

  // Modifiers for Mysore Pak
  await prisma.productModifierGroup.create({
    data: {
      merchantId,
      productId: mysorePak.id,
      name: 'Texture Preference',
      type: ModifierGroupType.SINGLE_SELECT,
      required: true,
      scope: ModifierScope.PRODUCT,
      sortOrder: 1,
      isActive: true,
      modifiers: {
        create: [
          { name: 'Soft (Melts in mouth)', sortOrder: 1, isDefault: true, priceAdjustment: 0 },
          { name: 'Hard (Crispy texture)', sortOrder: 2, priceAdjustment: 0 }
        ]
      }
    }
  })

  await prisma.productModifierGroup.create({
    data: {
      merchantId,
      productId: mysorePak.id,
      name: 'Quantity',
      type: ModifierGroupType.SINGLE_SELECT,
      required: true,
      scope: ModifierScope.PRODUCT,
      sortOrder: 2,
      isActive: true,
      modifiers: {
        create: [
          { name: '250g Box', sortOrder: 1, isDefault: true, priceAdjustment: 0 },
          { name: '500g Box', sortOrder: 2, priceAdjustment: 9.00 },
          { name: '1kg Box', sortOrder: 3, priceAdjustment: 18.00 }
        ]
      }
    }
  })

  console.log('✅ Added 2 products with modifiers to Priya\'s Sweet Corner')
}

main()
  .catch((e) => {
    console.error('❌ Adding products failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })