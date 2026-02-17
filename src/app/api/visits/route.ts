import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'clinician') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const visits = await prisma.visit.findMany({
      where: { clinicianId: session.user.id },
      include: { patient: true },
      orderBy: { startedAt: 'desc' }
    })

    return NextResponse.json({ visits })

  } catch (error) {
    console.error('Get visits error:', error)
    return NextResponse.json({ error: 'Failed to fetch visits' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'clinician') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { patientName, chiefComplaint } = await req.json()

    const patient = await prisma.patient.create({
      data: {
        displayName: patientName
      }
    })

    const visit = await prisma.visit.create({
      data: {
        patientId: patient.id,
        clinicianId: session.user.id,
        status: 'draft',
        chiefComplaint
      },
      include: { patient: true }
    })

    return NextResponse.json({ visit })

  } catch (error) {
    console.error('Create visit error:', error)
    return NextResponse.json({ error: 'Failed to create visit' }, { status: 500 })
  }
}
