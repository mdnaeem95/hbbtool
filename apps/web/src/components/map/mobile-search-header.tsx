'use client'

import { Search, Filter, MapPin, List, Map } from 'lucide-react'
import { Input, Button, Badge, Sheet, SheetContent, SheetHeader, SheetTitle } from '@kitchencloud/ui'
import { useState } from 'react'
import { FilterState } from '../../app/page'

interface MobileSearchHeaderProps {
  searchQuery: string
  setSearchQuery: (query: string) => void
  filters: FilterState
  setFilters: (filters: FilterState) => void
  totalResults: number
  isLoading: boolean
  onToggleView?: () => void
  isListView?: boolean
}

const CUISINE_OPTIONS = [
  { value: 'chinese', label: '🥟 Chinese' },
  { value: 'malay', label: '🍛 Malay' },
  { value: 'indian', label: '🍛 Indian' },
  { value: 'western', label: '🍔 Western' },
  { value: 'japanese', label: '🍱 Japanese' },
  { value: 'korean', label: '🥘 Korean' },
  { value: 'thai', label: '🍜 Thai' },
  { value: 'desserts', label: '🍰 Desserts' },
]

const DIETARY_OPTIONS: { value: 'HALAL' | 'VEGETARIAN' | 'VEGAN'; label: string }[] = [
  { value: 'HALAL', label: 'Halal' },
  { value: 'VEGETARIAN', label: 'Vegetarian' },
  { value: 'VEGAN', label: 'Vegan' },
]

export function MobileSearchHeader({
  searchQuery,
  setSearchQuery,
  filters,
  setFilters,
  totalResults,
  isLoading,
  onToggleView,
  isListView = false,
}: MobileSearchHeaderProps) {
  const [showFilters, setShowFilters] = useState(false)
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery)

  const activeFilterCount = Object.values(filters).filter(v => 
    Array.isArray(v) ? v.length > 0 : v === true
  ).length

  const toggleCuisine = (cuisine: string) => {
    const current = filters.cuisineType || []
    setFilters({
      ...filters,
      cuisineType: current.includes(cuisine)
        ? current.filter(c => c !== cuisine)
        : [...current, cuisine]
    })
  }

  const toggleDietary = (option: 'HALAL' | 'VEGETARIAN' | 'VEGAN') => {
    const current = filters.dietaryOptions || []
    setFilters({
      ...filters,
      dietaryOptions: current.includes(option)
        ? current.filter(d => d !== option)
        : [...current, option]
    })
  }

  const clearFilters = () => {
    setFilters({})
  }

  return (
    <>
      <div className="bg-white border-b sticky top-0 z-20 shadow-sm">
        {/* Search Bar Row */}
        <div className="p-3 space-y-2">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="search"
                placeholder="Search food or merchants..."
                value={localSearchQuery}
                onChange={(e: any) => setLocalSearchQuery(e.target.value)}
                onBlur={() => setSearchQuery(localSearchQuery)}
                onKeyDown={(e: any) => {
                  if (e.key === 'Enter') {
                    setSearchQuery(localSearchQuery)
                    e.currentTarget.blur()
                  }
                }}
                className="pl-9 pr-3 h-10 text-sm bg-gray-50 border-gray-200 focus:bg-white"
              />
            </div>
            
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowFilters(true)}
              className="h-10 w-10 border-gray-200 relative"
            >
              <Filter className="h-4 w-4" />
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-orange-500 text-white text-[10px] rounded-full flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </Button>

            {onToggleView && (
              <Button
                variant="outline"
                size="icon"
                onClick={onToggleView}
                className="h-10 w-10 border-gray-200"
              >
                {isListView ? <Map className="h-4 w-4" /> : <List className="h-4 w-4" />}
              </Button>
            )}
          </div>

          {/* Results Count & Active Filters */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <MapPin className="h-3 w-3" />
              <span>
                {isLoading ? 'Finding merchants...' : `${totalResults} merchants near you`}
              </span>
            </div>
          </div>

          {/* Active Filter Pills */}
          {activeFilterCount > 0 && (
            <div className="flex gap-1 overflow-x-auto pb-1 -mx-3 px-3 scrollbar-hide">
              {filters.cuisineType?.map(cuisine => (
                <Badge 
                  key={cuisine} 
                  className="bg-orange-100 text-orange-800 border-orange-200 text-xs whitespace-nowrap"
                >
                  {CUISINE_OPTIONS.find(c => c.value === cuisine)?.label || cuisine}
                </Badge>
              ))}
              {filters.dietaryOptions?.map(option => (
                <Badge 
                  key={option} 
                  className="bg-purple-100 text-purple-800 border-purple-200 text-xs whitespace-nowrap"
                >
                  {DIETARY_OPTIONS.find(d => d.value === option)?.label || option}
                </Badge>
              ))}
              {filters.deliveryOnly && (
                <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-xs">
                  Delivery
                </Badge>
              )}
              {filters.pickupOnly && (
                <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">
                  Pickup
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Filter Sheet */}
      <Sheet open={showFilters} onOpenChange={setShowFilters}>
        <SheetContent side="bottom" className="h-[80vh] rounded-t-xl">
          <SheetHeader className="pb-4 border-b">
            <div className="flex items-center justify-between">
              <SheetTitle>Filters</SheetTitle>
              {activeFilterCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="text-orange-600"
                >
                  Clear all
                </Button>
              )}
            </div>
          </SheetHeader>
          
          <div className="py-4 space-y-6 overflow-y-auto">
            {/* Cuisine Types */}
            <div>
              <h3 className="font-medium text-sm mb-3">Cuisine Type</h3>
              <div className="flex flex-wrap gap-2">
                {CUISINE_OPTIONS.map(option => (
                  <Button
                    key={option.value}
                    variant={filters.cuisineType?.includes(option.value) ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleCuisine(option.value)}
                    className={
                      filters.cuisineType?.includes(option.value)
                        ? "bg-orange-500 hover:bg-orange-600 text-white"
                        : "border-gray-200"
                    }
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Dietary Options */}
            <div>
              <h3 className="font-medium text-sm mb-3">Dietary Preferences</h3>
              <div className="flex flex-wrap gap-2">
                {DIETARY_OPTIONS.map(option => (
                  <Button
                    key={option.value}
                    variant={filters.dietaryOptions?.includes(option.value) ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleDietary(option.value)}
                    className={
                      filters.dietaryOptions?.includes(option.value)
                        ? "bg-purple-500 hover:bg-purple-600 text-white"
                        : "border-gray-200"
                    }
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Service Type */}
            <div>
              <h3 className="font-medium text-sm mb-3">Service Type</h3>
              <div className="flex gap-2">
                <Button
                  variant={filters.deliveryOnly ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilters({ ...filters, deliveryOnly: !filters.deliveryOnly, pickupOnly: false })}
                  className={
                    filters.deliveryOnly
                      ? "bg-blue-500 hover:bg-blue-600 text-white"
                      : "border-gray-200"
                  }
                >
                  🚴 Delivery Only
                </Button>
                <Button
                  variant={filters.pickupOnly ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilters({ ...filters, pickupOnly: !filters.pickupOnly, deliveryOnly: false })}
                  className={
                    filters.pickupOnly
                      ? "bg-green-500 hover:bg-green-600 text-white"
                      : "border-gray-200"
                  }
                >
                  🏪 Pickup Only
                </Button>
              </div>
            </div>
          </div>

          {/* Apply Button */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t">
            <Button 
              onClick={() => setShowFilters(false)}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white"
            >
              Show Results
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}