import { RecipeCategory } from "@homejiak/api"
import { Search } from "lucide-react"

const categories: (RecipeCategory | "All Recipes")[] = [
  "All Recipes",
  RecipeCategory.BAKED_GOODS,
  RecipeCategory.PASTRIES,
  RecipeCategory.CAKES,
  RecipeCategory.COOKIES,
  RecipeCategory.BREADS,
  RecipeCategory.DESSERTS,
  RecipeCategory.MAINS,
  RecipeCategory.APPETIZERS,
  RecipeCategory.SIDES,
  RecipeCategory.BEVERAGES,
  RecipeCategory.SAUCES_CONDIMENTS,
  RecipeCategory.MEAL_PREP,
  RecipeCategory.CATERING,
  RecipeCategory.SNACKS,
  RecipeCategory.OTHER,
]

interface RecipesFiltersProps {
  searchQuery: string
  onSearchChange: (value: string) => void
  selectedCategory: RecipeCategory | "All Recipes"
  onCategoryChange: (value: RecipeCategory | "All Recipes") => void
}

export function RecipesFilters({
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
}: RecipesFiltersProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search recipes..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>

        {/* Category Filter */}
        <select
          value={selectedCategory}
          onChange={(e) =>
            onCategoryChange(e.target.value as RecipeCategory | "All Recipes")
          }
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        >
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}