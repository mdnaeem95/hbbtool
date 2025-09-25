import { NextResponse } from "next/server"
import postgres from "postgres"

const sql = postgres(process.env.DATABASE_URL!, { ssl: "require" })

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lat = parseFloat(searchParams.get("lat") || "")
  const lng = parseFloat(searchParams.get("lng") || "")
  const radius = parseInt(searchParams.get("radius") || "5000", 10)
  const limit = parseInt(searchParams.get("limit") || "20", 10)

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

  return NextResponse.json({ merchants, total: merchants.length, radius })
}
