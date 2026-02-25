import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { esClient } from '@/lib/elasticsearch/client'
import { getAllTranscriptChunks, getMedicationsFromVisit } from '@/lib/elasticsearch/search'
import { INDICES } from '@/lib/elasticsearch/indices'

type MedicationSummary = {
  name: string
  dosage?: string
  frequency?: string
  confidence?: number
  mentions?: number
}

type SymptomSummary = {
  name: string
  severity?: string
  confidence?: number
}

type ProcedureSummary = {
  name: string
  confidence?: number
}

type VitalSummary = {
  type: string
  value: string
  confidence?: number
}

type TranscriptChunk = {
  chunk_id: string
  visit_id: string
  patient_id: string
  speaker: string
  start_ms: number
  end_ms: number
  text: string
  ml_entities?: {
    medications?: MedicationSummary[]
    symptoms?: SymptomSummary[]
    procedures?: ProcedureSummary[]
    vitals?: VitalSummary[]
  }
}

type FollowupItem = {
  task: string
  timestamp_ms: number
  priority: 'high' | 'medium'
  timing: string
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'clinician') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { visitId } = await req.json()

    if (!visitId) {
      return NextResponse.json({ error: 'Visit ID required' }, { status: 400 })
    }

    const visit = await prisma.visit.findUnique({
      where: { id: visitId },
      include: { patient: true }
    })

    if (!visit) {
      return NextResponse.json({ error: 'Visit not found' }, { status: 404 })
    }

    if (visit.clinicianId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Get transcript chunks from ES, or fall back to Prisma VisitDocumentation + local ML
    let chunks: TranscriptChunk[] = []
    let medications: MedicationSummary[] = []
    
    // Try ES first
    chunks = (await getAllTranscriptChunks(visitId, visit.patientId)) as unknown as TranscriptChunk[]
    if (chunks.length > 0) {
      medications = (await getMedicationsFromVisit(visitId, visit.patientId)) as MedicationSummary[]
    }

    // Fall back to Prisma transcript + local entity extraction
    if (chunks.length === 0) {
      const doc = await prisma.visitDocumentation.findUnique({
        where: { visitId },
        select: { transcriptJson: true },
      })

      if (doc?.transcriptJson) {
        const { extractMedicalEntities } = await import('@/lib/elasticsearch/ml')
        const segments = JSON.parse(doc.transcriptJson) as Array<{
          speaker: string; start_ms: number; end_ms: number; text: string
        }>

        chunks = await Promise.all(
          segments.map(async (seg, idx) => {
            const entities = await extractMedicalEntities(seg.text)
            return {
              chunk_id: `${visitId}-chunk-${idx}`,
              visit_id: visitId,
              patient_id: visit.patientId,
              speaker: seg.speaker,
              start_ms: seg.start_ms,
              end_ms: seg.end_ms,
              text: seg.text,
              ml_entities: {
                medications: entities.medications.map((m) => ({ name: m.name, dosage: m.dosage, frequency: m.frequency, confidence: m.confidence })),
                symptoms: entities.symptoms.map((s) => ({ name: s.name, severity: s.severity, confidence: s.confidence })),
                procedures: entities.procedures.map((p) => ({ name: p.name, confidence: p.confidence })),
                vitals: entities.vitals.map((v) => ({ type: v.type, value: v.value, confidence: v.confidence }))
              }
            }
          })
        )

        const medMap = new Map<string, MedicationSummary & { mentions: number }>()
        for (const chunk of chunks) {
          for (const med of chunk.ml_entities?.medications || []) {
            if (!medMap.has(med.name)) {
              medMap.set(med.name, { name: med.name, dosage: med.dosage, frequency: med.frequency, mentions: 1 })
            } else {
              const existing = medMap.get(med.name)
              if (existing) existing.mentions += 1
            }
          }
        }
        medications = Array.from(medMap.values())
      }
    }

    if (chunks.length === 0) {
      return NextResponse.json({ error: 'No transcript found' }, { status: 400 })
    }

    // Aggregate all ML entities from chunks
    const allSymptoms = new Set<string>()
    const allProcedures = new Set<string>()
    const allVitals: VitalSummary[] = []

    for (const chunk of chunks) {
      if (chunk.ml_entities?.symptoms) {
        chunk.ml_entities.symptoms.forEach((s) => allSymptoms.add(s.name))
      }
      if (chunk.ml_entities?.procedures) {
        chunk.ml_entities.procedures.forEach((p) => allProcedures.add(p.name))
      }
      if (chunk.ml_entities?.vitals) {
        allVitals.push(...chunk.ml_entities.vitals)
      }
    }

    // Generate artifacts
    const afterVisitSummary = generateAfterVisitSummary(chunks, medications, Array.from(allSymptoms))
    const soapDraft = generateSOAPNote(chunks, medications, Array.from(allSymptoms), allVitals)
    const followups = extractFollowups(chunks)

    // Try to index artifacts in ES
    try {
      await esClient.index({
        index: INDICES.VISIT_ARTIFACTS,
        document: {
          visit_id: visitId,
          patient_id: visit.patientId,
          after_visit_summary: afterVisitSummary,
          soap_draft: soapDraft,
          medication_list_json: {
            medications: medications.map(m => ({
              name: m.name,
              dosage: m.dosage || 'See transcript',
              frequency: m.frequency || 'See transcript',
              mentions: m.mentions
            }))
          },
          followups_json: {
            tasks: followups
          },
          extracted_entities_summary: {
            all_medications: medications.map(m => m.name),
            all_symptoms: Array.from(allSymptoms),
            all_procedures: Array.from(allProcedures),
            all_vitals: allVitals.map(v => ({
              type: v.type,
              value: v.value
            }))
          },
          created_at: new Date().toISOString()
        }
      })

      // Audit log
      await esClient.index({
        index: INDICES.AUDIT_ACTIONS,
        document: {
          visit_id: visitId,
          patient_id: visit.patientId,
          actor_id: session.user.id,
          actor_role: 'clinician',
          action_type: 'visit_finalized',
          action_description: 'Visit finalized and artifacts generated',
          payload_json: {
            medication_count: medications.length,
            symptom_count: allSymptoms.size,
            chunk_count: chunks.length
          },
          created_at: new Date().toISOString()
        }
      })

      await esClient.indices.refresh({ index: INDICES.VISIT_ARTIFACTS })
      await esClient.indices.refresh({ index: INDICES.AUDIT_ACTIONS })
    } catch {
      console.warn('ES not available — skipping artifact indexing')
    }

    // Update visit status
    await prisma.visit.update({
      where: { id: visitId },
      data: {
        status: 'finalized',
        finalizedAt: new Date()
      }
    })

    // Create share link
    let shareLink = await prisma.shareLink.findFirst({
      where: { visitId }
    })

    if (!shareLink) {
      const token = generateShareToken()
      shareLink = await prisma.shareLink.create({
        data: {
          visitId,
          patientId: visit.patientId,
          token
        }
      })
    }

    return NextResponse.json({
      success: true,
      shareLink: shareLink.token,
      artifacts: {
        afterVisitSummary,
        soapDraft,
        medications: medications.length,
        symptoms: allSymptoms.size
      }
    })

  } catch (error) {
    console.error('Finalize visit error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function generateAfterVisitSummary(
  chunks: TranscriptChunk[],
  medications: MedicationSummary[],
  symptoms: string[]
) {
  const patientStatements = chunks
    .filter((c) => c.speaker === 'patient')
    .slice(0, 3)
    .map((c) => c.text)

  return `# Your Visit Summary

## What We Discussed
${patientStatements.map((s: string) => `- ${s}`).join('\n')}

## Medications Prescribed
${medications.length > 0
  ? medications.map((m) => `- **${m.name}** ${m.dosage || ''} ${m.frequency || ''}`).join('\n')
  : '- No new medications prescribed'}

## Symptoms Discussed
${symptoms.length > 0
  ? symptoms.map((s: string) => `- ${s}`).join('\n')
  : '- No specific symptoms documented'}

## Important Notes
- Take all medications as prescribed
- Monitor your symptoms
- Contact the office if symptoms worsen or you have concerns

## Next Steps
- Follow up as scheduled
- Complete any recommended tests
- Keep track of your blood pressure/symptoms as discussed`
}

function generateSOAPNote(
  chunks: TranscriptChunk[],
  medications: MedicationSummary[],
  symptoms: string[],
  vitals: VitalSummary[]
) {
  const subjective = chunks
    .filter((c) => c.speaker === 'patient')
    .slice(0, 5)
    .map((c) => c.text)
    .join(' ')

  const objective = [
    vitals.length > 0 ? `Vitals: ${vitals.map((v) => `${v.type}: ${v.value}`).join(', ')}` : '',
    symptoms.length > 0 ? `Symptoms: ${symptoms.join(', ')}` : ''
  ].filter(Boolean).join('\n')

  return `# SOAP Note (Draft)

## S (Subjective)
${subjective}

## O (Objective)
${objective}

Physical examination findings: [To be completed by clinician]

## A (Assessment)
Chief complaint: ${symptoms[0] || 'Follow-up visit'}
${symptoms.length > 1 ? `Additional concerns: ${symptoms.slice(1).join(', ')}` : ''}

## P (Plan)
${medications.length > 0 ? `**Medications:**\n${medications.map((m) => `- ${m.name} ${m.dosage || ''} ${m.frequency || ''}`).join('\n')}` : ''}

**Follow-up:** As discussed with patient

**Patient Education:** Medication instructions provided, warning signs reviewed

_Note: This is a draft. Please review and complete before finalizing._`
}

function extractFollowups(chunks: TranscriptChunk[]) {
  const followupKeywords = [
    'follow up', 'follow-up', 'come back', 'return', 
    'schedule', 'appointment', 'blood test', 'blood work',
    'next week', 'two weeks', 'next visit'
  ]

  const followups: FollowupItem[] = []

  chunks.forEach((chunk) => {
    const lower = chunk.text.toLowerCase()
    const hasFollowup = followupKeywords.some(kw => lower.includes(kw))
    
    if (hasFollowup) {
      const timeMatch = chunk.text.match(/(next week|two weeks|in \d+ (days?|weeks?|months?))/i)
      
      followups.push({
        task: chunk.text,
        timestamp_ms: chunk.start_ms,
        priority: lower.includes('urgent') || lower.includes('immediately') ? 'high' : 'medium',
        timing: timeMatch ? timeMatch[0] : 'Not specified'
      })
    }
  })

  return followups
}

function generateShareToken() {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15)
}
