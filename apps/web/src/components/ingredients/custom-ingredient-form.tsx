import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { api } from "../../lib/trpc/client"
import { IngredientCategory, MeasurementUnit } from "@homejiak/types"

// Schema aligned with Prisma model
const customIngredientSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().optional(),
  category: z.enum(IngredientCategory),
  purchaseUnit: z.enum(MeasurementUnit),
  currentPricePerUnit: z.number().positive("Price must be positive"),
  preferredStore: z.string().optional(),
  currentStock: z.number().min(0).default(0),
  reorderPoint: z.number().min(0).optional(),
  shelfLifeDays: z.number().int().positive().optional(),
  allergens: z.string().optional(), // UI: comma-separated string
  notes: z.string().optional(),
})

type CustomIngredientFormData = z.infer<typeof customIngredientSchema>

interface CustomIngredientFormProps {
  onClose: () => void
  onSuccess: () => void
  initialData?: Partial<CustomIngredientFormData> & { id?: string }
}

  export function CustomIngredientForm({
    onClose,
    onSuccess,
    initialData,
  }: CustomIngredientFormProps) {
    const [isSubmitting, setIsSubmitting] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(customIngredientSchema),
    defaultValues: {
      currentStock: initialData?.currentStock ?? 0,
      category: initialData?.category ?? IngredientCategory.OTHER,
      purchaseUnit: initialData?.purchaseUnit ?? MeasurementUnit.GRAMS,
      ...initialData,
    },
  })

  type CustomIngredientFormData = z.infer<typeof customIngredientSchema>

  const createMutation = api.ingredients.createCustom.useMutation({
    onSuccess: () => {
      onSuccess()
    },
    onError: (error) => {
      alert(error.message)
      setIsSubmitting(false)
    },
  })

  const updateMutation = api.ingredients.updateCustom.useMutation({
    onSuccess: () => {
      onSuccess()
    },
    onError: (error) => {
      alert(error.message)
      setIsSubmitting(false)
    },
  })

  const onSubmit = (data: CustomIngredientFormData) => {
    setIsSubmitting(true)

    const allergensList = data.allergens
      ? data.allergens.split(",").map((a) => a.trim()).filter(Boolean)
      : []

    if (initialData?.id) {
      updateMutation.mutate({
        id: initialData.id,
        ...data,
        allergens: allergensList,
      })
    } else {
      createMutation.mutate({
        ...data,
        allergens: allergensList,
      })
    }
  }

  return (
    <div className="space-y-4">
      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Ingredient Name *
        </label>
        <input
          type="text"
          placeholder="e.g., Premium Dark Chocolate"
          {...register("name")}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
        )}
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description
        </label>
        <textarea
          rows={2}
          placeholder="Brief description..."
          {...register("description")}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        />
      </div>

      {/* Category & Purchase Unit */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Category *
          </label>
          <select
            {...register("category")}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          >
            {Object.values(IngredientCategory).map((cat) => (
              <option key={cat} value={cat}>
                {cat.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Purchase Unit *
          </label>
          <select
            {...register("purchaseUnit")}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          >
            {Object.values(MeasurementUnit).map((unit) => (
              <option key={unit} value={unit}>
                {unit}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Price + Stock */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Price per Unit ($) *
          </label>
          <input
            type="number"
            step="0.01"
            placeholder="0.00"
            {...register("currentPricePerUnit", { valueAsNumber: true })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
          {errors.currentPricePerUnit && (
            <p className="mt-1 text-sm text-red-600">
              {errors.currentPricePerUnit.message}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Current Stock
          </label>
          <input
            type="number"
            step="0.1"
            placeholder="0"
            {...register("currentStock", { valueAsNumber: true })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Reorder Point + Shelf Life */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Reorder Point
          </label>
          <input
            type="number"
            step="0.1"
            placeholder="10"
            {...register("reorderPoint", { valueAsNumber: true })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Shelf Life (days)
          </label>
          <input
            type="number"
            placeholder="30"
            {...register("shelfLifeDays", { valueAsNumber: true })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Preferred Store */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Preferred Store
        </label>
        <input
          type="text"
          placeholder="e.g., FairPrice, Cold Storage"
          {...register("preferredStore")}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        />
      </div>

      {/* Allergens */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Allergens
        </label>
        <input
          type="text"
          placeholder="e.g., Nuts, Dairy (comma separated)"
          {...register("allergens")}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        />
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Notes
        </label>
        <textarea
          rows={3}
          placeholder="Any additional notes..."
          {...register("notes")}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={handleSubmit(onSubmit)}
          disabled={isSubmitting}
          className="flex-1 py-2 px-4 bg-orange-500 text-white rounded-lg hover:bg-orange-600 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting
            ? "Saving..."
            : initialData?.id
            ? "Update Ingredient"
            : "Add Ingredient"}
        </button>
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
