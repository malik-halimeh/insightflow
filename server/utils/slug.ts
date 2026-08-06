/**
 * Turns free text into something that satisfies `slugSchema` (lowercase words
 * joined by single hyphens). Uniqueness is not this function's job — see
 * server/api/publish/index.post.ts, which retries with `randomSuffix()` on conflict.
 */
export function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '')

  return base || 'insight'
}

export function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 7)
}
