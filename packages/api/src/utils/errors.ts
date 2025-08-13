import { TRPCError } from '@trpc/server'
import { Prisma } from '@kitchencloud/database'

export function handleDatabaseError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      throw new TRPCError({
        code: 'CONFLICT',
        message: 'A record with this information already exists',
      })
    }
    if (error.code === 'P2025') {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Record not found',
      })
    }
    if (error.code === 'P2003') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Invalid reference provided',
      })
    }
  }
  
  if (error instanceof TRPCError) {
    throw error
  }
  
  console.error('Unhandled database error:', error)
  throw new TRPCError({
    code: 'INTERNAL_SERVER_ERROR',
    message: 'An unexpected error occurred',
  })
}