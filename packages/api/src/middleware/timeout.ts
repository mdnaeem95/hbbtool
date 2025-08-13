import { TRPCError } from "@trpc/server"
import { middleware } from "../trpc"

const TIMEOUT_MS = 25000 // 25 seconds (Vercel limit is 30s)

export const timeoutMiddleware = middleware(async ({ next, ctx }) => {
  let timedOut = false
  
  const timeout = setTimeout(() => {
    timedOut = true
  }, TIMEOUT_MS)

  try {
    const result = await Promise.race([
      next({ ctx }),
      new Promise((_, reject) => {
        setTimeout(() => {
          if (timedOut) {
            reject(new TRPCError({
              code: "TIMEOUT",
              message: "Request timed out. Please try again with smaller data."
            }))
          }
        }, TIMEOUT_MS)
      })
    ])
    
    clearTimeout(timeout)
    return result
  } catch (error) {
    clearTimeout(timeout)
    throw error
  }
})