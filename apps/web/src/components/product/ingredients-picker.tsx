"use client"

import { useState } from "react"
import { Check, X, Plus } from "lucide-react"
import { api } from "@/lib/trpc/client"
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Badge,
  cn,
} from "@homejiak/ui"

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

  // Get ALL global ingredients (not just merchant's inventory)
  const { data: ingredientsData } = api.ingredients.getAll.useQuery({
    search: search || undefined,
    limit: 50,
  })
  const ingredients = ingredientsData?.ingredients || []

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
          Link ingredients to track costs and manage stock
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
          <PopoverContent 
            className="w-[400px] p-0 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 shadow-lg" 
            align="start"
          >
            <Command shouldFilter={false} className="bg-white dark:bg-gray-950">
              <CommandInput
                placeholder="Search ingredients..."
                value={search}
                onValueChange={setSearch}
                className="border-b"
              />
              <CommandList className="bg-white dark:bg-gray-950">
                {ingredients.length === 0 ? (
                  <CommandEmpty>
                    <div className="py-6 text-center">
                      <p className="text-sm text-muted-foreground mb-2">
                        No ingredients found
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Try searching for common ingredients like "flour", "sugar", etc.
                      </p>
                    </div>
                  </CommandEmpty>
                ) : (
                  <CommandGroup className="p-2">
                    {ingredients.map((ingredient) => {
                      const isSelected = selectedIngredients.includes(ingredient.id)
                      return (
                        <CommandItem
                          key={ingredient.id}
                          value={ingredient.id}
                          onSelect={() => handleToggle(ingredient.id)}
                          className="cursor-pointer px-2 py-2.5 rounded-sm"
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              isSelected ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <div className="flex-1">
                            <p className="font-medium">{ingredient.name}</p>
                            {ingredient.category && (
                              <p className="text-xs text-muted-foreground">
                                {ingredient.category}
                              </p>
                            )}
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