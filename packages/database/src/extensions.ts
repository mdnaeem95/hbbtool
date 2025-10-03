import { Prisma } from "@prisma/client"

/**
 * Soft delete extension applied only to models that have `deletedAt`.
 * Models covered: Merchant, Category, Product, Customer
 */
export const softDeleteExtension = Prisma.defineExtension({
  name: "softDelete",

  /** Query interception: default to excluding soft-deleted rows */
  query: {
    merchant: {
      async findMany({ args, query }: { args: any, query: any }) {
        if (!args?.where || args.where.deletedAt === undefined) {
          args = { ...args, where: { ...(args?.where ?? {}), deletedAt: null } }
        }
        return query(args)
      },
      async findFirst({ args, query }: { args: any, query: any }) {
        if (!args?.where || args.where.deletedAt === undefined) {
          args = { ...args, where: { ...(args?.where ?? {}), deletedAt: null } }
        }
        return query(args)
      },
      async count({ args, query }: { args: any, query: any }) {
        if (!args?.where || args.where.deletedAt === undefined) {
          args = { ...args, where: { ...(args?.where ?? {}), deletedAt: null } }
        }
        return query(args)
      },
    },
    product: {
      async findMany({ args, query }: { args: any, query: any }) {
        if (!args?.where || args.where.deletedAt === undefined) {
          args = { ...args, where: { ...(args?.where ?? {}), deletedAt: null } }
        }
        return query(args)
      },
      async findFirst({ args, query }: { args: any, query: any }) {
        if (!args?.where || args.where.deletedAt === undefined) {
          args = { ...args, where: { ...(args?.where ?? {}), deletedAt: null } }
        }
        return query(args)
      },
      async count({ args, query }: { args: any, query: any }) {
        if (!args?.where || args.where.deletedAt === undefined) {
          args = { ...args, where: { ...(args?.where ?? {}), deletedAt: null } }
        }
        return query(args)
      },
    },
    customer: {
      async findMany({ args, query }: { args: any, query: any }) {
        if (!args?.where || args.where.deletedAt === undefined) {
          args = { ...args, where: { ...(args?.where ?? {}), deletedAt: null } }
        }
        return query(args)
      },
      async findFirst({ args, query }: { args: any, query: any }) {
        if (!args?.where || args.where.deletedAt === undefined) {
          args = { ...args, where: { ...(args?.where ?? {}), deletedAt: null } }
        }
        return query(args)
      },
      async count({ args, query }: { args: any, query: any }) {
        if (!args?.where || args.where.deletedAt === undefined) {
          args = { ...args, where: { ...(args?.where ?? {}), deletedAt: null } }
        }
        return query(args)
      },
    },
  },

  /** Model methods for the same set of models */
  model: {
    merchant: {
      async softDelete(
        this: any,
        where: Prisma.MerchantUpdateArgs["where"]
      ) {
        const ctx = Prisma.getExtensionContext(this)
        return (ctx as any).update({
          where,
          data: { deletedAt: new Date(), updatedAt: new Date() },
        })
      },
      async restore(
        this: any,
        where: Prisma.MerchantUpdateArgs["where"]
      ) {
        const ctx = Prisma.getExtensionContext(this)
        return (ctx as any).update({
          where,
          data: { deletedAt: null, updatedAt: new Date() },
        })
      },
      async hardDelete(
        this: any,
        where: Prisma.MerchantDeleteArgs["where"]
      ) {
        const ctx = Prisma.getExtensionContext(this)
        return (ctx as any).delete({ where })
      },
      async findManyActive(
        this: any,
        args?: Prisma.MerchantFindManyArgs
      ) {
        const ctx = Prisma.getExtensionContext(this)
        return (ctx as any).findMany({
          ...args,
          where: { ...(args?.where ?? {}), deletedAt: null },
        })
      },
    },

    category: {
      async softDelete(
        this: any,
        where: Prisma.CategoryUpdateArgs["where"]
      ) {
        const ctx = Prisma.getExtensionContext(this)
        return (ctx as any).update({
          where,
          data: { deletedAt: new Date(), updatedAt: new Date() },
        })
      },
      async restore(
        this: any,
        where: Prisma.CategoryUpdateArgs["where"]
      ) {
        const ctx = Prisma.getExtensionContext(this)
        return (ctx as any).update({
          where,
          data: { deletedAt: null, updatedAt: new Date() },
        })
      },
      async hardDelete(
        this: any,
        where: Prisma.CategoryDeleteArgs["where"]
      ) {
        const ctx = Prisma.getExtensionContext(this)
        return (ctx as any).delete({ where })
      },
      async findManyActive(
        this: any,
        args?: Prisma.CategoryFindManyArgs
      ) {
        const ctx = Prisma.getExtensionContext(this)
        return (ctx as any).findMany({
          ...args,
          where: { ...(args?.where ?? {}), deletedAt: null },
        })
      },
    },

    product: {
      async softDelete(
        this: any,
        where: Prisma.ProductUpdateArgs["where"]
      ) {
        const ctx = Prisma.getExtensionContext(this)
        return (ctx as any).update({
          where,
          data: { deletedAt: new Date(), updatedAt: new Date() },
        })
      },
      async restore(
        this: any,
        where: Prisma.ProductUpdateArgs["where"]
      ) {
        const ctx = Prisma.getExtensionContext(this)
        return (ctx as any).update({
          where,
          data: { deletedAt: null, updatedAt: new Date() },
        })
      },
      async hardDelete(
        this: any,
        where: Prisma.ProductDeleteArgs["where"]
      ) {
        const ctx = Prisma.getExtensionContext(this)
        return (ctx as any).delete({ where })
      },
      async findManyActive(
        this: any,
        args?: Prisma.ProductFindManyArgs
      ) {
        const ctx = Prisma.getExtensionContext(this)
        return (ctx as any).findMany({
          ...args,
          where: { ...(args?.where ?? {}), deletedAt: null },
        })
      },
    },

    customer: {
      async softDelete(
        this: any,
        where: Prisma.CustomerUpdateArgs["where"]
      ) {
        const ctx = Prisma.getExtensionContext(this)
        return (ctx as any).update({
          where,
          data: { deletedAt: new Date(), updatedAt: new Date() },
        })
      },
      async restore(
        this: any,
        where: Prisma.CustomerUpdateArgs["where"]
      ) {
        const ctx = Prisma.getExtensionContext(this)
        return (ctx as any).update({
          where,
          data: { deletedAt: null, updatedAt: new Date() },
        })
      },
      async hardDelete(
        this: any,
        where: Prisma.CustomerDeleteArgs["where"]
      ) {
        const ctx = Prisma.getExtensionContext(this)
        return (ctx as any).delete({ where })
      },
      async findManyActive(
        this: any,
        args?: Prisma.CustomerFindManyArgs
      ) {
        const ctx = Prisma.getExtensionContext(this)
        return (ctx as any).findMany({
          ...args,
          where: { ...(args?.where ?? {}), deletedAt: null },
        })
      },
    },
  },
})
