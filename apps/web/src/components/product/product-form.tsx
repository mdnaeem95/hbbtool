"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm, useFieldArray, Control, FieldValues } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import Link from "next/link"
import { api } from "../../lib/trpc/client"
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle,
  Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage,
  Input, Textarea, Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  Switch, Tabs, TabsContent, TabsList, TabsTrigger, useToast, cn } from "@homejiak/ui"
import { ChevronLeft, Save, Upload, X, Plus } from "lucide-react"
import { ProductStatus } from "@homejiak/database/types"

// ---------- Schema & Types ----------
const productFormSchema = z.object({
  name: z.string().min(1, "Product name is required").max(200),
  description: z.string().default(""),
  categoryId: z.string().optional(),

  price: z
    .string()
    .refine((v) => v !== "" && !Number.isNaN(Number(v)) && Number(v) >= 0, "Enter a valid non-negative price"),
  compareAtPrice: z
    .string()
    .default("")
    .refine((v) => v === "" || (!Number.isNaN(Number(v)) && Number(v) >= 0), "Enter a valid non-negative number"),

  sku: z.string().default(""),
  trackInventory: z.boolean().default(false),
  inventory: z
    .string()
    .default("0")
    .refine((v) => v !== "" && Number.isInteger(Number(v)) && Number(v) >= 0, "Enter a valid non-negative integer"),

  images: z.array(z.string().url()).default([]),
  status: z.nativeEnum(ProductStatus).default(ProductStatus.DRAFT),
  featured: z.boolean().default(false),
  preparationTime: z.string().default(""),
  ingredients: z.array(z.string()).default([]),
  allergens: z.array(z.string()).default([]),
})

// IMPORTANT: use the *input* side for RHF (defaults => optional at input)
type ProductFormValues = z.input<typeof productFormSchema>

// ---------- Local Product type (from your props) ----------
interface Product {
  id: string
  merchantId: string
  categoryId: string | null
  sku: string | null
  name: string
  slug: string
  description: string | null
  images: string[]
  price: number | { toNumber(): number }
  compareAtPrice: number | { toNumber(): number } | null
  trackInventory: boolean
  inventory: number
  lowStockThreshold: number | null
  allowBackorder: boolean
  status: ProductStatus
  featured: boolean
  sortOrder: number
  allergens: string[]
  dietaryInfo: string[]
  spiceLevel: number | null
  servingSize: string | null
  calories: number | null
  ingredients: string[]
  preparationTime: number | null
  preparationMethod: string | null
  shelfLife: string | null
  storageInstructions: string | null
  reheatingInstructions: string | null
  createdAt: Date
  updatedAt: Date
}

interface ProductFormProps {
  product?: Product & {
    category?: { id: string; name: string } | null
    variants?: any[]
    _count?: { orderItems: number; reviews: number }
  }
}

export function ProductForm({ product }: ProductFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("basic")

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: product?.name ?? "",
      description: product?.description ?? "",
      categoryId: product?.categoryId ?? undefined,
      price: product?.price
        ? typeof product.price === "object" && "toNumber" in product.price
          ? String(product.price.toNumber())
          : String(product.price)
        : "",
      compareAtPrice: product?.compareAtPrice
        ? typeof product.compareAtPrice === "object" && "toNumber" in product.compareAtPrice
          ? String(product.compareAtPrice.toNumber())
          : String(product.compareAtPrice)
        : "",
      sku: product?.sku ?? "",
      trackInventory: product?.trackInventory ?? false,
      inventory: product?.inventory != null ? String(product.inventory) : "0",
      images: product?.images ?? [],
      status: product?.status ?? ProductStatus.DRAFT,
      featured: product?.featured ?? false,
      preparationTime:
        product?.preparationTime != null ? String(product.preparationTime) : "",
      ingredients: product?.ingredients ?? [],
      allergens: product?.allergens ?? [],
    },
  })

  // Field arrays (Option B)
  const {
    fields: ingredientFields,
    append: appendIngredient,
    remove: removeIngredient,
  } = useFieldArray<FieldValues, "ingredients">({
    control: form.control as unknown as Control<FieldValues>,
    name: "ingredients",
  })

  const {
    fields: imageFields,
    append: appendImage,
    remove: removeImage,
  } = useFieldArray<FieldValues, "images">({
    control: form.control as unknown as Control<FieldValues>,
    name: "images",
  })

  // Fetch categories (assuming dashboard payload includes them)
  const { data: categoriesData } = api.merchant.getDashboard.useQuery()

  // Mutations
  const { mutate: createProduct } = api.product.create.useMutation({
    onSuccess: () => {
      toast({ title: "Product created", description: "Your product has been created successfully." })
      router.push("/dashboard/products")
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message || "Failed to create product.", variant: "destructive" })
      setIsLoading(false)
    },
  })

  const { mutate: updateProduct } = api.product.update.useMutation({
    onSuccess: () => {
      toast({ title: "Product updated", description: "Your product has been updated successfully." })
      router.push("/dashboard/products")
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message || "Failed to update product.", variant: "destructive" })
      setIsLoading(false)
    },
  })

  // Submit
  const onSubmit = async (values: ProductFormValues) => {
    setIsLoading(true)

    const price = Number(values.price)
    const compareAt =
      values.compareAtPrice && values.compareAtPrice !== ""
        ? Number(values.compareAtPrice)
        : undefined
    const inventory = Number(values.inventory)

    const preparationTime =
      values.preparationTime && values.preparationTime.trim() !== ""
        ? values.preparationTime
        : undefined

    const data = {
      ...values,
      price,
      compareAtPrice: compareAt,
      inventory,
      preparationTime,
    }

    if (product) {
      updateProduct({ id: product.id, data })
    } else {
      createProduct(data)
    }
  }

  // Helpers
  const handleImageUpload = () => {
    // demo placeholder
    toast({ title: "Coming soon", description: "Image upload will be available soon." })
    // Example (when ready): appendImage("https://example.com/image.jpg")
  }

  type SimpleCategory = { id: string; name: string }
    const categories =
  ((categoriesData as any)?.merchant?.categories as SimpleCategory[] | undefined) ?? []

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/products">
              <ChevronLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {product ? "Edit Product" : "New Product"}
            </h1>
            <p className="text-muted-foreground">
              {product ? "Update product details" : "Add a new product to your menu"}
            </p>
          </div>
        </div>
        {product && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {product._count && (
              <>
                <span>{product._count.orderItems} orders</span>
                <span>•</span>
                <span>{product._count.reviews} reviews</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Form */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} defaultValue="basic">
            <TabsList className="settings-tabslist grid w-full grid-cols-4">
              <TabsTrigger 
                value="basic"
                className={cn(
                  "settings-tabtrigger gap-2",
                  activeTab === "basic" && "settings-tabtrigger-active"
                )}
              >
                Basic Info
              </TabsTrigger>
              <TabsTrigger 
                value="pricing"
                className={cn(
                  "settings-tabtrigger gap-2", 
                  activeTab === "pricing" && "settings-tabtrigger-active"
                )}
              >
                Pricing & Inventory
              </TabsTrigger>
              <TabsTrigger 
                value="media"
                className={cn(
                  "settings-tabtrigger gap-2",
                  activeTab === "media" && "settings-tabtrigger-active"
                )}
              >
                Media
              </TabsTrigger>
              <TabsTrigger 
                value="details"
                className={cn(
                  "settings-tabtrigger gap-2",
                  activeTab === "details" && "settings-tabtrigger-active"
                )}
              >
                Details
              </TabsTrigger>
            </TabsList>

            {/* Basic Info */}
            <TabsContent value="basic" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                  <CardDescription>Essential details about your product</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Product Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Chicken Rice" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Describe your product..." className="min-h-[100px]" {...field} />
                        </FormControl>
                        <FormDescription>
                          Help customers understand what makes this dish special
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="categoryId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {categories.map((category: { id: string; name: string }) => (
                              <SelectItem key={category.id} value={category.id}>
                                {category.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value={ProductStatus.DRAFT}>Draft</SelectItem>
                            <SelectItem value={ProductStatus.ACTIVE}>Active</SelectItem>
                            <SelectItem value={ProductStatus.SOLD_OUT}>Sold Out</SelectItem>
                            <SelectItem value={ProductStatus.DISCONTINUED}>Discontinued</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>Only active products are visible to customers</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="featured"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Featured Product</FormLabel>
                          <FormDescription>Featured products appear at the top of your menu</FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Pricing & Inventory */}
            <TabsContent value="pricing" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Pricing & Inventory</CardTitle>
                  <CardDescription>Set your price and manage stock levels</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Price</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2">$</span>
                              <Input type="number" step="0.01" placeholder="0.00" className="pl-8" {...field} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="compareAtPrice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Compare at Price</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2">$</span>
                              <Input type="number" step="0.01" placeholder="0.00" className="pl-8" {...field} />
                            </div>
                          </FormControl>
                          <FormDescription>Original price to show discount</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="sku"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>SKU</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., CHKN-001" {...field} />
                        </FormControl>
                        <FormDescription>Stock keeping unit for inventory tracking</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="trackInventory"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Track Inventory</FormLabel>
                          <FormDescription>Automatically track stock levels</FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {form.watch("trackInventory") && (
                    <FormField
                      control={form.control}
                      name="inventory"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Current Stock</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="0" {...field} />
                          </FormControl>
                          <FormDescription>Number of units available for sale</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Media */}
            <TabsContent value="media" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Product Images</CardTitle>
                  <CardDescription>Upload images to showcase your product</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4">
                    {imageFields.length > 0 ? (
                      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                        {imageFields.map((field, index) => {
                          const value = form.watch(`images.${index}`) ?? ""
                          return (
                            <div key={field.id} className="relative group">
                              {value ? (
                                // preview
                                <img
                                  src={value}
                                  alt={`Product ${index + 1}`}
                                  className="h-32 w-full rounded-lg object-cover"
                                />
                              ) : (
                                <Input
                                  placeholder="Paste image URL"
                                  {...form.register(`images.${index}`)}
                                />
                              )}
                              <button
                                type="button"
                                onClick={() => removeImage(index)}
                                className="absolute right-2 top-2 rounded-full bg-white p-1 opacity-0 shadow-sm transition-opacity group-hover:opacity-100"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="flex h-32 items-center justify-center rounded-lg border-2 border-dashed">
                        <div className="text-center">
                          <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
                          <p className="mt-2 text-sm text-muted-foreground">No images uploaded yet</p>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button type="button" variant="outline" onClick={handleImageUpload} className="hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 hover:shadow-sm transition-all duration-200">
                        <Upload className="mr-2 h-4 w-4" />
                        Upload Images
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => appendImage("")}
                        title="Add image by URL"
                        className="hover:bg-green-50 hover:border-green-300 hover:text-green-700 hover:shadow-sm transition-all duration-200"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add Image URL
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Details */}
            <TabsContent value="details" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Additional Details</CardTitle>
                  <CardDescription>Extra information about your product</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="preparationTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Preparation Time</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., 15–20 mins" {...field} />
                        </FormControl>
                        <FormDescription>Estimated time to prepare this dish</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-4">
                    <div>
                      <FormLabel>Ingredients</FormLabel>
                      <FormDescription>List the main ingredients in this dish</FormDescription>
                    </div>

                    {ingredientFields.map((field, index) => (
                      <div key={field.id} className="flex gap-2">
                        <Input
                          {...form.register(`ingredients.${index}`)}
                          placeholder="e.g., Chicken, Rice"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeIngredient(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => appendIngredient("")}
                      className="hover:bg-green-50 hover:border-green-300 hover:text-green-700 hover:shadow-sm transition-all duration-200"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Ingredient
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Actions */}
          <div className="flex items-center justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/dashboard/products")}
              disabled={isLoading}
              className="hover:bg-gray-50 hover:border-gray-300 hover:shadow-sm transition-all duration-200"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="hover:bg-orange-700 hover:shadow-lg hover:scale-[1.02] transition-all duration-200 active:scale-[0.98]">
              <Save className="mr-2 h-4 w-4" />
              {isLoading ? "Saving..." : product ? "Update Product" : "Create Product"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
