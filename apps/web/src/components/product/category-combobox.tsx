"use client"

import { useState } from "react"
import { Check, ChevronsUpDown, Plus, Loader2 } from "lucide-react"
import { api } from "../../lib/trpc/client"
import { Button, Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, Popover, PopoverContent, PopoverTrigger, cn } from "@homejiak/ui"

interface CategoryComboboxProps {
  value?: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
}

export function CategoryCombobox({
  value,
  onChange,
  placeholder = "Select or create category...",
  disabled = false,
}: CategoryComboboxProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")

  // Get categories with search
  const { data: categories, isLoading } = api.category.search.useQuery({
    query: search,
    limit: 10,
  })

  // Get popular categories for suggestions
  const { data: popularCategories } = api.category.getPopular.useQuery({
    limit: 5,
  })

  // Create new category mutation
  const utils = api.useUtils()
  const createCategory = api.category.create.useMutation({
    onSuccess: (newCategory) => {
      onChange(newCategory.id)
      setOpen(false)
      setSearch("")
      // Invalidate queries to refetch
      utils.category.search.invalidate()
      utils.category.getPopular.invalidate()
    },
  })

  // Get selected category name
  const selectedCategory = categories?.find((c) => c.id === value)

  const handleSelect = (categoryId: string) => {
    onChange(categoryId)
    setOpen(false)
  }

  const handleCreate = () => {
    if (search.trim() && !createCategory.isPending) {
      createCategory.mutate({ name: search.trim() })
    }
  }

  // Show popular categories when no search query
  const displayCategories = search ? categories : popularCategories || categories

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
        >
          {selectedCategory ? selectedCategory.name : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0 bg-white dark:bg-gray-950" align="start">
        <Command shouldFilter={false} className="bg-white dark:bg-gray-950">
          <CommandInput
            placeholder="Search or type new..."
            value={search}
            onValueChange={setSearch}
            className="border-b"
          />
          <CommandList className="max-h-[300px]">
            {isLoading && (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span className="text-sm text-muted-foreground">Loading categories...</span>
              </div>
            )}
            
            {!isLoading && displayCategories && displayCategories.length > 0 && (
              <CommandGroup
                heading={search ? "Search Results" : "Popular Categories"}
              >
                {displayCategories.map((category) => (
                  <CommandItem
                    key={category.id}
                    value={category.id}
                    onSelect={() => handleSelect(category.id)}
                    className="cursor-pointer"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === category.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {category.name}
                    {category.usageCount > 0 && (
                      <span className="ml-auto text-xs text-muted-foreground">
                        {category.usageCount} {category.usageCount === 1 ? "use" : "uses"}
                      </span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {!isLoading && search && displayCategories?.length === 0 && (
              <CommandEmpty>
                <Button
                  variant="ghost"
                  onClick={handleCreate}
                  disabled={createCategory.isPending}
                  className="w-full justify-start"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {createCategory.isPending
                    ? "Creating..."
                    : `Create "${search}"`}
                </Button>
              </CommandEmpty>
            )}

            {!isLoading && !search && (!displayCategories || displayCategories.length === 0) && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                <p>No categories yet.</p>
                <p className="text-xs mt-1">Type to create your first category</p>
              </div>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}