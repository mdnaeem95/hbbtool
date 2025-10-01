import type { AppRouter } from "@homejiak/api"
import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server"

export type RouterInputs = inferRouterInputs<AppRouter>
export type RouterOutputs = inferRouterOutputs<AppRouter>

// Infer types from router outputs
export type Recipe = RouterOutputs["recipe"]["getById"]
export type RecipeListItem = RouterOutputs["recipe"]["getAll"]["recipes"][number]
export type Ingredient = RouterOutputs["ingredients"]["getById"]
export type IngredientListItem = RouterOutputs["ingredients"]["getAll"]["ingredients"][number]

// Re-export enums from API
export { 
  RecipeCategory, 
  MeasurementUnit, 
  IngredientCategory 
} from "@homejiak/api"

// Enum types
export type CostConfidence = "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN"