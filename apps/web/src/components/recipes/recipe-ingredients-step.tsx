import { useState, useRef, useEffect } from "react"
import { Plus, X, Search, PlusCircle } from "lucide-react"
import { api } from "../../lib/trpc/client"
import type { RecipeFormData } from "./create-recipe-modal"
import { MeasurementUnit, IngredientCategory } from "@homejiak/types"
import { keepPreviousData } from "@tanstack/react-query"

interface IngredientRow {
  id: string
  ingredientId?: string
  customIngredientId?: string
  isCustom: boolean
  quantity: number
  unit: MeasurementUnit
  prepNotes?: string
  isOptional: boolean
  selectedName?: string // Store the selected ingredient name for display
}

interface SearchableIngredientSelectProps {
  value: { ingredientId?: string; customIngredientId?: string; isCustom: boolean }
  onChange: (update: Partial<IngredientRow>) => void
  onRequestCreateNew: () => void
  selectedName?: string
}

function SearchableIngredientSelect({ 
  onChange, 
  onRequestCreateNew,
  selectedName 
}: SearchableIngredientSelectProps) {
  const [search, setSearch] = useState(selectedName || "")
  const [isOpen, setIsOpen] = useState(false)
  const [focused, setFocused] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Use the searchIngredients endpoint
  const { data: searchResults, isLoading } = api.ingredients.searchIngredients.useQuery(
    { 
      search,
      limit: 20 
    },
    { 
      enabled: search.length > 0,
      placeholderData: keepPreviousData,
    }
  )

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleSelect = (ingredient: any) => {
    setSearch(ingredient.name)
    onChange({
      isCustom: ingredient.isCustom,
      customIngredientId: ingredient.isCustom ? ingredient.id : undefined,
      ingredientId: ingredient.isCustom ? undefined : ingredient.id,
      selectedName: ingredient.name,
    })
    setIsOpen(false)
  }

  const handleCreateNew = () => {
    setIsOpen(false)
    onRequestCreateNew()
  }

  const hasResults = searchResults && searchResults.length > 0
  const showCreateOption = search.length > 0 && !isLoading

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setIsOpen(true)
          }}
          onFocus={() => {
            setFocused(true)
            if (search.length > 0) setIsOpen(true)
          }}
          onBlur={() => setFocused(false)}
          placeholder="Type to search ingredients..."
          className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        />
        <Search className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" />
      </div>

      {/* Dropdown Results */}
      {isOpen && (search.length > 0 || focused) && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
          {isLoading && (
            <div className="px-4 py-3 text-sm text-gray-500">
              Searching...
            </div>
          )}

          {!isLoading && hasResults && (
            <div className="py-1">
              {searchResults.map((ingredient: any) => (
                <button
                  key={ingredient.id}
                  type="button"
                  onClick={() => handleSelect(ingredient)}
                  className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center justify-between group"
                >
                  <div>
                    <div className="font-medium text-gray-900">
                      {ingredient.name}
                      {ingredient.isCustom && (
                        <span className="ml-2 text-xs text-gray-500">(Custom)</span>
                      )}
                    </div>
                    {ingredient.description && (
                      <div className="text-sm text-gray-500">{ingredient.description}</div>
                    )}
                  </div>
                  <div className="text-sm text-gray-400">
                    ${ingredient.pricePerUnit?.toFixed(2)}/{ingredient.purchaseUnit}
                  </div>
                </button>
              ))}
            </div>
          )}

          {!isLoading && !hasResults && search.length > 0 && (
            <div className="p-4">
              <p className="text-sm text-gray-500 mb-3">
                No ingredients found matching "{search}"
              </p>
              <button
                type="button"
                onClick={handleCreateNew}
                className="w-full px-4 py-2 bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-100 flex items-center justify-center gap-2 font-medium"
              >
                <PlusCircle className="w-4 h-4" />
                Create "{search}" as custom ingredient
              </button>
            </div>
          )}

          {showCreateOption && hasResults && (
            <div className="border-t border-gray-200">
              <button
                type="button"
                onClick={handleCreateNew}
                className="w-full px-4 py-2 text-orange-600 hover:bg-orange-50 flex items-center gap-2 text-sm font-medium"
              >
                <PlusCircle className="w-4 h-4" />
                Create new custom ingredient
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

interface QuickAddIngredientModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (ingredient: { id: string; name: string; isCustom: boolean }) => void
  prefillName?: string
}

function QuickAddIngredientModal({ isOpen, onClose, onAdd, prefillName }: QuickAddIngredientModalProps) {
  const [name, setName] = useState(prefillName || "")
  const [category, setCategory] = useState<IngredientCategory>(IngredientCategory.FLOUR_GRAINS)
  const [purchaseUnit, setPurchaseUnit] = useState<MeasurementUnit>("GRAMS" as MeasurementUnit)
  const [pricePerUnit, setPricePerUnit] = useState(0)
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    if (prefillName) setName(prefillName)
  }, [prefillName])

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
              onChange={(e: any) => setCategory(e.target.value as IngredientCategory)}
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
  const [prefillIngredientName, setPrefillIngredientName] = useState<string>("")

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
        selectedName: ingredient.name,
      })
    }
    setQuickAddTargetId(null)
    setPrefillIngredientName("")
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
          💡 <strong>Tip:</strong> Type to search ingredients from the global library or your custom ingredients. 
          New ingredients from the library will be automatically added to your inventory when you save the recipe.
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
              <SearchableIngredientSelect
                value={{
                  ingredientId: ing.ingredientId,
                  customIngredientId: ing.customIngredientId,
                  isCustom: ing.isCustom,
                }}
                onChange={(updates) => updateIngredient(ing.id, updates)}
                onRequestCreateNew={() => {
                  setQuickAddTargetId(ing.id)
                  // Get the current search term from the input if possible
                  setPrefillIngredientName("")
                  setShowQuickAdd(true)
                }}
                selectedName={ing.selectedName}
              />
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
          setPrefillIngredientName("")
        }}
        onAdd={handleQuickAdd}
        prefillName={prefillIngredientName}
      />
    </div>
  )
}