import { useState } from "react"
import { Edit2, Trash2, AlertCircle } from "lucide-react"
import { api } from "../../lib/trpc/client"
import type { RouterOutputs } from "../../lib/trpc/types"
import { DeleteConfirmDialog } from "./delete-confirm-dialog"

// Use the same type as your list component
type Ingredient = RouterOutputs["ingredients"]["getMerchantInventory"]["ingredients"][number]

interface IngredientCardProps {
  ingredient: Ingredient
  onEdit: (id: string) => void
  onRefetch: () => void
}

export function IngredientCard({ ingredient, onEdit, onRefetch }: IngredientCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  
  const deleteCustomMutation = api.ingredients.deleteCustom.useMutation({
    onSuccess: () => {
      onRefetch()
      setShowDeleteDialog(false)
    },
  })

  const isLowStock = ingredient.currentStock <= (ingredient.reorderPoint || 0)
  const stockPercentage = ingredient.reorderPoint
    ? (ingredient.currentStock / (ingredient.reorderPoint * 2)) * 100
    : 100

  const handleDelete = () => {
    if (ingredient.isCustom) {
      deleteCustomMutation.mutate({ id: ingredient.id })
    }
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg font-medium text-gray-900">{ingredient.name}</h3>
              {ingredient.isCustom && (
                <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-700 rounded">
                  Custom
                </span>
              )}
              {isLowStock && (
                <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded">
                  Low Stock
                </span>
              )}
            </div>

            <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-gray-500">Category</p>
                <p className="text-sm font-medium text-gray-900">
                  {ingredient.category.replace(/_/g, " ")}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Unit Price</p>
                <p className="text-sm font-medium text-gray-900">
                  ${ingredient.pricePerUnit.toFixed(2)} / {ingredient.purchaseUnit}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Current Stock</p>
                <p className="text-sm font-medium text-gray-900">
                  {ingredient.currentStock} {ingredient.purchaseUnit}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Store</p>
                <p className="text-sm font-medium text-gray-900">
                  {ingredient.preferredStore || "N/A"}
                </p>
              </div>
            </div>

            {/* Stock Progress Bar */}
            <div className="mt-3">
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    isLowStock ? "bg-red-500" : "bg-green-500"
                  }`}
                  style={{ width: `${Math.min(stockPercentage, 100)}%` }}
                />
              </div>
            </div>

            {ingredient.allergens.length > 0 && (
              <div className="mt-3 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-500" />
                <p className="text-xs text-gray-600">
                  Allergens: {ingredient.allergens.join(", ")}
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 ml-4">
            <button
              onClick={() => onEdit(ingredient.id)}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            {ingredient.isCustom && (
              <button
                onClick={() => setShowDeleteDialog(true)}
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                disabled={deleteCustomMutation.isPending}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {showDeleteDialog && (
        <DeleteConfirmDialog
          ingredientName={ingredient.name}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteDialog(false)}
          isLoading={deleteCustomMutation.isPending}
        />
      )}
    </>
  )
}