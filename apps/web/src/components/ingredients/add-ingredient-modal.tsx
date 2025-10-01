import { useState } from "react"
import { CustomIngredientForm } from "./custom-ingredient-form"
import { GlobalIngredientSelector } from "./global-ingredient-selector"

interface AddIngredientModalProps {
  onClose: () => void
  onSuccess: () => void
}

export function AddIngredientModal({ onClose, onSuccess }: AddIngredientModalProps) {
  const [isCustom, setIsCustom] = useState(true)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 z-10">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Add Ingredient</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors text-2xl leading-none"
            >
              ×
            </button>
          </div>

          {/* Toggle between Custom and Global */}
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => setIsCustom(true)}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                isCustom
                  ? "bg-orange-500 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Create Custom
            </button>
            <button
              onClick={() => setIsCustom(false)}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                !isCustom
                  ? "bg-orange-500 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Use Global Library
            </button>
          </div>
        </div>

        <div className="p-6">
          {isCustom ? (
            <CustomIngredientForm onClose={onClose} onSuccess={onSuccess} />
          ) : (
            <GlobalIngredientSelector onClose={onClose} onSuccess={onSuccess} />
          )}
        </div>
      </div>
    </div>
  )
}