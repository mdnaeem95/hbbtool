import { Search, Filter } from "lucide-react"
import type { IngredientCategory } from "../../types/ingredients"

const categories: (IngredientCategory | "All Categories")[] = [
  "All Categories",
  "FLOUR",
  "DAIRY",
  "SUGAR",
  "EGGS",
  "CHOCOLATE",
  "NUTS",
  "FRUITS",
  "VEGETABLES",
  "SPICES",
  "OILS_FATS",
  "LEAVENING",
  "EXTRACTS",
  "MEAT_POULTRY",
  "SEAFOOD",
  "GRAINS",
  "LEGUMES",
  "SAUCES_CONDIMENTS",
  "BEVERAGES",
  "PACKAGING",
  "OTHER",
]

interface IngredientsFiltersProps {
  searchQuery: string
  onSearchChange: (value: string) => void
  selectedCategory: IngredientCategory | "All Categories"
  onCategoryChange: (value: IngredientCategory | "All Categories") => void
  showFilters: boolean
  onToggleFilters: () => void
  filterLowStock: boolean
  onFilterLowStockChange: (value: boolean) => void
  filterCustomOnly: boolean
  onFilterCustomOnlyChange: (value: boolean) => void
  filterHasAllergens: boolean
  onFilterHasAllergensChange: (value: boolean) => void
}

export function IngredientsFilters({
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  showFilters,
  onToggleFilters,
  filterLowStock,
  onFilterLowStockChange,
  filterCustomOnly,
  onFilterCustomOnlyChange,
  filterHasAllergens,
  onFilterHasAllergensChange,
}: IngredientsFiltersProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search ingredients..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>

        {/* Category Filter */}
        <select
          value={selectedCategory}
          onChange={(e) => onCategoryChange(e.target.value as IngredientCategory | "All Categories")}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        >
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat.replace(/_/g, " ")}
            </option>
          ))}
        </select>

        <button
          onClick={onToggleFilters}
          className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <Filter className="w-4 h-4" />
          Filters
        </button>
      </div>

      {showFilters && (
        <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={filterLowStock}
              onChange={(e) => onFilterLowStockChange(e.target.checked)}
              className="rounded border-gray-300 text-orange-500 focus:ring-orange-500"
            />
            <span className="text-sm text-gray-700">Low Stock Only</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={filterCustomOnly}
              onChange={(e) => onFilterCustomOnlyChange(e.target.checked)}
              className="rounded border-gray-300 text-orange-500 focus:ring-orange-500"
            />
            <span className="text-sm text-gray-700">Custom Only</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={filterHasAllergens}
              onChange={(e) => onFilterHasAllergensChange(e.target.checked)}
              className="rounded border-gray-300 text-orange-500 focus:ring-orange-500"
            />
            <span className="text-sm text-gray-700">Has Allergens</span>
          </label>
        </div>
      )}
    </div>
  )
}