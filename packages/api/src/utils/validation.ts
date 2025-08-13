import { z } from 'zod'

// Common schemas
export const paginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

export const idSchema = z.object({
  id: z.string().cuid(),
})

export const slugSchema = z.object({
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
})

// Singapore-specific validations
export const phoneSchema = z.string().regex(/^(\+65)?[689]\d{7}$/, 'Invalid Singapore phone number')
export const postalCodeSchema = z.string().regex(/^\d{6}$/, 'Invalid Singapore postal code')

// Business validations
export const priceSchema = z.number().positive().multipleOf(0.01).max(99999.99)
export const quantitySchema = z.number().int().nonnegative()