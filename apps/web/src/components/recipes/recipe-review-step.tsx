import { useState } from "react"
import { Calculator } from "lucide-react"
import { api } from "../../lib/trpc/client"
import type { RecipeFormData } from "./create-recipe-modal"

interface RecipeReviewStepProps {
  formData: RecipeFormData
  onBack: () => void
  onSubmit: () => void
  onCancel: () => void
}

export function RecipeReviewStep({
  formData,
  onBack,
  onSubmit,
  onCancel,
}: RecipeReviewStepProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const createMutation = api.recipe.create.useMutation({
    onSuccess: () => {
      onSubmit()
    },
    onError: (error) => {
      alert(error.message)
      setIsSubmitting(false)
    },
  })

  const handleSubmit = () => {
    setIsSubmitting(true)
    createMutation.mutate({
      name: formData.name,
      description: formData.description,
      category: formData.category,
      productId: formData.productId,
      baseYield: formData.baseYield,
      yieldUnit: formData.yieldUnit,
      prepTime: formData.prepTime,
      cookTime: formData.cookTime,
      coolingTime: formData.coolingTime || 0,
      decorationTime: formData.decorationTime || 0,
      shelfLifeDays: formData.shelfLifeDays,
      storageInstructions: formData.storageInstructions,
      notes: formData.notes,
      ingredients: formData.ingredients,
    })
  }

  const totalTime =
    formData.prepTime +
    formData.cookTime +
    (formData.coolingTime || 0) +
    (formData.decorationTime || 0)

  return (
    <div className="space-y-6">
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-green-100 rounded-lg">
            <Calculator className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h3 className="font-medium text-green-900 mb-1">Cost Will Be Calculated</h3>
            <p className="text-sm text-green-700">
              Your recipe costs will be calculated automatically based on current ingredient
              prices.
            </p>
          </div>
        </div>
      </div>

      <div className="border border-gray-200 rounded-lg p-4">
        <h3 className="font-medium text-gray-900 mb-3">Recipe Summary</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Name:</span>
            <span className="font-medium">{formData.name}</span>
          </div>
          {formData.description && (
            <div className="flex justify-between">
              <span className="text-gray-600">Description:</span>
              <span className="font-medium text-right max-w-xs">
                {formData.description}
              </span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-600">Category:</span>
            <span className="font-medium">{formData.category.replace(/_/g, " ")}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Yield:</span>
            <span className="font-medium">
              {formData.baseYield} {formData.yieldUnit}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Total Time:</span>
            <span className="font-medium">{totalTime} minutes</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Ingredients:</span>
            <span className="font-medium">{formData.ingredients.length} items</span>
          </div>
          {formData.shelfLifeDays && (
            <div className="flex justify-between">
              <span className="text-gray-600">Shelf Life:</span>
              <span className="font-medium">{formData.shelfLifeDays} days</span>
            </div>
          )}
        </div>
      </div>

      <div className="border border-gray-200 rounded-lg p-4">
        <h3 className="font-medium text-gray-900 mb-3">Ingredients</h3>
        <div className="space-y-2">
          {formData.ingredients.map((ing, idx) => (
            <div key={idx} className="flex justify-between text-sm">
              <span className="text-gray-600">
                Ingredient {idx + 1}
                {ing.isOptional && <span className="text-gray-400"> (Optional)</span>}
              </span>
              <span className="font-medium">
                {ing.quantity} {ing.unit}
                {ing.prepNotes && (
                  <span className="text-gray-500 ml-2">({ing.prepNotes})</span>
                )}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
        <p className="text-sm text-orange-800">
          <strong>Note:</strong> You can adjust ingredient prices and quantities anytime to
          keep your recipe costs accurate.
        </p>
      </div>

      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={onBack}
          disabled={isSubmitting}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="flex-1 px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
        >
          {isSubmitting ? "Creating..." : "Create Recipe"}
        </button>
      </div>
    </div>
  )
}