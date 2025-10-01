import { Plus } from "lucide-react"

interface IngredientsHeaderProps {
  onAddClick: () => void
}

export function IngredientsHeader({ onAddClick }: IngredientsHeaderProps) {
  return (
    <div className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Ingredients</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage your ingredient library and track costs
            </p>
          </div>
          <button
            onClick={onAddClick}
            className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Ingredient
          </button>
        </div>
      </div>
    </div>
  )
}