import { Plus, Calculator } from "lucide-react"

interface RecipesHeaderProps {
  onAddClick: () => void
  onCalculatorClick: () => void
}

export function RecipesHeader({ onAddClick, onCalculatorClick }: RecipesHeaderProps) {
  return (
    <div className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Recipes</h1>
            <p className="mt-1 text-sm text-gray-500">
              Build recipes and calculate costs automatically
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onCalculatorClick}
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Calculator className="w-4 h-4" />
              Price Calculator
            </button>
            <button
              onClick={onAddClick}
              className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Recipe
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}