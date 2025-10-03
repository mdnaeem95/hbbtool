"use client"

import { useState } from "react"
import { 
  Dialog, 
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Button,
  Badge,
  cn
} from "@homejiak/ui"
import { ProductCard } from "@homejiak/ui"
import { Eye, Monitor, Smartphone } from "lucide-react"

interface ProductPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  formData: {
    name: string
    description?: string
    price: string
    compareAtPrice?: string
    images?: string[]
    preparationTime?: string
    status?: string
    featured?: boolean
    inventory?: string
  }
}

export function ProductPreviewModal({ 
  isOpen, 
  onClose, 
  formData 
}: ProductPreviewModalProps) {
  const [previewMode, setPreviewMode] = useState<'card' | 'detail'>('card')
  const [device, setDevice] = useState<'mobile' | 'desktop'>('desktop')

  // Transform form data to product card format
  const previewProduct = {
    id: 'preview',
    name: formData.name || 'Untitled Product',
    description: formData.description,
    price: formData.price ? Number(formData.price) : 0,
    compareAtPrice: formData.compareAtPrice ? Number(formData.compareAtPrice) : undefined,
    images: (formData.images && formData.images.length > 0) ? formData.images : ['/placeholder-food.jpg'],
    preparationTime: formData.preparationTime,
    status: (formData.status as "ACTIVE" | "SOLD_OUT" | "UNAVAILABLE") || "ACTIVE",
    featured: formData.featured,
    inventory: formData.inventory ? Number(formData.inventory) : undefined,
    merchant: {
      name: 'Your Store',
      slug: 'preview'
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] p-0 gap-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="border-b bg-muted/40 px-6 py-4 space-y-0">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <DialogTitle>Preview Changes</DialogTitle>
              <DialogDescription className="mt-1.5">
                See how your product will appear to customers
              </DialogDescription>
            </div>

            {/* Device toggle */}
            <div className="flex gap-1 rounded-lg border p-1 bg-background">
              <Button 
                type="button"
                variant={device === 'mobile' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setDevice('mobile')}
                className="gap-2"
              >
                <Smartphone className="h-4 w-4" />
                <span className="hidden sm:inline">Mobile</span>
              </Button>
              <Button 
                type="button"
                variant={device === 'desktop' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setDevice('desktop')}
                className="gap-2"
              >
                <Monitor className="h-4 w-4" />
                <span className="hidden sm:inline">Desktop</span>
              </Button>
            </div>
          </div>

          {/* View mode toggle */}
          <div className="flex gap-2">
            <Button 
              type="button"
              variant={previewMode === 'card' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPreviewMode('card')}
              className="gap-2"
            >
              <Eye className="h-4 w-4" />
              Catalog View
            </Button>
            <Button 
              type="button"
              variant={previewMode === 'detail' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPreviewMode('detail')}
              className="gap-2"
            >
              <Eye className="h-4 w-4" />
              Detail View
            </Button>
          </div>

          {/* Validation warnings */}
          {!formData.name && (
            <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 p-3 rounded-md mt-4">
              <Badge variant="outline" className="border-amber-200 text-amber-700">
                Warning
              </Badge>
              <span>Product name is required</span>
            </div>
          )}
        </DialogHeader>

        {/* Preview Area */}
        <div className="flex-1 overflow-auto bg-muted/20 p-4 sm:p-8">
          <div 
            className={cn(
              "mx-auto bg-white rounded-lg transition-all duration-300 shadow-sm",
              device === 'mobile' ? 'max-w-[375px]' : 'max-w-6xl'
            )}
          >
            {previewMode === 'card' ? (
              <div className="p-4 sm:p-6">
                <div className="mb-4">
                  <Badge variant="secondary" className="mb-2">
                    Preview Mode
                  </Badge>
                  <h3 className="text-lg font-semibold text-muted-foreground">
                    Product Catalog
                  </h3>
                </div>
                <div className={cn(
                  "grid gap-4",
                  device === 'desktop' ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1'
                )}>
                  <ProductCard 
                    product={previewProduct}
                    variant="preview"
                  />
                  {/* Show context with other products on desktop */}
                  {device === 'desktop' && (
                    <>
                      <div className="opacity-30 pointer-events-none hidden sm:block">
                        <ProductCard 
                          product={{
                            ...previewProduct,
                            id: 'context-1',
                            name: 'Other Product 1',
                            images: ['/placeholder-food.jpg'],
                            featured: false
                          }}
                          variant="default"
                        />
                      </div>
                      <div className="opacity-30 pointer-events-none hidden sm:block">
                        <ProductCard 
                          product={{
                            ...previewProduct,
                            id: 'context-2',
                            name: 'Other Product 2',
                            images: ['/placeholder-food.jpg'],
                            featured: false
                          }}
                          variant="default"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <ProductDetailPreview product={previewProduct} device={device} />
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t p-4 bg-background flex justify-end">
          <Button type="button" onClick={onClose}>
            Close Preview
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Product Detail Preview Component
function ProductDetailPreview({ 
  product, 
  device 
}: { 
  product: any
  device: 'mobile' | 'desktop'
}) {
  return (
    <div className={cn(
      "p-4 sm:p-6",
      device === 'mobile' ? 'space-y-4' : 'grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8'
    )}>
      <div className="mb-4 sm:col-span-2">
        <Badge variant="secondary">
          Preview Mode
        </Badge>
      </div>

      {/* Image Gallery */}
      <div className="space-y-4">
        <div className="aspect-square rounded-lg overflow-hidden bg-muted">
          <img 
            src={product.images[0]} 
            alt={product.name}
            className="w-full h-full object-cover"
          />
        </div>
        {product.images.length > 1 && (
          <div className="grid grid-cols-4 gap-2">
            {product.images.slice(0, 4).map((img: string, idx: number) => (
              <div 
                key={idx}
                className="aspect-square rounded-md overflow-hidden bg-muted border-2 border-transparent hover:border-primary cursor-pointer transition-colors"
              >
                <img 
                  src={img} 
                  alt={`${product.name} ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="space-y-6">
        {product.featured && (
          <Badge className="bg-orange-500 hover:bg-orange-600">
            Featured
          </Badge>
        )}

        <div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">{product.name}</h1>
          {product.description && (
            <p className="text-muted-foreground">{product.description}</p>
          )}
        </div>

        <div className="flex items-baseline gap-3">
          <span className="text-3xl sm:text-4xl font-bold">
            ${product.price.toFixed(2)}
          </span>
          {product.compareAtPrice && (
            <span className="text-lg sm:text-xl text-muted-foreground line-through">
              ${product.compareAtPrice.toFixed(2)}
            </span>
          )}
        </div>

        {product.preparationTime && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Preparation time: {product.preparationTime}</span>
          </div>
        )}

        {product.inventory !== undefined && (
          <div className="flex items-center gap-2">
            <Badge variant={product.inventory > 10 ? 'default' : 'destructive'}>
              {product.inventory > 0 ? `${product.inventory} in stock` : 'Out of stock'}
            </Badge>
          </div>
        )}

        <div className="pt-4 border-t">
          <Button size="lg" className="w-full bg-orange-500 hover:bg-orange-600" disabled>
            Add to Cart (Preview)
          </Button>
        </div>
      </div>
    </div>
  )
}