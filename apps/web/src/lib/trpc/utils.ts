export function getUrl() {
  // Vercel/Prod: set NEXT_PUBLIC_SITE_URL or VERCEL_URL
  const vercel = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL
  if (vercel) return `https://${vercel}/api/trpc`

  // Local dev (Next.js default port 3000 unless customized)
  const port = process.env.PORT ?? "3000"
  return `http://localhost:${port}/api/trpc`
}
