export async function fetchNearbyMerchants(params: {
  lat: number
  lng: number
  radius?: number
  limit?: number
}) {
  const query = new URLSearchParams({
    lat: params.lat.toString(),
    lng: params.lng.toString(),
    radius: (params.radius ?? 5000).toString(),
    limit: (params.limit ?? 20).toString(),
  })

  const res = await fetch(`/api/nearby?${query.toString()}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    next: { revalidate: 60 }, // (optional) Next.js caching hint
  })

  if (!res.ok) {
    throw new Error("Failed to fetch nearby merchants")
  }

  return res.json() as Promise<{
    merchants: any[]
    total: number
    radius: number
  }>
}
