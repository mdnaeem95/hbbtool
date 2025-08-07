import { Metadata } from "next"
import { notFound } from "next/navigation"
import { Button, Card } from "@kitchencloud/ui"
import { Clock, MapPin, Star, ShoppingCart } from "lucide-react"

type Props = {
  params: { slug: string }
}

// This will be replaced with API call
async function getMerchant(slug: string) {
  // Mock data
  if (slug === "sarahs-home-kitchen") {
    return {
      id: "1",
      name: "Sarah's Home Kitchen",
      slug: "sarahs-home-kitchen",
      description: "Authentic Peranakan dishes made with love. Family recipes passed down for generations.",
      cuisine: ["Peranakan", "Local"],
      rating: 4.8,
      reviewCount: 156,
      minimumOrder: 30,
      deliveryFee: 5,
      preparationTime: "30-45 min",
      image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&q=80",
      operatingHours: {
        monday: { open: "10:00", close: "20:00" },
        tuesday: { open: "10:00", close: "20:00" },
        wednesday: { open: "10:00", close: "20:00" },
        thursday: { open: "10:00", close: "20:00" },
        friday: { open: "10:00", close: "21:00" },
        saturday: { open: "09:00", close: "21:00" },
        sunday: { closed: true },
      },
      categories: [
        {
          id: "1",
          name: "Mains",
          products: [
            {
              id: "1",
              name: "Ayam Buah Keluak",
              description: "Traditional Peranakan chicken stew with black nuts",
              price: 28.90,
              image: "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=400&q=80",
            },
            {
              id: "2",
              name: "Babi Pongteh",
              description: "Braised pork with fermented bean paste",
              price: 25.90,
              image: "https://images.unsplash.com/photo-1606851181064-b7507b24377c?w=400&q=80",
            },
          ],
        },
        {
          id: "2",
          name: "Desserts",
          products: [
            {
              id: "3",
              name: "Kueh Lapis",
              description: "Nine-layer steamed cake",
              price: 12.90,
              image: "https://images.unsplash.com/photo-1548848221-0c2e497ed557?w=400&q=80",
            },
          ],
        },
      ],
    }
  }
  return null
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const merchant = await getMerchant(params.slug)
  
  if (!merchant) {
    return {
      title: "Merchant Not Found",
    }
  }

  return {
    title: merchant.name,
    description: merchant.description,
  }
}

export default async function MerchantPage({ params }: Props) {
  const merchant = await getMerchant(params.slug)

  if (!merchant) {
    notFound()
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative h-64 lg:h-80">
        <img
          src={merchant.image}
          alt={merchant.name}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
          <div className="container">
            <h1 className="text-3xl font-bold">{merchant.name}</h1>
            <p className="mt-2">{merchant.cuisine.join(" • ")}</p>
          </div>
        </div>
      </section>

      {/* Info Bar */}
      <section className="border-b bg-muted/50">
        <div className="container">
          <div className="flex flex-wrap gap-6 py-4 text-sm">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              <span className="font-medium">{merchant.rating}</span>
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
                              <Button size="sm">
                                <ShoppingCart className="mr-2 h-4 w-4" />
                                Add to Cart
                              </Button>
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