import { auth } from "./server"
import { toNextJsHandler } from "better-auth/next-js"

export const authHandler = toNextJsHandler(auth)

// For app router: app/api/auth/[...all]/route.ts
export const { GET, POST } = authHandler

// For pages router: pages/api/auth/[...all].ts
export default authHandler