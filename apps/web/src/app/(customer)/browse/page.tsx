import { Metadata } from "next"
import { Card } from "@kitchencloud/ui"
import Link from "next/link"
import { Clock, MapPin, Star } from "lucide-react"

export const metadata: Metadata = {
  title: "Browse Merchants",
  description: "Discover home-based food merchants in Singapore",
}

// Temporary mock data - will be replaced with API calls
const mockMerchants = [
  {
    id: "1",
    name: "Sarah's Home Kitchen",
    slug: "sarahs-home-kitchen",
    cuisine: ["Peranakan", "Local"],
    rating: 4.8,
    reviewCount: 156,
    minimumOrder: 30,
    deliveryFee: 5,
    preparationTime: "30-45 min",
    image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80",
    featured: true,
  },
  {
    id: "2",
    name: "Mama's Nasi Lemak",
    slug: "mamas-nasi-lemak",
    cuisine: ["Malay", "Halal"],
    rating: 4.9,
    reviewCount: 203,
    minimumOrder: 20,
    deliveryFee: 4,
    preparationTime: "20-30 min",
    image: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&q=80",
    featured: false,
  },
  {
    id: "3",
    name: "Uncle Tan's Zi Char",
    slug: "uncle-tans-zi-char",
    cuisine: ["Chinese", "Seafood"],
    rating: 4.7,
    reviewCount: 89,
    minimumOrder: 40,
    deliveryFee: 6,
    preparationTime: "45-60 min",
    image: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800&q=80",
    featured: false,
  },
]

export default function BrowsePage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-primary/5 py-12">
        <div className="container">
          <h1 className="text-3xl font-bold">Browse Merchants</h1>
          <p className="mt-2 text-muted-foreground">
            Discover delicious home-cooked meals from local merchants
          </p>
        </div>
      </section>

      {/* Filters Section (placeholder) */}
      <section className="border-b py-4">
        <div className="container">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">Filters:</span>
            <div className="flex gap-2">
              <button className="rounded-full border px-3 py-1 text-sm hover:bg-muted">
                All Cuisines
              </button>
              <button className="rounded-full border px-3 py-1 text-sm hover:bg-muted">
                Delivery Time
              </button>
              <button className="rounded-full border px-3 py-1 text-sm hover:bg-muted">
                Min Order
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Merchants Grid */}
      <section className="section-padding">
        <div className="container">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {mockMerchants.map((merchant) => (
              <Link
                key={merchant.id}
                href={`/merchant/${merchant.slug}`}
                className="group"
              >
                <Card className="overflow-hidden transition-shadow hover:shadow-lg">
                  {/* Image */}
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <img
                      src={merchant.image}
                      alt={merchant.name}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                    {merchant.featured && (
                      <div className="absolute left-2 top-2 rounded-full bg-primary px-2 py-1 text-xs font-medium text-primary-foreground">
                        Featured
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <h3 className="font-semibold">{merchant.name}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {merchant.cuisine.join(" • ")}
                    </p>

                    {/* Rating */}
                    <div className="mt-2 flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm font-medium">{merchant.rating}</span>
                      <span className="text-sm text-muted-foreground">
                        ({merchant.reviewCount})
                      </span>
                    </div>

                    {/* Info */}
                    <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {merchant.preparationTime}
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        ${merchant.deliveryFee}
                      </div>
                    </div>

                    {/* Min order */}
                    <div className="mt-2 text-xs text-muted-foreground">
                      Min order: ${merchant.minimumOrder}
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}