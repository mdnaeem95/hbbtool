"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import Link from "next/link"
import { api } from "../../lib/trpc/client"
import { 
  Button, Card, CardContent, CardDescription, CardHeader, CardTitle,
  Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage,
  Input, Textarea, Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  Switch, Tabs, TabsContent, TabsList, TabsTrigger, useToast, cn 
} from "@homejiak/ui"
import { ChevronLeft, Eye, ImageIcon, Save, Sparkles } from "lucide-react"
import { ProductStatus } from "@homejiak/types"
import { ProductImageManager } from "./image-manager"
import { ProductModifiersManager } from "./product-modifier-manager"
import { LocalModifiersManager } from "./local-modifiers-manager"
import { ProductVariantManager, type ProductVariant } from "./product-variant-manager"
import { CategoryCombobox } from "./category-combobox"
import { IngredientsPicker } from "./ingredients-picker"
import { ProductPreviewModal } from "./product-preview-modal"

// Product form schema
const productFormSchema = z.object({
  name: z.string().min(1, "Product name is required").max(200),
  description: z.string().default(""),
  categoryId: z.string().optional(),
  price: z.string().refine(
    (v) => v !== "" && !Number.isNaN(Number(v)) && Number(v) >= 0, 
    "Enter a valid non-negative price"
  ),
  compareAtPrice: z.string().default("").refine(
    (v) => v === "" || (!Number.isNaN(Number(v)) && Number(v) >= 0), 
    "Enter a valid non-negative number"
  ),
  sku: z.string().default(""),
  trackInventory: z.boolean().default(false),
  inventory: z.string().default("0").refine(
    (v) => v !== "" && Number.isInteger(Number(v)) && Number(v) >= 0, 
    "Enter a valid non-negative integer"
  ),
  images: z.array(z.string().url()).default([]),
  status: z.nativeEnum(ProductStatus).default(ProductStatus.DRAFT),
  featured: z.boolean().default(false),
  preparationTime: z.string().default(""),
  ingredients: z.array(z.string()).default([]),
  ingredientIds: z.array(z.string()).default([]),
  allergens: z.array(z.string()).default([]),
})

type ProductFormValues = z.input<typeof productFormSchema>

// Local Modifier types for state management
export interface LocalModifier {
  id?: string
  name: string
  description?: string
  priceAdjustment: number
  priceType: "FIXED" | "PERCENTAGE"
  sortOrder: number
  isAvailable: boolean
  isDefault?: boolean
  isNew?: boolean
}

export interface LocalModifierGroup {
  id?: string
  name: string
  description?: string
  type: "SINGLE_SELECT" | "MULTI_SELECT"
  required: boolean
  minSelect?: number
  maxSelect?: number
  sortOrder: number
  isActive: boolean
  modifiers: LocalModifier[]
  isNew?: boolean
}

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
  status: ProductStatus
  featured: boolean
  preparationTime: number | null
  ingredients: string[]
  allergens: string[]
  variants?: any[]
}

interface ProductFormProps {
  product?: Product & {
    category?: { id: string; name: string } | null
    _count?: { orderItems: number; reviews: number }
  }
}

export function ProductForm({ product }: ProductFormProps) {
  const productId = product?.id || ''
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("basic")
  const [showPreview, setShowPreview] = useState(false)

  // LOCAL STATE FOR VARIANTS AND MODIFIERS
  const [localVariants, setLocalVariants] = useState<ProductVariant[]>(
    product?.variants || []
  )
  const [localModifierGroups, setLocalModifierGroups] = useState<LocalModifierGroup[]>([])

  // Fetch existing data only when editing
  const { data: modifierGroups } = api.productModifiers.getByProduct.useQuery(
    { productId },
    { 
      enabled: !!productId && productId !== '',
    }
  )

  // Handle modifier groups data with useEffect
  useEffect(() => {
    if (modifierGroups && !localModifierGroups.length && !product) {
      // Only set on initial load for edit mode
      setLocalModifierGroups(modifierGroups as any)
    }
  }, [modifierGroups, localModifierGroups.length, product])

  // Mutations
  const createProductMutation = api.product.create.useMutation({
    onSuccess: async (data) => {
      if (data?.id) {
        await saveVariantsAndModifiers(data.id)
      }
      
      toast({
        title: "Success",
        description: "Product created successfully with all variants and customizations!",
      })
      
      router.push("/dashboard/products")
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create product",
        variant: "destructive",
      })
      setIsLoading(false)
    },
  })

  const updateProductMutation = api.product.update.useMutation({
    onSuccess: async (data) => {
      if (data?.id) {
        await saveVariantsAndModifiers(data.id)
      }
      
      toast({
        title: "Success",
        description: "Product updated successfully!",
      })
      
      router.push("/dashboard/products")
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update product",
        variant: "destructive",
      })
      setIsLoading(false)
    },
  })

  const upsertVariantsMutation = api.productVariants.upsertVariants.useMutation()
  const bulkUpsertModifiersMutation = api.productModifiers.bulkUpsertGroups.useMutation()

  // Helper function to save variants and modifiers after product creation/update
  const saveVariantsAndModifiers = async (productId: string) => {
    const errors: string[] = []
    
    try {
      // Save variants if any exist
      if (localVariants.length > 0) {
        const variantsToSave = localVariants
          .filter(v => !v.isDeleted)
          .map(v => ({
            id: v.id?.startsWith('new-') ? undefined : v.id,
            sku: v.sku,
            name: v.name,
            options: v.options,
            priceAdjustment: v.priceAdjustment,
            inventory: v.inventory,
            isDefault: v.isDefault,
            sortOrder: v.sortOrder,
            imageUrl: v.imageUrl,
          }))

        if (variantsToSave.length > 0) {
          await upsertVariantsMutation.mutateAsync({
            productId,
            variants: variantsToSave,
          })
        }
      }
    } catch (error) {
      console.error('Error saving variants:', error)
      errors.push('variants')
    }

    try {
      // Save modifier groups if any exist
      if (localModifierGroups.length > 0) {
        const groupsToSave = localModifierGroups
          .filter(g => g.name.trim() !== '') // Only save groups with names
          .map(g => ({
            id: g.id?.startsWith('temp-') ? undefined : g.id,
            name: g.name,
            description: g.description,
            type: g.type,
            required: g.required,
            minSelect: g.minSelect,
            maxSelect: g.maxSelect,
            sortOrder: g.sortOrder,
            isActive: g.isActive,
            modifiers: g.modifiers
              .filter(m => m.name.trim() !== '') // Only save modifiers with names
              .map(m => ({
                id: m.id?.startsWith('temp-') ? undefined : m.id,
                name: m.name,
                description: m.description,
                priceAdjustment: m.priceAdjustment,
                priceType: m.priceType,
                sortOrder: m.sortOrder,
                isAvailable: m.isAvailable,
                isDefault: m.isDefault,
              })),
          }))
          .filter(g => g.modifiers.length > 0) // Only save groups with modifiers

        if (groupsToSave.length > 0) {
          await bulkUpsertModifiersMutation.mutateAsync({
            productId,
            groups: groupsToSave,
          })
        }
      }
    } catch (error) {
      console.error('Error saving modifiers:', error)
      errors.push('customizations')
    }

    if (errors.length > 0) {
      toast({
        title: "Partial Save",
        description: `Product saved but some ${errors.join(' and ')} may not have been saved. You can add them by editing the product.`,
        variant: "destructive",
      })
    }
  }

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
      preparationTime: product?.preparationTime != null ? String(product.preparationTime) : "",
      ingredients: product?.ingredients ?? [],
      allergens: product?.allergens ?? [],
    },
  })

  const onSubmit = (values: ProductFormValues) => {
    setIsLoading(true)

    const price = parseFloat(values.price)
    const compareAt = values.compareAtPrice ? parseFloat(values.compareAtPrice) : undefined
    const inventory = parseInt(values?.inventory!, 10)
    const preparationTime = values.preparationTime ? parseInt(values.preparationTime, 10) : undefined

    const data = {
      ...values,
      price,
      compareAtPrice: compareAt,
      inventory,
      preparationTime,
    }

    if (product) {
      updateProductMutation.mutate({ id: product.id, data })
    } else {
      createProductMutation.mutate(data)
    }
  }

  // Handle changes from local managers
  const handleVariantsChange = (updatedVariants: ProductVariant[]) => {
    setLocalVariants(updatedVariants)
  }

  const handleModifiersChange = (updatedGroups: LocalModifierGroup[]) => {
    setLocalModifierGroups(updatedGroups)
  }

  // Count active items
  const activeVariantsCount = localVariants.filter(v => !v.isDeleted).length
  const activeModifiersCount = localModifierGroups.filter(g => 
    g.name.trim() !== '' && g.modifiers.some(m => m.name.trim() !== '')
  ).length

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
        {product && product._count && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{product._count.orderItems} orders</span>
            <span>•</span>
            <span>{product._count.reviews} reviews</span>
          </div>
        )}
      </div>

      {/* Info banner for new products */}
      {!product && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="flex items-start gap-3 pt-4">
            <Sparkles className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900">
                All-in-one product creation! 🎉
              </p>
              <p className="text-sm text-blue-700 mt-1">
                Add variants, customization options, and all product details in one go. 
                Everything saves together when you click Save Product.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Form */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} defaultValue="basic">
            <TabsList className="settings-tabslist grid w-full grid-cols-6">
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
                Pricing
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
                value="variants"
                className={cn(
                  "settings-tabtrigger gap-2",
                  activeTab === "variants" && "settings-tabtrigger-active"
                )}
              >
                Variants
                {activeVariantsCount > 0 && (
                  <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-xs text-white">
                    {activeVariantsCount}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger 
                value="customization"
                className={cn(
                  "settings-tabtrigger gap-2",
                  activeTab === "customization" && "settings-tabtrigger-active"
                )}
              >
                Customization
                {activeModifiersCount > 0 && (
                  <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-xs text-white">
                    {activeModifiersCount}
                  </span>
                )}
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

            {/* Basic Info Tab */}
            <TabsContent value="basic" className="space-y-6">
              <Card>
                <CardHeader className="space-y-2">
                  <CardTitle>Basic Information</CardTitle>
                  <CardDescription>Essential product details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Product Name *</FormLabel>
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
                          <Textarea
                            placeholder="Describe your product..."
                            className="min-h-[100px]"
                            {...field}
                          />
                        </FormControl>
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
                        <FormControl>
                          <CategoryCombobox
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="Select or create category..."
                            disabled={isLoading}
                          />
                        </FormControl>
                        <FormDescription>
                          Choose an existing category or create a new one
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Pricing & Inventory Tab */}
            <TabsContent value="pricing" className="space-y-6">
              <Card>
                <CardHeader className="space-y-2">
                  <CardTitle>Pricing</CardTitle>
                  <CardDescription>Set your product pricing</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Price *</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              {...field}
                            />
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
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>Original price for sale items</FormDescription>
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
                        <FormLabel>SKU (Stock Keeping Unit)</FormLabel>
                        <div className="flex gap-2">
                          <FormControl>
                            <Input placeholder="e.g., CHK-RICE-001" {...field} />
                          </FormControl>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              const productName = form.watch("name") || "PRODUCT"
                              const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase()
                              const generatedSku = productName
                                .toUpperCase()
                                .replace(/[^A-Z0-9]/g, '-')
                                .substring(0, 15) + '-' + randomSuffix
                              field.onChange(generatedSku)
                              toast({
                                title: "SKU Generated",
                                description: `Auto-generated: ${generatedSku}`,
                              })
                            }}
                            className="group whitespace-nowrap transition-all hover:shadow-md"
                          >
                            <svg 
                              className="mr-2 h-4 w-4 transition-transform group-hover:rotate-12" 
                              fill="none" 
                              stroke="currentColor" 
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            Generate
                          </Button>
                        </div>
                        <FormDescription className="space-y-1">
                          <p className="text-sm">
                            A unique code to identify and track this product in your inventory.
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Useful for inventory management, order tracking, and sales reports. 
                            Click "Generate" to create one automatically.
                          </p>
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="space-y-2">
                  <CardTitle>Inventory</CardTitle>
                  <CardDescription>Manage product stock</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="trackInventory"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Track Inventory</FormLabel>
                          <FormDescription>
                            Monitor stock levels for this product
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
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
                          <FormLabel>Stock Quantity</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              step="1"
                              placeholder="0"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Media Tab */}
            <TabsContent value="media" className="space-y-6">
              {productId ? (
                // For existing products, use the full image manager with API calls
                <ProductImageManager 
                  productId={productId}
                  images={form.watch("images") || []}
                  onUpdate={() => {
                    // Optionally refresh or show success message
                    toast({ title: "Images updated" })
                  }}
                />
              ) : (
                // For new products, show a placeholder or simple uploader
                <Card>
                  <CardHeader className="space-y-2">
                    <CardTitle>Product Images</CardTitle>
                    <CardDescription>Add photos after creating the product</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <ImageIcon className="h-12 w-12 text-muted-foreground/50 mb-4" />
                    <p className="text-sm text-muted-foreground text-center max-w-md">
                      Save the product first, then you can upload and manage images. 
                      This ensures your images are properly linked to the product.
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Variants Tab - ALWAYS ENABLED */}
            <TabsContent value="variants">
              <Card>
                <CardHeader className="space-y-2">
                  <CardTitle>Product Variants</CardTitle>
                  <CardDescription>
                    Add different options like sizes, colors, or flavors
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ProductVariantManager
                    variants={localVariants}
                    onChange={handleVariantsChange}
                    basePrice={Number(form.watch("price")) || 0}
                    trackInventory={form.watch("trackInventory")}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Customization Tab - NOW ENABLED FOR ALL */}
            <TabsContent value="customization">
              {productId ? (
                // Existing product - use the original manager with direct DB updates
                <ProductModifiersManager
                  productId={productId}
                  existingGroups={modifierGroups || []}
                />
              ) : (
                // New product - use local state manager
                <LocalModifiersManager
                  groups={localModifierGroups}
                  onChange={handleModifiersChange}
                />
              )}
            </TabsContent>

            {/* Details Tab */}
            <TabsContent value="details" className="space-y-6">
              <Card>
                <CardHeader className="space-y-2">
                  <CardTitle>Additional Details</CardTitle>
                  <CardDescription>Extra information about your product</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="preparationTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Preparation Time (minutes)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            step="1"
                            placeholder="e.g., 30"
                            {...field}
                          />
                        </FormControl>
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
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value={ProductStatus.DRAFT}>Draft</SelectItem>
                            <SelectItem value={ProductStatus.ACTIVE}>Active</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="featured"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Featured Product</FormLabel>
                          <FormDescription>
                            Highlight this product on your storefront
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

                <FormField
                  control={form.control}
                  name="ingredientIds"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <IngredientsPicker
                          selectedIngredients={field.value!}
                          onChange={field.onChange}
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </TabsContent>
          </Tabs>

          {/* Action Buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowPreview(true)}
                className="group relative overflow-hidden transition-all duration-200 hover:shadow-md hover:scale-105"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <Eye className="mr-2 h-4 w-4 transition-transform group-hover:scale-110" />
                <span className="relative">Preview Changes</span>
              </Button>
            </div>
            
            <div className="flex items-center gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/dashboard/products")}
                disabled={isLoading}
                className="group relative overflow-hidden transition-all duration-200 hover:shadow-md hover:scale-105 disabled:hover:scale-100"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-gray-500/10 to-gray-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <span className="relative">Cancel</span>
              </Button>
              
              <Button 
                type="submit" 
                disabled={isLoading}
                className="group relative overflow-hidden bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 transition-all duration-200 hover:shadow-lg hover:scale-105 disabled:hover:scale-100 disabled:opacity-50"
              >
                <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <Save className="mr-2 h-4 w-4 relative transition-transform group-hover:rotate-12" />
                <span className="relative font-semibold">
                  {isLoading ? "Saving..." : product ? "Update Product" : "Save Product"}
                </span>
              </Button>
            </div>
          </div>

          {/* Preview Modal */}
          <ProductPreviewModal
            isOpen={showPreview}
            onClose={() => setShowPreview(false)}
            formData={{
              name: form.watch("name"),
              description: form.watch("description"),
              price: form.watch("price"),
              compareAtPrice: form.watch("compareAtPrice"),
              images: form.watch("images"),
              preparationTime: form.watch("preparationTime"),
              status: form.watch("status"),
              featured: form.watch("featured"),
              inventory: form.watch("inventory"),
            }}
          />
        </form>
      </Form>
    </div>
  )
}