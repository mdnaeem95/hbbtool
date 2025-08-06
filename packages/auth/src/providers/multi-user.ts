export const multiUserSchema = {
  merchant: {
    fields: {
      email: { type: "string", required: true, unique: true },
      businessName: { type: "string", required: true },
      phone: { type: "string", required: true, unique: true },
      status: { type: "string", defaultValue: "PENDING_VERIFICATION" },
      verified: { type: "boolean", defaultValue: false },
    },
  },
  customer: {
    fields: {
      phone: { type: "string", required: true, unique: true },
      email: { type: "string", unique: true },
      name: { type: "string", required: true },
      phoneVerified: { type: "boolean", defaultValue: false },
      emailVerified: { type: "boolean", defaultValue: false },
    },
  },
}