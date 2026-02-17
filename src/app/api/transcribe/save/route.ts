import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  deriveChiefComplaint,
  generateConversationSummary,
  generateSoapNotesFromTranscript,
  type TranscriptSegment,
} from '@/lib/clinical-notes'

interface SaveTranscribePayload {
  patientName?: string
  transcript?: TranscriptSegment[]
}

function generateShareToken() {
  return (
    Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
  )
}

function validateTranscript(input: unknown): TranscriptSegment[] {
  if (!Array.isArray(input)) return []

  return input
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const candidate = item as Record<string, unknown>
      const speaker = candidate.speaker
      const text = candidate.text
      const startMs = candidate.start_ms
      const endMs = candidate.end_ms

      if (
        (speaker !== 'clinician' && speaker !== 'patient') ||
        typeof text !== 'string' ||
        typeof startMs !== 'number' ||
        typeof endMs !== 'number'
      ) {
        return null
      }

      return {
        speaker,
        text: text.trim(),
        start_ms: startMs,
        end_ms: endMs,
      } as TranscriptSegment
    })
    .filter((segment): segment is TranscriptSegment => Boolean(segment?.text))
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'clinician') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = (await req.json()) as SaveTranscribePayload
    const patientName = payload.patientName?.trim()
    const transcript = validateTranscript(payload.transcript)

    if (!patientName) {
      return NextResponse.json({ error: 'Patient name is required' }, { status: 400 })
    }

    if (transcript.length === 0) {
      return NextResponse.json({ error: 'Transcript is empty' }, { status: 400 })
    }

    const [summary, soapNotes] = await Promise.all([
      generateConversationSummary(transcript),
      generateSoapNotesFromTranscript(transcript),
    ])
    const chiefComplaint = deriveChiefComplaint(transcript)

    const result = await prisma.$transaction(async (tx) => {
      const patient = await tx.patient.create({
        data: {
          displayName: patientName,
        },
      })

      const visit = await tx.visit.create({
        data: {
          patientId: patient.id,
          clinicianId: session.user.id,
          status: 'finalized',
          chiefComplaint,
          finalizedAt: new Date(),
        },
      })

      const documentation = await tx.visitDocumentation.create({
        data: {
          visitId: visit.id,
          transcriptJson: JSON.stringify(transcript),
          summary,
          soapNotes,
          additionalNotes: '',
        },
      })

      const shareLink = await tx.shareLink.create({
        data: {
          visitId: visit.id,
          patientId: patient.id,
          token: generateShareToken(),
        },
      })

      return {
        visitId: visit.id,
        patientId: patient.id,
        patientName: patient.displayName,
        documentationId: documentation.id,
        shareToken: shareLink.token,
      }
    })

    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (error) {
    console.error('Save transcription error:', error)
    return NextResponse.json({ error: 'Failed to save transcription' }, { status: 500 })
  }
}
