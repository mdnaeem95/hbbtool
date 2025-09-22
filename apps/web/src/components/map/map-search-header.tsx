'use client'

import { useState, useEffect } from 'react'
import { Input, Button, Badge, Popover, PopoverContent, PopoverTrigger, Separator } from '@homejiak/ui'
import { Search, Filter, MapPin, X } from 'lucide-react'
import { useDebounce } from '../../hooks/use-debounce'

export interface FilterState {
  cuisineType?: string[]
  dietaryOptions?: ('HALAL' | 'VEGETARIAN' | 'VEGAN')[]
  priceRange?: {
    min?: number
    max?: number
  }
  deliveryOnly?: boolean
  pickupOnly?: boolean
}

interface MapSearchHeaderProps {
  onSearch: (query: string) => void
  onFilterChange: (filters: FilterState) => void
  totalResults: number
  isLoading?: boolean
}

const CUISINE_OPTIONS = [
  { value: 'chinese', label: 'Chinese' },
  { value: 'malay', label: 'Malay' },
  { value: 'indian', label: 'Indian' },
  { value: 'western', label: 'Western' },
  { value: 'japanese', label: 'Japanese' },
  { value: 'korean', label: 'Korean' },
  { value: 'thai', label: 'Thai' },
  { value: 'vietnamese', label: 'Vietnamese' },
  { value: 'italian', label: 'Italian' },
  { value: 'mexican', label: 'Mexican' },
  { value: 'peranakan', label: 'Peranakan' },
  { value: 'desserts', label: 'Desserts' },
  { value: 'bakery', label: 'Bakery' },
  { value: 'beverages', label: 'Beverages' },
]

const DIETARY_OPTIONS = [
  { value: 'HALAL', label: 'Halal' },
  { value: 'VEGETARIAN', label: 'Vegetarian' },
  { value: 'VEGAN', label: 'Vegan' },
]

export function MapSearchHeader({
  onSearch,
  onFilterChange,
  totalResults,
  isLoading
}: MapSearchHeaderProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState<FilterState>({})
  const [showFilters, setShowFilters] = useState(false)
  
  const debouncedSearch = useDebounce(searchQuery, 300)

  useEffect(() => {
    onSearch(debouncedSearch)
  }, [debouncedSearch, onSearch])

  // Handle filter changes
  const handleFilterChange = <K extends keyof FilterState>(
    key: K,
    value: FilterState[K]
  ) => {
    setFilters(prev => {
      const next = { ...prev, [key]: value }
      // drop undefined keys so counts stay correct
      if (next[key] === undefined) delete (next as any)[key]
      onFilterChange(next)
      return next
    })
  }

  // Toggle cuisine type
  const toggleCuisine = (cuisine: string) => {
    const current = filters.cuisineType || []
    const updated = current.includes(cuisine)
      ? current.filter(c => c !== cuisine)
      : [...current, cuisine]
    handleFilterChange('cuisineType', updated.length > 0 ? updated : undefined)
  }

  // Toggle dietary option
  const toggleDietary = (option: 'HALAL' | 'VEGETARIAN' | 'VEGAN') => {
    const current = filters.dietaryOptions || []
    const updated = current.includes(option)
      ? current.filter(d => d !== option)
      : [...current, option]
    handleFilterChange('dietaryOptions', updated.length > 0 ? updated : undefined)
  }

  const toggleDeliveryOnly = () => {
    setFilters(prev => {
      const deliveryOnly = !prev.deliveryOnly
      const next = {
        ...prev,
        deliveryOnly: deliveryOnly || undefined, // store only when true
        pickupOnly: undefined,                   // clear the other
      }
      onFilterChange(next)
      return next
    })
  }

  const togglePickupOnly = () => {
    setFilters(prev => {
      const pickupOnly = !prev.pickupOnly
      const next = {
        ...prev,
        pickupOnly: pickupOnly || undefined,
        deliveryOnly: undefined,
      }
      onFilterChange(next)
      return next
    })
  }

  // Clear all filters
  const clearFilters = () => {
    setFilters({})
    onFilterChange({})
  }

  const activeFilterCount = Object.values(filters).filter(v => 
    v !== undefined && (Array.isArray(v) ? v.length > 0 : true)
  ).length

  return (
    <div className="bg-background border-b sticky top-0 z-10">
      <div className="container mx-auto p-4">
        <div className="flex gap-3 items-center">
          {/* Search Bar */}
          <div className="relative flex-1 max-w-xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search merchants, dishes, or cuisines..."
              value={searchQuery}
              onChange={(e: any) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4"
            />
          </div>

          {/* Filter Button with Popover */}
          <Popover open={showFilters} onOpenChange={setShowFilters}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="relative">
                <Filter className="h-4 w-4 mr-2" />
                Filters
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-96 p-0 bg-background" align="end">
              <div className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Filter Merchants</h3>
                  {activeFilterCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearFilters}
                      className='bg-muted hover:bg-muted/80'
                    >
                      Clear All
                    </Button>
                  )}
                </div>
                
                <Separator />

                {/* Cuisine Types */}
                <div>
                  <h4 className="font-medium mb-3">Cuisine Type</h4>
                  <div className="flex flex-wrap gap-2">
                    {CUISINE_OPTIONS.map(option => (
                      <Button
                        key={option.value}
                        variant={filters.cuisineType?.includes(option.value) ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleCuisine(option.value)}
                        className="h-8"
                      >
                        {option.label}
                      </Button>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Dietary Options */}
                <div>
                  <h4 className="font-medium mb-3">Dietary Preferences</h4>
                  <div className="flex flex-wrap gap-2">
                    {DIETARY_OPTIONS.map(option => (
                      <Button
                        key={option.value}
                        variant={filters.dietaryOptions?.includes(option.value as any) ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleDietary(option.value as any)}
                        className="h-8"
                      >
                        {option.label}
                      </Button>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Service Options */}
                <div>
                  <h4 className="font-medium mb-3">Service Type</h4>
                  <div className="flex gap-2">
                    <Button
                      variant={filters.deliveryOnly ? "default" : "outline"}
                      size="sm"
                      onClick={toggleDeliveryOnly}
                      className="h-8"
                    >
                      Delivery Only
                    </Button>
                    <Button
                      variant={filters.pickupOnly ? "default" : "outline"}
                      size="sm"
                      onClick={togglePickupOnly}
                      className="h-8"
                    >
                      Pickup Only 
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* Actions */}
                <div className="flex gap-2 pt-2 bg-muted/50 -mx-4 -mb-4 p-4 rounded-b-lg">
                  <Button
                    variant="outline"
                    onClick={() => setShowFilters(false)}
                    className="flex-1 bg-background hover:bg-muted"
                  >
                    Close
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Results Count */}
          <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>
              {isLoading ? 'Searching...' : `${totalResults} merchants`}
            </span>
          </div>
        </div>

        {/* Mobile Results Count */}
        <div className="sm:hidden mt-3 flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4" />
          <span>
            {isLoading ? 'Searching...' : `${totalResults} merchants near you`}
          </span>
        </div>

        {/* Active Filters Display */}
        {activeFilterCount > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {filters.cuisineType?.map(cuisine => (
              <Badge key={cuisine} variant="secondary" className="gap-1">
                {CUISINE_OPTIONS.find(c => c.value === cuisine)?.label || cuisine}
                <button
                  onClick={() => toggleCuisine(cuisine)}
                  className="ml-1 hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            {filters.dietaryOptions?.map(option => (
              <Badge key={option} variant="secondary" className="gap-1">
                {DIETARY_OPTIONS.find(d => d.value === option)?.label || option}
                <button
                  onClick={() => toggleDietary(option)}
                  className="ml-1 hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            {filters.deliveryOnly && (
              <Badge variant="secondary" className="gap-1">
                Delivery Only
                <button
                  onClick={() => handleFilterChange('deliveryOnly', false)}
                  className="ml-1 hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {filters.pickupOnly && (
              <Badge variant="secondary" className="gap-1">
                Pickup Only
                <button
                  onClick={() => handleFilterChange('pickupOnly', false)}
                  className="ml-1 hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
          </div>
        )}
      </div>
    </div>
  )
}