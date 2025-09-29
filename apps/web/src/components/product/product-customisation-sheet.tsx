"use client"

import { useState, useEffect } from "react"
import { Sheet, SheetContent, Button, RadioGroup, RadioGroupItem, ScrollArea } from "@homejiak/ui"
import { Plus, Minus, ShoppingCart } from "lucide-react"
import { useCart } from "../../stores/cart-store"
import { formatPrice } from "../../lib/utils"
import { motion, AnimatePresence } from "framer-motion"

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
        const defaultModifier = group.modifiers.find((m: any) => m.isDefault)
        if (defaultModifier) {
          defaults[group.id] = defaultModifier.id
        } else if (group.required && group.modifiers.length > 0) {
          defaults[group.id] = group.modifiers[0].id
        }
      } else {
        const defaultModifiers = group.modifiers.filter((m: any) => m.isDefault)
        defaults[group.id] = defaultModifiers.map((m: any) => m.id)
      }
    })
    setSelectedModifiers(defaults)
  }, [product])

  const calculateTotalPrice = () => {
    // Start with base price, default to 0 if not available
    let price = product?.price || 0
    
    // Ensure we have a valid number
    if (typeof price !== 'number' || isNaN(price)) {
      price = 0
    }
    
    // Add modifier prices
    product?.modifierGroups?.forEach((group: any) => {
      if (group.type === "SINGLE_SELECT") {
        const selectedId = selectedModifiers[group.id]
        const modifier = group.modifiers.find((m: any) => m.id === selectedId)
        if (modifier && modifier.priceAdjustment) {
          const adjustment = parseFloat(modifier.priceAdjustment) || 0
          price += adjustment
        }
      } else {
        const selectedIds = selectedModifiers[group.id] || []
        selectedIds.forEach((id: string) => {
          const modifier = group.modifiers.find((m: any) => m.id === id)
          if (modifier && modifier.priceAdjustment) {
            const adjustment = parseFloat(modifier.priceAdjustment) || 0
            price += adjustment
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
    setErrors(prev => {
      const newErrors = { ...prev }
      delete newErrors[groupId]
      return newErrors
    })
  }

  const validateSelections = () => {
    const newErrors: Record<string, string> = {}
    
    product?.modifierGroups?.forEach((group: any) => {
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
    
    const customizations = product?.modifierGroups?.map((group: any) => {
      const selections = []
      
      if (group.type === "SINGLE_SELECT") {
        const selectedId = selectedModifiers[group.id]
        if (selectedId) {
          const modifier = group.modifiers.find((m: any) => m.id === selectedId)
          if (modifier) {
            selections.push({
              modifierId: modifier.id,
              modifierName: modifier.name,
              priceAdjustment: modifier.priceAdjustment || 0,
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
              priceAdjustment: modifier.priceAdjustment || 0,
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
    
    addItem({
      productId: product.id,
      merchantId: product.merchantId,
      merchantName: product.merchant?.businessName || "",
      name: product.name,
      price: product.price || 0,
      image: product.images?.[0],
      quantity,
      customizations: customizations.length > 0 ? customizations : undefined
    })
    
    onClose()
    setQuantity(1)
    setErrors({})
  }

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent 
        side="bottom" 
        className="h-screen max-h-screen w-full rounded-t-3xl p-0 flex flex-col bg-white border-t shadow-xl"
      >
        {/* Header with Product Info - removed X button since Sheet has one */}
        <div className="px-6 pt-6 pb-4 border-b bg-white">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {product?.name || "Product"}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Customize your order
            </p>
          </div>
        </div>

        {/* Scrollable Content */}
        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="px-6 py-4 space-y-6">
            {/* Modifier Groups */}
            {product?.modifierGroups?.map((group: any, index: number) => (
              <motion.div
                key={group.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-gray-900">
                    {group.name}
                    {group.required && (
                      <span className="text-red-500 ml-1 text-sm">*</span>
                    )}
                  </h3>
                  {group.type === "MULTI_SELECT" && group.maxSelect && (
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                      Max {group.maxSelect}
                    </span>
                  )}
                </div>

                {group.type === "SINGLE_SELECT" ? (
                  <RadioGroup
                    value={selectedModifiers[group.id] || ""}
                    onValueChange={(value) => handleSingleSelect(group.id, value)}
                    className="space-y-2"
                  >
                    {group.modifiers.map((modifier: any) => (
                      <label
                        key={modifier.id}
                        htmlFor={`radio-${modifier.id}`}
                        className={`
                          flex items-center justify-between p-4 rounded-2xl border-2 
                          cursor-pointer transition-all duration-200
                          ${selectedModifiers[group.id] === modifier.id 
                            ? 'border-orange-500 bg-orange-50' 
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                          }
                        `}
                      >
                        <div className="flex items-center gap-3">
                          <RadioGroupItem 
                            value={modifier.id} 
                            id={`radio-${modifier.id}`}
                            className="text-orange-500 border-gray-300"
                          />
                          <span className="text-gray-900 font-medium">
                            {modifier.name}
                          </span>
                        </div>
                        {modifier.priceAdjustment !== 0 && (
                          <span className="text-sm font-semibold text-gray-700">
                            {modifier.priceAdjustment > 0 ? "+" : ""}
                            {formatPrice(modifier.priceAdjustment || 0)}
                          </span>
                        )}
                      </label>
                    ))}
                  </RadioGroup>
                ) : (
                  <div className="space-y-2">
                    {group.modifiers.map((modifier: any) => {
                      const isChecked = (selectedModifiers[group.id] || []).includes(modifier.id)
                      return (
                        <div
                          key={modifier.id}
                          className={`
                            flex items-center justify-between p-4 rounded-2xl border-2 
                            cursor-pointer transition-all duration-200
                            ${isChecked 
                              ? 'border-orange-500 bg-orange-50' 
                              : 'border-gray-200 hover:border-gray-300 bg-white'
                            }
                          `}
                          onClick={() => handleMultiSelect(group.id, modifier.id, !isChecked)}
                        >
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <input
                                type="checkbox"
                                id={`check-${modifier.id}`}
                                checked={isChecked}
                                onChange={(e) => handleMultiSelect(group.id, modifier.id, e.target.checked)}
                                className="sr-only"
                              />
                              <div className={`
                                w-5 h-5 rounded border-2 transition-all
                                ${isChecked 
                                  ? 'bg-orange-500 border-orange-500' 
                                  : 'bg-white border-gray-300'
                                }
                              `}>
                                {isChecked && (
                                  <svg className="w-3 h-3 text-white absolute top-0.5 left-0.5" viewBox="0 0 12 12" fill="none">
                                    <path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                )}
                              </div>
                            </div>
                            <label 
                              htmlFor={`check-${modifier.id}`}
                              className="text-gray-900 font-medium cursor-pointer"
                            >
                              {modifier.name}
                            </label>
                          </div>
                          {modifier.priceAdjustment !== 0 && (
                            <span className="text-sm font-semibold text-gray-700">
                              {modifier.priceAdjustment > 0 ? "+" : ""}
                              {formatPrice(modifier.priceAdjustment || 0)}
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}

                <AnimatePresence>
                  {errors[group.id] && (
                    <motion.p
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="text-sm text-red-500 pl-2"
                    >
                      {errors[group.id]}
                    </motion.p>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}

            {/* Quantity Selector */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-3 pt-4"
            >
              <h3 className="font-medium text-gray-900">Quantity</h3>
              <div className="flex items-center justify-between bg-gray-50 rounded-2xl p-2 max-w-xs">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="rounded-xl h-12 w-12 hover:bg-white transition-colors"
                  disabled={quantity <= 1}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="text-xl font-semibold w-16 text-center">
                  {quantity}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setQuantity(quantity + 1)}
                  className="rounded-xl h-12 w-12 hover:bg-white transition-colors"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          </div>
        </ScrollArea>

        {/* Fixed Footer */}
        <div className="border-t bg-white px-6 py-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Total</span>
            <motion.span 
              key={calculateTotalPrice()}
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className="text-2xl font-bold text-gray-900"
            >
              {formatPrice(calculateTotalPrice())}
            </motion.span>
          </div>
          
          <Button
            className="w-full h-14 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-semibold text-lg shadow-lg shadow-orange-500/25 transition-all duration-200 hover:shadow-xl hover:shadow-orange-500/30"
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