import { cookies } from "next/headers"
import { db } from "@homejiak/database"

export interface Session {
  user: {
    id: string
    email: string
    businessName?: string
  }
  userType: "merchant" | "customer"
  sessionId: string
}

export async function getServerSession(): Promise<Session | null> {
  const cookieStore = await cookies()
  const sessionToken = cookieStore.get("session")?.value

  if (!sessionToken) {
    return null
  }

  try {
    // Check session
    const session = await db.session.findUnique({
      where: {
        id: sessionToken,
        expiresAt: { gt: new Date() },
      },
      include: {
        merchant: {
            select: { id: true, email: true, businessName: true },
        },
        customer: {
          select: { id: true, email: true, name: true,
          },
        },
      },
    })

    if (!session) {
        return null
    }

    if (session.merchant) {
      return {
        user: {
          id: session.merchant.id,
          email: session.merchant.email || "",
          businessName: session.merchant.businessName || undefined,
        },
        userType: "merchant",
        sessionId: session.id,
      }
    }

    if (session.customer) {
      return {
        user: {
          id: session.customer.id,
          email: session.customer.email || "",
          businessName: session.customer.name || undefined,
        },
        userType: "customer",
        sessionId: session.id,
      }
    }

    return null
  } catch (error) {
    console.error("Error fetching session:", error)
    return null
  }
}