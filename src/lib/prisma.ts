import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export function getPrismaDatabaseUrl() {
  const raw = process.env.DATABASE_URL
  if (!raw) {
    return undefined
  }

  try {
    const parsed = new URL(raw)
    const isSupabasePooler = parsed.hostname.endsWith('.pooler.supabase.com')

    if (isSupabasePooler) {
      if (!parsed.searchParams.has('sslmode')) {
        parsed.searchParams.set('sslmode', 'require')
      }
      if (!parsed.searchParams.has('pgbouncer')) {
        parsed.searchParams.set('pgbouncer', 'true')
      }
      if (!parsed.searchParams.has('connection_limit')) {
        parsed.searchParams.set('connection_limit', '1')
      }
    }

    return parsed.toString()
  } catch {
    return raw
  }
}

const prismaDatabaseUrl = getPrismaDatabaseUrl()

export function createPrismaClient() {
  return new PrismaClient(
    prismaDatabaseUrl
      ? {
          datasources: {
            db: {
              url: prismaDatabaseUrl,
            },
          },
        }
      : undefined
  )
}

export const prisma =
  globalForPrisma.prisma ??
  createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
