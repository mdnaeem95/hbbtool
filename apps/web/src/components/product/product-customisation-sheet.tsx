"use client"

import { useState, useEffect } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, Button, Label,
  RadioGroup, RadioGroupItem, Checkbox, Badge, ScrollArea } from "@homejiak/ui"
import { Plus, Minus, ShoppingCart } from "lucide-react"
import { useCart } from "../../stores/cart-store"
import { formatPrice } from "../../lib/utils"

interface ProductCustomizationSheetProps {
  product: any
  isOpen: boolean
  onClose: () => void
}

export function ProductCustomizationSheet({
  product,
  isOpen,
  onClose
}: ProductCustomizationSheetProps) {
  const [quantity, setQuantity] = useState(1)
  const [selectedModifiers, setSelectedModifiers] = useState<Record<string, any>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const { addItem } = useCart()

  // Initialize default selections
  useEffect(() => {
    if (!product?.modifierGroups) return
    
    const defaults: Record<string, any> = {}
    product.modifierGroups.forEach((group: any) => {
      if (group.type === "SINGLE_SELECT") {
        // Set default for single select if available
        const defaultModifier = group.modifiers.find((m: any) => m.isDefault)
        if (defaultModifier) {
          defaults[group.id] = defaultModifier.id
        } else if (group.required && group.modifiers.length > 0) {
          defaults[group.id] = group.modifiers[0].id
        }
      } else {
        // Set defaults for multi-select
        const defaultModifiers = group.modifiers.filter((m: any) => m.isDefault)
        defaults[group.id] = defaultModifiers.map((m: any) => m.id)
      }
    })
    setSelectedModifiers(defaults)
  }, [product])

  const calculateTotalPrice = () => {
    let price = product.price
    
    // Add modifier prices
    product.modifierGroups?.forEach((group: any) => {
      if (group.type === "SINGLE_SELECT") {
        const selectedId = selectedModifiers[group.id]
        const modifier = group.modifiers.find((m: any) => m.id === selectedId)
        if (modifier) {
          price += modifier.priceAdjustment
        }
      } else {
        const selectedIds = selectedModifiers[group.id] || []
        selectedIds.forEach((id: string) => {
          const modifier = group.modifiers.find((m: any) => m.id === id)
          if (modifier) {
            price += modifier.priceAdjustment
          }
        })
      }
    })
    
    return price * quantity
  }

  const handleSingleSelect = (groupId: string, modifierId: string) => {
    setSelectedModifiers(prev => ({
      ...prev,
      [groupId]: modifierId
    }))
    // Clear error for this group
    setErrors(prev => {
      const newErrors = { ...prev }
      delete newErrors[groupId]
      return newErrors
    })
  }

  const handleMultiSelect = (groupId: string, modifierId: string, checked: boolean) => {
    setSelectedModifiers(prev => {
      const current = prev[groupId] || []
      let updated: string[]
      
      if (checked) {
        updated = [...current, modifierId]
      } else {
        updated = current.filter((id: string) => id !== modifierId)
      }
      
      return { ...prev, [groupId]: updated }
    })
    // Clear error for this group
    setErrors(prev => {
      const newErrors = { ...prev }
      delete newErrors[groupId]
      return newErrors
    })
  }

  const validateSelections = () => {
    const newErrors: Record<string, string> = {}
    
    product.modifierGroups?.forEach((group: any) => {
      if (group.required) {
        if (group.type === "SINGLE_SELECT") {
          if (!selectedModifiers[group.id]) {
            newErrors[group.id] = `Please select a ${group.name.toLowerCase()}`
          }
        } else {
          const selected = selectedModifiers[group.id] || []
          if (selected.length === 0) {
            newErrors[group.id] = `Please select at least one ${group.name.toLowerCase()}`
          } else if (group.minSelect && selected.length < group.minSelect) {
            newErrors[group.id] = `Select at least ${group.minSelect} options`
          }
        }
      }
      
      // Check max selections for multi-select
      if (group.type === "MULTI_SELECT" && group.maxSelect) {
        const selected = selectedModifiers[group.id] || []
        if (selected.length > group.maxSelect) {
          newErrors[group.id] = `Select at most ${group.maxSelect} options`
        }
      }
    })
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleAddToCart = () => {
    if (!validateSelections()) {
      return
    }
    
    // Build customizations array
    const customizations = product.modifierGroups?.map((group: any) => {
      const selections = []
      
      if (group.type === "SINGLE_SELECT") {
        const selectedId = selectedModifiers[group.id]
        if (selectedId) {
          const modifier = group.modifiers.find((m: any) => m.id === selectedId)
          if (modifier) {
            selections.push({
              modifierId: modifier.id,
              modifierName: modifier.name,
              priceAdjustment: modifier.priceAdjustment,
              priceType: modifier.priceType || "FIXED",
              quantity: 1
            })
          }
        }
      } else {
        const selectedIds = selectedModifiers[group.id] || []
        selectedIds.forEach((id: string) => {
          const modifier = group.modifiers.find((m: any) => m.id === id)
          if (modifier) {
            selections.push({
              modifierId: modifier.id,
              modifierName: modifier.name,
              priceAdjustment: modifier.priceAdjustment,
              priceType: modifier.priceType || "FIXED",
              quantity: 1
            })
          }
        })
      }
      
      return {
        groupId: group.id,
        groupName: group.name,
        selections
      }
    }).filter((g: any) => g.selections.length > 0)
    
    // Add to cart
    addItem({
      productId: product.id,
      merchantId: product.merchantId,
      merchantName: product.merchant?.businessName || "",
      name: product.name,
      price: product.price,
      image: product.images?.[0],
      quantity,
      customizations: customizations.length > 0 ? customizations : undefined
    })
    
    onClose()
    
    // Reset for next time
    setQuantity(1)
    setErrors({})
  }

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent 
        side="top" 
        className="h-[85vh] sm:h-[90vh] flex flex-col"
      >
        <SheetHeader>
          <SheetTitle>{product.name}</SheetTitle>
          <SheetDescription>
            Customize your order
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-6 py-4">
            {/* Modifier Groups */}
            {product.modifierGroups?.map((group: any) => (
              <div key={group.id} className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-medium">
                    {group.name}
                    {group.required && <span className="text-red-500 ml-1">*</span>}
                  </Label>
                  {group.type === "MULTI_SELECT" && group.maxSelect && (
                    <span className="text-sm text-muted-foreground">
                      Select up to {group.maxSelect}
                    </span>
                  )}
                </div>

                {group.type === "SINGLE_SELECT" ? (
                  <RadioGroup
                    value={selectedModifiers[group.id] || ""}
                    onValueChange={(value) => handleSingleSelect(group.id, value)}
                  >
                    {group.modifiers.map((modifier: any) => (
                      <div
                        key={modifier.id}
                        className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-center space-x-3">
                          <RadioGroupItem value={modifier.id} id={modifier.id} />
                          <Label
                            htmlFor={modifier.id}
                            className="font-normal cursor-pointer"
                          >
                            {modifier.name}
                          </Label>
                        </div>
                        {modifier.priceAdjustment !== 0 && (
                          <Badge variant="secondary">
                            {modifier.priceAdjustment > 0 ? "+" : ""}
                            {formatPrice(modifier.priceAdjustment)}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </RadioGroup>
                ) : (
                  <div className="space-y-2">
                    {group.modifiers.map((modifier: any) => {
                      const isChecked = (selectedModifiers[group.id] || []).includes(modifier.id)
                      return (
                        <div
                          key={modifier.id}
                          className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                        >
                          <div className="flex items-center space-x-3">
                            <Checkbox
                              id={modifier.id}
                              checked={isChecked}
                              onCheckedChange={(checked) => 
                                handleMultiSelect(group.id, modifier.id, checked as boolean)
                              }
                            />
                            <Label
                              htmlFor={modifier.id}
                              className="font-normal cursor-pointer"
                            >
                              {modifier.name}
                            </Label>
                          </div>
                          {modifier.priceAdjustment !== 0 && (
                            <Badge variant="secondary">
                              {modifier.priceAdjustment > 0 ? "+" : ""}
                              {formatPrice(modifier.priceAdjustment)}
                            </Badge>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}

                {errors[group.id] && (
                  <p className="text-sm text-red-500">{errors[group.id]}</p>
                )}
              </div>
            ))}

            {/* Quantity Selector */}
            <div className="space-y-3 pt-4 border-t">
              <Label className="text-base font-medium">Quantity</Label>
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-12 text-center font-semibold">{quantity}</span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity(quantity + 1)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="border-t pt-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-lg font-semibold">Total</span>
            <span className="text-2xl font-bold">
              {formatPrice(calculateTotalPrice())}
            </span>
          </div>
          
          <Button
            className="w-full"
            size="lg"
            onClick={handleAddToCart}
          >
            <ShoppingCart className="mr-2 h-5 w-5" />
            Add to Cart
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}