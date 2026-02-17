import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

async function getAuthorizedVisit(visitId: string, clinicianId: string) {
  const visit = await prisma.visit.findUnique({
    where: { id: visitId },
    select: {
      id: true,
      patientId: true,
      clinicianId: true,
    },
  })

  if (!visit || visit.clinicianId !== clinicianId) {
    return null
  }
  return visit
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ visitId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'clinician') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { visitId } = await params
    const visit = await getAuthorizedVisit(visitId, session.user.id)
    if (!visit) {
      return NextResponse.json({ error: 'Visit not found' }, { status: 404 })
    }

    const planItems = await prisma.carePlanItem.findMany({
      where: { visitId: visit.id },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        title: true,
        details: true,
        dueAt: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({ success: true, planItems })
  } catch (error) {
    console.error('Get plan items error:', error)
    return NextResponse.json({ error: 'Failed to fetch plan items' }, { status: 500 })
  }
}

interface CreatePlanItemPayload {
  title?: string
  details?: string
  dueAt?: string
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ visitId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'clinician') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { visitId } = await params
    const visit = await getAuthorizedVisit(visitId, session.user.id)
    if (!visit) {
      return NextResponse.json({ error: 'Visit not found' }, { status: 404 })
    }

    const payload = (await req.json()) as CreatePlanItemPayload
    const title = (payload.title ?? '').trim()
    const details = typeof payload.details === 'string' ? payload.details.trim() : ''

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    let dueAt: Date | null = null
    if (payload.dueAt) {
      dueAt = new Date(payload.dueAt)
      if (Number.isNaN(dueAt.getTime())) {
        return NextResponse.json({ error: 'Invalid due date' }, { status: 400 })
      }
    }

    const planItem = await prisma.carePlanItem.create({
      data: {
        visitId: visit.id,
        patientId: visit.patientId,
        clinicianId: session.user.id,
        title,
        details: details || null,
        dueAt,
      },
      select: {
        id: true,
        title: true,
        details: true,
        dueAt: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({ success: true, planItem })
  } catch (error) {
    console.error('Create plan item error:', error)
    return NextResponse.json({ error: 'Failed to create plan item' }, { status: 500 })
  }
}

interface UpdatePlanItemPayload {
  itemId?: string
  status?: string
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ visitId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'clinician') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { visitId } = await params
    const visit = await getAuthorizedVisit(visitId, session.user.id)
    if (!visit) {
      return NextResponse.json({ error: 'Visit not found' }, { status: 404 })
    }

    const payload = (await req.json()) as UpdatePlanItemPayload
    const itemId = payload.itemId ?? ''
    const status = payload.status === 'completed' ? 'completed' : 'pending'

    if (!itemId) {
      return NextResponse.json({ error: 'itemId is required' }, { status: 400 })
    }

    const existing = await prisma.carePlanItem.findUnique({
      where: { id: itemId },
      select: { id: true, visitId: true, clinicianId: true },
    })

    if (!existing || existing.visitId !== visit.id || existing.clinicianId !== session.user.id) {
      return NextResponse.json({ error: 'Plan item not found' }, { status: 404 })
    }

    const updated = await prisma.carePlanItem.update({
      where: { id: itemId },
      data: { status },
      select: {
        id: true,
        title: true,
        details: true,
        dueAt: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({ success: true, planItem: updated })
  } catch (error) {
    console.error('Update plan item error:', error)
    return NextResponse.json({ error: 'Failed to update plan item' }, { status: 500 })
  }
}
