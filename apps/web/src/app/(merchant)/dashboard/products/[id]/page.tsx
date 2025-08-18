"use client"

import { useEffect } from "react"
import { notFound, useRouter } from "next/navigation"
import { ProductForm } from "@/components/product/product-form"
import { api } from "@/lib/trpc/client"
import { useSession } from "@/hooks/use-session"
import { Spinner } from "@kitchencloud/ui"

interface ProductEditPageProps {
  params: { id: string }
}

export default function ProductEditPage({ params }: ProductEditPageProps) {
  const router = useRouter()
  const { user, loading: sessionLoading } = useSession()
  
  // Check authentication
  useEffect(() => {
    if (!sessionLoading && !user) {
      router.push("/auth?redirect=/dashboard/products")
    }
  }, [user, sessionLoading, router])

  // Check if this is a new product
  if (params.id === "new") {
    return <ProductForm />
  }

  // Otherwise, fetch the existing product
  const { data: product, isLoading, error } = api.product.get.useQuery(
    { id: params.id },
    { enabled: !!user }
  )

  if (sessionLoading || isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  if (error || !product) {
    notFound()
  }

  return <ProductForm product={product as any} />
}