import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { api } from "../../lib/trpc/client"
import { Button } from "@homejiak/ui"

const globalIngredientSchema = z.object({
  currentPricePerUnit: z.number().positive("Price must be positive"),
  currentStock: z.number().min(0, "Stock cannot be negative"),
  preferredStore: z.string().optional(),
  brandPreference: z.string().optional(),
  reorderPoint: z.number().min(0).optional(),
  reorderQuantity: z.number().positive().optional(),
  notes: z.string().optional(),
})

type GlobalIngredientFormData = z.infer<typeof globalIngredientSchema>

interface GlobalIngredientFormProps {
  ingredient: any // Use proper type from RouterOutputs
  onClose: () => void
  onSuccess: () => void
}

export function GlobalIngredientForm({
  ingredient,
  onClose,
  onSuccess,
}: GlobalIngredientFormProps) {
  const updateMutation = api.ingredients.updateMerchantPricing.useMutation({
    onSuccess: () => {
      onSuccess()
    },
  })

  const form = useForm<GlobalIngredientFormData>({
    resolver: zodResolver(globalIngredientSchema),
    defaultValues: {
      currentPricePerUnit: ingredient.merchantPricing?.currentPricePerUnit ?? ingredient.pricePerUnit,
      currentStock: ingredient.merchantPricing?.currentStock ?? 0,
      preferredStore: ingredient.merchantPricing?.preferredStore ?? "",
      brandPreference: ingredient.merchantPricing?.brandPreference ?? "",
      reorderPoint: ingredient.merchantPricing?.reorderPoint ?? undefined,
      reorderQuantity: ingredient.merchantPricing?.reorderQuantity ?? undefined,
      notes: ingredient.merchantPricing?.notes ?? "",
    },
  })

  const onSubmit = (data: GlobalIngredientFormData) => {
    updateMutation.mutate({
      ingredientId: ingredient.id,
      ...data,
    })
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      {/* Read-only fields */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
        <input
          type="text"
          value={ingredient.name}
          disabled
          className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
        <input
          type="text"
          value={ingredient.category}
          disabled
          className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
        />
      </div>

      {/* Editable fields */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Price per {ingredient.purchaseUnit}
        </label>
        <input
          type="number"
          step="0.01"
          {...form.register("currentPricePerUnit", { valueAsNumber: true })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Current Stock</label>
        <input
          type="number"
          step="0.01"
          {...form.register("currentStock", { valueAsNumber: true })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Store</label>
        <input
          type="text"
          {...form.register("preferredStore")}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Brand Preference</label>
        <input
          type="text"
          {...form.register("brandPreference")}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Reorder Point</label>
        <input
          type="number"
          step="0.01"
          {...form.register("reorderPoint", { valueAsNumber: true })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Reorder Quantity</label>
        <input
          type="number"
          step="0.01"
          {...form.register("reorderQuantity", { valueAsNumber: true })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
        <textarea
          {...form.register("notes")}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={updateMutation.isPending}>
          {updateMutation.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </form>
  )
}