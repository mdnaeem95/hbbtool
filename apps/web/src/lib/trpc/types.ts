import type { AppRouter } from "@kitchencloud/api"
import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server"

export type RouterInputs = inferRouterInputs<AppRouter>
export type RouterOutputs = inferRouterOutputs<AppRouter>