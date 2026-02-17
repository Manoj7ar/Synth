import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface UpdateSoapNotesPayload {
  additionalNotes?: string
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
    const payload = (await req.json()) as UpdateSoapNotesPayload

    if (typeof payload.additionalNotes !== 'string') {
      return NextResponse.json({ error: 'additionalNotes must be a string' }, { status: 400 })
    }

    const record = await prisma.visitDocumentation.findUnique({
      where: { visitId },
      include: {
        visit: true,
      },
    })

    if (!record) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 })
    }

    if (record.visit.clinicianId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const updated = await prisma.visitDocumentation.update({
      where: { visitId },
      data: {
        additionalNotes: payload.additionalNotes,
      },
    })

    return NextResponse.json({
      success: true,
      visitId: updated.visitId,
      additionalNotes: updated.additionalNotes ?? '',
      updatedAt: updated.updatedAt,
    })
  } catch (error) {
    console.error('Update SOAP notes error:', error)
    return NextResponse.json({ error: 'Failed to update additional notes' }, { status: 500 })
  }
}
