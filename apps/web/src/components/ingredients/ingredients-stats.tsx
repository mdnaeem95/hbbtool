import { Package, AlertCircle, DollarSign } from "lucide-react"

interface IngredientsStatsProps {
  totalIngredients: number
  lowStockCount: number
  totalValue: number
}

export function IngredientsStats({
  totalIngredients,
  lowStockCount,
  totalValue,
}: IngredientsStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div className="bg-orange-50 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-100 rounded-lg">
            <Package className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <p className="text-sm text-gray-600">Total Ingredients</p>
            <p className="text-2xl font-semibold text-gray-900">{totalIngredients}</p>
          </div>
        </div>
      </div>

      <div className="bg-red-50 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-100 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <p className="text-sm text-gray-600">Low Stock Items</p>
            <p className="text-2xl font-semibold text-gray-900">{lowStockCount}</p>
          </div>
        </div>
      </div>

      <div className="bg-green-50 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-lg">
            <DollarSign className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="text-sm text-gray-600">Inventory Value</p>
            <p className="text-2xl font-semibold text-gray-900">${totalValue.toFixed(2)}</p>
          </div>
        </div>
      </div>
    </div>
  )
}