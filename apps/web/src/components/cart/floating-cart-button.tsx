'use client'

import { useState, useEffect } from "react"
import { Button, cn } from "@kitchencloud/ui"
import { ShoppingCart } from "lucide-react"
import { useCartCount, useCartTotal } from "@/stores/cart-store"
import { motion, AnimatePresence } from "framer-motion"
import { CustomCartDrawer } from "./custom-cart-drawer"

interface FloatingCartButtonProps {
  className?: string
}

export function FloatingCartButton({ className }: FloatingCartButtonProps) {
  const itemCount = useCartCount()
  const { subtotal } = useCartTotal()
  const [isVisible, setIsVisible] = useState(false)
  const [prevCount, setPrevCount] = useState(0)
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Show animation when items are added
  useEffect(() => {
    if (itemCount > prevCount) {
      setIsVisible(true)
    }
    setPrevCount(itemCount)
  }, [itemCount, prevCount])

  const handleButtonClick = () => {
    console.log("Opening custom drawer...")
    setDrawerOpen(true)
  }

  // Hide the button if cart is empty
  if (itemCount === 0) {
    return null
  }

  return (
    <>
      <AnimatePresence>
        <motion.div
          initial={{ scale: 0, opacity: 0, y: 100 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0, opacity: 0, y: 100 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          className={cn(
            "fixed bottom-4 right-4 md:bottom-6 md:right-6 z-40",
            className
          )}
        >
          <Button
            size="lg"
            className="h-auto rounded-full shadow-lg hover:shadow-xl transition-shadow"
            onClick={handleButtonClick}
            type="button"
          >
            <div className="flex items-center gap-3 px-2 py-2">
              {/* Cart Icon with Badge */}
              <div className="relative">
                <ShoppingCart className="h-6 w-6" />
                <motion.span
                  key={itemCount}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 15 }}
                  className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-background text-xs font-bold text-foreground"
                >
                  {itemCount > 99 ? "99+" : itemCount}
                </motion.span>
              </div>

              {/* Cart Details */}
              <div className="flex flex-col items-start pr-2">
                <span className="text-xs font-medium opacity-90">
                  {itemCount} {itemCount === 1 ? "item" : "items"}
                </span>
                <span className="text-sm font-bold">
                  ${subtotal.toFixed(2)}
                </span>
              </div>
            </div>
          </Button>

          {/* Pulse animation on item add */}
          {isVisible && (
            <motion.div
              initial={{ scale: 1, opacity: 0.5 }}
              animate={{ scale: 2.5, opacity: 0 }}
              transition={{ duration: 0.6 }}
              className="absolute inset-0 rounded-full bg-primary pointer-events-none"
              onAnimationComplete={() => setIsVisible(false)}
            />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Custom Cart Drawer */}
      <CustomCartDrawer 
        open={drawerOpen} 
        onOpenChange={setDrawerOpen} 
      />
    </>
  )
}