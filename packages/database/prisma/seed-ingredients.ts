// packages/database/src/seed/ingredients.ts
import { PrismaClient, IngredientCategory, MeasurementUnit } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'

const prisma = new PrismaClient()

/**
 * GLOBAL INGREDIENT LIBRARY - Singapore Edition
 * Prices as of Q4 2024 / Q1 2025
 * 
 * Sources: NTUC FairPrice, Cold Storage, Phoon Huat, RedMart
 * Focused on commonly used ingredients for home-based F&B
 */

interface IngredientSeed {
  name: string
  category: IngredientCategory
  purchaseUnit: MeasurementUnit
  unitSize: number
  referencePrice: number // SGD
  alternativeNames?: string[]
  commonStores?: string[]
  storageLocation?: string
  shelfLifeDays?: number
  openedShelfLifeDays?: number
  allergens?: string[]
  dietaryFlags?: string[]
  conversionNotes?: string
  description?: string
  caloriesPer100g?: number
  proteinPer100g?: number
  carbsPer100g?: number
  fatPer100g?: number
}

const INGREDIENTS: IngredientSeed[] = [
  // ==================== FLOUR & GRAINS (10) ====================
  {
    name: 'All-Purpose Flour',
    category: 'FLOUR_GRAINS',
    purchaseUnit: 'KG',
    unitSize: 1,
    referencePrice: 2.95,
    alternativeNames: ['Plain Flour', 'AP Flour'],
    commonStores: ['NTUC FairPrice', 'Cold Storage', 'Giant', 'Sheng Siong'],
    storageLocation: 'Pantry',
    shelfLifeDays: 365,
    openedShelfLifeDays: 180,
    allergens: ['WHEAT_GLUTEN'],
    conversionNotes: '1 cup ≈ 120g',
    description: 'Standard baking flour',
    caloriesPer100g: 364,
    proteinPer100g: 10.3,
    carbsPer100g: 76.3,
    fatPer100g: 1.0
  },
  {
    name: 'Bread Flour',
    category: 'FLOUR_GRAINS',
    purchaseUnit: 'KG',
    unitSize: 1,
    referencePrice: 3.80,
    alternativeNames: ['Strong Flour', 'High-Protein Flour'],
    commonStores: ['Phoon Huat', 'Bake King', 'NTUC FairPrice'],
    storageLocation: 'Pantry',
    shelfLifeDays: 365,
    allergens: ['WHEAT_GLUTEN'],
    conversionNotes: '1 cup ≈ 130g'
  },
  {
    name: 'Cake Flour',
    category: 'FLOUR_GRAINS',
    purchaseUnit: 'KG',
    unitSize: 1,
    referencePrice: 4.50,
    alternativeNames: ['Soft Flour'],
    commonStores: ['Phoon Huat', 'Bake King'],
    storageLocation: 'Pantry',
    shelfLifeDays: 365,
    allergens: ['WHEAT_GLUTEN'],
    description: 'Fine texture for cakes'
  },
  {
    name: 'Self-Rising Flour',
    category: 'FLOUR_GRAINS',
    purchaseUnit: 'KG',
    unitSize: 1,
    referencePrice: 3.40,
    commonStores: ['NTUC FairPrice', 'Cold Storage'],
    storageLocation: 'Pantry',
    shelfLifeDays: 180,
    allergens: ['WHEAT_GLUTEN'],
    description: 'Contains baking powder'
  },
  {
    name: 'Almond Flour',
    category: 'FLOUR_GRAINS',
    purchaseUnit: 'KG',
    unitSize: 1,
    referencePrice: 32.00,
    alternativeNames: ['Almond Meal'],
    commonStores: ['Cold Storage', 'RedMart', 'Phoon Huat'],
    storageLocation: 'Fridge',
    shelfLifeDays: 180,
    openedShelfLifeDays: 90,
    allergens: ['TREE_NUTS'],
    dietaryFlags: ['Gluten-Free', 'Keto']
  },
  {
    name: 'Rice Flour',
    category: 'FLOUR_GRAINS',
    purchaseUnit: 'KG',
    unitSize: 1,
    referencePrice: 4.20,
    commonStores: ['NTUC FairPrice', 'Sheng Siong', 'Giant'],
    storageLocation: 'Pantry',
    shelfLifeDays: 365,
    dietaryFlags: ['Gluten-Free'],
    description: 'For Asian desserts'
  },
  {
    name: 'Cornstarch',
    category: 'FLOUR_GRAINS',
    purchaseUnit: 'KG',
    unitSize: 1,
    referencePrice: 5.50,
    alternativeNames: ['Corn Flour'],
    commonStores: ['NTUC FairPrice', 'Cold Storage'],
    storageLocation: 'Pantry',
    shelfLifeDays: 730,
    dietaryFlags: ['Gluten-Free'],
    conversionNotes: '1 tbsp ≈ 8g'
  },
  {
    name: 'Oats',
    category: 'FLOUR_GRAINS',
    purchaseUnit: 'KG',
    unitSize: 1,
    referencePrice: 6.80,
    alternativeNames: ['Rolled Oats', 'Quick Oats'],
    commonStores: ['NTUC FairPrice', 'Cold Storage', 'Giant'],
    storageLocation: 'Pantry',
    shelfLifeDays: 365,
    dietaryFlags: ['Whole Grain']
  },
  {
    name: 'Tapioca Flour',
    category: 'FLOUR_GRAINS',
    purchaseUnit: 'KG',
    unitSize: 1,
    referencePrice: 3.80,
    alternativeNames: ['Tapioca Starch'],
    commonStores: ['NTUC FairPrice', 'Sheng Siong'],
    storageLocation: 'Pantry',
    shelfLifeDays: 730,
    dietaryFlags: ['Gluten-Free']
  },
  {
    name: 'Panko Breadcrumbs',
    category: 'FLOUR_GRAINS',
    purchaseUnit: 'KG',
    unitSize: 1,
    referencePrice: 12.00,
    commonStores: ['NTUC FairPrice', 'Don Don Donki'],
    storageLocation: 'Pantry',
    shelfLifeDays: 365,
    allergens: ['WHEAT_GLUTEN']
  },

  // ==================== DAIRY & EGGS (10) ====================
  {
    name: 'Unsalted Butter',
    category: 'DAIRY_EGGS',
    purchaseUnit: 'KG',
    unitSize: 1,
    referencePrice: 13.50,
    alternativeNames: ['Sweet Butter'],
    commonStores: ['NTUC FairPrice', 'Cold Storage', 'Giant'],
    storageLocation: 'Fridge',
    shelfLifeDays: 120,
    openedShelfLifeDays: 30,
    allergens: ['DAIRY'],
    conversionNotes: '1 cup ≈ 227g, 1 tbsp ≈ 14g',
    description: 'SCS, Anchor, or President brands'
  },
  {
    name: 'Salted Butter',
    category: 'DAIRY_EGGS',
    purchaseUnit: 'KG',
    unitSize: 1,
    referencePrice: 13.00,
    commonStores: ['NTUC FairPrice', 'Cold Storage'],
    storageLocation: 'Fridge',
    shelfLifeDays: 120,
    allergens: ['DAIRY']
  },
  {
    name: 'Large Eggs',
    category: 'DAIRY_EGGS',
    purchaseUnit: 'PIECES',
    unitSize: 1,
    referencePrice: 0.42,
    alternativeNames: ['Chicken Eggs'],
    commonStores: ['NTUC FairPrice', 'Cold Storage', 'Sheng Siong', 'Giant'],
    storageLocation: 'Fridge',
    shelfLifeDays: 21,
    allergens: ['EGGS'],
    conversionNotes: '1 large egg ≈ 50g (30g white + 20g yolk)',
    description: 'Chew\'s, Seng Choon, or Farm Fresh'
  },
  {
    name: 'Fresh Milk',
    category: 'DAIRY_EGGS',
    purchaseUnit: 'LITERS',
    unitSize: 1,
    referencePrice: 3.50,
    alternativeNames: ['Whole Milk', 'Full Cream Milk'],
    commonStores: ['NTUC FairPrice', 'Cold Storage', 'Giant'],
    storageLocation: 'Fridge',
    shelfLifeDays: 7,
    openedShelfLifeDays: 3,
    allergens: ['DAIRY'],
    description: 'Meiji, Marigold, or Magnolia brands'
  },
  {
    name: 'Heavy Cream',
    category: 'DAIRY_EGGS',
    purchaseUnit: 'LITERS',
    unitSize: 1,
    referencePrice: 14.00,
    alternativeNames: ['Whipping Cream', 'Thickened Cream'],
    commonStores: ['Cold Storage', 'NTUC FairPrice', 'Phoon Huat'],
    storageLocation: 'Fridge',
    shelfLifeDays: 14,
    openedShelfLifeDays: 3,
    allergens: ['DAIRY'],
    description: 'Elle & Vire or Dairy Farmers'
  },
  {
    name: 'Cream Cheese',
    category: 'DAIRY_EGGS',
    purchaseUnit: 'KG',
    unitSize: 1,
    referencePrice: 22.00,
    alternativeNames: ['Philadelphia Cheese'],
    commonStores: ['NTUC FairPrice', 'Cold Storage'],
    storageLocation: 'Fridge',
    shelfLifeDays: 60,
    openedShelfLifeDays: 14,
    allergens: ['DAIRY']
  },
  {
    name: 'Cheddar Cheese',
    category: 'DAIRY_EGGS',
    purchaseUnit: 'KG',
    unitSize: 1,
    referencePrice: 26.00,
    commonStores: ['NTUC FairPrice', 'Cold Storage'],
    storageLocation: 'Fridge',
    shelfLifeDays: 90,
    openedShelfLifeDays: 21,
    allergens: ['DAIRY']
  },
  {
    name: 'Parmesan Cheese',
    category: 'DAIRY_EGGS',
    purchaseUnit: 'KG',
    unitSize: 1,
    referencePrice: 48.00,
    alternativeNames: ['Parmigiano'],
    commonStores: ['Cold Storage', 'RedMart'],
    storageLocation: 'Fridge',
    shelfLifeDays: 180,
    allergens: ['DAIRY']
  },
  {
    name: 'Greek Yogurt',
    category: 'DAIRY_EGGS',
    purchaseUnit: 'KG',
    unitSize: 1,
    referencePrice: 15.00,
    commonStores: ['Cold Storage', 'NTUC FairPrice'],
    storageLocation: 'Fridge',
    shelfLifeDays: 21,
    openedShelfLifeDays: 7,
    allergens: ['DAIRY']
  },
  {
    name: 'Condensed Milk',
    category: 'DAIRY_EGGS',
    purchaseUnit: 'KG',
    unitSize: 1,
    referencePrice: 8.50,
    alternativeNames: ['Sweetened Condensed Milk'],
    commonStores: ['NTUC FairPrice', 'Sheng Siong', 'Giant'],
    storageLocation: 'Pantry',
    shelfLifeDays: 730,
    openedShelfLifeDays: 7,
    allergens: ['DAIRY'],
    description: 'F&N or Marigold brands'
  },

  // ==================== SWEETENERS (8) ====================
  {
    name: 'White Sugar',
    category: 'SWEETENERS',
    purchaseUnit: 'KG',
    unitSize: 1,
    referencePrice: 2.40,
    alternativeNames: ['Granulated Sugar', 'Caster Sugar'],
    commonStores: ['NTUC FairPrice', 'Cold Storage', 'Giant', 'Sheng Siong'],
    storageLocation: 'Pantry',
    shelfLifeDays: 999,
    conversionNotes: '1 cup ≈ 200g'
  },
  {
    name: 'Brown Sugar',
    category: 'SWEETENERS',
    purchaseUnit: 'KG',
    unitSize: 1,
    referencePrice: 3.80,
    alternativeNames: ['Dark Brown Sugar'],
    commonStores: ['NTUC FairPrice', 'Phoon Huat'],
    storageLocation: 'Pantry',
    shelfLifeDays: 730,
    conversionNotes: '1 cup packed ≈ 220g'
  },
  {
    name: 'Icing Sugar',
    category: 'SWEETENERS',
    purchaseUnit: 'KG',
    unitSize: 1,
    referencePrice: 4.50,
    alternativeNames: ['Powdered Sugar', 'Confectioners Sugar'],
    commonStores: ['Phoon Huat', 'Bake King', 'NTUC FairPrice'],
    storageLocation: 'Pantry',
    shelfLifeDays: 730,
    conversionNotes: '1 cup ≈ 120g'
  },
  {
    name: 'Honey',
    category: 'SWEETENERS',
    purchaseUnit: 'KG',
    unitSize: 1,
    referencePrice: 22.00,
    commonStores: ['Cold Storage', 'NTUC FairPrice'],
    storageLocation: 'Pantry',
    shelfLifeDays: 999,
    conversionNotes: '1 cup ≈ 340g'
  },
  {
    name: 'Maple Syrup',
    category: 'SWEETENERS',
    purchaseUnit: 'ML',
    unitSize: 250,
    referencePrice: 0.050, // $12.50 per 250ml
    commonStores: ['Cold Storage', 'RedMart'],
    storageLocation: 'Fridge',
    shelfLifeDays: 365,
    openedShelfLifeDays: 180
  },
  {
    name: 'Golden Syrup',
    category: 'SWEETENERS',
    purchaseUnit: 'KG',
    unitSize: 1,
    referencePrice: 12.00,
    commonStores: ['NTUC FairPrice', 'Cold Storage'],
    storageLocation: 'Pantry',
    shelfLifeDays: 730,
    description: 'Lyle\'s Golden Syrup'
  },
  {
    name: 'Coconut Sugar',
    category: 'SWEETENERS',
    purchaseUnit: 'KG',
    unitSize: 1,
    referencePrice: 14.00,
    commonStores: ['Cold Storage', 'RedMart'],
    storageLocation: 'Pantry',
    shelfLifeDays: 730,
    dietaryFlags: ['Vegan']
  },
  {
    name: 'Stevia',
    category: 'SWEETENERS',
    purchaseUnit: 'GRAMS',
    unitSize: 100,
    referencePrice: 0.180, // $18 per 100g
    commonStores: ['NTUC FairPrice', 'Cold Storage'],
    storageLocation: 'Pantry',
    shelfLifeDays: 730,
    dietaryFlags: ['Sugar-Free', 'Keto']
  },

  // ==================== FATS & OILS (6) ====================
  {
    name: 'Vegetable Oil',
    category: 'FATS_OILS',
    purchaseUnit: 'LITERS',
    unitSize: 1,
    referencePrice: 5.20,
    alternativeNames: ['Cooking Oil', 'Canola Oil'],
    commonStores: ['NTUC FairPrice', 'Cold Storage', 'Giant', 'Sheng Siong'],
    storageLocation: 'Pantry',
    shelfLifeDays: 365,
    conversionNotes: '1 cup ≈ 220ml'
  },
  {
    name: 'Olive Oil',
    category: 'FATS_OILS',
    purchaseUnit: 'LITERS',
    unitSize: 1,
    referencePrice: 22.00,
    alternativeNames: ['Extra Virgin Olive Oil'],
    commonStores: ['Cold Storage', 'NTUC FairPrice'],
    storageLocation: 'Pantry',
    shelfLifeDays: 365
  },
  {
    name: 'Coconut Oil',
    category: 'FATS_OILS',
    purchaseUnit: 'LITERS',
    unitSize: 1,
    referencePrice: 16.00,
    commonStores: ['NTUC FairPrice', 'Cold Storage'],
    storageLocation: 'Pantry',
    shelfLifeDays: 730,
    dietaryFlags: ['Vegan']
  },
  {
    name: 'Sesame Oil',
    category: 'FATS_OILS',
    purchaseUnit: 'ML',
    unitSize: 250,
    referencePrice: 0.028, // $7 per 250ml
    commonStores: ['NTUC FairPrice', 'Sheng Siong'],
    storageLocation: 'Pantry',
    shelfLifeDays: 730,
    allergens: ['SESAME']
  },
  {
    name: 'Ghee',
    category: 'FATS_OILS',
    purchaseUnit: 'KG',
    unitSize: 1,
    referencePrice: 28.00,
    commonStores: ['Little India shops', 'NTUC FairPrice'],
    storageLocation: 'Pantry',
    shelfLifeDays: 365,
    allergens: ['DAIRY']
  },
  {
    name: 'Peanut Oil',
    category: 'FATS_OILS',
    purchaseUnit: 'LITERS',
    unitSize: 1,
    referencePrice: 8.50,
    commonStores: ['NTUC FairPrice', 'Sheng Siong'],
    storageLocation: 'Pantry',
    shelfLifeDays: 365,
    allergens: ['PEANUTS']
  },

  // ==================== LEAVENING (4) ====================
  {
    name: 'Baking Powder',
    category: 'LEAVENING',
    purchaseUnit: 'GRAMS',
    unitSize: 100,
    referencePrice: 0.040, // $4 per 100g
    alternativeNames: ['Double Acting Baking Powder'],
    commonStores: ['Phoon Huat', 'NTUC FairPrice', 'Bake King'],
    storageLocation: 'Pantry',
    shelfLifeDays: 365,
    openedShelfLifeDays: 180,
    conversionNotes: '1 tsp ≈ 4g'
  },
  {
    name: 'Baking Soda',
    category: 'LEAVENING',
    purchaseUnit: 'GRAMS',
    unitSize: 100,
    referencePrice: 0.025, // $2.50 per 100g
    alternativeNames: ['Sodium Bicarbonate'],
    commonStores: ['NTUC FairPrice', 'Phoon Huat'],
    storageLocation: 'Pantry',
    shelfLifeDays: 999,
    conversionNotes: '1 tsp ≈ 5g'
  },
  {
    name: 'Instant Yeast',
    category: 'LEAVENING',
    purchaseUnit: 'GRAMS',
    unitSize: 100,
    referencePrice: 0.060, // $6 per 100g
    alternativeNames: ['Active Dry Yeast', 'Bread Yeast'],
    commonStores: ['Phoon Huat', 'Bake King'],
    storageLocation: 'Fridge',
    shelfLifeDays: 730,
    openedShelfLifeDays: 180,
    conversionNotes: '1 packet ≈ 7g'
  },
  {
    name: 'Cream of Tartar',
    category: 'LEAVENING',
    purchaseUnit: 'GRAMS',
    unitSize: 100,
    referencePrice: 0.080, // $8 per 100g
    commonStores: ['Phoon Huat', 'Bake King'],
    storageLocation: 'Pantry',
    shelfLifeDays: 999
  },

  // ==================== CHOCOLATE & COCOA (5) ====================
  {
    name: 'Cocoa Powder',
    category: 'CHOCOLATE_COCOA',
    purchaseUnit: 'GRAMS',
    unitSize: 500,
    referencePrice: 0.028, // $14 per 500g
    alternativeNames: ['Unsweetened Cocoa'],
    commonStores: ['Phoon Huat', 'Bake King', 'NTUC FairPrice'],
    storageLocation: 'Pantry',
    shelfLifeDays: 730,
    conversionNotes: '1 cup ≈ 85g',
    description: 'Van Houten or Hershey\'s'
  },
  {
    name: 'Dark Chocolate',
    category: 'CHOCOLATE_COCOA',
    purchaseUnit: 'KG',
    unitSize: 1,
    referencePrice: 38.00,
    alternativeNames: ['Dark Couverture', 'Baking Chocolate'],
    commonStores: ['Phoon Huat', 'Bake King'],
    storageLocation: 'Pantry',
    shelfLifeDays: 365,
    description: 'Callebaut or Valrhona'
  },
  {
    name: 'Milk Chocolate',
    category: 'CHOCOLATE_COCOA',
    purchaseUnit: 'KG',
    unitSize: 1,
    referencePrice: 35.00,
    commonStores: ['Phoon Huat', 'Bake King'],
    storageLocation: 'Pantry',
    shelfLifeDays: 365,
    allergens: ['DAIRY']
  },
  {
    name: 'Chocolate Chips',
    category: 'CHOCOLATE_COCOA',
    purchaseUnit: 'KG',
    unitSize: 1,
    referencePrice: 32.00,
    alternativeNames: ['Semi-Sweet Chocolate Chips'],
    commonStores: ['NTUC FairPrice', 'Phoon Huat'],
    storageLocation: 'Pantry',
    shelfLifeDays: 365,
    description: 'Hershey\'s or Nestlé'
  },
  {
    name: 'Nutella',
    category: 'CHOCOLATE_COCOA',
    purchaseUnit: 'KG',
    unitSize: 1,
    referencePrice: 22.00,
    alternativeNames: ['Chocolate Hazelnut Spread'],
    commonStores: ['NTUC FairPrice', 'Cold Storage'],
    storageLocation: 'Pantry',
    shelfLifeDays: 365,
    allergens: ['TREE_NUTS', 'DAIRY']
  },

  // ==================== NUTS & SEEDS (6) ====================
  {
    name: 'Almonds',
    category: 'NUTS_SEEDS',
    purchaseUnit: 'KG',
    unitSize: 1,
    referencePrice: 28.00,
    alternativeNames: ['Whole Almonds', 'Sliced Almonds'],
    commonStores: ['NTUC FairPrice', 'Cold Storage'],
    storageLocation: 'Pantry',
    shelfLifeDays: 180,
    allergens: ['TREE_NUTS']
  },
  {
    name: 'Walnuts',
    category: 'NUTS_SEEDS',
    purchaseUnit: 'KG',
    unitSize: 1,
    referencePrice: 35.00,
    commonStores: ['Cold Storage', 'NTUC FairPrice'],
    storageLocation: 'Fridge',
    shelfLifeDays: 90,
    allergens: ['TREE_NUTS']
  },
  {
    name: 'Peanuts',
    category: 'NUTS_SEEDS',
    purchaseUnit: 'KG',
    unitSize: 1,
    referencePrice: 14.00,
    alternativeNames: ['Groundnuts'],
    commonStores: ['NTUC FairPrice', 'Sheng Siong'],
    storageLocation: 'Pantry',
    shelfLifeDays: 180,
    allergens: ['PEANUTS']
  },
  {
    name: 'Cashew Nuts',
    category: 'NUTS_SEEDS',
    purchaseUnit: 'KG',
    unitSize: 1,
    referencePrice: 32.00,
    commonStores: ['NTUC FairPrice', 'Cold Storage'],
    storageLocation: 'Pantry',
    shelfLifeDays: 180,
    allergens: ['TREE_NUTS']
  },
  {
    name: 'Chia Seeds',
    category: 'NUTS_SEEDS',
    purchaseUnit: 'GRAMS',
    unitSize: 500,
    referencePrice: 0.020, // $10 per 500g
    commonStores: ['Cold Storage', 'RedMart'],
    storageLocation: 'Pantry',
    shelfLifeDays: 730,
    dietaryFlags: ['Vegan', 'Gluten-Free']
  },
  {
    name: 'Sesame Seeds',
    category: 'NUTS_SEEDS',
    purchaseUnit: 'GRAMS',
    unitSize: 500,
    referencePrice: 0.010, // $5 per 500g
    commonStores: ['NTUC FairPrice', 'Sheng Siong'],
    storageLocation: 'Pantry',
    shelfLifeDays: 365,
    allergens: ['SESAME']
  },

  // ==================== SPICES & HERBS (10) ====================
  {
    name: 'Salt',
    category: 'SPICES_HERBS',
    purchaseUnit: 'KG',
    unitSize: 1,
    referencePrice: 1.80,
    alternativeNames: ['Table Salt', 'Fine Salt'],
    commonStores: ['NTUC FairPrice', 'Cold Storage', 'Giant', 'Sheng Siong'],
    storageLocation: 'Pantry',
    shelfLifeDays: 999,
    conversionNotes: '1 tsp ≈ 6g'
  },
  {
    name: 'Black Pepper',
    category: 'SPICES_HERBS',
    purchaseUnit: 'GRAMS',
    unitSize: 100,
    referencePrice: 0.045, // $4.50 per 100g
    alternativeNames: ['Ground Black Pepper'],
    commonStores: ['NTUC FairPrice', 'Cold Storage'],
    storageLocation: 'Pantry',
    shelfLifeDays: 730
  },
  {
    name: 'Vanilla Extract',
    category: 'SPICES_HERBS',
    purchaseUnit: 'ML',
    unitSize: 100,
    referencePrice: 0.220, // $22 per 100ml
    alternativeNames: ['Pure Vanilla Extract'],
    commonStores: ['Phoon Huat', 'Cold Storage'],
    storageLocation: 'Pantry',
    shelfLifeDays: 1825,
    conversionNotes: '1 tsp ≈ 5ml',
    description: 'Nielsen-Massey or McCormick'
  },
  {
    name: 'Cinnamon Powder',
    category: 'SPICES_HERBS',
    purchaseUnit: 'GRAMS',
    unitSize: 100,
    referencePrice: 0.065, // $6.50 per 100g
    alternativeNames: ['Ground Cinnamon'],
    commonStores: ['NTUC FairPrice', 'Cold Storage'],
    storageLocation: 'Pantry',
    shelfLifeDays: 730
  },
  {
    name: 'Turmeric Powder',
    category: 'SPICES_HERBS',
    purchaseUnit: 'GRAMS',
    unitSize: 100,
    referencePrice: 0.035, // $3.50 per 100g
    commonStores: ['NTUC FairPrice', 'Sheng Siong'],
    storageLocation: 'Pantry',
    shelfLifeDays: 730
  },
  {
    name: 'Chili Powder',
    category: 'SPICES_HERBS',
    purchaseUnit: 'GRAMS',
    unitSize: 100,
    referencePrice: 0.040, // $4 per 100g
    commonStores: ['NTUC FairPrice', 'Sheng Siong'],
    storageLocation: 'Pantry',
    shelfLifeDays: 730
  },
  {
    name: 'Garlic Powder',
    category: 'SPICES_HERBS',
    purchaseUnit: 'GRAMS',
    unitSize: 100,
    referencePrice: 0.055, // $5.50 per 100g
    commonStores: ['NTUC FairPrice', 'Cold Storage'],
    storageLocation: 'Pantry',
    shelfLifeDays: 730
  },
  {
    name: 'Paprika',
    category: 'SPICES_HERBS',
    purchaseUnit: 'GRAMS',
    unitSize: 100,
    referencePrice: 0.060, // $6 per 100g
    commonStores: ['NTUC FairPrice', 'Cold Storage'],
    storageLocation: 'Pantry',
    shelfLifeDays: 730
  },
  {
    name: 'Dried Oregano',
    category: 'SPICES_HERBS',
    purchaseUnit: 'GRAMS',
    unitSize: 100,
    referencePrice: 0.080, // $8 per 100g
    commonStores: ['Cold Storage', 'NTUC FairPrice'],
    storageLocation: 'Pantry',
    shelfLifeDays: 730
  },
  {
    name: 'Dried Basil',
    category: 'SPICES_HERBS',
    purchaseUnit: 'GRAMS',
    unitSize: 100,
    referencePrice: 0.085, // $8.50 per 100g
    commonStores: ['Cold Storage', 'NTUC FairPrice'],
    storageLocation: 'Pantry',
    shelfLifeDays: 730
  },

  // ==================== PACKAGING (5) ====================
  {
    name: 'Cupcake Liners',
    category: 'PACKAGING',
    purchaseUnit: 'PIECES',
    unitSize: 1,
    referencePrice: 0.06, // ~$3 per 50
    commonStores: ['Phoon Huat', 'Bake King', 'Daiso'],
    storageLocation: 'Pantry',
    shelfLifeDays: 999
  },
  {
    name: 'Parchment Paper',
    category: 'PACKAGING',
    purchaseUnit: 'PIECES',
    unitSize: 1,
    referencePrice: 0.20,
    alternativeNames: ['Baking Paper'],
    commonStores: ['NTUC FairPrice', 'Phoon Huat'],
    storageLocation: 'Pantry',
    shelfLifeDays: 999
  },
  {
    name: 'Plastic Food Containers',
    category: 'PACKAGING',
    purchaseUnit: 'PIECES',
    unitSize: 1,
    referencePrice: 0.90,
    commonStores: ['Daiso', 'NTUC FairPrice'],
    storageLocation: 'Pantry',
    shelfLifeDays: 999
  },
  {
    name: 'Ziplock Bags',
    category: 'PACKAGING',
    purchaseUnit: 'PIECES',
    unitSize: 1,
    referencePrice: 0.08, // ~$4 per 50
    commonStores: ['NTUC FairPrice', 'Giant', 'Daiso'],
    storageLocation: 'Pantry',
    shelfLifeDays: 999
  },
  {
    name: 'Food Grade Boxes',
    category: 'PACKAGING',
    purchaseUnit: 'PIECES',
    unitSize: 1,
    referencePrice: 1.20,
    alternativeNames: ['Cake Boxes'],
    commonStores: ['Phoon Huat', 'Bake King'],
    storageLocation: 'Pantry',
    shelfLifeDays: 999
  }
]

async function main() {
  console.log('🌱 Starting global ingredient library seed...')
  console.log(`📦 Total ingredients to seed: ${INGREDIENTS.length}`)
  console.log('🇸🇬 Prices based on Singapore market (Q4 2024 / Q1 2025)')
  console.log('')

  let created = 0
  let skipped = 0
  let failed = 0

  for (const ingredient of INGREDIENTS) {
    try {
      // Check if already exists
      const existing = await prisma.ingredient.findUnique({
        where: { name: ingredient.name }
      })

      if (existing) {
        console.log(`⏭️  ${ingredient.name} - already exists`)
        skipped++
        continue
      }

      // Create ingredient
      await prisma.ingredient.create({
        data: {
          name: ingredient.name,
          category: ingredient.category,
          description: ingredient.description,
          purchaseUnit: ingredient.purchaseUnit,
          unitSize: new Decimal(ingredient.unitSize),
          
          // Reference pricing
          referencePrice: new Decimal(ingredient.referencePrice),
          referencePriceDate: new Date(),
          
          // Metadata
          alternativeNames: ingredient.alternativeNames || [],
          commonStores: ingredient.commonStores || [],
          storageLocation: ingredient.storageLocation,
          shelfLifeDays: ingredient.shelfLifeDays,
          openedShelfLifeDays: ingredient.openedShelfLifeDays,
          allergens: ingredient.allergens || [],
          dietaryFlags: ingredient.dietaryFlags || [],
          conversionNotes: ingredient.conversionNotes,
          
          // Nutrition
          caloriesPer100g: ingredient.caloriesPer100g 
            ? new Decimal(ingredient.caloriesPer100g) 
            : null,
          proteinPer100g: ingredient.proteinPer100g 
            ? new Decimal(ingredient.proteinPer100g) 
            : null,
          carbsPer100g: ingredient.carbsPer100g 
            ? new Decimal(ingredient.carbsPer100g) 
            : null,
          fatPer100g: ingredient.fatPer100g 
            ? new Decimal(ingredient.fatPer100g) 
            : null,
          
          isActive: true
        }
      })

      console.log(`✅ ${ingredient.name} - $${ingredient.referencePrice}/${ingredient.purchaseUnit}`)
      created++
    } catch (error) {
      console.error(`❌ ${ingredient.name} - failed:`, error)
      failed++
    }
  }

  console.log('')
  console.log('='.repeat(60))
  console.log('🎉 Global ingredient library seeded!')
  console.log('='.repeat(60))
  console.log(`✅ Created: ${created}`)
  console.log(`⏭️  Skipped: ${skipped}`)
  console.log(`❌ Failed: ${failed}`)
  console.log('')
  console.log('📊 Breakdown by category:')
  
  const categories = INGREDIENTS.reduce((acc, ing) => {
    acc[ing.category] = (acc[ing.category] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  
  Object.entries(categories).forEach(([cat, count]) => {
    console.log(`   ${cat}: ${count} ingredients`)
  })
  
  console.log('')
  console.log('🏪 Common stores included:')
  console.log('   - NTUC FairPrice')
  console.log('   - Cold Storage')
  console.log('   - Giant')
  console.log('   - Sheng Siong')
  console.log('   - Phoon Huat (baking supplies)')
  console.log('   - Bake King')
  console.log('   - RedMart')
  console.log('   - Daiso')
  console.log('')
  console.log('💡 Next steps:')
  console.log('   1. Merchants can now select from this library')
  console.log('   2. They set their own prices in MerchantIngredientPrice')
  console.log('   3. Reference prices are just starting points')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })