"use client"

import { useState } from "react"
import { api } from "../../../../lib/trpc/client"
import { RecipesHeader, RecipesStats, RecipesFilters, RecipesList, CreateRecipeModal, EditRecipeModal, PricingCalculatorModal, n } from "../../../../components/recipes"
import { RecipeCategory } from "@homejiak/api"

export default function RecipesPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<RecipeCategory | "All Recipes">("All Recipes")
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showCalculator, setShowCalculator] = useState(false)
  const [editingRecipe, setEditingRecipe] = useState<string | null>(null)
  const [calculatorRecipe, setCalculatorRecipe] = useState<string | null>(null)

  // Fetch recipes with filters
  const { data, isLoading, refetch } = api.recipe.getAll.useQuery({
    page: 1,
    limit: 100,
    search: searchQuery || undefined,
    category: selectedCategory !== "All Recipes" ? selectedCategory : undefined,
  })

  // Calculate stats
  const totalRecipes = data?.recipes.length || 0
  const avgCostPerUnit = data?.recipes.length
    ? data.recipes.reduce((sum, r) => sum + n(r?.costPerUnit), 0) / data.recipes.length
    : 0
  const linkedProducts = data?.recipes.filter((r) => r.products.length > 0).length || 0

  const handleViewPricing = (recipeId: string) => {
    setCalculatorRecipe(recipeId)
    setShowCalculator(true)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <RecipesHeader
        onAddClick={() => setShowCreateModal(true)}
        onCalculatorClick={() => setShowCalculator(true)}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <RecipesStats
          totalRecipes={totalRecipes}
          avgCostPerUnit={avgCostPerUnit}
          linkedProducts={linkedProducts}
        />

        <RecipesFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
        />

        <RecipesList
          recipes={data?.recipes || []}
          isLoading={isLoading}
          onEdit={(id) => setEditingRecipe(id)}
          onViewPricing={handleViewPricing}
          onRefetch={refetch}
        />
      </div>

      {showCreateModal && (
        <CreateRecipeModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false)
            refetch()
          }}
        />
      )}

      {editingRecipe && (
        <EditRecipeModal
          recipeId={editingRecipe}
          onClose={() => setEditingRecipe(null)}
          onSuccess={() => {
            setEditingRecipe(null)
            refetch()
          }}
        />
      )}

      {showCalculator && (
        <PricingCalculatorModal
          recipeId={calculatorRecipe}
          onClose={() => {
            setShowCalculator(false)
            setCalculatorRecipe(null)
          }}
        />
      )}
    </div>
  )
}