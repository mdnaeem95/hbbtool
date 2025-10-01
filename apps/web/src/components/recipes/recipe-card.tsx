import { useState } from "react"
import { Calculator, Edit2, Trash2, Link2, Clock } from "lucide-react"
import { UIRecipeListItem } from "./recipes-list"

// helper: robustly coerce Decimal | string | number | null | undefined -> number
export const n = (v: unknown): number => {
  if (typeof v === "number") return v
  if (v && typeof v === "object" && "toNumber" in (v as any)) {
    return (v as any).toNumber()
  }
  // handles string, null, undefined
  const parsed = Number(v)
  return Number.isFinite(parsed) ? parsed : 0
}

interface RecipeCardProps {
  recipe: UIRecipeListItem
  onEdit: (id: string) => void
  onViewPricing: (id: string) => void
  onRefetch: () => void
}

export function RecipeCard({ recipe, onEdit, onViewPricing, onRefetch }: RecipeCardProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const linkedProduct = recipe.products[0]
  const profit = linkedProduct ? n(linkedProduct?.price) - n(recipe?.totalCost) : 0
  const margin = linkedProduct ? ((profit / n(linkedProduct?.price)) * 100) : 0

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-lg font-semibold text-gray-900">{recipe.name}</h3>
            {recipe.costConfidence === "HIGH" && (
              <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded">
                Verified Cost
              </span>
            )}
            {recipe.costConfidence === "MEDIUM" && (
              <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-700 rounded">
                Est. Cost
              </span>
            )}
          </div>

          {recipe.description && (
            <p className="mt-1 text-sm text-gray-600 line-clamp-2">{recipe.description}</p>
          )}

          <div className="mt-3 grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500">Yield</p>
              <p className="text-sm font-medium text-gray-900">
                {Number(recipe.baseYield)} {recipe.yieldUnit}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Time</p>
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-gray-400" />
                <p className="text-sm font-medium text-gray-900">{recipe.totalTime} min</p>
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-500">Cost/Unit</p>
              <p className="text-sm font-medium text-green-600">
                ${recipe.costPerUnit?.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Total Cost</p>
              <p className="text-sm font-medium text-gray-900">
                ${recipe.totalCost?.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Linked Product */}
          {linkedProduct && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <Link2 className="w-4 h-4 text-blue-600" />
                <p className="text-xs font-medium text-blue-900">Linked Product</p>
              </div>
              <p className="text-sm text-gray-900 font-medium">{linkedProduct.name}</p>
              <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                <div>
                  <p className="text-gray-600">Price</p>
                  <p className="font-semibold text-gray-900">
                    ${n(linkedProduct?.price).toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Profit</p>
                  <p className="font-semibold text-green-600">${profit.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-gray-600">Margin</p>
                  <p className="font-semibold text-blue-600">{margin.toFixed(0)}%</p>
                </div>
              </div>
            </div>
          )}

          {/* Ingredients Preview */}
          <div className="mt-4">
            <p className="text-xs text-gray-500 mb-2">Key Ingredients</p>
            <div className="flex flex-wrap gap-1">
              {recipe.ingredients.slice(0, 3).map((ing) => {
                const name = ing.ingredient?.name || ing.customIngredient?.name || "Unknown"
                return (
                  <span key={ing.id} className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                    {name}
                  </span>
                )
              })}
              {recipe.ingredients.length > 3 && (
                <span className="px-2 py-1 text-xs bg-gray-100 text-gray-500 rounded">
                  +{recipe.ingredients.length - 3} more
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 ml-4">
          <button
            onClick={() => onViewPricing(recipe.id)}
            className="p-2 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
            title="View pricing"
          >
            <Calculator className="w-4 h-4" />
          </button>
          <button
            onClick={() => onEdit(recipe.id)}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="Edit recipe"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Delete recipe"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {showDeleteConfirm && (
        <DeleteConfirmDialog
          recipeName={recipe.name}
          onConfirm={() => {
            // Handle delete - will implement in next component
            setShowDeleteConfirm(false)
            onRefetch()
          }}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </div>
  )
}

interface DeleteConfirmDialogProps {
  recipeName: string
  onConfirm: () => void
  onCancel: () => void
}

function DeleteConfirmDialog({ recipeName, onConfirm, onCancel }: DeleteConfirmDialogProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Recipe</h3>
        <p className="text-gray-700 mb-6">
          Are you sure you want to delete <strong>{recipeName}</strong>? This action cannot be undone.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}