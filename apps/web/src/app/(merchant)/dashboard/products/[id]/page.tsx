"use client"

import React, { useEffect } from "react"
import { notFound, useRouter } from "next/navigation"
import { ProductForm } from "../../../../../components/product/product-form"
import { api } from "../../../../../lib/trpc/client"
import { Spinner } from "@homejiak/ui"
import { useAuth } from "@homejiak/auth/client"

interface ProductEditPageProps {
  params: Promise<{ id: string }>
}

export default function ProductEditPage({ params }: ProductEditPageProps) {
  const { id } = React.use(params)
  const router = useRouter()
  const { user, isLoading: authLoading, isMerchant } = useAuth()
  
  // Check authentication
  useEffect(() => {
    if (!authLoading && !user && !isMerchant) {
      router.push("/auth?redirect=/dashboard/products")
    }
  }, [user, authLoading, router, isMerchant])

  // Check if this is a new product
  if (id === "new") {
    return <ProductForm />
  }

  // Otherwise, fetch the existing product
  const { data: product, isLoading, error } = api.product.get.useQuery(
    { id: id },
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