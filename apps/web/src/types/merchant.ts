import type { inferRouterOutputs, inferRouterInputs } from '@trpc/server'
import type { AppRouter } from '@kitchencloud/api'

// OUTPUT (what the API returns)
export type MerchantSearchNearbyOutput =
  inferRouterOutputs<AppRouter>['merchant']['searchNearby']

export type MerchantMapMarker =
  MerchantSearchNearbyOutput['merchants'][number]

// (optional) INPUT (what the API expects) — handy for filters/bounds typing
export type MerchantSearchNearbyInput =
  inferRouterInputs<AppRouter>['merchant']['searchNearby']

export type MerchantSearchFilters =
  NonNullable<MerchantSearchNearbyInput['filters']>

export type MerchantSearchBounds =
  NonNullable<NonNullable<MerchantSearchNearbyInput['filters']>['bounds']>
