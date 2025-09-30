"use client"

import { useCallback, useEffect, useState } from "react"
import { api } from "../../lib/trpc/client"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
  Badge, Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  Checkbox, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, toast } from "@homejiak/ui"
import { MoreHorizontal, Edit, Copy, Trash, Search, Package, ChevronLeft, ChevronRight } from "lucide-react"
import { useRouter } from "next/navigation"
import { formatDistanceToNow } from "date-fns"
import Link from "next/link"
import { useDebounce } from "@/hooks/use-debounce"

// Import the enum from the schema
enum ProductStatus {
  DRAFT = "DRAFT",
  ACTIVE = "ACTIVE", 
  SOLD_OUT = "SOLD_OUT",
  DISCONTINUED = "DISCONTINUED"
}

interface ProductListProps {
  searchParams: {
    page?: string
    search?: string
    status?: string
    category?: string
    sort?: string
  }
}

export function ProductList({ searchParams }: ProductListProps) {
  const router = useRouter()
  const utils = api.useUtils()
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set())
  const [localSearch, setLocalSearch] = useState(searchParams.search || "")

  const debouncedSearch = useDebounce(localSearch, 500)
  
  const page = Number(searchParams.page) || 1
  const limit = 10

  // Build query key for cache operations
  const queryKey = {
    page,
    limit,
    search: debouncedSearch || undefined,
    status: searchParams.status && searchParams.status !== 'all' ? searchParams.status as ProductStatus : undefined,
    categoryId: searchParams.category || undefined,
  }

  const { data, isLoading } = api.product.list.useQuery(queryKey)

  // Delete mutation with optimistic updates
  const { mutate: deleteProduct } = api.product.delete.useMutation({
    onMutate: async ({ id }) => {
      // Cancel any outgoing refetches
      await utils.product.list.cancel()
      
      // Snapshot the previous value
      const previousData = utils.product.list.getData(queryKey)
      
      // Optimistically remove the product from the list
      if (previousData) {
        utils.product.list.setData(queryKey, {
          ...previousData,
          items: previousData.items.filter((p: any) => p.id !== id),
          pagination: {
            ...previousData.pagination,
            total: Math.max(0, previousData.pagination.total - 1),
          }
        })
      }
      
      // Also remove from selected products if it was selected
      setSelectedProducts(prev => {
        const newSet = new Set(prev)
        newSet.delete(id)
        return newSet
      })
      
      // Return context with snapshot for potential rollback
      return { previousData }
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousData) {
        console.log('Rolling back optimistic update due to error:', err, variables)
        utils.product.list.setData(queryKey, context.previousData)
      }
      
      toast({
        title: "Error",
        description: "Failed to delete product. Please try again.",
        variant: "destructive",
      })
    },
    onSettled: async () => {
      // Always refetch after error or success to ensure consistency
      await utils.product.list.invalidate()
    },
    onSuccess: () => {
      toast({
        title: "Product deleted",
        description: "The product has been deleted successfully.",
      })
    },
  })

  // Duplicate mutation with optimistic updates
  const { mutate: duplicateProduct, isPending: isDuplicating } = api.product.duplicate.useMutation({
    onMutate: async ({ id }) => {
      // Cancel any outgoing refetches
      await utils.product.list.cancel()
      
      // Snapshot the previous value
      const previousData = utils.product.list.getData(queryKey)
      
      // Find the product being duplicated
      const productToDuplicate = previousData?.items.find((p: any) => p.id === id)
      
      if (productToDuplicate && previousData) {
        // Create optimistic duplicated product
        const tempDuplicatedProduct = {
          ...productToDuplicate,
          id: `temp-${Date.now()}`, // Temporary ID
          name: `${productToDuplicate.name} (Copy)`,
          status: 'DRAFT' as ProductStatus,
          featured: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        
        // Add to the beginning of the list (most recent first)
        utils.product.list.setData(queryKey, {
          ...previousData,
          items: [tempDuplicatedProduct, ...previousData.items],
          pagination: {
            ...previousData.pagination,
            total: previousData.pagination.total + 1,
          }
        })
      }
      
      // Return context with snapshot
      return { previousData }
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousData) {
        console.log('Rolling back optimistic update due to error:', err, variables)
        utils.product.list.setData(queryKey, context.previousData)
      }
      
      toast({
        title: "Error",
        description: err.message || "Failed to duplicate product. Please try again.",
        variant: "destructive",
      })
    },
    onSettled: async () => {
      // Always refetch after error or success to get the real data
      await utils.product.list.invalidate()
    },
    onSuccess: (data) => {
      toast({
        title: "Product duplicated",
        description: "The product has been duplicated successfully. It's been saved as a draft for your review.",
        action: (
          <Button
            size="sm"
            variant="outline"
            onClick={() => router.push(`/dashboard/products/${data.id}`)}
          >
            Edit
          </Button>
        )
      })
    },
  })

  // Bulk delete mutation with optimistic updates
  const { mutate: bulkDeleteProducts } = api.product.bulkUpdate.useMutation({
    onMutate: async ({ ids, action }) => {
      if (action !== 'delete') return
      
      // Cancel any outgoing refetches
      await utils.product.list.cancel()
      
      // Snapshot the previous value
      const previousData = utils.product.list.getData(queryKey)
      
      // Optimistically remove the products from the list
      if (previousData) {
        utils.product.list.setData(queryKey, {
          ...previousData,
          items: previousData.items.filter((p: any) => !ids.includes(p.id)),
          pagination: {
            ...previousData.pagination,
            total: Math.max(0, previousData.pagination.total - ids.length),
          }
        })
      }
      
      // Clear selected products
      setSelectedProducts(new Set())
      
      // Return context with snapshot
      return { previousData }
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousData) {
        console.log('Rolling back optimistic update due to error:', err, variables)
        utils.product.list.setData(queryKey, context.previousData)
      }
      
      toast({
        title: "Error",
        description: "Failed to delete products. Please try again.",
        variant: "destructive",
      })
    },
    onSettled: async () => {
      // Always refetch after error or success
      await utils.product.list.invalidate()
    },
    onSuccess: (data) => {
      toast({
        title: "Products deleted",
        description: `Successfully deleted ${data.count} products.`,
      })
    },
  })

  // Handle URL updates for search (only when debounced value changes)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    
    if (debouncedSearch && debouncedSearch !== '') {
      params.set('search', debouncedSearch)
    } else {
      params.delete('search')
    }
    
    // Only update URL if the search param actually changed
    const newUrl = params.toString() ? `/dashboard/products?${params.toString()}` : '/dashboard/products'
    if (window.location.pathname + window.location.search !== newUrl) {
      router.replace(newUrl, { scroll: false })
    }
  }, [debouncedSearch, router])

  const handleDuplicate = (productId: string) => {
    duplicateProduct({ 
      id: productId,
      includeModifiers: true 
    })
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedProducts(new Set(data?.items.map((p: any) => p.id) || []))
    } else {
      setSelectedProducts(new Set())
    }
  }

  const handleSelectProduct = (productId: string, checked: boolean) => {
    const newSelected = new Set(selectedProducts)
    if (checked) {
      newSelected.add(productId)
    } else {
      newSelected.delete(productId)
    }
    setSelectedProducts(newSelected)
  }

  const handleBulkDelete = () => {
    if (selectedProducts.size === 0) return
    
    if (confirm(`Are you sure you want to delete ${selectedProducts.size} product${selectedProducts.size > 1 ? 's' : ''}?`)) {
      bulkDeleteProducts({
        ids: Array.from(selectedProducts),
        action: 'delete'
      })
    }
  }

  // Update other params (not search) immediately
  const updateSearchParam = useCallback((key: string, value: string | null) => {
    if (key === 'search') {
      // For search, just update local state - the effect will handle URL update
      setLocalSearch(value || '')
      return
    }
    
    // For other params, update URL immediately
    const params = new URLSearchParams(window.location.search)
    if (value && value !== '') {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    router.push(`/dashboard/products?${params.toString()}`)
  }, [router])

  if (isLoading && !data) {
    return <ProductListSkeleton />
  }

  const products = data?.items || []
  const totalPages = data?.pagination?.totalPages || 1

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select
            value={searchParams.status || "all"}
            onValueChange={(value) => updateSearchParam("status", value === "all" ? null : value)}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="DRAFT">Draft</SelectItem>
              <SelectItem value="SOLD_OUT">Sold Out</SelectItem>
              <SelectItem value="DISCONTINUED">Discontinued</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {selectedProducts.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {selectedProducts.size} selected
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkDelete}
            >
              <Trash className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedProducts.size === products.length && products.length > 0}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Inventory</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Updated</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <Package className="h-8 w-8 text-muted-foreground" />
                    <p className="text-muted-foreground">
                      {debouncedSearch ? `No products found for "${debouncedSearch}"` : "No products found"}
                    </p>
                    <Button size="sm" asChild>
                      <Link href="/dashboard/products/new">Add Product</Link>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              products.map((product: any) => (
                <TableRow key={product.id} className={product.id.startsWith('temp-') ? 'opacity-60' : ''}>
                  <TableCell>
                    <Checkbox
                      checked={selectedProducts.has(product.id)}
                      onCheckedChange={(checked: any) => 
                        handleSelectProduct(product.id, checked as boolean)
                      }
                      disabled={product.id.startsWith('temp-')}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {product.images?.[0] ? (
                        <img
                          src={product.images[0]}
                          alt={product.name}
                          className="h-10 w-10 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                          <Package className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium">
                          {product.name}
                          {product.id.startsWith('temp-') && (
                            <span className="ml-2 text-xs text-muted-foreground">(Creating...)</span>
                          )}
                        </p>
                        {product.category && (
                          <p className="text-sm text-muted-foreground">
                            {product.category.name}
                          </p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">${Number(product.price).toFixed(2)}</p>
                      {product.compareAtPrice && (
                        <p className="text-sm text-muted-foreground line-through">
                          ${Number(product.compareAtPrice).toFixed(2)}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {product.trackInventory ? (
                      <div>
                        <p className={product.inventory === 0 ? "text-red-600" : ""}>
                          {product.inventory} in stock
                        </p>
                        {product.lowStockThreshold && 
                         product.inventory <= product.lowStockThreshold && 
                         product.inventory > 0 && (
                          <p className="text-sm text-yellow-600">Low stock</p>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Not tracked</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <ProductStatusBadge status={product.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDistanceToNow(new Date(product.updatedAt), { addSuffix: true })}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" disabled={product.id.startsWith('temp-')}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-white shadow-lg border z-50">
                        <DropdownMenuItem asChild className="hover:bg-gray-100 cursor-pointer focus:bg-gray-100">
                          <Link href={`/dashboard/products/${product.id}`}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDuplicate(product.id)}
                          disabled={isDuplicating}
                          className="hover:bg-gray-100 cursor-pointer focus:bg-gray-100"
                        >
                          <Copy className="mr-2 h-4 w-4" />
                          {isDuplicating ? "Duplicating..." : "Duplicate"}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-600 hover:bg-red-50 hover:text-red-700 cursor-pointer focus:bg-red-50 focus:text-red-700"
                          onClick={() => {
                            if (confirm("Are you sure you want to delete this product?")) {
                              deleteProduct({ id: product.id })
                            }
                          }}
                        >
                          <Trash className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => updateSearchParam("page", String(page - 1))}
              disabled={page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => updateSearchParam("page", String(page + 1))}
              disabled={page >= totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function ProductStatusBadge({ status }: { status: ProductStatus }) {
  const variants: Record<ProductStatus, "default" | "secondary" | "destructive" | "outline"> = {
    ACTIVE: "default",
    DRAFT: "secondary",
    SOLD_OUT: "destructive",
    DISCONTINUED: "outline",
  }

  const labels: Record<ProductStatus, string> = {
    ACTIVE: "Active",
    DRAFT: "Draft",
    SOLD_OUT: "Sold Out",
    DISCONTINUED: "Discontinued",
  }

  return (
    <Badge variant={variants[status]}>
      {labels[status]}
    </Badge>
  )
}

export function ProductListSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="h-10 w-full max-w-sm animate-pulse rounded-lg bg-muted" />
        <div className="h-10 w-[150px] animate-pulse rounded-lg bg-muted" />
      </div>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12"></TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Inventory</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Updated</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell>
                  <div className="h-4 w-4 animate-pulse rounded bg-muted" />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 animate-pulse rounded-lg bg-muted" />
                    <div className="space-y-2">
                      <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                      <div className="h-3 w-24 animate-pulse rounded bg-muted" />
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="h-4 w-16 animate-pulse rounded bg-muted" />
                </TableCell>
                <TableCell>
                  <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                </TableCell>
                <TableCell>
                  <div className="h-6 w-16 animate-pulse rounded bg-muted" />
                </TableCell>
                <TableCell>
                  <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                </TableCell>
                <TableCell>
                  <div className="h-8 w-8 animate-pulse rounded bg-muted" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}