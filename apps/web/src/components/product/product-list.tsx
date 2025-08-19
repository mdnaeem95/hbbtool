"use client"

import { useState } from "react"
import { api } from "@/lib/trpc/client"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow,
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Checkbox,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  toast,
} from "@kitchencloud/ui"
import { 
  MoreHorizontal, 
  Edit, 
  Copy, 
  Trash,
  Search,
  Package,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { formatDistanceToNow } from "date-fns"
import Link from "next/link"

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
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set())
  
  const page = Number(searchParams.page) || 1
  const limit = 10

  const { data, isLoading } = api.product.list.useQuery({
    page,
    limit,
    search: searchParams.search || undefined,
    status: searchParams.status && searchParams.status !== 'all' ? searchParams.status as ProductStatus : undefined,
    categoryId: searchParams.category || undefined,
  })

  const { mutate: deleteProduct } = api.product.delete.useMutation({
    onSuccess: () => {
      toast({
        title: "Product deleted",
        description: "The product has been deleted successfully.",
      })
      router.refresh()
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete product. Please try again.",
        variant: "destructive",
      })
    },
  })

  // Remove duplicate mutation for now since it's not in the router yet
  const handleDuplicate = () => {
    toast({
      title: "Coming soon",
      description: "Product duplication will be available soon.",
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

  const updateSearchParam = (key: string, value: string | null) => {
    const params = new URLSearchParams(window.location.search)
    if (value && value !== '') {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    router.push(`/dashboard/products?${params.toString()}`)
  }

  if (isLoading) {
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
              defaultValue={searchParams.search}
              onChange={(e) => updateSearchParam("search", e.target.value || null)}
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
              onClick={() => {
                // Implement bulk delete
                toast({
                  title: "Bulk actions",
                  description: "Bulk actions coming soon!",
                })
              }}
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
                    <p className="text-muted-foreground">No products found</p>
                    <Button size="sm" asChild>
                      <Link href="/dashboard/products/new">Add Product</Link>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              products.map((product: any) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedProducts.has(product.id)}
                      onCheckedChange={(checked) => 
                        handleSelectProduct(product.id, checked as boolean)
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {product.images[0] ? (
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
                        <p className="font-medium">{product.name}</p>
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
                        <Button variant="ghost" size="icon">
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
                          onClick={() => handleDuplicate()}
                          className="hover:bg-gray-100 cursor-pointer focus:bg-gray-100"
                        >
                          <Copy className="mr-2 h-4 w-4" />
                          Duplicate
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