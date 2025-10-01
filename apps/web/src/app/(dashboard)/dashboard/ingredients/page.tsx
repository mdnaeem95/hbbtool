"use client"

import { useState } from "react"
import { api } from "../../../../lib/trpc/client"
import { IngredientsHeader, IngredientsStats, IngredientsFilters, IngredientsList, AddIngredientModal, EditIngredientModal } from "../../../../components/ingredients"
import { IngredientCategory } from "../../../../types/ingredients"
import type { Ingredient as UIIngredient, IngredientCategory as UIIngredientCategory, MeasurementUnit as UIMeasurementUnit } from "../../../../types/ingredients"
import { RouterOutputs } from "../../../../lib/trpc/types"

type ApiIngredient = RouterOutputs["ingredients"]["getAll"]["ingredients"][number]

// adapter
function toUiIngredient(x: ApiIngredient): UIIngredient {
  return {
    id: x.id,
    name: x.name,
    // normalize nulls for UI expectations
    description: (x as any).description ?? undefined,
    // Cast enums from Prisma enum type → UI union (strings are identical)
    category: x.category as unknown as UIIngredientCategory,
    purchaseUnit: x.purchaseUnit as unknown as UIMeasurementUnit,
    isGlobal: x.isGlobal,
    isCustom: x.isCustom,
    pricePerUnit: x.pricePerUnit,
    currentStock: x.currentStock,
    preferredStore: (x as any).preferredStore ?? null,
    shelfLifeDays: (x as any).shelfLifeDays ?? null,
    // include only if your UI Ingredient type has it
    reorderPoint: (x as any).reorderPoint ?? null,
    allergens: (x as any).allergens ?? [],
  }
}

export default function IngredientsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<IngredientCategory | "All Categories">("All Categories")
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingIngredient, setEditingIngredient] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [filterLowStock, setFilterLowStock] = useState(false)
  const [filterCustomOnly, setFilterCustomOnly] = useState(false)
  const [filterHasAllergens, setFilterHasAllergens] = useState(false)

  

  // Fetch ingredients with filters
  const { data, isLoading, refetch } = api.ingredients.getAll.useQuery({
    page: 1,
    limit: 100,
    search: searchQuery || undefined,
    category: selectedCategory !== "All Categories" ? selectedCategory : undefined,
    includeCustom: true,
    includeGlobal: true,
  })

  const apiIngredients = data?.ingredients ?? []
  const uiIngredients = apiIngredients.map(toUiIngredient)

  // Filter ingredients based on local filters
  const filteredIngredients = uiIngredients.filter((ing) => {
    if (filterLowStock && ing.currentStock > (ing.reorderPoint || 0)) return false
    if (filterCustomOnly && !ing.isCustom) return false
    if (filterHasAllergens && ing.allergens.length === 0) return false
    return true
  }) || []

  // Calculate stats
  const lowStockCount = data?.ingredients.filter(
    (i) => i.currentStock <= (i.reorderPoint || 0)
  ).length || 0
  
  const totalValue = data?.ingredients.reduce(
    (sum, i) => sum + (i.pricePerUnit * i.currentStock),
    0
  ) || 0

  return (
    <div className="min-h-screen bg-gray-50">
      <IngredientsHeader onAddClick={() => setShowAddModal(true)} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <IngredientsStats
          totalIngredients={data?.ingredients.length || 0}
          lowStockCount={lowStockCount}
          totalValue={totalValue}
        />

        <IngredientsFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          showFilters={showFilters}
          onToggleFilters={() => setShowFilters(!showFilters)}
          filterLowStock={filterLowStock}
          onFilterLowStockChange={setFilterLowStock}
          filterCustomOnly={filterCustomOnly}
          onFilterCustomOnlyChange={setFilterCustomOnly}
          filterHasAllergens={filterHasAllergens}
          onFilterHasAllergensChange={setFilterHasAllergens}
        />

        <IngredientsList
          ingredients={filteredIngredients}
          isLoading={isLoading}
          onEdit={(id) => setEditingIngredient(id)}
          onRefetch={refetch}
        />
      </div>

      {showAddModal && (
        <AddIngredientModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false)
            refetch()
          }}
        />
      )}

      {editingIngredient && (
        <EditIngredientModal
          ingredientId={editingIngredient}
          onClose={() => setEditingIngredient(null)}
          onSuccess={() => {
            setEditingIngredient(null)
            refetch()
          }}
        />
      )}
    </div>
  )
}