'use client'

import { useState } from "react"
import { useCart } from "../stores/cart-store"
import { useToast } from "@homejiak/ui"

interface Product {
  id: string
  name: string
  price: number
  image?: string
  merchantId?: string
  modifierGroups?: any[]
}

interface Merchant {
  id: string
  name: string
}

export function useAddToCart() {
  const [customizationProduct, setCustomizationProduct] = useState<Product | null>(null)
  const { addItem, canAddItem } = useCart()
  const { toast } = useToast()

  // Check if product needs customization
  const needsCustomization = (product: Product): boolean => {
    return !!(
      product.modifierGroups &&
      product.modifierGroups.length > 0 &&
      product.modifierGroups.some((g: any) =>
        g.isActive && g.modifiers && g.modifiers.length > 0
      )
    )
  }

  // Main add to cart function
  const addToCart = (product: Product, merchant: Merchant, quantity: number = 1) => {
    // Check merchant compatibility first
    if (!canAddItem(merchant.id)) {
      toast({
        title: "Different merchant",
        description: "You can only order from one merchant at a time. Please clear your cart first.",
        variant: "destructive",
      })
      return false
    }

    // Check if product needs customization
    if (needsCustomization(product)) {
      // Store product for customization sheet
      setCustomizationProduct({
        ...product,
        merchantId: merchant.id || product.merchantId,
      })
      return true // Indicates sheet should open
    }

    // Add directly to cart (no modifiers)
    try {
      addItem({
        productId: product.id,
        merchantId: merchant.id || product.merchantId || "",
        merchantName: merchant.name,
        name: product.name,
        price: product.price,
        image: product.image,
        quantity,
      })

      toast({
        title: "Added to cart",
        description: `${product.name} has been added to your cart.`,
      })
      return false // No sheet needed
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add item to cart. Please try again.",
        variant: "destructive",
      })
      return false
    }
  }

  // Handle add with customizations (called from sheet)
  const addWithCustomizations = (
    product: Product,
    merchant: Merchant,
    quantity: number,
    customizations: any,
    totalPrice: number
  ) => {
    try {
      addItem({
        productId: product.id,
        merchantId: merchant.id || product.merchantId || "",
        merchantName: merchant.name,
        name: product.name,
        price: totalPrice / quantity, // Price per item including modifiers
        image: product.image,
        quantity,
        customizations,
      })

      toast({
        title: "Added to cart",
        description: `${product.name} has been added to your cart.`,
      })
      
      // Clear customization product
      setCustomizationProduct(null)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add item to cart. Please try again.",
        variant: "destructive",
      })
    }
  }

  return {
    addToCart,
    addWithCustomizations,
    needsCustomization,
    customizationProduct,
    setCustomizationProduct,
  }
}