export enum IngredientCategory {
  FLOUR_GRAINS = "FLOUR_GRAINS",
  DAIRY_EGGS = "DAIRY_EGGS",
  SWEETENERS = "SWEETENERS",
  FATS_OILS = "FATS_OILS",
  LEAVENING = "LEAVENING",
  CHOCOLATE_COCOA = "CHOCOLATE_COCOA",
  NUTS_SEEDS = "NUTS_SEEDS",
  FRUITS = "FRUITS",
  VEGETABLES = "VEGETABLES",
  MEAT_SEAFOOD = "MEAT_SEAFOOD",
  SPICES_HERBS = "SPICES_HERBS",
  FLAVORINGS_EXTRACTS = "FLAVORINGS_EXTRACTS",
  BEVERAGES = "BEVERAGES",
  PACKAGING = "PACKAGING",
  SUPPLIES = "SUPPLIES",
  OTHER = "OTHER",
}

export enum MeasurementUnit {
  // Weight
  GRAMS = "GRAMS",
  KG = "KG",
  OUNCES = "OUNCES",
  POUNDS = "POUNDS",

  // Volume
  ML = "ML",
  LITERS = "LITERS",
  TSP = "TSP",
  TBSP = "TBSP",
  CUPS = "CUPS",

  // Count
  PIECES = "PIECES",
  SERVINGS = "SERVINGS",
  BATCHES = "BATCHES",
  DOZEN = "DOZEN",
}

export interface Ingredient {
  id: string
  name: string
  description?: string | null
  category: IngredientCategory
  purchaseUnit: MeasurementUnit
  pricePerUnit: number
  currentStock: number
  reorderPoint?: number | null
  preferredStore?: string
  allergens: string[]
  shelfLifeDays?: number
  isGlobal: boolean
  isCustom: boolean
}