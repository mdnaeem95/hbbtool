import { useState } from "react"
import { api } from "../../lib/trpc/client"

interface PricingCalculatorModalProps {
  recipeId: string | null
  onClose: () => void
}

export function PricingCalculatorModal({ recipeId, onClose }: PricingCalculatorModalProps) {
  const [markup, setMarkup] = useState(300)
  const [selectedRecipeId, setSelectedRecipeId] = useState(recipeId)

  // Fetch all recipes for selection
  const { data: recipesData } = api.recipe.getAll.useQuery({
    page: 1,
    limit: 100,
  })

  // Fetch specific recipe if selected
  const { data: recipe } = api.recipe.getById.useQuery(
    { id: selectedRecipeId! },
    { enabled: !!selectedRecipeId }
  )

  // Fetch pricing calculation
  const { data: pricingData } = api.recipe.calculatePricing.useQuery(
    {
      recipeId: selectedRecipeId!,
      markupPercentage: markup,
    },
    { enabled: !!selectedRecipeId }
  )

  const cost = pricingData?.costs.perUnit || 0
  const suggestedPrice = pricingData?.pricing.suggested.price || 0
  const profit = pricingData?.pricing.suggested.profit || 0
  const margin = pricingData?.pricing.suggested.margin || 0

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Pricing Calculator</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
            >
              ×
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Recipe Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Recipe
            </label>
            <select
              value={selectedRecipeId || ""}
              onChange={(e) => setSelectedRecipeId(e.target.value || null)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="">Choose a recipe...</option>
              {recipesData?.recipes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          {selectedRecipeId && pricingData && (
            <>
              {/* Cost Breakdown */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-4">Cost Breakdown</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Ingredient Cost</span>
                    <span className="font-semibold text-gray-900">
                      ${pricingData.costs.total.toFixed(2)}
                    </span>
                  </div>
                  <div className="pt-3 border-t border-gray-200 flex justify-between items-center">
                    <span className="font-medium text-gray-900">Total Cost per Unit</span>
                    <span className="text-lg font-bold text-green-600">
                      ${cost.toFixed(2)}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    Confidence: {pricingData.costs.confidence}
                  </div>
                </div>
              </div>

              {/* Markup Slider */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="font-medium text-gray-900">Markup Percentage</label>
                  <span className="text-2xl font-bold text-orange-600">{markup}%</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="500"
                  step="10"
                  value={markup}
                  onChange={(e) => setMarkup(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, #FF6B35 0%, #FF6B35 ${
                      ((markup - 50) / 450) * 100
                    }%, #E5E7EB ${((markup - 50) / 450) * 100}%, #E5E7EB 100%)`,
                  }}
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>50%</span>
                  <span>275%</span>
                  <span>500%</span>
                </div>
              </div>

              {/* Suggested Pricing */}
              <div className="bg-gradient-to-br from-orange-50 to-purple-50 rounded-lg p-6 border border-orange-200">
                <h3 className="font-medium text-gray-900 mb-4">Suggested Pricing</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-xs text-gray-600 mb-1">Selling Price</p>
                    <p className="text-2xl font-bold text-gray-900">
                      ${suggestedPrice.toFixed(2)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-600 mb-1">Profit</p>
                    <p className="text-2xl font-bold text-green-600">
                      ${profit.toFixed(2)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-600 mb-1">Margin</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {margin.toFixed(0)}%
                    </p>
                  </div>
                </div>
              </div>

              {/* Comparison with Current */}
              {pricingData.pricing.products.length > 0 && (
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-3">Current vs Suggested</h3>
                  {pricingData.pricing.products.map((product, idx) => (
                    <div key={idx} className="space-y-2 text-sm">
                      <div className="font-medium text-gray-900">{product.name}</div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Current Price:</span>
                        <span className="font-medium">
                          ${product.currentPrice.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Suggested Price:</span>
                        <span className="font-medium text-orange-600">
                          ${suggestedPrice.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between pt-2 border-t">
                        <span className="text-gray-600">Difference:</span>
                        <span
                          className={`font-semibold ${
                            suggestedPrice > product.currentPrice
                              ? "text-red-600"
                              : "text-green-600"
                          }`}
                        >
                          {suggestedPrice > product.currentPrice ? "+" : ""}$
                          {(suggestedPrice - product.currentPrice).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Ingredient Breakdown */}
              {pricingData.costs && (
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-3">
                    Ingredient Cost Breakdown
                  </h3>
                  <div className="space-y-2 text-sm">
                    {recipe?.ingredients.map((ing) => {
                      const ingredientName =
                        ing.ingredient?.name || ing.customIngredient?.name || "Unknown"
                      const unitCost = ing.ingredient
                        ? Number(ing.ingredient.referencePrice)
                        : ing.customIngredient
                        ? Number(ing.customIngredient.currentPricePerUnit)
                        : 0
                      const quantity = Number(ing.quantity)
                      const totalCost = unitCost * quantity

                      return (
                        <div key={ing.id} className="flex justify-between">
                          <span className="text-gray-600">
                            {ingredientName} ({quantity} {ing.unit})
                          </span>
                          <span className="font-medium">${totalCost.toFixed(2)}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </>
          )}

          <button
            onClick={onClose}
            className="w-full py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}