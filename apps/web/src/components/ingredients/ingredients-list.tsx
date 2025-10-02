import { Package } from "lucide-react"
import { IngredientCard } from "./ingredients-card"
import type { RouterOutputs } from "../../lib/trpc/types"

type Ingredient = RouterOutputs["ingredients"]["getAll"]["ingredients"][number]

interface IngredientsListProps {
  ingredients: Ingredient[]
  isLoading: boolean
  onEdit: (id: string) => void
  onRefetch: () => void
}

export function IngredientsList({
  ingredients,
  isLoading,
  onEdit,
  onRefetch,
}: IngredientsListProps) {
  if (isLoading) {
    return (
      <div className="mt-6 grid grid-cols-1 gap-4">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 animate-pulse"
          >
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-4" />
            <div className="grid grid-cols-4 gap-4">
              <div className="h-4 bg-gray-200 rounded" />
              <div className="h-4 bg-gray-200 rounded" />
              <div className="h-4 bg-gray-200 rounded" />
              <div className="h-4 bg-gray-200 rounded" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (ingredients.length === 0) {
    return (
      <div className="mt-12 text-center">
        <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-gray-900 mb-1">No ingredients found</h3>
        <p className="text-gray-500">Try adjusting your search or filters</p>
      </div>
    )
  }

  return (
    <div className="mt-6 grid grid-cols-1 gap-4">
      {ingredients.map((ingredient) => (
        <IngredientCard
          key={ingredient.id}
          ingredient={ingredient}
          onEdit={onEdit}
          onRefetch={onRefetch}
        />
      ))}
    </div>
  )
}