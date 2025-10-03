"use client"

import { useState } from "react"
import { Check, X, Plus } from "lucide-react"
import { api } from "@/lib/trpc/client"
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle,
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
  Popover, PopoverContent, PopoverTrigger, Badge, cn } from "@homejiak/ui"

interface IngredientsPickerProps {
  selectedIngredients: string[] // Array of ingredient IDs
  onChange: (ingredientIds: string[]) => void
  disabled?: boolean
}

export function IngredientsPicker({
  selectedIngredients = [],
  onChange,
  disabled = false,
}: IngredientsPickerProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")

  // Get merchant's ingredients
  const { data: inventoryData } = api.ingredients.getMerchantInventory.useQuery({})
  const ingredients = inventoryData?.ingredients || []

  // Filter ingredients based on search
  const filteredIngredients = ingredients.filter((ing) =>
    ing.name.toLowerCase().includes(search.toLowerCase())
  )

  // Get selected ingredient details
  const selectedIngredientDetails = ingredients.filter((ing) =>
    selectedIngredients.includes(ing.id)
  )

  const handleToggle = (ingredientId: string) => {
    if (selectedIngredients.includes(ingredientId)) {
      onChange(selectedIngredients.filter((id) => id !== ingredientId))
    } else {
      onChange([...selectedIngredients, ingredientId])
    }
  }

  const handleRemove = (ingredientId: string) => {
    onChange(selectedIngredients.filter((id) => id !== ingredientId))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ingredients</CardTitle>
        <CardDescription>
          Link ingredients from your inventory to track costs and manage stock
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Selected Ingredients */}
        {selectedIngredientDetails.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedIngredientDetails.map((ingredient) => (
              <Badge
                key={ingredient.id}
                variant="secondary"
                className="gap-1 pr-1"
              >
                {ingredient.name}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 hover:bg-transparent"
                  onClick={() => handleRemove(ingredient.id)}
                  disabled={disabled}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ))}
          </div>
        )}

        {/* Add Ingredients Popover */}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-start"
              disabled={disabled}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Ingredients
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[400px] p-0" align="start">
            <Command shouldFilter={false}>
              <CommandInput
                placeholder="Search ingredients..."
                value={search}
                onValueChange={setSearch}
              />
              <CommandList>
                {filteredIngredients.length === 0 ? (
                  <CommandEmpty>
                    {ingredients.length === 0 ? (
                      <div className="py-6 text-center">
                        <p className="text-sm text-muted-foreground mb-2">
                          No ingredients in your inventory yet
                        </p>
                        <Button
                          variant="link"
                          size="sm"
                          onClick={() => {
                            window.location.href = "/dashboard/ingredients"
                          }}
                        >
                          Add ingredients to inventory
                        </Button>
                      </div>
                    ) : (
                      <p className="py-6 text-center text-sm text-muted-foreground">
                        No ingredients found
                      </p>
                    )}
                  </CommandEmpty>
                ) : (
                  <CommandGroup>
                    {filteredIngredients.map((ingredient) => {
                      const isSelected = selectedIngredients.includes(
                        ingredient.id
                      )
                      return (
                        <CommandItem
                          key={ingredient.id}
                          value={ingredient.id}
                          onSelect={() => handleToggle(ingredient.id)}
                          className="cursor-pointer"
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              isSelected ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <div className="flex-1">
                            <p className="font-medium">{ingredient.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {ingredient.currentStock}{" "}
                              {ingredient.purchaseUnit} in stock
                            </p>
                          </div>
                        </CommandItem>
                      )
                    })}
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {selectedIngredientDetails.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No ingredients selected yet
          </p>
        )}
      </CardContent>
    </Card>
  )
}