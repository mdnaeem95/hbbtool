import { FloatingCartButton } from "../../../../components/cart/floating-cart-button"

export default function MerchantShopLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      {children}
      <FloatingCartButton />
    </>
  )
}