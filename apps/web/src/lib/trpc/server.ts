import { createTRPCProxyClient, httpBatchLink } from "@trpc/client"
import { headers } from "next/headers"
import type { AppRouter } from "@kitchencloud/api"
import { getUrl } from "./utils"
import superjson from "superjson"
import { createClient } from "@/lib/supabase/server"

export const api = createTRPCProxyClient<AppRouter>({
  transformer: superjson,
  links: [
    httpBatchLink({
      url: getUrl(),
      async headers() {
        const heads = new Map(headers())
        heads.set("x-trpc-source", "rsc")

        //get user session and pass it through headers
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (user) {
          heads.set("x-user-id", user.id)
          heads.set("x-user-email", user.email || "")
          heads.set("x-user-role", user.user_metadata?.userType || "CUSTOMER")          
        }

        return Object.fromEntries(heads)
      },
    }),
  ],
})