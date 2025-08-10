'use client'

import { notFound } from "next/navigation"
import { Card } from "@kitchencloud/ui"
import { Star, Clock, MapPin, ShoppingCart } from "lucide-react"
import { AddToCartButton } from "@/components/cart/add-to-cart-button"

// Mock data - in a real app, this would come from your database
const getMerchantBySlug = (slug: string) => {
  // Mock merchant data
  const merchants = {
    "sarahs-kitchen": {
      id: "1",
      slug: "sarahs-kitchen",
      name: "Sarah's Kitchen",
      description: "Authentic home-cooked Peranakan dishes made with love",
      image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800",
      rating: 4.8,
      reviewCount: 124,
      preparationTime: "30-45 min",
      deliveryFee: 5,
      minimumOrder: 20,
      categories: [
        {
          id: "1",
          name: "Mains",
          products: [
            {
              id: "1",
              name: "Ayam Buah Keluak",
              description: "Traditional Peranakan chicken stew with black nuts",
              price: 18.90,
              image: "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=400",
            },
            {
              id: "2",
              name: "Babi Pongteh",
              description: "Braised pork with fermented bean paste and mushrooms",
              price: 16.90,
              image: "https://images.unsplash.com/photo-1606850246029-dd00bd5eff97?w=400",
            },
          ],
        },
        {
          id: "2",
          name: "Sides",
          products: [
            {
              id: "3",
              name: "Ngoh Hiang",
              description: "Five-spice meat rolls wrapped in beancurd skin",
              price: 8.90,
              image: "https://images.unsplash.com/photo-1626200419199-391ae4be7a41?w=400",
            },
          ],
        },
      ],
    },
  }
  
  return merchants[slug as keyof typeof merchants]
}

interface MerchantPageProps {
  params: {
    slug: string
  }
}

export default function MerchantPage({ params }: MerchantPageProps) {
  const merchant = getMerchantBySlug(params.slug)

  if (!merchant) {
    notFound()
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative h-64 overflow-hidden">
        <img
          src={merchant.image}
          alt={merchant.name}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
          <div className="container">
            <h1 className="text-3xl font-bold">{merchant.name}</h1>
            <p className="mt-2">{merchant.description}</p>
          </div>
        </div>
      </section>

      {/* Info Bar */}
      <section className="border-b py-4">
        <div className="container">
          <div className="flex flex-wrap gap-6 text-sm">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              <span className="font-semibold">{merchant.rating}</span>
              <span className="text-muted-foreground">({merchant.reviewCount} reviews)</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>{merchant.preparationTime}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>Delivery: ${merchant.deliveryFee}</span>
            </div>
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              <span>Min order: ${merchant.minimumOrder}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Menu */}
      <section className="section-padding">
        <div className="container">
          <div className="grid gap-8 lg:grid-cols-4">
            {/* Categories Sidebar */}
            <div className="lg:col-span-1">
              <div className="sticky top-20">
                <h3 className="font-semibold">Menu Categories</h3>
                <nav className="mt-4 space-y-2">
                  {merchant.categories.map((category) => (
                    <a
                      key={category.id}
                      href={`#${category.name.toLowerCase()}`}
                      className="block rounded-md px-3 py-2 text-sm hover:bg-muted"
                    >
                      {category.name}
                    </a>
                  ))}
                </nav>
              </div>
            </div>

            {/* Products */}
            <div className="lg:col-span-3">
              {merchant.categories.map((category) => (
                <div key={category.id} id={category.name.toLowerCase()} className="mb-8">
                  <h2 className="mb-4 text-xl font-semibold">{category.name}</h2>
                  <div className="grid gap-4">
                    {category.products.map((product) => (
                      <Card key={product.id} className="overflow-hidden">
                        <div className="flex gap-4 p-4">
                          <img
                            src={product.image}
                            alt={product.name}
                            className="h-24 w-24 rounded-md object-cover"
                          />
                          <div className="flex-1">
                            <h3 className="font-semibold">{product.name}</h3>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {product.description}
                            </p>
                            <div className="mt-2 flex items-center justify-between">
                              <span className="font-semibold">${product.price.toFixed(2)}</span>
                              <AddToCartButton
                                product={product}
                                merchant={{
                                  id: merchant.id,
                                  name: merchant.name,
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}