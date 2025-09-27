"use client"

import { useState } from "react"
import { api } from "@/lib/trpc/client"
import { Button, 
  Card, 
  Input, 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Label,
  useToast 
} from "@homejiak/ui"
import { Plus, Trash2, Edit2, X, Save } from "lucide-react"

export function ProductModifiersManager({ 
  productId, 
  existingGroups = [] 
}: {
  productId: string
  existingGroups: any[]
}) {
  const [groups, setGroups] = useState(existingGroups)
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null)
  const { toast } = useToast()
  const utils = api.useUtils()

  const upsertMutation = api.productModifiers.upsertGroup.useMutation({
    onSuccess: (data) => {
      toast({ 
        title: "Success",
        description: "Modifier group saved successfully" 
      })
      
      // Update local state
      setGroups(prev => {
        const index = prev.findIndex(g => g.id === data?.id)
        if (index >= 0) {
          const updated = [...prev]
          updated[index] = data
          return updated
        }
        return [...prev, data]
      })
      
      setEditingGroupId(null)
      utils.productModifiers.getByProduct.invalidate({ productId })
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to save modifier group, ${error}`,
        variant: "destructive"
      })
    }
  })

  const deleteMutation = api.productModifiers.deleteGroup.useMutation({
    onSuccess: () => {
      toast({ 
        title: "Success",
        description: "Modifier group deleted" 
      })
      utils.productModifiers.getByProduct.invalidate({ productId })
    }
  })

  const addNewGroup = () => {
    const tempId = `temp-${Date.now()}`
    const newGroup = {
      id: tempId,
      name: "",
      type: "SINGLE_SELECT" as const,
      required: false,
      modifiers: [],
      isActive: true
    }
    setGroups([...groups, newGroup])
    setEditingGroupId(tempId)
  }

  const handleSaveGroup = (groupData: any) => {
    // Filter out empty modifiers
    const cleanedData = {
      ...groupData,
      productId,
      modifiers: groupData.modifiers.filter((m: any) => m.name)
    }
    
    upsertMutation.mutate(cleanedData)
  }

  const handleDeleteGroup = (groupId: string) => {
    if (groupId.startsWith("temp-")) {
      setGroups(groups.filter(g => g.id !== groupId))
    } else if (confirm("Delete this modifier group and all its options?")) {
      deleteMutation.mutate({ groupId })
      setGroups(groups.filter(g => g.id !== groupId))
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Product Customization</h3>
          <p className="text-sm text-muted-foreground">
            Add modifier groups to allow customers to customize this product
          </p>
        </div>
        <Button onClick={addNewGroup}>
          <Plus className="w-4 h-4 mr-2" />
          Add Modifier Group
        </Button>
      </div>

      {/* Groups */}
      {groups.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground mb-4">
            No customization options yet
          </p>
          <Button onClick={addNewGroup} variant="outline">
            <Plus className="w-4 h-4 mr-2" />
            Create Your First Modifier Group
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {groups.map(group => (
            <ModifierGroupCard
              key={group.id}
              group={group}
              isEditing={editingGroupId === group.id}
              onEdit={() => setEditingGroupId(group.id)}
              onSave={handleSaveGroup}
              onCancel={() => {
                if (group.id.startsWith("temp-")) {
                  setGroups(groups.filter(g => g.id !== group.id))
                }
                setEditingGroupId(null)
              }}
              onDelete={() => handleDeleteGroup(group.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// Modifier Group Card Component
function ModifierGroupCard({ 
  group, 
  isEditing, 
  onEdit, 
  onSave, 
  onCancel, 
  onDelete 
}: any) {
  const [formData, setFormData] = useState(group)

  const addModifier = () => {
    const newModifier = {
      id: `temp-${Date.now()}`,
      name: "",
      priceAdjustment: 0,
      priceType: "FIXED" as const,
      isAvailable: true,
      isDefault: false
    }
    setFormData({
      ...formData,
      modifiers: [...(formData.modifiers || []), newModifier]
    })
  }

  const updateModifier = (index: number, updates: any) => {
    const updatedModifiers = [...formData.modifiers]
    updatedModifiers[index] = { ...updatedModifiers[index], ...updates }
    setFormData({ ...formData, modifiers: updatedModifiers })
  }

  const removeModifier = (index: number) => {
    setFormData({
      ...formData,
      modifiers: formData.modifiers.filter((_: any, i: number) => i !== index)
    })
  }

  if (!isEditing) {
    return (
      <Card className="p-4">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <h4 className="font-medium">
              {group.name || "Unnamed Group"}
            </h4>
            <div className="flex items-center gap-4 mt-1">
              <span className="text-sm text-muted-foreground">
                {group.type === "SINGLE_SELECT" ? "Single Choice" : "Multiple Choice"}
              </span>
              {group.required && (
                <span className="text-sm text-orange-600">Required</span>
              )}
              {!group.isActive && (
                <span className="text-sm text-gray-500">Inactive</span>
              )}
            </div>
            {group.modifiers && group.modifiers.length > 0 && (
              <div className="mt-3 space-y-1">
                {group.modifiers.map((m: any) => (
                  <div key={m.id} className="text-sm flex items-center gap-2">
                    <span className="text-muted-foreground">•</span>
                    <span>{m.name}</span>
                    {m.priceAdjustment !== 0 && (
                      <span className="text-muted-foreground">
                        ({m.priceAdjustment > 0 ? "+" : ""}
                        ${Math.abs(m.priceAdjustment).toFixed(2)})
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={onEdit}>
              <Edit2 className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onDelete}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-4">
      <div className="space-y-4">
        {/* Group Settings */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Group Name</Label>
            <Input
              placeholder="e.g., Size, Add-ons, Spice Level"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          <div>
            <Label>Selection Type</Label>
            <Select
              value={formData.type}
              onValueChange={(value) => setFormData({ ...formData, type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SINGLE_SELECT">Single Choice (Radio)</SelectItem>
                <SelectItem value="MULTI_SELECT">Multiple Choice (Checkbox)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Switch
              id={`required-${group.id}`}
              checked={formData.required}
              onCheckedChange={(checked) => setFormData({ ...formData, required: checked })}
            />
            <Label htmlFor={`required-${group.id}`}>Required</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id={`active-${group.id}`}
              checked={formData.isActive ?? true}
              onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
            />
            <Label htmlFor={`active-${group.id}`}>Active</Label>
          </div>
        </div>

        {/* Modifiers */}
        <div>
          <Label>Options</Label>
          <div className="space-y-2 mt-2">
            {formData.modifiers?.map((modifier: any, index: number) => (
              <div key={modifier.id} className="flex gap-2">
                <Input
                  placeholder="Option name"
                  value={modifier.name}
                  onChange={(e) => updateModifier(index, { name: e.target.value })}
                />
                <Input
                  type="number"
                  placeholder="0.00"
                  value={modifier.priceAdjustment}
                  onChange={(e) => updateModifier(index, { 
                    priceAdjustment: parseFloat(e.target.value) || 0 
                  })}
                  className="w-28"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeModifier(index)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addModifier}
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Option
            </Button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button 
            onClick={() => onSave(formData)}
            disabled={!formData.name}
          >
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>
    </Card>
  )
}