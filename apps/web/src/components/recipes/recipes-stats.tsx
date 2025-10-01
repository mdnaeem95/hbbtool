import { ChefHat, DollarSign, Link2 } from "lucide-react"

interface RecipesStatsProps {
  totalRecipes: number
  avgCostPerUnit: number
  linkedProducts: number
}

export function RecipesStats({
  totalRecipes,
  avgCostPerUnit,
  linkedProducts,
}: RecipesStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div className="bg-purple-50 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <ChefHat className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <p className="text-sm text-gray-600">Total Recipes</p>
            <p className="text-2xl font-semibold text-gray-900">{totalRecipes}</p>
          </div>
        </div>
      </div>

      <div className="bg-green-50 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-lg">
            <DollarSign className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="text-sm text-gray-600">Avg Cost/Unit</p>
            <p className="text-2xl font-semibold text-gray-900">
              ${avgCostPerUnit.toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Link2 className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-gray-600">Linked Products</p>
            <p className="text-2xl font-semibold text-gray-900">{linkedProducts}</p>
          </div>
        </div>
      </div>
    </div>
  )
}