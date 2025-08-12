'use client'

import { useState, useCallback } from 'react'
import { Input, Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@kitchencloud/ui'
import { Search, Filter, MapPin, X } from 'lucide-react'
import { useDebounce } from '@/hooks/use-debounce'


interface MapSearchHeaderProps {
  onSearch: (query: string) => void
  onFilterChange: (filters: FilterState) => void
  totalResults: number
  isLoading?: boolean
}

export interface FilterState {
  cuisine?: string
  isOpen?: boolean
  hasDelivery?: boolean
  minRating?: number
  maxDeliveryFee?: number
}

const CUISINE_OPTIONS = [
  { value: 'all', label: 'All Cuisines' },
  { value: 'chinese', label: 'Chinese' },
  { value: 'malay', label: 'Malay' },
  { value: 'indian', label: 'Indian' },
  { value: 'western', label: 'Western' },
  { value: 'japanese', label: 'Japanese' },
  { value: 'korean', label: 'Korean' },
  { value: 'thai', label: 'Thai' },
  { value: 'peranakan', label: 'Peranakan' },
  { value: 'halal', label: 'Halal' },
  { value: 'vegetarian', label: 'Vegetarian' },
]

export function MapSearchHeader({
  onSearch,
  onFilterChange,
  totalResults,
  isLoading
}: MapSearchHeaderProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<FilterState>({})
  
  const debouncedSearch = useDebounce(searchQuery, 300)

  // Handle search
  useCallback(() => {
    onSearch(debouncedSearch)
  }, [debouncedSearch, onSearch])

  // Handle filter changes
  const handleFilterChange = (key: keyof FilterState, value: any) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    onFilterChange(newFilters)
  }

  // Clear all filters
  const clearFilters = () => {
    setFilters({})
    onFilterChange({})
  }

  const activeFilterCount = Object.values(filters).filter(v => v !== undefined).length

  return (
    <div className="bg-background border-b">
      <div className="p-4 space-y-4">
        {/* Search Bar */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search merchants, dishes, or cuisines..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            variant={showFilters ? 'default' : 'outline'}
            size="icon"
            onClick={() => setShowFilters(!showFilters)}
            className="relative"
          >
            <Filter className="h-4 w-4" />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </Button>
        </div>

        {/* Results Count */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>
              {isLoading ? 'Searching...' : `${totalResults} merchants near you`}
            </span>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="space-y-3 pt-3 border-t">
            <div className="grid grid-cols-2 gap-3">
              {/* Cuisine Filter */}
              <Select
                value={filters.cuisine || 'all'}
                onValueChange={(value) => handleFilterChange('cuisine', value === 'all' ? undefined : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Cuisine" />
                </SelectTrigger>
                <SelectContent>
                  {CUISINE_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Open Now Filter */}
              <Select
                value={filters.isOpen?.toString() || 'all'}
                onValueChange={(value) => handleFilterChange('isOpen', value === 'all' ? undefined : value === 'true')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Open Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any Time</SelectItem>
                  <SelectItem value="true">Open Now</SelectItem>
                  <SelectItem value="false">Closed</SelectItem>
                </SelectContent>
              </Select>

              {/* Delivery Option */}
              <Select
                value={filters.hasDelivery?.toString() || 'all'}
                onValueChange={(value) => handleFilterChange('hasDelivery', value === 'all' ? undefined : value === 'true')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Delivery" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Options</SelectItem>
                  <SelectItem value="true">Delivery Available</SelectItem>
                  <SelectItem value="false">Pickup Only</SelectItem>
                </SelectContent>
              </Select>

              {/* Rating Filter */}
              <Select
                value={filters.minRating?.toString() || 'all'}
                onValueChange={(value) => handleFilterChange('minRating', value === 'all' ? undefined : parseFloat(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Rating" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any Rating</SelectItem>
                  <SelectItem value="4.5">4.5+ Stars</SelectItem>
                  <SelectItem value="4">4+ Stars</SelectItem>
                  <SelectItem value="3.5">3.5+ Stars</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Clear Filters */}
            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="w-full"
              >
                <X className="h-4 w-4 mr-2" />
                Clear {activeFilterCount} {activeFilterCount === 1 ? 'filter' : 'filters'}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}