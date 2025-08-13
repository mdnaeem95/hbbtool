import { Prisma } from '@prisma/client'

export const softDeleteExtension = Prisma.defineExtension({
  name: 'softDelete',
  model: {
    $allModels: {
      async softDelete<T>(
        this: T,
        where: Prisma.Args<T, 'update'>['where']
      ) {
        const context = Prisma.getExtensionContext(this)
        return (context as any).update({
          where,
          data: { deletedAt: new Date() }
        })
      },
      
      async findManyActive<T>(
        this: T,
        args?: Prisma.Args<T, 'findMany'>
      ) {
        const context = Prisma.getExtensionContext(this)
        return (context as any).findMany({
          ...args,
          where: {
            ...args?.where,
            deletedAt: null
          }
        })
      }
    }
  }
})
