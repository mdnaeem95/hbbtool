export function getUrl() {
  // Browser should use relative URL
  if (typeof window !== 'undefined') return '/api/trpc'
  
  // SSR should use absolute URL
  // Use Vercel URL if available, otherwise localhost
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}/api/trpc`
  }
  
  // Assume localhost
  return `http://localhost:${process.env.PORT ?? 3000}/api/trpc`
}

export function getBaseUrl() {
  if (typeof window !== 'undefined') return '' // browser should use relative url
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}` // SSR should use vercel url
  return `http://localhost:${process.env.PORT ?? 3000}` // dev SSR should use localhost
}