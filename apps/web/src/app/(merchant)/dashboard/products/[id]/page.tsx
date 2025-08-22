"use client"

import { useEffect } from "react"
import { notFound, useRouter } from "next/navigation"
import { ProductForm } from "@/components/product/product-form"
import { api } from "@/lib/trpc/client"
import { Spinner } from "@kitchencloud/ui"
import { useAuth } from "@kitchencloud/auth/client"

interface ProductEditPageProps {
  params: { id: string }
}

export default function ProductEditPage({ params }: ProductEditPageProps) {
  const router = useRouter()
  const { user, isLoading: authLoading, isMerchant } = useAuth()
  
  // Check authentication
  useEffect(() => {
    if (!authLoading && !user && !isMerchant) {
      router.push("/auth?redirect=/dashboard/products")
    }
  }, [user, authLoading, router, isMerchant])

  // Check if this is a new product
  if (params.id === "new") {
    return <ProductForm />
  }

  // Otherwise, fetch the existing product
  const { data: product, isLoading, error } = api.product.get.useQuery(
    { id: params.id },
    { enabled: !!user }
  )

  if (authLoading || isLoading) {
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