import { IngredientCategory, MeasurementUnit } from "@homejiak/types"
import { api } from "../../lib/trpc/client"
import { CustomIngredientForm } from "./custom-ingredient-form"
import { GlobalIngredientForm } from "./global-ingredient-form"

interface EditIngredientModalProps {
  ingredientId: string
  isCustom: boolean
  onClose: () => void
  onSuccess: () => void
}

export function EditIngredientModal({
  ingredientId,
  isCustom,
  onClose,
  onSuccess,
}: EditIngredientModalProps) {
  const { data: ingredient, isLoading } = api.ingredients.getById.useQuery({
    id: ingredientId,
    isCustom, // still pass this for runtime
  })

  // tiny helper to coerce strings to enums safely (only needed if your client uses TS enums)
  const toEnum = <E extends Record<string, string>>(
    e: E,
    v?: string | null
  ): E[keyof E] | undefined =>
    v && (Object.values(e) as string[]).includes(v) ? (v as E[keyof E]) : undefined

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 z-10">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Edit Ingredient</h2>
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
          ) : !ingredient ? (
            <p className="text-center text-gray-500 py-8">Ingredient not found</p>
          ) : ingredient.isCustom ? ( // ✅ discriminant guard
            <CustomIngredientForm
              onClose={onClose}
              onSuccess={onSuccess}
              initialData={{
                id: ingredient.id,
                name: ingredient.name,
                description: ingredient.description ?? "",
                // if you’re using TS enums on the client, coerce safely:
                category:
                  toEnum(IngredientCategory, ingredient.category) ?? IngredientCategory.OTHER,
                purchaseUnit:
                  toEnum(MeasurementUnit, ingredient.purchaseUnit) ?? MeasurementUnit.GRAMS,

                // ✅ custom-only fields (now safe after the guard)
                currentPricePerUnit: ingredient.currentPricePerUnit,
                preferredStore: ingredient.preferredStore ?? undefined,
                currentStock: ingredient.currentStock ?? 0,
                reorderPoint: ingredient.reorderPoint ?? undefined,
                shelfLifeDays: ingredient.shelfLifeDays ?? undefined,
                allergens: (ingredient.allergens ?? []).join(", "),
                notes: ingredient.notes ?? "",
              }}
            />
          ) : (
            // Global ingredient form - only edit merchant-specific fields
            <GlobalIngredientForm
              onClose={onClose}
              onSuccess={onSuccess}
              ingredient={ingredient}
            />
          )}
        </div>
      </div>
    </div>
  )
}