import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { api } from "../../lib/trpc/client"
import type { RecipeFormData } from "./create-recipe-modal"
import { MeasurementUnit, RecipeCategory } from "@homejiak/api"

const detailsSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().optional(),
  category: z.enum(RecipeCategory),
  productId: z.string().optional(),
  baseYield: z.number().positive("Yield must be positive"),
  yieldUnit: z.enum(MeasurementUnit),
  prepTime: z.number().min(0, "Prep time cannot be negative"),
  cookTime: z.number().min(0, "Cook time cannot be negative"),
  coolingTime: z.number().min(0).optional(),
  decorationTime: z.number().min(0).optional(),
  shelfLifeDays: z.number().int().positive().optional(),
  storageInstructions: z.string().optional(),
  notes: z.string().optional(),
})

const recipeCategoryOptions = Object.values(RecipeCategory) as string[]

type DetailsFormData = z.infer<typeof detailsSchema>

interface RecipeDetailsStepProps {
  initialData: Partial<RecipeFormData>
  onNext: (data: Partial<RecipeFormData>) => void
  onCancel: () => void
}

export function RecipeDetailsStep({ initialData, onNext, onCancel }: RecipeDetailsStepProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DetailsFormData>({
    resolver: zodResolver(detailsSchema),
    defaultValues: {
      ...initialData,
      coolingTime: initialData.coolingTime || 0,
      decorationTime: initialData.decorationTime || 0,
    },
  })

  // Fetch products for linking
  const { data: productsData } = api.product.list.useQuery({
    page: 1,
    limit: 100,
  })

  const onSubmit = (data: DetailsFormData) => {
    onNext(data)
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Recipe Name *
        </label>
        <input
          type="text"
          placeholder="e.g., Chocolate Chip Cookies"
          {...register("name")}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea
          rows={3}
          placeholder="Brief description of the recipe..."
          {...register("description")}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
          <select
            {...register("category")}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          >
            {recipeCategoryOptions.map((cat) => (
              <option key={cat} value={cat}>
                {cat.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Link to Product
          </label>
          <select
            {...register("productId")}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          >
            <option value="">None</option>
            {productsData?.items.map((product: any) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Yield Amount *
          </label>
          <input
            type="number"
            step="0.1"
            placeholder="24"
            {...register("baseYield", { valueAsNumber: true })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
          {errors.baseYield && (
            <p className="mt-1 text-sm text-red-600">{errors.baseYield.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Yield Unit *</label>
          <select
            {...register("yieldUnit")}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          >
            <option value="PIECES">PIECES</option>
            <option value="SERVINGS">SERVINGS</option>
            <option value="BATCHES">BATCHES</option>
            <option value="DOZEN">DOZEN</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Prep Time (min) *
          </label>
          <input
            type="number"
            placeholder="15"
            {...register("prepTime", { valueAsNumber: true })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
          {errors.prepTime && (
            <p className="mt-1 text-sm text-red-600">{errors.prepTime.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Cook Time (min) *
          </label>
          <input
            type="number"
            placeholder="12"
            {...register("cookTime", { valueAsNumber: true })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
          {errors.cookTime && (
            <p className="mt-1 text-sm text-red-600">{errors.cookTime.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Cooling Time (min)
          </label>
          <input
            type="number"
            placeholder="0"
            {...register("coolingTime", { valueAsNumber: true })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Decoration Time (min)
          </label>
          <input
            type="number"
            placeholder="0"
            {...register("decorationTime", { valueAsNumber: true })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Shelf Life (days)
          </label>
          <input
            type="number"
            placeholder="7"
            {...register("shelfLifeDays", { valueAsNumber: true })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Storage Instructions
          </label>
          <input
            type="text"
            placeholder="e.g., Refrigerate"
            {...register("storageInstructions")}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
        <textarea
          rows={3}
          placeholder="Any additional notes or instructions..."
          {...register("notes")}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        />
      </div>

      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit(onSubmit)}
          className="flex-1 px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
        >
          Continue
        </button>
      </div>
    </div>
  )
}