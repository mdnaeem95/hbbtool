import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server"
import type { AppRouter } from "@kitchencloud/api"

export type RouterInputs = inferRouterInputs<AppRouter>
export type RouterOutputs = inferRouterOutputs<AppRouter>