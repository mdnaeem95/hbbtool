import * as React from "react"
import { Button, Label, Slider, Badge, Checkbox, Separator, cn } from "@homejiak/ui"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@homejiak/ui"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@homejiak/ui"
import { RadioGroup, RadioGroupItem } from "@homejiak/ui"
import { X, Filter, XCircle } from "lucide-react"

export interface FilterOption {
  value: string
  label: string
  count?: number
}

export interface ProductFiltersProps {
  categories?: FilterOption[]
  priceRange?: {
    min: number
    max: number
    current: [number, number]
  }
  sortOptions?: FilterOption[]
  availability?: boolean
  featured?: boolean
  preparationTime?: FilterOption[]
  selectedFilters?: {
    categories?: string[]
    priceRange?: [number, number]
    sort?: string
    availability?: boolean
    featured?: boolean
    preparationTime?: string
  }
  onChange?: (filters: any) => void
  onClear?: () => void
  variant?: "sidebar" | "mobile"
}

export function ProductFilters({
  categories = [],
  priceRange,
  sortOptions = [
    { value: "featured", label: "Featured" },
    { value: "price-asc", label: "Price: Low to High" },
    { value: "price-desc", label: "Price: High to Low" },
    { value: "newest", label: "Newest First" },
    { value: "popular", label: "Most Popular" },
  ],
//   availability,
//   featured,
  preparationTime = [],
  selectedFilters = {},
  onChange,
  onClear,
  variant = "sidebar",
}: ProductFiltersProps) {
  const [localFilters, setLocalFilters] = React.useState(selectedFilters)

  const handleFilterChange = (key: string, value: any) => {
    const newFilters = { ...localFilters, [key]: value }
    setLocalFilters(newFilters)
    onChange?.(newFilters)
  }

  const activeFilterCount = React.useMemo(() => {
    let count = 0
    if (localFilters.categories?.length) count += localFilters.categories.length
    if (localFilters.priceRange) count++
    if (localFilters.availability) count++
    if (localFilters.featured) count++
    if (localFilters.preparationTime) count++
    return count
  }, [localFilters])

  const FilterContent = () => (
    <div className="space-y-6">
      {/* Sort */}
      <div>
        <Label className="text-sm font-medium">Sort By</Label>
        <Select
          value={localFilters.sort || "featured"}
          onValueChange={(value) => handleFilterChange("sort", value)}
        >
          <SelectTrigger className="mt-2 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="w-full">
            {sortOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Separator />

      {/* Categories */}
      {categories.length > 0 && (
        <div>
          <Label className="text-sm font-medium">Categories</Label>
          <div className="mt-3 space-y-2">
            {categories.map((category) => (
              <label
                key={category.value}
                className="flex items-center space-x-2 text-sm"
              >
                <Checkbox
                  checked={localFilters.categories?.includes(category.value)}
                  onCheckedChange={(checked) => {
                    const current = localFilters.categories || []
                    const updated = checked
                      ? [...current, category.value]
                      : current.filter((c) => c !== category.value)
                    handleFilterChange("categories", updated)
                  }}
                />
                <span className="flex-1">{category.label}</span>
                {category.count !== undefined && (
                  <span className="text-xs text-muted-foreground">
                    ({category.count})
                  </span>
                )}
              </label>
            ))}
          </div>
        </div>
      )}

      {categories.length > 0 && <Separator />}

      {/* Price Range */}
      {priceRange && (
        <div>
          <Label className="text-sm font-medium">Price Range</Label>
          <div className="mt-3 space-y-3">
            <Slider
              min={priceRange.min}
              max={priceRange.max}
              step={1}
              value={localFilters.priceRange || priceRange.current}
              onValueChange={(value) => handleFilterChange("priceRange", value)}
              className="mt-3"
            />
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>${localFilters.priceRange?.[0] || priceRange.current[0]}</span>
              <span>${localFilters.priceRange?.[1] || priceRange.current[1]}</span>
            </div>
          </div>
        </div>
      )}

      {priceRange && <Separator />}

      {/* Availability */}
      <div className="space-y-3">
        <label className="flex items-center space-x-2 text-sm">
          <Checkbox
            checked={localFilters.availability}
            onCheckedChange={(checked) => 
              handleFilterChange("availability", checked)
            }
          />
          <span>Available Now</span>
        </label>

        <label className="flex items-center space-x-2 text-sm">
          <Checkbox
            checked={localFilters.featured}
            onCheckedChange={(checked) => 
              handleFilterChange("featured", checked)
            }
          />
          <span>Featured Items</span>
        </label>
      </div>

      {/* Preparation Time */}
      {preparationTime.length > 0 && (
        <>
          <Separator />
          <div>
            <Label className="text-sm font-medium">Preparation Time</Label>
            <RadioGroup
              value={localFilters.preparationTime}
              onValueChange={(value) => handleFilterChange("preparationTime", value)}
              className="mt-3 space-y-2"
            >
              {preparationTime.map((option) => (
                <label
                  key={option.value}
                  className="flex items-center space-x-2 text-sm"
                >
                  <RadioGroupItem value={option.value} />
                  <span>{option.label}</span>
                </label>
              ))}
            </RadioGroup>
          </div>
        </>
      )}

      {/* Clear Filters */}
      {activeFilterCount > 0 && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setLocalFilters({})
            onClear?.()
          }}
          className="w-full"
        >
          Clear All Filters
        </Button>
      )}
    </div>
  )

  if (variant === "mobile") {
    return (
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm">
            <Filter className="mr-2 h-4 w-4" />
            Filters
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Filters</SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            <FilterContent />
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <div className="sticky top-4">
      <div className="rounded-lg border bg-card p-6">
        <h3 className="mb-4 font-semibold">Filters</h3>
        <FilterContent />
      </div>
    </div>
  )
}

export interface ActiveFilter {
  key: string
  value: string
  label: string
}

export interface ActiveFiltersProps {
  filters: ActiveFilter[]
  onRemove: (key: string, value?: string) => void
  onClearAll?: () => void
  className?: string
}

// Active filter badges
export function ActiveFilters({
  filters,
  onRemove,
  onClearAll,
  className,
}: ActiveFiltersProps) {
  if (filters.length === 0) return null

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <span className="text-sm text-muted-foreground">Active filters:</span>
      
      {filters.map((filter, index) => (
        <Badge
          key={`${filter.key}-${filter.value}-${index}`}
          variant="secondary"
          className="gap-1 pr-1 hover:bg-secondary/80 transition-colors"
        >
          <span className="text-xs">{filter.label}</span>
          <button
            onClick={() => onRemove(filter.key, filter.value)}
            className="ml-1 rounded-sm hover:bg-background/80 transition-colors p-0.5"
            aria-label={`Remove ${filter.label} filter`}
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
      
      {onClearAll && filters.length > 1 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearAll}
          className="h-7 text-xs gap-1"
        >
          <XCircle className="h-3.5 w-3.5" />
          Clear all
        </Button>
      )}
    </div>
  )
}