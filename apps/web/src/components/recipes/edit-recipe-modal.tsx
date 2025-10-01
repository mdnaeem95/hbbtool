import { api } from "../../lib/trpc/client"
import { n } from "./recipe-card"

interface EditRecipeModalProps {
  recipeId: string
  onClose: () => void
  onSuccess: () => void
}

export function EditRecipeModal({ recipeId, onClose, onSuccess }: EditRecipeModalProps) {
  const { data: recipe, isLoading } = api.recipe.getById.useQuery({
    id: recipeId,
  })

  console.log(onSuccess)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 z-10">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Edit Recipe</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors text-2xl leading-none"
            >
              ×
            </button>
          </div>
        </div>

        <div className="p-6">
          {isLoading ? (
            <div className="space-y-4">
              <div className="h-10 bg-gray-200 rounded animate-pulse" />
              <div className="h-10 bg-gray-200 rounded animate-pulse" />
              <div className="h-10 bg-gray-200 rounded animate-pulse" />
            </div>
          ) : recipe ? (
            <div className="text-center py-8">
              <p className="text-gray-600">
                Recipe editing is coming soon. For now, you can view the recipe details.
              </p>
              <div className="mt-6 space-y-2 text-left">
                <div className="p-4 border border-gray-200 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-2">{recipe.name}</h3>
                  <p className="text-sm text-gray-600">
                    Yield: {n(recipe.baseYield)} {recipe.yieldUnit}
                  </p>
                  <p className="text-sm text-gray-600">
                    Total Time: {recipe.totalTime} minutes
                  </p>
                  <p className="text-sm text-gray-600">
                    Ingredients: {recipe.ingredients.length} items
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="mt-6 px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
              >
                Close
              </button>
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">Recipe not found</p>
          )}
        </div>
      </div>
    </div>
  )
}