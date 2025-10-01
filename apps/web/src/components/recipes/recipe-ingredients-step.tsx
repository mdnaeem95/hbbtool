import { useState } from "react"
import { Plus, X } from "lucide-react"
import { api } from "../../lib/trpc/client"
import type { RecipeFormData } from "./create-recipe-modal"
import { MeasurementUnit } from "@homejiak/api"

interface IngredientRow {
  id: string
  ingredientId?: string
  customIngredientId?: string
  isCustom: boolean
  quantity: number
  unit: MeasurementUnit
  prepNotes?: string
  isOptional: boolean
}

interface RecipeIngredientsStepProps {
  initialData: Partial<RecipeFormData>
  onNext: (data: Partial<RecipeFormData>) => void
  onBack: () => void
}

const measurementUnitOptions = Object.values(MeasurementUnit) as string[]

export function RecipeIngredientsStep({
  initialData,
  onNext,
  onBack,
}: RecipeIngredientsStepProps) {
  const [ingredients, setIngredients] = useState<IngredientRow[]>(
    initialData.ingredients?.map((ing, idx) => ({
      id: `ing-${idx}`,
      ...ing,
      isCustom: !!ing.customIngredientId,
    })) || [
      {
        id: "ing-1",
        quantity: 0,
        unit: "GRAMS" as MeasurementUnit,
        isOptional: false,
        isCustom: false,
      },
    ]
  )

  // Fetch all available ingredients
  const { data: ingredientsData } = api.ingredients.getAll.useQuery({
    page: 1,
    limit: 200,
  })

  const addIngredient = () => {
    setIngredients([
      ...ingredients,
      {
        id: `ing-${Date.now()}`,
        quantity: 0,
        unit: "GRAMS" as MeasurementUnit,
        isOptional: false,
        isCustom: false,
      },
    ])
  }

  const removeIngredient = (id: string) => {
    setIngredients(ingredients.filter((ing) => ing.id !== id))
  }

  const updateIngredient = (id: string, updates: Partial<IngredientRow>) => {
    setIngredients(
      ingredients.map((ing) => (ing.id === id ? { ...ing, ...updates } : ing))
    )
  }

  const handleNext = () => {
    // Validate
    const hasEmpty = ingredients.some(
      (ing) => !ing.ingredientId && !ing.customIngredientId
    )
    if (hasEmpty) {
      alert("Please select an ingredient for all rows")
      return
    }

    const hasZeroQuantity = ingredients.some((ing) => ing.quantity <= 0)
    if (hasZeroQuantity) {
      alert("All ingredients must have a quantity greater than 0")
      return
    }

    // Convert to API format
    const formattedIngredients = ingredients.map((ing) => ({
      ingredientId: ing.isCustom ? undefined : ing.ingredientId,
      customIngredientId: ing.isCustom ? ing.customIngredientId : undefined,
      quantity: ing.quantity,
      unit: ing.unit,
      prepNotes: ing.prepNotes,
      isOptional: ing.isOptional,
    }))

    onNext({ ingredients: formattedIngredients })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-gray-900">Recipe Ingredients</h3>
        <button
          onClick={addIngredient}
          className="text-sm text-orange-600 hover:text-orange-700 font-medium flex items-center gap-1"
        >
          <Plus className="w-4 h-4" />
          Add Ingredient
        </button>
      </div>

      <div className="space-y-3">
        {ingredients.map((ing, idx) => (
          <div key={ing.id} className="p-4 border border-gray-200 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">
                Ingredient {idx + 1}
              </span>
              {ingredients.length > 1 && (
                <button
                  onClick={() => removeIngredient(ing.id)}
                  className="text-sm text-red-600 hover:text-red-700 flex items-center gap-1"
                >
                  <X className="w-4 h-4" />
                  Remove
                </button>
              )}
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Select Ingredient *
              </label>
              <select
                value={
                  ing.isCustom
                    ? `custom-${ing.customIngredientId}`
                    : `global-${ing.ingredientId}`
                }
                onChange={(e) => {
                  const value = e.target.value
                  if (value.startsWith("custom-")) {
                    updateIngredient(ing.id, {
                      isCustom: true,
                      customIngredientId: value.replace("custom-", ""),
                      ingredientId: undefined,
                    })
                  } else {
                    updateIngredient(ing.id, {
                      isCustom: false,
                      ingredientId: value.replace("global-", ""),
                      customIngredientId: undefined,
                    })
                  }
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="">Select an ingredient...</option>
                {ingredientsData?.ingredients.map((ingredient) => (
                  <option
                    key={ingredient.id}
                    value={
                      ingredient.isCustom
                        ? `custom-${ingredient.id}`
                        : `global-${ingredient.id}`
                    }
                  >
                    {ingredient.name} {ingredient.isCustom && "(Custom)"}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Quantity *</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="300"
                  value={ing.quantity || ""}
                  onChange={(e) =>
                    updateIngredient(ing.id, {
                      quantity: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Unit *</label>
                <select
                  value={ing.unit}
                  onChange={(e) =>
                    updateIngredient(ing.id, {
                      unit: e.target.value as MeasurementUnit,
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  {measurementUnitOptions.map((unit) => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">Prep Notes</label>
              <input
                type="text"
                placeholder="e.g., sifted, melted, room temperature"
                value={ing.prepNotes || ""}
                onChange={(e) =>
                  updateIngredient(ing.id, { prepNotes: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={ing.isOptional}
                onChange={(e) =>
                  updateIngredient(ing.id, { isOptional: e.target.checked })
                }
                className="rounded border-gray-300 text-orange-500 focus:ring-orange-500"
              />
              <span className="text-sm text-gray-700">Optional ingredient</span>
            </label>
          </div>
        ))}
      </div>

      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
        >
          Back
        </button>
        <button
          type="button"
          onClick={handleNext}
          className="flex-1 px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
        >
          Continue
        </button>
      </div>
    </div>
  )
}