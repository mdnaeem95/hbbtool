import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <Header />
      <main className="min-h-screen pt-16">{children}</main>
      <Footer />
    </>
  )
}