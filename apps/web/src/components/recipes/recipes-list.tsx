import { ChefHat } from "lucide-react"
import { RecipeCard } from "./recipe-card"
import { CostConfidence, MeasurementUnit } from "@homejiak/types"
import { Decimal } from "@homejiak/database"

interface RecipesListProps {
  recipes: UIRecipeListItem[]
  isLoading: boolean
  onEdit: (id: string) => void
  onViewPricing: (id: string) => void
  onRefetch: () => void
}

export type UIRecipeListItem = {
  id: string
  name: string
  description?: string | null
  costConfidence: CostConfidence | null
  baseYield: Decimal
  yieldUnit: MeasurementUnit
  totalTime: number
  // costs may be absent in list queries
  costPerUnit?: number | null
  totalCost?: number | null
  products: Array<{
    id: string
    name: string
    price: number | string | { toNumber(): number } // tolerate Decimal/strings
  }>
  ingredients: Array<{
    id: string
    ingredient?: { name: string } | null
    customIngredient?: { name: string } | null
  }>
}

export function RecipesList({
  recipes,
  isLoading,
  onEdit,
  onViewPricing,
  onRefetch,
}: RecipesListProps) {
  if (isLoading) {
    return (
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 animate-pulse"
          >
            <div className="h-6 bg-gray-200 rounded w-1/2 mb-4" />
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="h-4 bg-gray-200 rounded" />
              <div className="h-4 bg-gray-200 rounded" />
              <div className="h-4 bg-gray-200 rounded" />
              <div className="h-4 bg-gray-200 rounded" />
            </div>
            <div className="h-20 bg-gray-200 rounded" />
          </div>
        ))}
      </div>
    )
  }

  if (recipes.length === 0) {
    return (
      <div className="mt-12 text-center">
        <ChefHat className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-gray-900 mb-1">No recipes found</h3>
        <p className="text-gray-500">Create your first recipe to get started</p>
      </div>
    )
  }

  return (
    <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
      {recipes.map((recipe) => (
        <RecipeCard
          key={recipe.id}
          recipe={recipe}
          onEdit={onEdit}
          onViewPricing={onViewPricing}
          onRefetch={onRefetch}
        />
      ))}
    </div>
  )
}