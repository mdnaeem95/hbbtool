"use client"

import { useState } from "react"
import { Button, Input, Label, Switch, Card, CardContent, CardHeader, CardTitle } from "@homejiak/ui"
import { Plus, Trash2, GripVertical, AlertCircle, Package } from "lucide-react"
import { cn } from "../../lib/utils"
import { motion, AnimatePresence, Reorder } from "framer-motion"

export interface ProductVariant {
  id?: string
  sku: string
  name: string
  options: Record<string, any>
  priceAdjustment: number
  inventory: number
  isDefault: boolean
  sortOrder: number
  imageUrl?: string
  isNew?: boolean // For tracking new variants before saving
  isDeleted?: boolean // For marking variants for deletion
}

interface ProductVariantManagerProps {
  variants: ProductVariant[]
  onChange: (variants: ProductVariant[]) => void
  basePrice: number
  trackInventory?: boolean
  className?: string
}

export function ProductVariantManager({
  variants = [],
  onChange,
  basePrice,
  trackInventory = false,
  className
}: ProductVariantManagerProps) {
  const [expandedVariants, setExpandedVariants] = useState<Set<string | number>>(new Set())

  // Add a new variant
  const addVariant = () => {
    const newVariant: ProductVariant = {
      id: `new-${Date.now()}`, // Temporary ID for new variants
      sku: '',
      name: '',
      options: {},
      priceAdjustment: 0,
      inventory: 0,
      isDefault: variants.length === 0, // First variant is default
      sortOrder: variants.length,
      isNew: true
    }
    onChange([...variants, newVariant])
    setExpandedVariants(prev => new Set(prev).add(newVariant.id!))
  }

  // Update a variant
  const updateVariant = (index: number, updates: Partial<ProductVariant>) => {
    const updated = [...variants]
    updated[index] = { ...updated[index]!, ...updates }
    
    // If setting as default, unset others
    if (updates.isDefault) {
      updated.forEach((v, i) => {
        if (i !== index) v.isDefault = false
      })
    }
    
    onChange(updated)
  }

  // Remove a variant
  const removeVariant = (index: number) => {
    const variant = variants[index]
    
    // If it's a new variant, remove it completely
    if (variant?.isNew) {
      onChange(variants.filter((_, i) => i !== index))
    } else {
      // Mark existing variant for deletion
      updateVariant(index, { isDeleted: true })
    }
  }

  // Restore a deleted variant
  const restoreVariant = (index: number) => {
    updateVariant(index, { isDeleted: false })
  }

  // Add an option field to a variant
  const addOption = (variantIndex: number, key: string, value: string) => {
    if (!key) return
    
    const variant = variants[variantIndex]
    const newOptions = { ...variant?.options, [key]: value }
    updateVariant(variantIndex, { options: newOptions })
  }

  // Remove an option from a variant
  const removeOption = (variantIndex: number, key: string) => {
    const variant = variants[variantIndex]
    const newOptions = { ...variant?.options }
    delete newOptions[key]
    updateVariant(variantIndex, { options: newOptions })
  }

  // Reorder variants
  const handleReorder = (newOrder: ProductVariant[]) => {
    const reordered = newOrder.map((v, i) => ({ ...v, sortOrder: i }))
    onChange(reordered)
  }

  // Toggle expanded state
  const toggleExpanded = (id: string | number) => {
    setExpandedVariants(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  // Calculate effective price for display
  const getEffectivePrice = (variant: ProductVariant) => {
    return basePrice + variant.priceAdjustment
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Product Variants</h3>
          <p className="text-sm text-gray-500">
            Create different versions of your product (e.g., sizes, portions)
          </p>
        </div>
        <Button
          onClick={addVariant}
          variant="outline"
          size="sm"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Variant
        </Button>
      </div>

      {/* Variants List */}
      {variants.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-8 text-center">
            <Package className="h-12 w-12 text-gray-400 mb-3" />
            <p className="text-sm text-gray-600 mb-4">
              No variants yet. Add variants to offer different options of this product.
            </p>
            <Button onClick={addVariant} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add First Variant
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Reorder.Group
          axis="y"
          values={variants.filter(v => !v.isDeleted)}
          onReorder={handleReorder}
          className="space-y-3"
        >
          <AnimatePresence>
            {variants.map((variant, index) => {
              const isExpanded = expandedVariants.has(variant.id || index)
              const isDeleted = variant.isDeleted
              
              if (isDeleted) {
                return (
                  <motion.div
                    key={variant.id || index}
                    initial={{ opacity: 1 }}
                    animate={{ opacity: 0.5 }}
                    className="relative"
                  >
                    <Card className="border-red-200 bg-red-50">
                      <CardContent className="flex items-center justify-between py-4">
                        <div className="flex items-center gap-3">
                          <Trash2 className="h-4 w-4 text-red-500" />
                          <div>
                            <p className="font-medium text-gray-700 line-through">
                              {variant.name || 'Unnamed Variant'}
                            </p>
                            <p className="text-sm text-gray-500">
                              This variant will be deleted when you save
                            </p>
                          </div>
                        </div>
                        <Button
                          onClick={() => restoreVariant(index)}
                          variant="outline"
                          size="sm"
                        >
                          Restore
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                )
              }
              
              return (
                <Reorder.Item
                  key={variant.id || index}
                  value={variant}
                  className="relative"
                >
                  <Card className={cn(
                    "transition-all",
                    variant.isNew && "border-green-500 shadow-green-100",
                    variant.isDefault && "ring-2 ring-orange-500 ring-offset-2"
                  )}>
                    <CardHeader 
                      className="cursor-pointer"
                      onClick={() => toggleExpanded(variant.id || index)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <GripVertical className="h-5 w-5 text-gray-400 cursor-move" />
                          <div>
                            <CardTitle className="text-base flex items-center gap-2">
                              {variant.name || 'Unnamed Variant'}
                              {variant.isDefault && (
                                <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                                  Default
                                </span>
                              )}
                              {variant.isNew && (
                                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                                  New
                                </span>
                              )}
                            </CardTitle>
                            <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                              <span>SKU: {variant.sku || 'Not set'}</span>
                              <span>Price: ${getEffectivePrice(variant).toFixed(2)}</span>
                              {trackInventory && (
                                <span>Stock: {variant.inventory}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <Button
                          onClick={(e) => {
                            e.stopPropagation()
                            removeVariant(index)
                          }}
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          style={{ overflow: "hidden" }}
                        >
                          <CardContent className="space-y-4 border-t">
                            {/* Basic Info */}
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor={`name-${index}`}>
                                  Variant Name <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                  id={`name-${index}`}
                                  value={variant.name}
                                  onChange={(e) => updateVariant(index, { name: e.target.value })}
                                  placeholder="e.g., Large, 6 Pieces"
                                  className="mt-1"
                                />
                              </div>
                              <div>
                                <Label htmlFor={`sku-${index}`}>SKU</Label>
                                <Input
                                  id={`sku-${index}`}
                                  value={variant.sku}
                                  onChange={(e) => updateVariant(index, { sku: e.target.value })}
                                  placeholder="e.g., PROD-001-L"
                                  className="mt-1"
                                />
                              </div>
                            </div>

                            {/* Pricing and Inventory */}
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor={`price-${index}`}>
                                  Price Adjustment
                                </Label>
                                <div className="flex items-center gap-2 mt-1">
                                  <Input
                                    id={`price-${index}`}
                                    type="number"
                                    step="0.01"
                                    value={variant.priceAdjustment}
                                    onChange={(e) => updateVariant(index, { 
                                      priceAdjustment: parseFloat(e.target.value) || 0 
                                    })}
                                    placeholder="0.00"
                                    className="flex-1"
                                  />
                                  <span className="text-sm text-gray-500">
                                    = ${getEffectivePrice(variant).toFixed(2)}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                  Use negative values for discounts
                                </p>
                              </div>
                              {trackInventory && (
                                <div>
                                  <Label htmlFor={`inventory-${index}`}>
                                    Inventory
                                  </Label>
                                  <Input
                                    id={`inventory-${index}`}
                                    type="number"
                                    value={variant.inventory}
                                    onChange={(e) => updateVariant(index, { 
                                      inventory: parseInt(e.target.value) || 0 
                                    })}
                                    placeholder="0"
                                    className="mt-1"
                                  />
                                </div>
                              )}
                            </div>

                            {/* Options */}
                            <div>
                              <Label>Options (Optional)</Label>
                              <p className="text-xs text-gray-500 mb-2">
                                Add custom properties like size, color, etc.
                              </p>
                              <div className="space-y-2">
                                {Object.entries(variant.options).map(([key, value]) => (
                                  <div key={key} className="flex items-center gap-2">
                                    <Input
                                      value={key}
                                      onChange={(e) => {
                                        const newKey = e.target.value
                                        const newOptions = { ...variant.options }
                                        delete newOptions[key]
                                        newOptions[newKey] = value
                                        updateVariant(index, { options: newOptions })
                                      }}
                                      placeholder="Property"
                                      className="flex-1"
                                    />
                                    <Input
                                      value={value as string}
                                      onChange={(e) => {
                                        const newOptions = { ...variant.options }
                                        newOptions[key] = e.target.value
                                        updateVariant(index, { options: newOptions })
                                      }}
                                      placeholder="Value"
                                      className="flex-1"
                                    />
                                    <Button
                                      onClick={() => removeOption(index, key)}
                                      variant="ghost"
                                      size="sm"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                ))}
                                <Button
                                  onClick={() => addOption(index, `option${Object.keys(variant.options).length + 1}`, '')}
                                  variant="outline"
                                  size="sm"
                                  className="w-full"
                                >
                                  <Plus className="h-4 w-4 mr-2" />
                                  Add Option
                                </Button>
                              </div>
                            </div>

                            {/* Settings */}
                            <div className="flex items-center justify-between border-t pt-4">
                              <div className="flex items-center gap-2">
                                <Switch
                                  id={`default-${index}`}
                                  checked={variant.isDefault}
                                  onCheckedChange={(checked) => updateVariant(index, { isDefault: checked })}
                                />
                                <Label htmlFor={`default-${index}`} className="cursor-pointer">
                                  Set as default variant
                                </Label>
                              </div>
                            </div>
                          </CardContent>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Card>
                </Reorder.Item>
              )
            })}
          </AnimatePresence>
        </Reorder.Group>
      )}

      {/* Info Alert */}
      {variants.length > 0 && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800 space-y-1">
              <p className="font-medium">Variant Tips:</p>
              <ul className="list-disc list-inside space-y-0.5 text-xs">
                <li>Each variant should have a unique name and SKU</li>
                <li>The default variant is selected automatically for customers</li>
                <li>Price adjustments are added to the base product price</li>
                {trackInventory && <li>Track inventory separately for each variant</li>}
                <li>Drag variants to reorder them</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}