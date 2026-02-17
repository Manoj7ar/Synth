import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

type AssistantRequestMessage = {
  role: 'user' | 'assistant'
  content: string
}

type AssistantRequestBody = {
  message?: string
  currentPath?: string
  history?: AssistantRequestMessage[]
}

type ClinicianRecord = {
  visitId: string
  patientName: string
  summary: string
  soapNotes: string
  updatedAt: Date
}

type ClinicianAppointment = {
  id: string
  visitId: string
  patientName: string
  title: string
  scheduledFor: Date
  notes: string
}

type ClinicianPlanItem = {
  id: string
  visitId: string
  patientName: string
  title: string
  details: string
  dueAt: Date | null
  status: string
}

type NavigationIntent = {
  href: string
  label: string
  reason: string
  patientName?: string
}

function normalizeText(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9\s']/g, ' ')
}

function includesAny(haystack: string, needles: string[]): boolean {
  return needles.some((needle) => haystack.includes(needle))
}

function findBestPatientMatch(message: string, records: ClinicianRecord[]): ClinicianRecord | null {
  const normalizedMessage = normalizeText(message)
  let best: { record: ClinicianRecord; score: number } | null = null

  for (const record of records) {
    const normalizedName = normalizeText(record.patientName).trim()
    const firstName = normalizedName.split(' ')[0]
    let score = 0

    if (normalizedName && normalizedMessage.includes(normalizedName)) {
      score += 10
    }
    if (firstName && firstName.length > 2 && normalizedMessage.includes(firstName)) {
      score += 5
    }
    if (
      firstName &&
      firstName.length > 2 &&
      normalizedMessage.includes(`${firstName}'s`) &&
      score < 10
    ) {
      score += 7
    }

    if (!best || score > best.score) {
      best = { record, score }
    }
  }

  if (!best || best.score === 0) {
    return null
  }

  return best.record
}

function detectNavigationIntent(message: string, records: ClinicianRecord[]): NavigationIntent | null {
  const normalized = normalizeText(message)
  const wantsNavigation = includesAny(normalized, [
    'open',
    'go to',
    'take me to',
    'show me',
    'navigate',
    'bring me',
    'head to',
    'move to',
  ])

  const wantsNotes = includesAny(normalized, ['soap', 'note', 'notes', 'record', 'records'])
  const patientMatch = findBestPatientMatch(message, records)

  if (wantsNavigation && patientMatch && wantsNotes) {
    return {
      href: `/soap-notes/${patientMatch.visitId}`,
      label: `${patientMatch.patientName}'s SOAP notes`,
      reason: 'patient_notes',
      patientName: patientMatch.patientName,
    }
  }

  if (wantsNavigation && patientMatch) {
    return {
      href: `/soap-notes/${patientMatch.visitId}`,
      label: `${patientMatch.patientName}'s SOAP notes`,
      reason: 'patient_notes',
      patientName: patientMatch.patientName,
    }
  }

  if (includesAny(normalized, ['transcribe', 'recording', 'record'])) {
    return { href: '/transcribe', label: 'Transcribe', reason: 'transcribe' }
  }
  if (includesAny(normalized, ['soap notes', 'soap list', 'saved records', 'patient records'])) {
    return { href: '/soap-notes', label: 'SOAP Notes', reason: 'soap_notes' }
  }
  if (includesAny(normalized, ['ai chat', 'chat page', 'clinician'])) {
    return { href: '/clinician', label: 'AI Chat', reason: 'ai_chat' }
  }
  if (includesAny(normalized, ['how it works', 'guide', 'walkthrough'])) {
    return { href: '/how-it-works', label: 'How It Works', reason: 'how_it_works' }
  }
  if (includesAny(normalized, ['technology', 'tech stack', 'architecture', 'security page'])) {
    return { href: '/technology', label: 'Technology', reason: 'technology' }
  }
  if (includesAny(normalized, ['sign out', 'log out', 'logout'])) {
    return { href: '/signout', label: 'Sign Out', reason: 'sign_out' }
  }
  if (includesAny(normalized, ['login', 'log in'])) {
    return { href: '/login', label: 'Login', reason: 'login' }
  }
  if (includesAny(normalized, ['home page', 'landing page'])) {
    return { href: '/', label: 'Home', reason: 'home' }
  }

  return null
}

function buildRecordsContext(records: ClinicianRecord[]): string {
  if (records.length === 0) {
    return 'No patient SOAP records are available for this clinician yet.'
  }

  return records
    .slice(0, 15)
    .map((record, index) => {
      const summaryPreview = record.summary.replace(/\s+/g, ' ').slice(0, 180)
      return `${index + 1}. ${record.patientName} | visitId=${record.visitId} | updated=${record.updatedAt.toISOString()} | summary=${summaryPreview}`
    })
    .join('\n')
}

function buildAppointmentsContext(appointments: ClinicianAppointment[]): string {
  if (appointments.length === 0) {
    return 'No appointments are currently saved.'
  }

  return appointments
    .slice(0, 20)
    .map(
      (appointment, index) =>
        `${index + 1}. ${appointment.patientName} | visitId=${appointment.visitId} | title=${appointment.title} | scheduled=${appointment.scheduledFor.toISOString()} | notes=${appointment.notes || 'none'}`
    )
    .join('\n')
}

function findNextAppointmentForPatient(
  matchedPatient: ClinicianRecord | null,
  appointments: ClinicianAppointment[]
): ClinicianAppointment | null {
  if (!matchedPatient) return null

  const now = Date.now()
  const upcoming = appointments
    .filter(
      (appointment) =>
        appointment.visitId === matchedPatient.visitId &&
        appointment.scheduledFor.getTime() >= now
    )
    .sort((a, b) => a.scheduledFor.getTime() - b.scheduledFor.getTime())

  return upcoming[0] ?? null
}

function buildPlanContext(planItems: ClinicianPlanItem[]): string {
  if (planItems.length === 0) {
    return 'No care plan items are currently saved.'
  }

  return planItems
    .slice(0, 25)
    .map(
      (item, index) =>
        `${index + 1}. ${item.patientName} | visitId=${item.visitId} | title=${item.title} | due=${item.dueAt ? item.dueAt.toISOString() : 'none'} | status=${item.status} | details=${item.details || 'none'}`
    )
    .join('\n')
}

function findPlanItemsForPatient(
  matchedPatient: ClinicianRecord | null,
  planItems: ClinicianPlanItem[]
): ClinicianPlanItem[] {
  if (!matchedPatient) return []
  return planItems.filter((item) => item.visitId === matchedPatient.visitId)
}

function buildFallbackResponse(
  message: string,
  navigationIntent: NavigationIntent | null,
  matchedPatient: ClinicianRecord | null,
  sessionRole: string | undefined,
  nextAppointment: ClinicianAppointment | null,
  patientPlanItems: ClinicianPlanItem[]
): string {
  const normalized = normalizeText(message)

  if (navigationIntent) {
    return `Opening ${navigationIntent.label}.`
  }

  if (sessionRole !== 'clinician') {
      return `I can help with app navigation. Try: "Open transcribe", "Open SOAP notes", or "Open technology".`
  }

  if (
    includesAny(normalized, ['next appointment', 'when is', 'when is sarah', 'appointment']) &&
    nextAppointment
  ) {
    return `${nextAppointment.patientName}'s next appointment is ${nextAppointment.title} on ${nextAppointment.scheduledFor.toLocaleString()}.`
  }

  if (includesAny(normalized, ['next appointment', 'appointment']) && matchedPatient) {
    return `I do not see an upcoming appointment saved yet for ${matchedPatient.patientName}.`
  }

  if (includesAny(normalized, ['care plan', 'plan items', 'plan']) && matchedPatient) {
    if (patientPlanItems.length === 0) {
      return `There are no saved care plan items yet for ${matchedPatient.patientName}.`
    }
    const pending = patientPlanItems.filter((item) => item.status !== 'completed').length
    return `${matchedPatient.patientName} has ${patientPlanItems.length} care plan items, with ${pending} still pending.`
  }

  if (matchedPatient) {
    return `${matchedPatient.patientName} has a saved record. You can ask me to open it by saying "open ${matchedPatient.patientName}'s notes".`
  }

  return `I can help with patient notes and app navigation. Try: "Open Sarah's notes", "Open transcribe", or "Open technology".`
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const body = (await req.json()) as AssistantRequestBody
    const message = body.message?.trim()

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    let records: ClinicianRecord[] = []
    let appointments: ClinicianAppointment[] = []
    let planItems: ClinicianPlanItem[] = []
    if (session?.user.role === 'clinician') {
      const docs = await prisma.visitDocumentation.findMany({
        where: {
          visit: {
            clinicianId: session.user.id,
          },
        },
        select: {
          visitId: true,
          summary: true,
          soapNotes: true,
          updatedAt: true,
          visit: {
            select: {
              patient: {
                select: {
                  displayName: true,
                },
              },
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
        take: 40,
      })

      records = docs.map((doc) => ({
        visitId: doc.visitId,
        patientName: doc.visit.patient.displayName,
        summary: doc.summary,
        soapNotes: doc.soapNotes,
        updatedAt: doc.updatedAt,
      }))

      const appointmentRows = await prisma.appointment.findMany({
        where: { clinicianId: session.user.id },
        orderBy: { scheduledFor: 'asc' },
        take: 80,
        select: {
          id: true,
          visitId: true,
          title: true,
          scheduledFor: true,
          notes: true,
          visit: {
            select: {
              patient: {
                select: {
                  displayName: true,
                },
              },
            },
          },
        },
      })

      appointments = appointmentRows.map((row) => ({
        id: row.id,
        visitId: row.visitId,
        patientName: row.visit.patient.displayName,
        title: row.title,
        scheduledFor: row.scheduledFor,
        notes: row.notes ?? '',
      }))

      const planRows = await prisma.carePlanItem.findMany({
        where: { clinicianId: session.user.id },
        orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
        take: 100,
        select: {
          id: true,
          visitId: true,
          title: true,
          details: true,
          dueAt: true,
          status: true,
          visit: {
            select: {
              patient: {
                select: {
                  displayName: true,
                },
              },
            },
          },
        },
      })

      planItems = planRows.map((row) => ({
        id: row.id,
        visitId: row.visitId,
        patientName: row.visit.patient.displayName,
        title: row.title,
        details: row.details ?? '',
        dueAt: row.dueAt,
        status: row.status,
      }))
    }

    const navigationIntent = detectNavigationIntent(message, records)
    const matchedPatient = findBestPatientMatch(message, records)
    const nextAppointment = findNextAppointmentForPatient(matchedPatient, appointments)
    const patientPlanItems = findPlanItemsForPatient(matchedPatient, planItems)
    const history = (body.history ?? []).slice(-8)
    const recordsContext = buildRecordsContext(records)
    const appointmentsContext = buildAppointmentsContext(appointments)
    const plansContext = buildPlanContext(planItems)
    const matchedPatientContext = matchedPatient
      ? `Matched patient: ${matchedPatient.patientName}
Latest summary: ${matchedPatient.summary.slice(0, 700)}
Latest SOAP notes excerpt: ${matchedPatient.soapNotes.slice(0, 700)}`
      : 'Matched patient: none'
    const matchedPatientAppointmentContext = nextAppointment
      ? `Matched patient next appointment: ${nextAppointment.title} on ${nextAppointment.scheduledFor.toISOString()}`
      : 'Matched patient next appointment: none'

    let answer = ''

    try {
      const { getGeminiModel } = await import('@/lib/gemini')
      const model = getGeminiModel('gemini-2.0-flash')
      const prompt = `You are Synth Assist, a concise in-app assistant for a medical AI app.
You help with:
1) App navigation.
2) Basic app usage questions.
3) Patient-specific guidance only from provided records.

Rules:
- Never invent patient details not in provided context.
- Keep responses short and direct.
- If a navigation action is provided, confirm it in one sentence.
- If user is not authenticated clinician, only provide general app guidance.

Current route: ${body.currentPath ?? 'unknown'}
Session role: ${session?.user.role ?? 'guest'}

Resolved navigation action:
${navigationIntent ? `${navigationIntent.label} -> ${navigationIntent.href}` : 'none'}

Clinician records:
${recordsContext}

Appointments:
${appointmentsContext}

Care plan items:
${plansContext}

${matchedPatientContext}
${matchedPatientAppointmentContext}

Recent conversation:
${history.map((item) => `${item.role}: ${item.content}`).join('\n') || 'none'}

User message:
${message}

Respond with plain text only.`

      const result = await model.generateContent(prompt)
      answer = result.response.text().trim()
    } catch {
      answer = buildFallbackResponse(
        message,
        navigationIntent,
        matchedPatient,
        session?.user.role,
        nextAppointment,
        patientPlanItems
      )
    }

    if (!answer) {
      answer = buildFallbackResponse(
        message,
        navigationIntent,
        matchedPatient,
        session?.user.role,
        nextAppointment,
        patientPlanItems
      )
    }

    return NextResponse.json({
      answer,
      navigateTo: navigationIntent?.href ?? null,
      navigationLabel: navigationIntent?.label ?? null,
      matchedPatient: navigationIntent?.patientName ?? matchedPatient?.patientName ?? null,
      poweredBy: 'Gemini',
    })
  } catch (error) {
    console.error('Assistant API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
