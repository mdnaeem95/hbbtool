import { useState } from "react"
import { RecipeDetailsStep } from "./recipe-details-step"
import { RecipeIngredientsStep } from "./recipe-ingredients-step"
import { RecipeReviewStep } from "./recipe-review-step"
import { MeasurementUnit, RecipeCategory } from "@homejiak/api"

export interface RecipeFormData {
  name: string
  description?: string
  category: RecipeCategory
  productId?: string
  baseYield: number
  yieldUnit: MeasurementUnit
  prepTime: number
  cookTime: number
  coolingTime: number
  decorationTime: number
  shelfLifeDays?: number
  storageInstructions?: string
  notes?: string
  ingredients: Array<{
    ingredientId?: string
    customIngredientId?: string
    quantity: number
    unit: MeasurementUnit
    prepNotes?: string
    isOptional: boolean
  }>
}

interface CreateRecipeModalProps {
  onClose: () => void
  onSuccess: () => void
}

export function CreateRecipeModal({ onClose, onSuccess }: CreateRecipeModalProps) {
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState<Partial<RecipeFormData>>({
    category: "BAKED_GOODS" as RecipeCategory,
    yieldUnit: "PIECES" as MeasurementUnit,
    baseYield: 1,
    prepTime: 0,
    cookTime: 0,
    coolingTime: 0,
    decorationTime: 0,
    ingredients: [],
  })

  const handleNext = (stepData: Partial<RecipeFormData>) => {
    setFormData((prev) => ({ ...prev, ...stepData }))
    setStep(step + 1)
  }

  const handleBack = () => {
    setStep(step - 1)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 z-10">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Create Recipe</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
            >
              ×
            </button>
          </div>

          {/* Progress Steps */}
          <div className="mt-4 flex items-center gap-2">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center flex-1">
                <div
                  className={`flex-1 h-1 rounded ${
                    s <= step ? "bg-orange-500" : "bg-gray-200"
                  }`}
                />
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-between text-xs text-gray-600">
            <span>Details</span>
            <span>Ingredients</span>
            <span>Review</span>
          </div>
        </div>

        <div className="p-6">
          {step === 1 && (
            <RecipeDetailsStep
              initialData={formData}
              onNext={handleNext}
              onCancel={onClose}
            />
          )}
          {step === 2 && (
            <RecipeIngredientsStep
              initialData={formData}
              onNext={handleNext}
              onBack={handleBack}
            />
          )}
          {step === 3 && (
            <RecipeReviewStep
              formData={formData as RecipeFormData}
              onBack={handleBack}
              onSubmit={onSuccess}
              onCancel={onClose}
            />
          )}
        </div>
      </div>
    </div>
  )
}