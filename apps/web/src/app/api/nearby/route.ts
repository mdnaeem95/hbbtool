import { NextRequest, NextResponse } from "next/server"
import postgres from "postgres"
import { edgeCache, cacheTTL } from "@homejiak/api/edge-cache"

// Reuse sql client across invocations
const sql = postgres(process.env.DATABASE_URL!, {
  ssl: "require",
  max: 10, // small pool, Edge is short-lived
})

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const lat = parseFloat(searchParams.get("lat") || "")
    const lng = parseFloat(searchParams.get("lng") || "")
    const radius = parseInt(searchParams.get("radius") || "5000", 10) // meters
    const limit = parseInt(searchParams.get("limit") || "20", 10)

    if (isNaN(lat) || isNaN(lng)) {
      return NextResponse.json(
        { error: "lat and lng query params are required" },
        { status: 400 }
      )
    }

    // 🔑 Build cache key
    const cacheKey = `nearby:${lat.toFixed(4)}:${lng.toFixed(4)}:${radius}:${limit}`

    const result = await edgeCache.getOrSet(
      cacheKey,
      async () => {
        const merchants = await sql/*sql*/`
          SELECT id, "businessName", slug,
                 latitude, longitude, halal,
                 "deliveryEnabled", "pickupEnabled",
                 "averageRating", verified,
                 ST_Distance(
                   location,
                   ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
                 ) AS distance
          FROM "Merchant"
          WHERE status = 'ACTIVE'
            AND "deletedAt" IS NULL
            AND ST_DWithin(
                  location,
                  ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
                  ${radius}
                )
          ORDER BY verified DESC, distance ASC, "averageRating" DESC NULLS LAST
          LIMIT ${limit};
        `
        return { merchants, total: merchants.length, radius }
      },
      cacheTTL.merchant // e.g. 300s
    )

    return NextResponse.json(result)
  } catch (err) {
    console.error("[/api/nearby] error:", err)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
