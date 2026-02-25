import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getClinicianSessionContext } from '@/lib/server/clinician-auth'

type ProfileResponse = {
  profile: {
    name: string | null
    practiceName: string | null
    specialty: string | null
    onboardingCompletedAt: string | null
    onboardingComplete: boolean
  }
}

function serializeProfile(user: {
  name: string | null
  practiceName: string | null
  specialty: string | null
  onboardingCompletedAt: Date | null
}): ProfileResponse {
  return {
    profile: {
      name: user.name,
      practiceName: user.practiceName,
      specialty: user.specialty,
      onboardingCompletedAt: user.onboardingCompletedAt?.toISOString() ?? null,
      onboardingComplete: Boolean(user.onboardingCompletedAt),
    },
  }
}

function normalizeField(value: unknown, min: number, max: number) {
  if (typeof value !== 'string') {
    return { ok: false as const, error: 'Invalid field type' }
  }

  const trimmed = value.trim()
  if (trimmed.length < min || trimmed.length > max) {
    return { ok: false as const, error: `Field must be between ${min} and ${max} characters` }
  }

  return { ok: true as const, value: trimmed }
}

export async function GET() {
  try {
    const context = await getClinicianSessionContext()
    if (!context) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json(
      serializeProfile({
        name: context.user.name,
        practiceName: context.user.practiceName,
        specialty: context.user.specialty,
        onboardingCompletedAt: context.user.onboardingCompletedAt,
      })
    )
  } catch (error) {
    console.error('Get profile error:', error)
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const context = await getClinicianSessionContext()
    if (!context) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = (await req.json()) as {
      name?: unknown
      practiceName?: unknown
      specialty?: unknown
    }

    const name = normalizeField(payload.name, 2, 80)
    const practiceName = normalizeField(payload.practiceName, 2, 120)
    const specialty = normalizeField(payload.specialty, 2, 80)

    if (!name.ok || !practiceName.ok || !specialty.ok) {
      return NextResponse.json(
        {
          error:
            (!name.ok && name.error) ||
            (!practiceName.ok && practiceName.error) ||
            (!specialty.ok && specialty.error) ||
            'Invalid profile data',
        },
        { status: 400 }
      )
    }

    const updated = await prisma.user.update({
      where: { id: context.user.id },
      data: {
        name: name.value,
        practiceName: practiceName.value,
        specialty: specialty.value,
        onboardingCompletedAt: new Date(),
      },
      select: {
        name: true,
        practiceName: true,
        specialty: true,
        onboardingCompletedAt: true,
      },
    })

    return NextResponse.json(serializeProfile(updated))
  } catch (error) {
    console.error('Update profile error:', error)
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
  }
}
