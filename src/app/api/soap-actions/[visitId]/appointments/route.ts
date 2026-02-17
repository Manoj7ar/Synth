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

    const appointments = await prisma.appointment.findMany({
      where: { visitId },
      orderBy: { scheduledFor: 'asc' },
      select: {
        id: true,
        title: true,
        scheduledFor: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({ success: true, appointments })
  } catch (error) {
    console.error('Get appointments error:', error)
    return NextResponse.json({ error: 'Failed to fetch appointments' }, { status: 500 })
  }
}

interface CreateAppointmentPayload {
  title?: string
  scheduledFor?: string
  notes?: string
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

    const payload = (await req.json()) as CreateAppointmentPayload
    const title = (payload.title ?? '').trim()
    const scheduledForRaw = payload.scheduledFor ?? ''
    const notes = typeof payload.notes === 'string' ? payload.notes.trim() : ''

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    const scheduledFor = new Date(scheduledForRaw)
    if (Number.isNaN(scheduledFor.getTime())) {
      return NextResponse.json({ error: 'Valid date/time is required' }, { status: 400 })
    }

    const appointment = await prisma.appointment.create({
      data: {
        visitId: visit.id,
        patientId: visit.patientId,
        clinicianId: session.user.id,
        title,
        scheduledFor,
        notes: notes || null,
      },
      select: {
        id: true,
        title: true,
        scheduledFor: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({ success: true, appointment })
  } catch (error) {
    console.error('Create appointment error:', error)
    return NextResponse.json({ error: 'Failed to create appointment' }, { status: 500 })
  }
}
