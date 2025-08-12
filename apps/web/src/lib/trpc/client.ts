import { createTRPCReact } from "@trpc/react-query"
import type { AppRouter } from "@kitchencloud/api"

export const api = createTRPCReact<AppRouter>()
