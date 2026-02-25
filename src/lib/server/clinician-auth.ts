import 'server-only'

import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export type ClinicianUserProfile = {
  id: string
  email: string
  role: string
  name: string | null
  practiceName: string | null
  specialty: string | null
  onboardingCompletedAt: Date | null
  onboardingComplete: boolean
}

export type ClinicianSessionContext = {
  session: Awaited<ReturnType<typeof getServerSession>>
  user: ClinicianUserProfile
}

export async function getClinicianSessionContext(): Promise<ClinicianSessionContext | null> {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'clinician' || !session.user.id) {
    return null
  }

  let usedLegacyFallback = false
  let user:
    | {
        id: string
        email: string
        role: string
        name: string | null
        practiceName: string | null
        specialty: string | null
        onboardingCompletedAt: Date | null
      }
    | null = null

  try {
    user = (await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        role: true,
        name: true,
        practiceName: true,
        specialty: true,
        onboardingCompletedAt: true,
      },
    })) as typeof user
  } catch (error) {
    usedLegacyFallback = true
    console.warn('Clinician profile query fallback:', error)
    const legacyUser = (await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        role: true,
        name: true,
      },
    })) as { id: string; email: string; role: string; name: string | null } | null

    user = legacyUser
      ? {
          ...legacyUser,
          practiceName: null,
          specialty: null,
          onboardingCompletedAt: null,
        }
      : null
  }

  if (!user || user.role !== 'clinician') {
    return null
  }

  return {
    session,
    user: {
      ...user,
      onboardingComplete: usedLegacyFallback ? true : Boolean(user.onboardingCompletedAt),
    },
  }
}

export async function requireClinicianPage(options?: {
  requireOnboarding?: boolean
  loginRedirectTo?: string
  onboardingRedirectTo?: string
}): Promise<ClinicianSessionContext> {
  const context = await getClinicianSessionContext()
  if (!context) {
    redirect(options?.loginRedirectTo ?? '/login')
  }

  const requireOnboarding = options?.requireOnboarding ?? true
  if (requireOnboarding && !context.user.onboardingComplete) {
    redirect(options?.onboardingRedirectTo ?? '/clinician/onboarding')
  }

  return context
}
