import { notFound } from 'next/navigation'
import { appRouter } from '@kitchencloud/api'
import { Card } from "@kitchencloud/ui"
import { Clock, ShoppingCart, MapPin } from "lucide-react"
import { db } from '@kitchencloud/database'
import { getAuthSession, createServerSupabaseClient } from '@kitchencloud/auth/server'
import type { TRPCContext } from '@kitchencloud/api'

interface MerchantPageProps {
  params: Promise<{ slug: string }>
}

export default async function MerchantPage({ params }: MerchantPageProps) {
  const { slug } = await params
  
  // Create a simplified context directly for server-side usage
  // This bypasses the FetchCreateContextFnOptions requirement
  const session = await getAuthSession()
  const supabase = await createServerSupabaseClient()
  
  const context: TRPCContext = {
    db,
    session,
    supabase,
    req: new Request(`http://localhost:3000/merchant/${slug}`),
    resHeaders: new Headers(),
    ip: undefined,
  }
  
  // Create the caller
  const caller = appRouter.createCaller(context)
  
  try {
    // Get merchant
    const merchant = await caller.public.getMerchant({ slug })
    
    if (!merchant) {
      notFound()
    }
    
    // Use listProducts instead of getProducts
    const productsResult = await caller.public.listProducts({ 
      merchantSlug: slug,
      limit: 50,
      page: 1
    })
    
    return (
      <div className="min-h-screen">
        {/* Hero Section */}
        <section className="relative h-64 overflow-hidden">
          <div className="h-full w-full bg-gradient-to-br from-orange-400 to-orange-600" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
            <div className="container">
              <h1 className="text-3xl font-bold">{merchant.businessName}</h1>
              {merchant.description && (
                <p className="mt-2">{merchant.description}</p>
              )}
            </div>
          </div>
        </section>

        {/* Info Bar */}
        <section className="border-b py-4">
          <div className="container">
            <div className="flex flex-wrap gap-6 text-sm">
              <div className="text-muted-foreground">
                {merchant._count.products} products • {merchant._count.reviews} reviews
              </div>
              {merchant.minimumOrder && (
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                  <span>Min order ${Number(merchant.minimumOrder).toFixed(2)}</span>
                </div>
              )}
              {merchant.deliveryFee && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>${Number(merchant.deliveryFee).toFixed(2)} delivery</span>
                </div>
              )}
              {merchant.preparationTime && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{merchant.preparationTime} min</span>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Products Grid */}
        <section className="py-8">
          <div className="container">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {productsResult.items.map((product: any) => (
                <Card key={product.id} className="overflow-hidden">
                  {product.images?.[0] && (
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="h-48 w-full object-cover"
                    />
                  )}
                  <div className="p-4">
                    <h3 className="font-semibold">{product.name}</h3>
                    {product.description && (
                      <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                        {product.description}
                      </p>
                    )}
                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-lg font-bold">
                        ${Number(product.price).toFixed(2)}
                      </span>
                      <button className="px-3 py-1 bg-orange-500 text-white rounded hover:bg-orange-600">
                        Add to Cart
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
            
            {productsResult.items.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No products available</p>
              </div>
            )}
          </div>
        </section>
      </div>
    )
  } catch (error) {
    console.error('Error loading merchant:', error)
    notFound()
  }
}