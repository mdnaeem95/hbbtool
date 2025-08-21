export const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'merchant'

export async function ensureUniqueSlug(db: any, base: string) {
  let slug = base
  for (let i = 1; i < 50; i++) {
    const exists = await db.merchant.findFirst({ where: { slug } })
    if (!exists) return slug
    slug = `${base}-${i + 1}`
  }
  // ultra-rare: fallback to random
  return `${base}-${Math.random().toString(36).slice(2, 6)}`
}