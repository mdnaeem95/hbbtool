"use client"

import { useState } from "react"
import { 
  Button, 
  Card, 
  CardContent, 
  CardHeader, 
  Input, 
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Textarea
} from "@homejiak/ui"
import { Plus, Trash2, GripVertical, ChevronDown, ChevronUp, Package } from "lucide-react"
import { cn } from "../../lib/utils"
import { motion, AnimatePresence, Reorder } from "framer-motion"

// Import types from product-form
import type { LocalModifier, LocalModifierGroup } from "./product-form"

interface LocalModifiersManagerProps {
  groups: LocalModifierGroup[]
  onChange: (groups: LocalModifierGroup[]) => void
  className?: string
}

export function LocalModifiersManager({
  groups = [],
  onChange,
  className
}: LocalModifiersManagerProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  // Toggle group expansion
  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(groupId)) {
        next.delete(groupId)
      } else {
        next.add(groupId)
      }
      return next
    })
  }

  // Add a new modifier group
  const addGroup = () => {
    const newGroup: LocalModifierGroup = {
      id: `temp-${Date.now()}`,
      name: "",
      description: "",
      type: "SINGLE_SELECT",
      required: false,
      sortOrder: groups.length,
      isActive: true,
      modifiers: [],
      isNew: true
    }
    onChange([...groups, newGroup])
    setExpandedGroups(prev => new Set(prev).add(newGroup.id!))
  }

  // Update a group
  const updateGroup = (groupId: string, updates: Partial<LocalModifierGroup>) => {
    onChange(groups.map(g => 
      g.id === groupId ? { ...g, ...updates } : g
    ))
  }

  // Delete a group
  const deleteGroup = (groupId: string) => {
    onChange(groups.filter(g => g.id !== groupId))
    setExpandedGroups(prev => {
      const next = new Set(prev)
      next.delete(groupId)
      return next
    })
  }

  // Add a modifier to a group
  const addModifier = (groupId: string) => {
    const newModifier: LocalModifier = {
      id: `temp-${Date.now()}`,
      name: "",
      description: "",
      priceAdjustment: 0,
      priceType: "FIXED",
      sortOrder: 0,
      isAvailable: true,
      isDefault: false,
      isNew: true
    }
    
    onChange(groups.map(g => {
      if (g.id === groupId) {
        return {
          ...g,
          modifiers: [...g.modifiers, { ...newModifier, sortOrder: g.modifiers.length }]
        }
      }
      return g
    }))
  }

  // Update a modifier
  const updateModifier = (groupId: string, modifierId: string, updates: Partial<LocalModifier>) => {
    onChange(groups.map(g => {
      if (g.id === groupId) {
        return {
          ...g,
          modifiers: g.modifiers.map(m => 
            m.id === modifierId ? { ...m, ...updates } : m
          )
        }
      }
      return g
    }))
  }

  // Delete a modifier
  const deleteModifier = (groupId: string, modifierId: string) => {
    onChange(groups.map(g => {
      if (g.id === groupId) {
        return {
          ...g,
          modifiers: g.modifiers.filter(m => m.id !== modifierId)
        }
      }
      return g
    }))
  }

  // Reorder groups
  const reorderGroups = (newOrder: LocalModifierGroup[]) => {
    onChange(newOrder.map((g, i) => ({ ...g, sortOrder: i })))
  }

  // Reorder modifiers within a group
  const reorderModifiers = (groupId: string, newOrder: LocalModifier[]) => {
    onChange(groups.map(g => {
      if (g.id === groupId) {
        return {
          ...g,
          modifiers: newOrder.map((m, i) => ({ ...m, sortOrder: i }))
        }
      }
      return g
    }))
  }

  if (groups.length === 0) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="rounded-lg border-2 border-dashed border-muted-foreground/25 p-8 text-center">
          <Package className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="font-semibold text-lg mb-2">No customization options yet</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">
            Add customization groups like "Toppings", "Spice Level", or "Add-ons" to let customers personalize their orders.
          </p>
          <Button onClick={addGroup} variant="outline">
            <Plus className="mr-2 h-4 w-4" />
            Add Customization Group
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("space-y-4", className)}>
      <Reorder.Group axis="y" values={groups} onReorder={reorderGroups} className="space-y-4">
        {groups.map((group) => (
          <Reorder.Item key={group.id} value={group}>
            <Card className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    className="mt-1 cursor-grab active:cursor-grabbing touch-none"
                  >
                    <GripVertical className="h-5 w-5 text-muted-foreground" />
                  </button>
                  
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 grid gap-3 sm:grid-cols-2">
                        <div>
                          <Label className="text-xs text-muted-foreground">Group Name</Label>
                          <Input
                            value={group.name}
                            onChange={(e) => updateGroup(group.id!, { name: e.target.value })}
                            placeholder="e.g., Toppings"
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Type</Label>
                          <Select
                            value={group.type}
                            onValueChange={(value: "SINGLE_SELECT" | "MULTI_SELECT") => 
                              updateGroup(group.id!, { type: value })
                            }
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="SINGLE_SELECT">Single Select</SelectItem>
                              <SelectItem value="MULTI_SELECT">Multi Select</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleGroup(group.id!)}
                        >
                          {expandedGroups.has(group.id!) ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteGroup(group.id!)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>

                    <AnimatePresence>
                      {expandedGroups.has(group.id!) && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="space-y-3 overflow-hidden"
                        >
                          <div>
                            <Label className="text-xs text-muted-foreground">Description (Optional)</Label>
                            <Textarea
                              value={group.description || ""}
                              onChange={(e) => updateGroup(group.id!, { description: e.target.value })}
                              placeholder="Describe this customization group..."
                              className="mt-1 min-h-[60px]"
                            />
                          </div>

                          <div className="grid gap-3 sm:grid-cols-3">
                            <div className="flex items-center justify-between rounded-lg border p-3">
                              <Label className="text-sm">Required</Label>
                              <Switch
                                checked={group.required}
                                onCheckedChange={(checked) => updateGroup(group.id!, { required: checked })}
                              />
                            </div>

                            {group.type === "MULTI_SELECT" && (
                              <>
                                <div>
                                  <Label className="text-xs text-muted-foreground">Min Select</Label>
                                  <Input
                                    type="number"
                                    min="0"
                                    value={group.minSelect || ""}
                                    onChange={(e) => updateGroup(group.id!, { 
                                      minSelect: e.target.value ? parseInt(e.target.value) : undefined 
                                    })}
                                    placeholder="0"
                                    className="mt-1"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs text-muted-foreground">Max Select</Label>
                                  <Input
                                    type="number"
                                    min="0"
                                    value={group.maxSelect || ""}
                                    onChange={(e) => updateGroup(group.id!, { 
                                      maxSelect: e.target.value ? parseInt(e.target.value) : undefined 
                                    })}
                                    placeholder="Unlimited"
                                    className="mt-1"
                                  />
                                </div>
                              </>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Options</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addModifier(group.id!)}
                    >
                      <Plus className="mr-1 h-3 w-3" />
                      Add Option
                    </Button>
                  </div>

                  {group.modifiers.length === 0 ? (
                    <div className="rounded-lg border-2 border-dashed p-4 text-center text-sm text-muted-foreground">
                      No options added yet. Click "Add Option" to create one.
                    </div>
                  ) : (
                    <Reorder.Group
                      axis="y"
                      values={group.modifiers}
                      onReorder={(newOrder) => reorderModifiers(group.id!, newOrder)}
                      className="space-y-2"
                    >
                      {group.modifiers.map((modifier) => (
                        <Reorder.Item key={modifier.id} value={modifier}>
                          <div className="rounded-lg border bg-muted/50 p-3">
                            <div className="flex items-start gap-2">
                              <button
                                type="button"
                                className="mt-2 cursor-grab active:cursor-grabbing touch-none"
                              >
                                <GripVertical className="h-4 w-4 text-muted-foreground" />
                              </button>
                              
                              <div className="flex-1 grid gap-2 sm:grid-cols-3">
                                <div className="sm:col-span-1">
                                  <Input
                                    value={modifier.name}
                                    onChange={(e) => updateModifier(group.id!, modifier.id!, { 
                                      name: e.target.value 
                                    })}
                                    placeholder="Option name"
                                    className="bg-background"
                                  />
                                </div>
                                <div>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={modifier.priceAdjustment}
                                    onChange={(e) => updateModifier(group.id!, modifier.id!, { 
                                      priceAdjustment: parseFloat(e.target.value) || 0 
                                    })}
                                    placeholder="0.00"
                                    className="bg-background"
                                  />
                                </div>
                                <div className="flex items-center gap-2">
                                  <Select
                                    value={modifier.priceType}
                                    onValueChange={(value: "FIXED" | "PERCENTAGE") => 
                                      updateModifier(group.id!, modifier.id!, { priceType: value })
                                    }
                                  >
                                    <SelectTrigger className="bg-background">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="FIXED">Fixed ($)</SelectItem>
                                      <SelectItem value="PERCENTAGE">Percent (%)</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => deleteModifier(group.id!, modifier.id!)}
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </div>
                              </div>
                            </div>

                            {/* Advanced options */}
                            <div className="mt-2 flex items-center gap-3 pl-6">
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={modifier.isDefault}
                                  onCheckedChange={(checked) => 
                                    updateModifier(group.id!, modifier.id!, { isDefault: checked })
                                  }
                                />
                                <Label className="text-xs text-muted-foreground">Default</Label>
                              </div>
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={modifier.isAvailable}
                                  onCheckedChange={(checked) => 
                                    updateModifier(group.id!, modifier.id!, { isAvailable: checked })
                                  }
                                />
                                <Label className="text-xs text-muted-foreground">Available</Label>
                              </div>
                            </div>
                          </div>
                        </Reorder.Item>
                      ))}
                    </Reorder.Group>
                  )}
                </div>
              </CardContent>
            </Card>
          </Reorder.Item>
        ))}
      </Reorder.Group>

      <Button
        type="button"
        variant="outline"
        onClick={addGroup}
        className="w-full"
      >
        <Plus className="mr-2 h-4 w-4" />
        Add Another Customization Group
      </Button>
    </div>
  )
}