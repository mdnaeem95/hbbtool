import { MeasurementUnit, RecipeCategory } from "../trpc/routers/recipe"

export { RecipeCategory, MeasurementUnit } from "../trpc/routers/recipe"
export { IngredientCategory } from "../types"

// You can also add derived types here
export type RecipeCategoryType = `${RecipeCategory}`
export type MeasurementUnitType = `${MeasurementUnit}`

export type CostConfidence = "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN"