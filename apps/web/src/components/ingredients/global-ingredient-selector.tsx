import { useState } from "react"
import { Search, ExternalLink } from "lucide-react"
import { api } from "../../lib/trpc/client"

interface GlobalIngredientSelectorProps {
  onClose: () => void
  onSuccess: () => void
}

export function GlobalIngredientSelector({
  onClose,
  onSuccess,
}: GlobalIngredientSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [price, setPrice] = useState("")

  const { data, isLoading } = api.ingredients.getAll.useQuery({
    page: 1,
    limit: 50,
    search: searchQuery || undefined,
    includeGlobal: true,
    includeCustom: false,
  })

  const updatePricingMutation = api.ingredients.updateMerchantPricing.useMutation({
    onSuccess: () => {
      onSuccess()
    },
    onError: (error) => {
      alert(error.message)
    },
  })

  const handleAdd = () => {
    if (!selectedId || !price) {
      alert("Please select an ingredient and enter a price")
      return
    }

    updatePricingMutation.mutate({
      ingredientId: selectedId,
      currentPricePerUnit: parseFloat(price),
    })
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search global ingredient library..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        />
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {isLoading ? (
          <p className="text-center text-gray-500 py-4">Loading...</p>
        ) : data?.ingredients && data.ingredients.length > 0 ? (
          data.ingredients.map((ingredient) => (
            <button
              key={ingredient.id}
              onClick={() => setSelectedId(ingredient.id)}
              className={`w-full p-3 text-left border rounded-lg transition-colors ${
                selectedId === ingredient.id
                  ? "border-orange-500 bg-orange-50"
                  : "border-gray-200 hover:border-orange-500 hover:bg-orange-50"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium text-gray-900">{ingredient.name}</span>
                  <p className="text-xs text-gray-500 mt-1">
                    {ingredient.category.replace(/_/g, " ")} • Ref price: $
                    {ingredient.pricePerUnit.toFixed(2)}/{ingredient.purchaseUnit}
                  </p>
                </div>
                <ExternalLink className="w-4 h-4 text-gray-400" />
              </div>
            </button>
          ))
        ) : (
          <p className="text-center text-gray-500 py-4">No ingredients found</p>
        )}
      </div>

      {selectedId && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Your Price per Unit ($) *
          </label>
          <input
            type="number"
            step="0.01"
            placeholder="0.00"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
          <p className="mt-1 text-xs text-gray-500">
            Enter your actual purchase price for this ingredient
          </p>
        </div>
      )}

      <div className="flex gap-3 pt-4">
        <button
          onClick={handleAdd}
          disabled={!selectedId || !price || updatePricingMutation.isPending}
          className="flex-1 py-2 px-4 bg-orange-500 text-white rounded-lg hover:bg-orange-600 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {updatePricingMutation.isPending ? "Adding..." : "Add Selected"}
        </button>
        <button
          onClick={onClose}
          disabled={updatePricingMutation.isPending}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}