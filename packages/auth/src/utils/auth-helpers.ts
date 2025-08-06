import { cookies } from "next/headers"
import { auth, type Session, type User } from "../server"

// Extend the base User with multi-user fields
type AuthUser = User & {
  userType: "merchant" | "customer"
  status: string
}

// Non-nullable session with an AuthUser
type ExtendedSession = Omit<NonNullable<Session>, 'user'> & {
  user: AuthUser
}

export async function getServerSession() {
  const sessionCookie = cookies().get("better-auth.session")
  
  if (!sessionCookie) {
    return null
  }

  // Build a Headers instance rather than a plain object
  const headers = new Headers()
  headers.set("cookie", `better-auth.session=${sessionCookie.value}`)

  return auth.api.getSession({ headers })
}

export async function requireMerchant(): Promise<ExtendedSession> {
  const session = await getServerSession() as ExtendedSession
  
  if (!session || session.user.userType !== "merchant") {
    throw new Error("Unauthorized: Merchant access required")
  }
  
  if (session.user.status !== "ACTIVE") {
    throw new Error("Unauthorized: Merchant account is not active")
  }
  
  return session
}

export async function requireCustomer(): Promise<ExtendedSession> {
  const session = await getServerSession() as ExtendedSession
  
  if (!session || session.user.userType !== "customer") {
    throw new Error("Unauthorized: Customer access required")
  }
  
  return session
}

/**
 * Returns the current session if present, otherwise null. Does not throw.
 */
export async function optionalAuth() {
  try {
    return await getServerSession()
  } catch {
    return null
  }
}