import { redirect } from 'next/navigation'

interface MerchantPageProps {
  params: Promise<{ slug: string }>
}

export default async function MerchantPage({ params }: MerchantPageProps) {
  const { slug } = await params
  
  // Redirect to the products page which has better performance
  redirect(`/merchant/${slug}/products`)
}