import postgres from "postgres"

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set")
}

// Edge-safe, very lightweight client
export const sql = postgres(process.env.DATABASE_URL, {
  max: 1, // keep 1 connection per edge worker
  ssl: "require", // good for Supabase / managed PG
})
