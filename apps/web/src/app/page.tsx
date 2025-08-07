import Link from "next/link"
import { Button } from "@kitchencloud/ui"
import { ArrowRight, ShoppingBag, Clock, MapPin } from "lucide-react"

export default function HomePage() {
  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <section className="section-padding bg-gradient-to-b from-primary/5 to-background">
        <div className="container">
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              Homemade Goodness,{" "}
              <span className="text-primary">Delivered Fresh</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground md:text-xl">
              Discover and order from Singapore&apos;s best home-based food businesses. 
              From traditional favorites to modern fusion, find your next meal here.
            </p>
            <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center">
              <Button size="lg" asChild>
                <Link href="/browse">
                  Browse Merchants
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/login">Sign In</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="section-padding">
        <div className="container">
          <h2 className="text-center text-3xl font-bold">Why Choose KitchenCloud?</h2>
          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <ShoppingBag className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">Easy Ordering</h3>
              <p className="mt-2 text-muted-foreground">
                Browse menus, add to cart, and checkout in minutes. No more 
                back-and-forth messaging.
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Clock className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">Real-time Updates</h3>
              <p className="mt-2 text-muted-foreground">
                Track your order status in real-time. Know exactly when your 
                food will be ready.
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <MapPin className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">Local & Fresh</h3>
              <p className="mt-2 text-muted-foreground">
                Support local home-based businesses and enjoy freshly prepared 
                meals from your neighborhood.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="section-padding bg-primary/5">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold">Ready to Order?</h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Join thousands of happy customers enjoying homemade meals from 
              talented local cooks.
            </p>
            <Button size="lg" className="mt-8" asChild>
              <Link href="/browse">
                Start Ordering Now
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  )
}