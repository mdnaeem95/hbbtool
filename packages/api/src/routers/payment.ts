import { z } from "zod"
import { createTRPCRouter, publicProcedure, protectedProcedure } from "../trpc"
import { TRPCError } from "@trpc/server"
import { PaymentStatus, OrderStatus, Prisma } from "@kitchencloud/database/client"

export const paymentRouter = createTRPCRouter({
  // Get payment details by order ID or order number
  getByOrder: publicProcedure
    .input(
      z.object({
        orderId: z.string().optional(),
        orderNumber: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      if (!input.orderId && !input.orderNumber) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Either orderId or orderNumber is required",
        })
      }

      const order = await ctx.db.order.findFirst({
        where: {
          OR: [
            input.orderId ? { id: input.orderId } : {},
            input.orderNumber ? { orderNumber: input.orderNumber } : {},
          ],
        },
        include: {
          payment: {
            include: {
              paymentProofs: {
                orderBy: { uploadedAt: "desc" },
              },
            },
          },
          merchant: {
            select: {
              businessName: true,
              paynowNumber: true,
              paynowQrCode: true,
              phone: true,
            },
          },
        },
      })

      if (!order || !order.payment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Order or payment not found",
        })
      }

      return {
        payment: order.payment,
        merchant: order.merchant,
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          total: order.total,
          status: order.status,
        },
      }
    }),

  // Upload payment proof
  uploadProof: publicProcedure
    .input(
      z.object({
        orderId: z.string().optional(),
        orderNumber: z.string().optional(),
        fileUrl: z.string().url("Invalid file URL"),
        fileName: z.string().min(1, "File name is required"),
        fileSize: z.number().max(5 * 1024 * 1024, "File size must be less than 5MB"),
        mimeType: z.enum(["image/jpeg", "image/png", "image/webp"], {
          errorMap: () => ({ message: "Only JPEG, PNG, and WebP images are allowed" }),
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!input.orderId && !input.orderNumber) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Either orderId or orderNumber is required",
        })
      }

      // Find order and payment
      const order = input.orderId
        ? await ctx.db.order.findUnique({
            where: { id: input.orderId },
            include: {
                payment: { include: { paymentProofs: true } },
                merchant: { select: { businessName: true, email: true } },
            }
        })
        : await ctx.db.order.findUnique({
            where: { orderNumber: input.orderNumber },
            include: {
                payment: { include: { paymentProofs: true } },
                merchant: { select: { businessName: true, email: true } },
            }
        })

      if (!order || !order.payment) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Order or payment not found" })
      }

      // Check if payment is already completed
      if (order.payment.status === PaymentStatus.COMPLETED) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Payment has already been verified",
        })
      }

      // Limit number of proof uploads
      if (order.payment.paymentProofs.length >= 3) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Maximum number of payment proofs (3) already uploaded",
        })
      }

      const xfwd = ctx.headers?.get("x-forwarded-for") || undefined
      const ipAddress = xfwd ? xfwd.split(",")[0]?.trim() : undefined
      const userAgent = ctx?.headers.get("user-agent") || undefined

      // Create payment proof record
      const proof = await ctx.db.paymentProof.create({
        data: {
          paymentId: order.payment.id,
          fileUrl: input.fileUrl,
          fileName: input.fileName,
          fileSize: input.fileSize,
          mimeType: input.mimeType,
          uploadedBy: ctx.session?.user?.id ?? null,
          ipAddress: ipAddress ?? null,
          userAgent: userAgent ?? null,
        },
      })

      // Update payment with primary proof URL if first upload
      if (!order.payment.paymentProofUrl) {
        await ctx.db.payment.update({
          where: { id: order.payment.id },
          data: {
            paymentProofUrl: input.fileUrl,
            status: PaymentStatus.PROCESSING,
            updatedAt: new Date(),
          },
        })
      }

      // Create order event
      await ctx.db.orderEvent.create({
        data: {
          orderId: order.id,
          event: "payment_proof_uploaded",
          data: {
            proofId: proof.id,
            fileName: input.fileName,
            uploadedAt: proof.uploadedAt,
            uploadNumber: order.payment.paymentProofs.length + 1,
          } as Prisma.InputJsonValue,
        },
      })

      // TODO: Send notification to merchant
      // - Email notification with proof image
      // - SMS/WhatsApp alert

      return {
        success: true,
        proofId: proof.id,
        message: "Payment proof uploaded successfully. The merchant will verify your payment shortly.",
      }
    }),

  // Verify payment (merchant only)
  verify: protectedProcedure
    .input(
      z.object({
        paymentId: z.string(),
        verified: z.boolean(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = ctx.session.user
      if (user.role !== "MERCHANT") {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Only merchants can verify payments" })
      }

      // Get payment with order + basic customer info
      const payment = await ctx.db.payment.findUnique({
        where: { id: input.paymentId },
        include: {
          order: {
            select: {
              id: true,
              merchantId: true,
              customerId: true,
              orderNumber: true,
              customer: { select: { email: true, phone: true, name: true } },
            },
          },
        },
      })
      if (!payment || !payment.order) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Payment not found" })
      }

      // if session.user.id == merchantId for merchants this is correct
      // otherwise, resolve merchant Id for the session and compare against that
      if (payment.order.merchantId !== user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to verify this payment",
        })
      }

      // Check current status
      if (payment.status === PaymentStatus.COMPLETED) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Payment has already been verified",
        })
      }

      const now = new Date()

      // Update payment status
      const updatedPayment = await ctx.db.$transaction(async (tx) => {
        const pay = await tx.payment.update({
            where: { id: input.paymentId },
            data: {
                status: input.verified ? PaymentStatus.COMPLETED : PaymentStatus.FAILED,
                verifiedBy: user.id,
                verifiedAt: now,
                verficationNotes: input.notes ?? null,
                paidAt: input.verified ? now : null,
                updatedAt: now
            },
        })

        // update order + event
        if (input.verified) {
            await tx.order.update({
                where: { id: payment.orderId },
                data: {
                    paymentStatus: PaymentStatus.COMPLETED,
                    status: OrderStatus.CONFIRMED,
                    confirmedAt: now,
                    updatedAt: now
                },
            })

            await tx.orderEvent.create({
                data: {
                    orderId: payment.orderId,
                    event: "payment_verified",
                    userId: user.id,
                    data: {
                        verifiedBy: user.id,
                        notes: input.notes,
                        verifiedAt: now.toISOString(),
                    } as Prisma.InputJsonValue,
                },
            })

            // TODO: Send confirmation notifications
            // - Email to customer with order details
            // - SMS confirmation
            // - WhatsApp message
        } else {
            await tx.order.update({
                where: { id: payment.orderId },
                data: {
                    paymentStatus: PaymentStatus.FAILED,
                    updatedAt: now,
                }
            })

            await tx.orderEvent.create({
                data: {
                    orderId: payment.orderId,
                    event: "payment_rejected",
                    userId: user.id,
                    data: {
                        rejectedBy: user.id,
                        reason: input.notes || "Payment could not be verified",
                        rejectedAt: now.toISOString(),
                    } as Prisma.InputJsonValue
                },
            })

            // TODO: Notify customer of rejection
            // - Email with reason and next steps
            // - Option to upload new proof
        }

        return pay
      })

      return {
        success: true,
        payment: updatedPayment,
        message: input.verified
         ? "Payment verified successfully. Order confirmed."
         : "Payment rejected. Customer has been notified."
      }
    }),

  // List pending payments for merchant
  listPending: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const user = ctx.session.user
      if (user.role !== "MERCHANT") {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Merchant access only",
        })
      }

      const where: Prisma.PaymentWhereInput = {
        order: {
          merchantId: user.id,
        },
        status: {
          in: [PaymentStatus.PENDING, PaymentStatus.PROCESSING],
        },
      }

      const payments = await ctx.db.payment.findMany({
        where,
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              customerName: true,
              customerPhone: true,
              total: true,
              createdAt: true,
            },
          },
          paymentProofs: {
            select: {
              id: true,
              fileUrl: true,
              fileName: true,
              uploadedAt: true,
            },
            orderBy: {
              uploadedAt: "desc",
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: input.limit + 1,
        ...(input.cursor && {
          cursor: { id: input.cursor },
          skip: 1,
        }),
      })

      let nextCursor: string | undefined
      if (payments.length > input.limit) {
        const nextItem = payments.pop()
        nextCursor = nextItem?.id
      }

      return {
        items: payments,
        nextCursor,
      }
    }),

  // Get payment statistics for merchant dashboard
  getStats: protectedProcedure.query(async ({ ctx }) => {
    const user = ctx.session.user
    if (user.role !== "MERCHANT") {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Merchant access only",
      })
    }

    const [pending, completed, failed] = await Promise.all([
      ctx.db.payment.count({
        where: {
          order: { merchantId: user.id },
          status: { in: [PaymentStatus.PENDING, PaymentStatus.PROCESSING] },
        },
      }),
      ctx.db.payment.count({
        where: {
          order: { merchantId: user.id },
          status: PaymentStatus.COMPLETED,
        },
      }),
      ctx.db.payment.count({
        where: {
          order: { merchantId: user.id },
          status: PaymentStatus.FAILED,
        },
      }),
    ])

    const totalRevenue = await ctx.db.payment.aggregate({
      where: {
        order: { merchantId: user.id },
        status: PaymentStatus.COMPLETED,
      },
      _sum: {
        amount: true,
      },
    })

    return {
      pending,
      completed,
      failed,
      totalRevenue: totalRevenue._sum.amount?.toNumber() || 0,
    }
  }),
})