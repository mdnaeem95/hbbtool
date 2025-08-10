import superjson from "superjson"

const isDecimalLike = (v: unknown): v is { toNumber(): number } =>
  !!v && typeof v === "object" && typeof (v as any).toNumber === "function"

// Convert Prisma Decimal -> number on the wire
superjson.registerCustom(
  {
    isApplicable: isDecimalLike,
    serialize: (v) => (v as any).toNumber(),
    // keep it as a number on the client
    deserialize: (v) => v,
  },
  "prisma:decimal"
)

export default superjson