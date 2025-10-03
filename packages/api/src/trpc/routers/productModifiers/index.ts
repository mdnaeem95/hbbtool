import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { merchantProcedure, router } from "../../core";

// Validation schemas
const modifierSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  priceAdjustment: z.number().default(0),
  priceType: z.enum(["FIXED", "PERCENTAGE"]).default("FIXED"),
  isDefault: z.boolean().default(false),
  isAvailable: z.boolean().default(true),
  sortOrder: z.number().default(0),
  imageUrl: z.string().optional(),
  trackInventory: z.boolean().default(false),
  inventory: z.number().optional(),
  maxPerOrder: z.number().optional(),
});

const modifierGroupSchema = z.object({
  id: z.string().optional(),
  productId: z.string(),
  name: z.string().min(1, "Group name is required"),
  description: z.string().optional(),
  type: z.enum(["SINGLE_SELECT", "MULTI_SELECT"]),
  required: z.boolean().default(false),
  minSelect: z.number().optional(),
  maxSelect: z.number().optional(),
  sortOrder: z.number().default(0),
  isActive: z.boolean().default(true),
  modifiers: z.array(modifierSchema).default([]),
});

export const productModifiersRouter = router({
  // Get all modifier groups for a product
  getByProduct: merchantProcedure
    .input(z.object({ productId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { productId } = input;
      const merchantId = ctx.session!.user.id;

      // Verify product belongs to merchant
      const product = await ctx.db.product.findFirst({
        where: { id: productId, merchantId },
      });

      if (!product) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Product not found",
        });
      }

      // Get all modifier groups with modifiers
      const groups = await ctx.db.productModifierGroup.findMany({
        where: { productId },
        include: {
          modifiers: {
            orderBy: { sortOrder: "asc" },
          },
        },
        orderBy: { sortOrder: "asc" },
      });

      return groups;
    }),

  // Create or update a modifier group with all its modifiers
  upsertGroup: merchantProcedure
    .input(modifierGroupSchema)
    .mutation(async ({ ctx, input }) => {
      const merchantId = ctx.session!.user.id;

      // Verify product belongs to merchant
      const product = await ctx.db.product.findFirst({
        where: { id: input.productId, merchantId },
      });

      if (!product) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Product not found",
        });
      }

      // Validate multi-select constraints
      if (input.type === "MULTI_SELECT") {
        if (input.minSelect && input.maxSelect && input.minSelect > input.maxSelect) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Minimum selection cannot be greater than maximum",
          });
        }
      }

      const { modifiers, ...groupData } = input;

      const completeGroupData = {
        ...groupData,
        merchantId: merchantId, // Make sure merchantId is included
        };

      // Use transaction for atomicity
      const result = await ctx.db.$transaction(async (tx) => {
        let group;

        if (input.id && !input.id.startsWith("temp-")) {
          // Update existing group
          group = await tx.productModifierGroup.update({
            where: { id: input.id },
            data: groupData,
          });

          // Handle modifiers
          const existingModifierIds = modifiers
            .filter(m => m.id && !m.id.startsWith("temp-"))
            .map(m => m.id!);

          // Delete removed modifiers
          await tx.productModifier.deleteMany({
            where: {
              groupId: group.id,
              id: { notIn: existingModifierIds },
            },
          });

          // Update or create modifiers
          for (const modifier of modifiers) {
            if (modifier.id && !modifier.id.startsWith("temp-")) {
              // Update existing modifier
              await tx.productModifier.update({
                where: { id: modifier.id },
                data: {
                  name: modifier.name,
                  description: modifier.description,
                  priceAdjustment: modifier.priceAdjustment,
                  priceType: modifier.priceType,
                  isDefault: modifier.isDefault,
                  isAvailable: modifier.isAvailable,
                  sortOrder: modifier.sortOrder,
                  imageUrl: modifier.imageUrl,
                  trackInventory: modifier.trackInventory,
                  inventory: modifier.inventory,
                  maxPerOrder: modifier.maxPerOrder,
                },
              });
            } else {
              // Create new modifier
              await tx.productModifier.create({
                data: {
                  groupId: group.id,
                  name: modifier.name,
                  description: modifier.description,
                  priceAdjustment: modifier.priceAdjustment,
                  priceType: modifier.priceType,
                  isDefault: modifier.isDefault,
                  isAvailable: modifier.isAvailable,
                  sortOrder: modifier.sortOrder,
                  imageUrl: modifier.imageUrl,
                  trackInventory: modifier.trackInventory,
                  inventory: modifier.inventory,
                  maxPerOrder: modifier.maxPerOrder,
                },
              });
            }
          }
        } else {
          // Create new group
          group = await tx.productModifierGroup.create({
            data: {
              ...completeGroupData,
              modifiers: {
                create: modifiers.map(modifier => ({
                  name: modifier.name,
                  description: modifier.description,
                  priceAdjustment: modifier.priceAdjustment,
                  priceType: modifier.priceType,
                  isDefault: modifier.isDefault,
                  isAvailable: modifier.isAvailable,
                  sortOrder: modifier.sortOrder,
                  imageUrl: modifier.imageUrl,
                  trackInventory: modifier.trackInventory,
                  inventory: modifier.inventory,
                  maxPerOrder: modifier.maxPerOrder,
                })),
              },
            },
          });
        }

        // Return the complete group with modifiers
        return await tx.productModifierGroup.findUnique({
          where: { id: group.id },
          include: {
            modifiers: {
              orderBy: { sortOrder: "asc" },
            },
          },
        });
      });

      return result;
    }),

  bulkUpsertGroups: merchantProcedure
    .input(z.object({
      productId: z.string(),
      groups: z.array(z.object({
        id: z.string().optional(),
        name: z.string().min(1),
        description: z.string().optional(),
        type: z.enum(["SINGLE_SELECT", "MULTI_SELECT"]),
        required: z.boolean().default(false),
        minSelect: z.number().int().min(0).optional(),
        maxSelect: z.number().int().min(0).optional(),
        sortOrder: z.number().int().min(0),
        isActive: z.boolean().default(true),
        modifiers: z.array(z.object({
          id: z.string().optional(),
          name: z.string().min(1),
          description: z.string().optional(),
          priceAdjustment: z.number(),
          priceType: z.enum(["FIXED", "PERCENTAGE"]),
          sortOrder: z.number().int().min(0),
          isAvailable: z.boolean().default(true),
          isDefault: z.boolean().default(false),
        })),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      const merchantId = ctx.session!.user.id;
      
      // Verify product ownership
      const product = await ctx.db.product.findFirst({
        where: { id: input.productId, merchantId }
      });
      
      if (!product) {
        throw new TRPCError({ 
          code: 'NOT_FOUND',
          message: 'Product not found'
        });
      }
      
      // Validate single-select groups have max 1 default modifier
      for (const group of input.groups) {
        if (group.type === "SINGLE_SELECT") {
          const defaultCount = group.modifiers.filter(m => m.isDefault).length;
          if (defaultCount > 1) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: `Single-select group "${group.name}" can only have one default modifier`
            });
          }
        }
      }
      
      // Use transaction for data consistency
      return await ctx.db.$transaction(async (tx) => {
        // Get existing groups
        const existingGroups = await tx.productModifierGroup.findMany({
          where: { productId: input.productId },
          include: { modifiers: true }
        });
        
        const existingGroupIds = existingGroups.map(g => g.id);
        const inputGroupIds = input.groups
          .filter(g => g.id && !g.id.startsWith('temp-'))
          .map(g => g.id!);
        
        // Delete removed groups (modifiers will cascade)
        const toDelete = existingGroupIds.filter(id => !inputGroupIds.includes(id));
        if (toDelete.length > 0) {
          await tx.productModifierGroup.deleteMany({
            where: { id: { in: toDelete } }
          });
        }
        
        const results = [];
        
        // Upsert groups and modifiers
        for (const group of input.groups) {
          const isNewGroup = !group.id || group.id.startsWith('temp-');
          
          let savedGroup;
          if (isNewGroup) {
            // Create new group
            savedGroup = await tx.productModifierGroup.create({
              data: {
                productId: input.productId,
                merchantId,
                name: group.name,
                description: group.description,
                type: group.type,
                required: group.required,
                minSelect: group.minSelect,
                maxSelect: group.maxSelect,
                sortOrder: group.sortOrder,
                isActive: group.isActive,
              }
            });
          } else {
            // Update existing group
            savedGroup = await tx.productModifierGroup.update({
              where: { id: group.id },
              data: {
                name: group.name,
                description: group.description,
                type: group.type,
                required: group.required,
                minSelect: group.minSelect,
                maxSelect: group.maxSelect,
                sortOrder: group.sortOrder,
                isActive: group.isActive,
              }
            });
            
            // Delete removed modifiers
            const existingGroup = existingGroups.find(g => g.id === group.id);
            if (existingGroup) {
              const existingModIds = existingGroup.modifiers.map(m => m.id);
              const inputModIds = group.modifiers
                .filter(m => m.id && !m.id.startsWith('temp-'))
                .map(m => m.id!);
              
              const modToDelete = existingModIds.filter(id => !inputModIds.includes(id));
              if (modToDelete.length > 0) {
                await tx.productModifier.deleteMany({
                  where: { id: { in: modToDelete } }
                });
              }
            }
          }
          
          // Upsert modifiers
          const savedModifiers = [];
          for (const modifier of group.modifiers) {
            const isNewMod = !modifier.id || modifier.id.startsWith('temp-');
            
            if (isNewMod) {
              const created = await tx.productModifier.create({
                data: {
                  groupId: savedGroup.id,
                  name: modifier.name,
                  description: modifier.description,
                  priceAdjustment: modifier.priceAdjustment,
                  priceType: modifier.priceType,
                  sortOrder: modifier.sortOrder,
                  isAvailable: modifier.isAvailable,
                  isDefault: modifier.isDefault,
                  trackInventory: false,
                  inventory: 0,
                }
              });
              savedModifiers.push(created);
            } else {
              const updated = await tx.productModifier.update({
                where: { id: modifier.id },
                data: {
                  name: modifier.name,
                  description: modifier.description,
                  priceAdjustment: modifier.priceAdjustment,
                  priceType: modifier.priceType,
                  sortOrder: modifier.sortOrder,
                  isAvailable: modifier.isAvailable,
                  isDefault: modifier.isDefault,
                }
              });
              savedModifiers.push(updated);
            }
          }
          
          results.push({ group: savedGroup, modifiers: savedModifiers });
        }
        
        return {
          success: true,
          groupCount: results.length,
          modifierCount: results.reduce((sum, r) => sum + r.modifiers.length, 0),
          results
        };
      });
    }),

  // Delete a modifier group
  deleteGroup: merchantProcedure
    .input(z.object({ groupId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const merchantId = ctx.session!.user.id;

      // Verify group belongs to merchant's product
      const group = await ctx.db.productModifierGroup.findFirst({
        where: { 
          id: input.groupId,
          product: { merchantId }
        },
      });

      if (!group) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Modifier group not found",
        });
      }

      // Delete group (modifiers will cascade)
      await ctx.db.productModifierGroup.delete({
        where: { id: input.groupId },
      });

      return { success: true };
    }),

  // Update modifier inventory (for quick stock adjustments)
  updateModifierInventory: merchantProcedure
    .input(
      z.object({
        modifierId: z.string(),
        inventory: z.number().min(0),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const merchantId = ctx.session!.user.id;

      // Verify modifier belongs to merchant's product
      const modifier = await ctx.db.productModifier.findFirst({
        where: {
          id: input.modifierId,
          group: {
            product: { merchantId },
          },
        },
      });

      if (!modifier) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Modifier not found",
        });
      }

      // Update inventory
      const updated = await ctx.db.productModifier.update({
        where: { id: input.modifierId },
        data: { inventory: input.inventory },
      });

      return updated;
    }),

  // Bulk update sort order
  updateSortOrder: merchantProcedure
    .input(
      z.object({
        productId: z.string(),
        groups: z.array(
          z.object({
            id: z.string(),
            sortOrder: z.number(),
            modifiers: z.array(
              z.object({
                id: z.string(),
                sortOrder: z.number(),
              })
            ).optional(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const merchantId = ctx.session!.user.id;

      // Verify product belongs to merchant
      const product = await ctx.db.product.findFirst({
        where: { id: input.productId, merchantId },
      });

      if (!product) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Product not found",
        });
      }

      // Update in transaction
      await ctx.db.$transaction(async (tx) => {
        // Update group sort orders
        for (const group of input.groups) {
          await tx.productModifierGroup.update({
            where: { id: group.id },
            data: { sortOrder: group.sortOrder },
          });

          // Update modifier sort orders if provided
          if (group.modifiers) {
            for (const modifier of group.modifiers) {
              await tx.productModifier.update({
                where: { id: modifier.id },
                data: { sortOrder: modifier.sortOrder },
              });
            }
          }
        }
      });

      return { success: true };
    }),

  // Clone modifiers from another product
  cloneFromProduct: merchantProcedure
    .input(
      z.object({
        sourceProductId: z.string(),
        targetProductId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const merchantId = ctx.session!.user.id;

      // Verify both products belong to merchant
      const [sourceProduct, targetProduct] = await Promise.all([
        ctx.db.product.findFirst({
          where: { id: input.sourceProductId, merchantId },
        }),
        ctx.db.product.findFirst({
          where: { id: input.targetProductId, merchantId },
        }),
      ]);

      if (!sourceProduct || !targetProduct) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Product not found",
        });
      }

      // Get source modifier groups
      const sourceGroups = await ctx.db.productModifierGroup.findMany({
        where: { productId: input.sourceProductId },
        include: { modifiers: true },
        orderBy: { sortOrder: "asc" },
      });

      // Clone in transaction
      await ctx.db.$transaction(async (tx) => {
        for (const sourceGroup of sourceGroups) {
          const { id, productId, modifiers, ...groupData } = sourceGroup;
          
          // Create new group
          const newGroup = await tx.productModifierGroup.create({
            data: {
              ...groupData,
              productId: input.targetProductId,
            },
          });

          // Clone modifiers
            for (const modifier of modifiers) {
            await tx.productModifier.create({
                data: {
                groupId: newGroup.id,
                name: modifier.name,
                description: modifier.description,
                priceAdjustment: modifier.priceAdjustment,
                priceType: modifier.priceType,
                variantPricing: modifier.variantPricing ?? undefined, // Convert null to undefined
                trackInventory: modifier.trackInventory,
                inventory: modifier.inventory,
                maxPerOrder: modifier.maxPerOrder,
                caloriesAdjustment: modifier.caloriesAdjustment,
                imageUrl: modifier.imageUrl,
                sortOrder: modifier.sortOrder,
                isDefault: modifier.isDefault,
                isAvailable: modifier.isAvailable,
                isHidden: modifier.isHidden,
                incompatibleWith: modifier.incompatibleWith || [],
                requiredWith: modifier.requiredWith || [],
                },
            });
            }
        }
      });

      return { success: true };
    }),
});

// Export type for use in other routers
export type ProductModifiersRouter = typeof productModifiersRouter;