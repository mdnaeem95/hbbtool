import { useState } from "react"
import { Plus, X } from "lucide-react"
import { api } from "../../lib/trpc/client"
import type { RecipeFormData } from "./create-recipe-modal"
import { MeasurementUnit, IngredientCategory } from "@homejiak/types"

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

interface QuickAddIngredientModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (ingredient: { id: string; name: string; isCustom: boolean }) => void
}

function QuickAddIngredientModal({ isOpen, onClose, onAdd }: QuickAddIngredientModalProps) {
  const [name, setName] = useState("")
  const [category, setCategory] = useState<IngredientCategory>("PRODUCE" as IngredientCategory)
  const [purchaseUnit, setPurchaseUnit] = useState<MeasurementUnit>("GRAMS" as MeasurementUnit)
  const [pricePerUnit, setPricePerUnit] = useState(0)
  const [isCreating, setIsCreating] = useState(false)

  const createCustomIngredient = api.ingredients.createCustom.useMutation({
    onSuccess: (data) => {
      onAdd({ id: data.id, name: data.name, isCustom: true })
      onClose()
      setName("")
      setPricePerUnit(0)
    },
  })

  const handleCreate = async () => {
    if (!name || pricePerUnit <= 0) {
      alert("Please fill in all required fields")
      return
    }

    setIsCreating(true)
    await createCustomIngredient.mutate({
      name,
      category,
      purchaseUnit,
      currentPricePerUnit: pricePerUnit,
      currentStock: 0, // Will be updated when they purchase
    })
    setIsCreating(false)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4">Add Custom Ingredient</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ingredient Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Homemade Rendang Paste"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category *
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as IngredientCategory)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
            >
              {Object.values(IngredientCategory).map((cat) => (
                <option key={cat} value={cat}>
                  {cat.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Purchase Unit *
              </label>
              <select
                value={purchaseUnit}
                onChange={(e) => setPurchaseUnit(e.target.value as MeasurementUnit)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
              >
                {Object.values(MeasurementUnit).map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Price per Unit ($) *
              </label>
              <input
                type="number"
                step="0.01"
                value={pricePerUnit}
                onChange={(e) => setPricePerUnit(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCreate}
            disabled={isCreating}
            className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
          >
            {isCreating ? "Creating..." : "Create Ingredient"}
          </button>
        </div>
      </div>
    </div>
  )
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

  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [quickAddTargetId, setQuickAddTargetId] = useState<string | null>(null)

  // Fetch ALL available ingredients (both in merchant inventory and global library)
  const { data: allIngredientsData, isLoading: isLoadingAll, refetch: refetchIngredients } = 
    api.ingredients.getAll.useQuery({
      page: 1,
      limit: 1000,
      includeCustom: true,
      includeGlobal: true,
    })

  // Also fetch global library ingredients that aren't in merchant inventory yet
  const { data: globalLibraryData, isLoading: isLoadingLibrary } = 
    api.ingredients.searchGlobalLibrary.useQuery({
      search: "", // Empty search returns all
      limit: 1000,
    })

  // Combine all available ingredients
  const merchantIngredients = allIngredientsData?.ingredients || []
  const libraryIngredients = globalLibraryData || []
  
  // Create a combined list with no duplicates
  // Track which ingredients are from library (not in inventory yet)
  const merchantIds = new Set(merchantIngredients.filter(ing => ing.isGlobal).map(ing => ing.id))
  
  const allAvailableIngredients = [
    ...merchantIngredients,
    ...libraryIngredients
      .filter(ing => !merchantIds.has(ing.id)) // Only include if not already in merchant inventory
      .map(ing => ({
        ...ing,
        isGlobal: true,
        isCustom: false,
        pricePerUnit: ing.referencePrice,
        currentStock: 0,
      }))
  ]

  const isLoading = isLoadingAll || isLoadingLibrary

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

  const handleQuickAdd = (ingredient: { id: string; name: string; isCustom: boolean }) => {
    if (quickAddTargetId) {
      updateIngredient(quickAddTargetId, {
        isCustom: ingredient.isCustom,
        customIngredientId: ingredient.isCustom ? ingredient.id : undefined,
        ingredientId: ingredient.isCustom ? undefined : ingredient.id,
      })
    }
    setQuickAddTargetId(null)
    refetchIngredients() // Refresh the list to include the new ingredient
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

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-sm text-blue-800">
          💡 <strong>Tip:</strong> All ingredients you select will be automatically added to your 
          inventory when you save the recipe. You can also create custom ingredients on the fly!
        </p>
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
              <div className="flex gap-2">
                <select
                  value={
                    ing.isCustom
                      ? `custom-${ing.customIngredientId}`
                      : ing.ingredientId 
                        ? `global-${ing.ingredientId}`
                        : ""
                  }
                  onChange={(e) => {
                    const value = e.target.value
                    if (!value) return
                    
                    if (value === "create-new") {
                      setQuickAddTargetId(ing.id)
                      setShowQuickAdd(true)
                      return
                    }
                    
                    if (value.startsWith("custom-")) {
                      updateIngredient(ing.id, {
                        isCustom: true,
                        customIngredientId: value.replace("custom-", ""),
                        ingredientId: undefined,
                      })
                    } else if (value.startsWith("global-")) {
                      updateIngredient(ing.id, {
                        isCustom: false,
                        ingredientId: value.replace("global-", ""),
                        customIngredientId: undefined,
                      })
                    }
                  }}
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                >
                  <option value="">
                    {isLoading ? "Loading ingredients..." : "Select an ingredient..."}
                  </option>
                  
                  <option value="create-new" className="font-medium text-orange-600">
                    ➕ Create New Custom Ingredient
                  </option>
                  
                  {/* Your Custom Ingredients */}
                  {allAvailableIngredients.filter(ing => ing.isCustom).length > 0 && (
                    <optgroup label="Your Custom Ingredients">
                      {allAvailableIngredients
                        .filter(ing => ing.isCustom)
                        .map((ingredient) => (
                          <option
                            key={`custom-${ingredient.id}`}
                            value={`custom-${ingredient.id}`}
                          >
                            {ingredient.name}
                          </option>
                        ))}
                    </optgroup>
                  )}
                  
                  {/* Ingredients in Your Inventory */}
                  {allAvailableIngredients.filter(ing => ing.isGlobal && merchantIds.has(ing.id)).length > 0 && (
                    <optgroup label="In Your Inventory">
                      {allAvailableIngredients
                        .filter(ing => ing.isGlobal && merchantIds.has(ing.id))
                        .map((ingredient) => (
                          <option
                            key={`global-${ingredient.id}`}
                            value={`global-${ingredient.id}`}
                          >
                            {ingredient.name}
                          </option>
                        ))}
                    </optgroup>
                  )}
                  
                  {/* Available from Global Library */}
                  {allAvailableIngredients.filter(ing => ing.isGlobal && !merchantIds.has(ing.id)).length > 0 && (
                    <optgroup label="Available from Library (will be added to your inventory)">
                      {allAvailableIngredients
                        .filter(ing => ing.isGlobal && !merchantIds.has(ing.id))
                        .map((ingredient) => (
                          <option
                            key={`global-${ingredient.id}`}
                            value={`global-${ingredient.id}`}
                          >
                            {ingredient.name} (${ingredient.pricePerUnit.toFixed(2)}/{ingredient.purchaseUnit})
                          </option>
                        ))}
                    </optgroup>
                  )}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Quantity *</label>
                <input
                  type="number"
                  step="0.001"
                  placeholder="0"
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

      <QuickAddIngredientModal
        isOpen={showQuickAdd}
        onClose={() => {
          setShowQuickAdd(false)
          setQuickAddTargetId(null)
        }}
        onAdd={handleQuickAdd}
      />
    </div>
  )
}