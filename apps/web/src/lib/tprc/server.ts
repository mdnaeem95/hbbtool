import { createTRPCProxyClient, httpBatchLink } from "@trpc/client"
import { headers } from "next/headers"
import type { AppRouter } from "@kitchencloud/api"
import { getUrl } from "./utils"
import superjson from "superjson"

export const api = createTRPCProxyClient<AppRouter>({
  transformer: superjson,
  links: [
    httpBatchLink({
      url: getUrl(),
      headers() {
        const heads = new Map(headers())
        heads.set("x-trpc-source", "rsc")
        return Object.fromEntries(heads)
      },
    }),
  ],
})