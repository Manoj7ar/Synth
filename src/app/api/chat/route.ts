import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getGeminiModel } from '@/lib/gemini'
import { prisma } from '@/lib/prisma'
import type { TranscriptSegment } from '@/lib/clinical-notes'

type ChatAccessRole = 'clinician' | 'patient'

type ChatRequestBody = {
  message?: string
  conversationId?: string | null
  patientId?: string
  visitId?: string
  agentId?: string
  shareToken?: string
}

interface VisitContext {
  patientName: string
  transcriptText: string
  summary: string
  soapNotes: string
  additionalNotes: string
  appointments: Array<{ title: string; scheduledFor: Date; notes: string }>
  planItems: Array<{ title: string; details: string; dueAt: Date | null; status: string }>
  bpHistory: BloodPressurePoint[]
}

interface BloodPressurePoint {
  visitId: string
  visitDate: Date
  label: string
  systolic: number
  diastolic: number
  source: 'Summary' | 'SOAP' | 'Transcript'
  timestamp?: string
  excerpt: string
}

interface MessageCitation {
  source: string
  timestamp?: string
  excerpt: string
}

interface MessageSourceDetail {
  source: string
  visitDate?: string
  timestamp?: string
  excerpt: string
}

interface ChatVisualizationPoint {
  label: string
  visitDate: string
  systolic: number
  diastolic: number
}

interface ChatVisualizationPayload {
  type: 'bp_trend'
  title: string
  description?: string
  data: ChatVisualizationPoint[]
}

type ChatToolEvent =
  | { type: 'tool_call'; tool: string; params?: Record<string, unknown> }
  | { type: 'tool_result'; result: Record<string, unknown> }

type StreamPayload = {
  conversation_id: string
  response: string
  tool_events?: ChatToolEvent[]
  citations?: MessageCitation[]
  source_details?: MessageSourceDetail[]
  visualization?: ChatVisualizationPayload
}

const BP_LABELED_REGEX = /(?:blood pressure|\bbp\b)[^0-9]{0,20}(\d{2,3})\s*(?:\/|over)\s*(\d{2,3})/gi
const BP_GENERIC_REGEX = /(\d{2,3})\s*(?:\/|over)\s*(\d{2,3})/gi

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const body = (await req.json()) as ChatRequestBody
    const {
      message,
      conversationId,
      patientId,
      visitId,
      shareToken,
      agentId = 'synth_patient_agent',
    } = body

    if (!message || !patientId || !visitId) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const access = await resolveAccess({
      session,
      shareToken: shareToken ?? null,
      patientId,
      visitId,
    })

    if (!access.allowed) {
      return new Response(JSON.stringify({ error: access.reason }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const kibanaUrl = process.env.KIBANA_URL
    const kibanaApiKey = process.env.KIBANA_API_KEY

    if (access.role === 'clinician' && kibanaUrl && kibanaApiKey) {
      try {
        const kibanaSpace = process.env.KIBANA_SPACE_ID || 'default'
        const baseURL = kibanaSpace === 'default' ? kibanaUrl : `${kibanaUrl}/s/${kibanaSpace}`

        const response = await fetch(`${baseURL}/api/agent_builder/converse/async`, {
          method: 'POST',
          headers: {
            Authorization: `ApiKey ${kibanaApiKey}`,
            'kbn-xsrf': 'true',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            agent_id: agentId,
            conversation_id: conversationId || undefined,
            input: message,
            configuration_overrides: {
              instructions: `Runtime context: You are responding to a clinician about visit ${visitId}. Patient ID: ${patientId}. Visit ID: ${visitId}.`,
            },
            capabilities: { visualizations: true },
          }),
        })

        if (response.ok) {
          const data = (await response.json()) as StreamPayload
          return streamResponse(data, conversationId ?? null)
        }
      } catch {
        // Fall back to Gemini.
      }
    }

    const geminiResponse = await generateGeminiResponse({
      message,
      visitId,
      role: access.role,
    })

    return streamResponse(
      {
        conversation_id: conversationId || `gemini-conv-${Date.now()}`,
        response: geminiResponse.text,
        tool_events: geminiResponse.toolEvents,
        citations: geminiResponse.citations,
        source_details: geminiResponse.sourceDetails,
        visualization: geminiResponse.visualization,
      },
      conversationId ?? null
    )
  } catch (error) {
    console.error('Chat error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

async function resolveAccess({
  session,
  shareToken,
  patientId,
  visitId,
}: {
  session: { user?: { role?: string; id?: string } } | null
  shareToken: string | null
  patientId: string
  visitId: string
}): Promise<{ allowed: true; role: ChatAccessRole } | { allowed: false; reason: string }> {
  if (session?.user?.role === 'clinician') {
    const visit = await prisma.visit.findUnique({
      where: { id: visitId },
      select: { clinicianId: true, patientId: true },
    })

    if (!visit || visit.clinicianId !== session.user.id || visit.patientId !== patientId) {
      return { allowed: false, reason: 'Unauthorized visit access' }
    }
    return { allowed: true, role: 'clinician' }
  }

  if (shareToken) {
    const shareLink = await prisma.shareLink.findUnique({
      where: { token: shareToken },
      select: {
        patientId: true,
        visitId: true,
        revokedAt: true,
        expiresAt: true,
      },
    })

    if (!shareLink || shareLink.revokedAt) {
      return { allowed: false, reason: 'Share link is invalid' }
    }

    if (shareLink.expiresAt && shareLink.expiresAt.getTime() < Date.now()) {
      return { allowed: false, reason: 'Share link has expired' }
    }

    if (shareLink.patientId !== patientId || shareLink.visitId !== visitId) {
      return { allowed: false, reason: 'Share link does not match this visit' }
    }

    return { allowed: true, role: 'patient' }
  }

  return { allowed: false, reason: 'Unauthorized' }
}

async function generateGeminiResponse({
  message,
  visitId,
  role,
}: {
  message: string
  visitId: string
  role: ChatAccessRole
}) {
  const toolEvents: ChatToolEvent[] = []
  toolEvents.push({ type: 'tool_call', tool: 'synth_load_visit_context', params: { visitId } })

  const context = await loadVisitContext(visitId)
  if (!context) {
    toolEvents.push({ type: 'tool_result', result: { error: 'Visit context missing' } })
    return {
      text: 'I could not load this visit context right now. Please try again in a moment.',
      toolEvents,
      citations: [] as MessageCitation[],
      sourceDetails: [] as MessageSourceDetail[],
      visualization: undefined as ChatVisualizationPayload | undefined,
    }
  }

  toolEvents.push({
    type: 'tool_result',
    result: {
      transcript: context.transcriptText ? 'loaded' : 'none',
      hasSummary: Boolean(context.summary),
      appointments: context.appointments.length,
      planItems: context.planItems.length,
      bpPoints: context.bpHistory.length,
    },
  })

  if (!context.transcriptText && !context.summary && !context.soapNotes) {
    return {
      text: "I don't have enough visit information yet. Please ask your clinic to complete the visit documentation.",
      toolEvents,
      citations: [] as MessageCitation[],
      sourceDetails: [] as MessageSourceDetail[],
      visualization: undefined as ChatVisualizationPayload | undefined,
    }
  }

  const appointmentContext =
    context.appointments.length === 0
      ? 'No appointment currently scheduled.'
      : context.appointments
          .map(
            (appointment, index) =>
              `${index + 1}. ${appointment.title} | ${appointment.scheduledFor.toISOString()} | notes: ${appointment.notes || 'none'}`
          )
          .join('\n')

  const planContext =
    context.planItems.length === 0
      ? 'No care plan tasks currently saved.'
      : context.planItems
          .map(
            (item, index) =>
              `${index + 1}. ${item.title} | status: ${item.status} | due: ${
                item.dueAt ? item.dueAt.toISOString() : 'none'
              } | details: ${item.details || 'none'}`
          )
          .join('\n')

  const bpHistoryContext =
    context.bpHistory.length === 0
      ? 'No reliable blood pressure readings found across visits.'
      : context.bpHistory
          .map(
            (point, index) =>
              `${index + 1}. ${point.visitDate.toISOString()} | ${point.systolic}/${point.diastolic} mmHg | source: ${point.source}${
                point.timestamp ? ` ${point.timestamp}` : ''
              } | excerpt: ${point.excerpt}`
          )
          .join('\n')

  const model = getGeminiModel('gemini-2.0-flash')

  const systemPrompt =
    role === 'clinician'
      ? `You are Synth, an AI clinical assistant for clinicians.
Answer using ONLY the provided visit context.
If uncertain, say so directly.
Keep responses concise and clinically grounded.`
      : `You are Synth, a patient-facing AI assistant.
You are grounded in this patient's visit transcript, SOAP notes, summary, appointments, care plan, and blood pressure history.
Rules:
- Use simple language.
- If the question asks about next appointment or care tasks, answer from those sections directly.
- For food/diet/lifestyle questions, first check the visit context. If not explicitly documented, provide conservative general guidance and suggest confirming with the doctor.
- If asked for research or studies, provide high-level general medical guidance and clearly state it is educational, not a diagnosis.
- Do not invent prescriptions, diagnoses, or restrictions.
- Use BLOOD PRESSURE HISTORY if asked to compare or trend BP.
- End your answer with a single line called Sources using short tags like [Transcript 02:10], [SOAP], [Summary], [Appointment], [Plan].`

  const prompt = `${systemPrompt}

Patient: ${context.patientName}

--- VISIT SUMMARY ---
${context.summary || 'No summary available.'}

--- SOAP NOTES ---
${context.soapNotes || 'No SOAP notes available.'}

--- ADDITIONAL NOTES ---
${context.additionalNotes || 'No additional notes.'}

--- APPOINTMENTS ---
${appointmentContext}

--- CARE PLAN ---
${planContext}

--- BLOOD PRESSURE HISTORY ---
${bpHistoryContext}

--- TRANSCRIPT ---
${context.transcriptText || 'No transcript available.'}

User question: ${message}

Respond helpfully and safely.`

  let responseText = ''
  try {
    const result = await model.generateContent(prompt)
    responseText = result.response.text()
  } catch (error) {
    console.error('Gemini generation failed, using deterministic fallback:', error)
    responseText = buildDeterministicFallback(message, context)
  }

  const visualization =
    role === 'patient' ? buildBpVisualizationIfNeeded(message, context.bpHistory) : undefined
  const citations = buildCitationsFromResponse(responseText, context)
  const sourceDetails =
    visualization && visualization.data.length > 0
      ? buildTrendSourceDetails(visualization, context.bpHistory)
      : buildSourceDetailsFromCitations(citations)

  return {
    text: responseText,
    toolEvents,
    citations,
    sourceDetails,
    visualization,
  }
}

async function loadVisitContext(visitId: string): Promise<VisitContext | null> {
  const visit = (await prisma.visit.findUnique({
    where: { id: visitId },
    include: {
      patient: true,
      documentation: true,
      appointments: {
        orderBy: { scheduledFor: 'asc' },
        take: 20,
      },
      carePlanItems: {
        orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
        take: 40,
      },
    },
  })) as
    | {
        id: string
        patientId: string
        patient: { displayName: string }
        documentation: {
          transcriptJson: string
          summary: string
          soapNotes: string
          additionalNotes: string | null
        } | null
        appointments: Array<{
          title: string
          scheduledFor: Date
          notes: string | null
        }>
        carePlanItems: Array<{
          title: string
          details: string | null
          dueAt: Date | null
          status: string
        }>
      }
    | null

  if (!visit) return null

  const transcriptText = toTranscriptText(visit.documentation?.transcriptJson ?? null)

  const patientVisits = await prisma.visit.findMany({
    where: { patientId: visit.patientId },
    include: { documentation: true },
    orderBy: { startedAt: 'desc' },
    take: 10,
  })

  const bpHistory = (patientVisits as Array<{
    id: string
    startedAt: Date
    documentation: {
      summary: string
      soapNotes: string
      transcriptJson: string
    } | null
  }>)
    .map((patientVisit) => extractVisitBloodPressure(patientVisit))
    .filter((point): point is BloodPressurePoint => point !== null)
    .sort((a, b) => a.visitDate.getTime() - b.visitDate.getTime())
    .slice(-6)

  return {
    patientName: visit.patient.displayName,
    transcriptText,
    summary: visit.documentation?.summary ?? '',
    soapNotes: visit.documentation?.soapNotes ?? '',
    additionalNotes: visit.documentation?.additionalNotes ?? '',
    appointments: visit.appointments.map((appointment) => ({
      title: appointment.title,
      scheduledFor: appointment.scheduledFor,
      notes: appointment.notes ?? '',
    })),
    planItems: visit.carePlanItems.map((item) => ({
      title: item.title,
      details: item.details ?? '',
      dueAt: item.dueAt,
      status: item.status,
    })),
    bpHistory,
  }
}

function toTranscriptText(rawTranscriptJson: string | null): string {
  if (!rawTranscriptJson) {
    return ''
  }

  try {
    const segments = JSON.parse(rawTranscriptJson) as TranscriptSegment[]
    if (!Array.isArray(segments)) {
      return ''
    }

    return segments
      .filter(
        (segment) =>
          typeof segment.start_ms === 'number' &&
          typeof segment.text === 'string' &&
          (segment.speaker === 'clinician' || segment.speaker === 'patient')
      )
      .map((segment) => {
        const startSec = Math.floor(segment.start_ms / 1000)
        const mm = Math.floor(startSec / 60)
          .toString()
          .padStart(2, '0')
        const ss = (startSec % 60).toString().padStart(2, '0')
        const label = segment.speaker === 'clinician' ? 'Doctor' : 'Patient'
        return `[${mm}:${ss}] ${label}: ${segment.text}`
      })
      .join('\n')
  } catch {
    return ''
  }
}

function extractVisitBloodPressure(patientVisit: {
  id: string
  startedAt: Date
  documentation: {
    summary: string
    soapNotes: string
    transcriptJson: string
  } | null
}): BloodPressurePoint | null {
  if (!patientVisit.documentation) {
    return null
  }

  const summaryReading = extractReadingFromText(patientVisit.documentation.summary, 'Summary')
  const soapReading = extractReadingFromText(patientVisit.documentation.soapNotes, 'SOAP')
  const transcriptText = toTranscriptText(patientVisit.documentation.transcriptJson)
  const transcriptReading = extractReadingFromTranscript(transcriptText)

  const selected = soapReading ?? summaryReading ?? transcriptReading
  if (!selected) {
    return null
  }

  return {
    visitId: patientVisit.id,
    visitDate: patientVisit.startedAt,
    label: formatShortDate(patientVisit.startedAt),
    systolic: selected.systolic,
    diastolic: selected.diastolic,
    source: selected.source,
    timestamp: 'timestamp' in selected ? selected.timestamp : undefined,
    excerpt: selected.excerpt,
  }
}

function extractReadingFromText(
  text: string,
  source: 'Summary' | 'SOAP'
): { systolic: number; diastolic: number; source: 'Summary' | 'SOAP'; excerpt: string } | null {
  if (!text || !text.trim()) {
    return null
  }

  const labeledMatch = getValidReading(text, BP_LABELED_REGEX)
  if (labeledMatch) {
    return {
      systolic: labeledMatch.systolic,
      diastolic: labeledMatch.diastolic,
      source,
      excerpt: labeledMatch.excerpt,
    }
  }

  const genericMatch = getValidReading(text, BP_GENERIC_REGEX, true)
  if (genericMatch) {
    return {
      systolic: genericMatch.systolic,
      diastolic: genericMatch.diastolic,
      source,
      excerpt: genericMatch.excerpt,
    }
  }

  return null
}

function extractReadingFromTranscript(
  transcript: string
): { systolic: number; diastolic: number; source: 'Transcript'; timestamp?: string; excerpt: string } | null {
  if (!transcript) {
    return null
  }

  const lines = transcript.split('\n')
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const line = lines[index]
    if (!/blood pressure|\bbp\b/i.test(line)) {
      continue
    }

    const match = getValidReading(line, BP_GENERIC_REGEX)
    if (!match) {
      continue
    }

    const timeMatch = line.match(/\[(\d{2}:\d{2})\]/)
    return {
      systolic: match.systolic,
      diastolic: match.diastolic,
      source: 'Transcript',
      timestamp: timeMatch?.[1],
      excerpt: line,
    }
  }

  return null
}

function getValidReading(text: string, regex: RegExp, requireKeywordNear = false) {
  regex.lastIndex = 0
  let match = regex.exec(text)
  while (match) {
    const systolic = Number(match[1])
    const diastolic = Number(match[2])

    if (isValidBloodPressure(systolic, diastolic)) {
      const matchIndex = match.index ?? 0
      if (requireKeywordNear) {
        const windowStart = Math.max(0, matchIndex - 30)
        const windowEnd = Math.min(text.length, matchIndex + (match[0]?.length ?? 0) + 30)
        const localWindow = text.slice(windowStart, windowEnd)
        if (!/blood pressure|\bbp\b|pressure/i.test(localWindow)) {
          match = regex.exec(text)
          continue
        }
      }

      return {
        systolic,
        diastolic,
        excerpt: compactWhitespace(text.slice(Math.max(0, matchIndex - 35), matchIndex + match[0].length + 45)),
      }
    }

    match = regex.exec(text)
  }

  return null
}

function isValidBloodPressure(systolic: number, diastolic: number) {
  return systolic >= 70 && systolic <= 260 && diastolic >= 40 && diastolic <= 160
}

function buildBpVisualizationIfNeeded(
  question: string,
  bpHistory: BloodPressurePoint[]
): ChatVisualizationPayload | undefined {
  if (!shouldVisualizeBloodPressure(question) || bpHistory.length < 2) {
    return undefined
  }

  const points = bpHistory.slice(-6)
  return {
    type: 'bp_trend',
    title: 'Blood pressure across recent visits',
    description: 'Values extracted from your visit notes and transcript history.',
    data: points.map((point) => ({
      label: point.label,
      visitDate: point.visitDate.toISOString(),
      systolic: point.systolic,
      diastolic: point.diastolic,
    })),
  }
}

function shouldVisualizeBloodPressure(question: string) {
  const lower = question.toLowerCase()
  const hasBpIntent =
    lower.includes('blood pressure') ||
    /\bbp\b/.test(lower) ||
    lower.includes('systolic') ||
    lower.includes('diastolic')

  if (!hasBpIntent) {
    return false
  }

  const comparisonIntent =
    lower.includes('compare') ||
    lower.includes('trend') ||
    lower.includes('last') ||
    lower.includes('previous') ||
    lower.includes('over time') ||
    lower.includes('change') ||
    lower.includes('history') ||
    lower.includes('visits') ||
    lower.includes('graph') ||
    lower.includes('chart')

  return comparisonIntent
}

function buildCitationsFromResponse(responseText: string, context: VisitContext): MessageCitation[] {
  const citations: MessageCitation[] = []
  const seen = new Set<string>()

  const tagRegex = /\[(Summary|SOAP|Appointment|Plan)\]/gi
  let match = tagRegex.exec(responseText)
  while (match) {
    const source = match[1]
    const key = `${source.toLowerCase()}`
    if (!seen.has(key)) {
      const excerpt = getSourceExcerpt(source, context)
      if (excerpt) {
        citations.push({ source, excerpt })
        seen.add(key)
      }
    }
    match = tagRegex.exec(responseText)
  }

  const transcriptRegex = /\[Transcript\s+([0-9]{2}:[0-9]{2}(?::[0-9]{2})?)(?:-[0-9]{2}:[0-9]{2}(?::[0-9]{2})?)?\]/gi
  let transcriptMatch = transcriptRegex.exec(responseText)
  while (transcriptMatch) {
    const timestamp = normalizeTimestamp(transcriptMatch[1])
    const key = `transcript-${timestamp}`
    if (!seen.has(key)) {
      const excerpt = getTranscriptExcerpt(context.transcriptText, timestamp)
      if (excerpt) {
        citations.push({ source: 'Transcript', timestamp, excerpt })
        seen.add(key)
      }
    }
    transcriptMatch = transcriptRegex.exec(responseText)
  }

  if (citations.length > 0) {
    return citations.slice(0, 6)
  }

  const fallback: MessageCitation[] = []
  if (context.summary) {
    fallback.push({ source: 'Summary', excerpt: compactWhitespace(context.summary).slice(0, 220) })
  }
  if (context.soapNotes) {
    fallback.push({ source: 'SOAP', excerpt: compactWhitespace(context.soapNotes).slice(0, 220) })
  }
  return fallback.slice(0, 4)
}

function buildSourceDetailsFromCitations(citations: MessageCitation[]): MessageSourceDetail[] {
  return citations.map((citation) => ({
    source: citation.source,
    timestamp: citation.timestamp,
    excerpt: citation.excerpt,
  }))
}

function buildTrendSourceDetails(
  visualization: ChatVisualizationPayload,
  bpHistory: BloodPressurePoint[]
): MessageSourceDetail[] {
  const details: MessageSourceDetail[] = []

  for (const point of visualization.data) {
    const matched = bpHistory.find(
      (historyPoint) =>
        historyPoint.visitDate.toISOString() === point.visitDate &&
        historyPoint.systolic === point.systolic &&
        historyPoint.diastolic === point.diastolic
    )

    if (!matched) {
      continue
    }

    details.push({
      source: matched.source,
      visitDate: formatLongDate(matched.visitDate),
      timestamp: matched.timestamp,
      excerpt: `BP ${matched.systolic}/${matched.diastolic} mmHg. ${compactWhitespace(matched.excerpt)}`,
    })
  }

  return details.slice(0, 6)
}

function getSourceExcerpt(source: string, context: VisitContext): string {
  if (source === 'Summary') {
    return compactWhitespace(context.summary).slice(0, 220)
  }
  if (source === 'SOAP') {
    return compactWhitespace(context.soapNotes).slice(0, 220)
  }
  if (source === 'Appointment') {
    const first = context.appointments[0]
    if (!first) return ''
    return `${first.title} on ${formatLongDate(first.scheduledFor)}${first.notes ? ` - ${compactWhitespace(first.notes)}` : ''}`.slice(0, 220)
  }
  if (source === 'Plan') {
    const first = context.planItems[0]
    if (!first) return ''
    return `${first.title}${first.details ? ` - ${compactWhitespace(first.details)}` : ''}`.slice(0, 220)
  }
  return ''
}

function getTranscriptExcerpt(transcriptText: string, timestamp: string): string {
  if (!transcriptText) return ''

  const lines = transcriptText.split('\n')
  const exact = lines.find((line) => line.startsWith(`[${timestamp}]`))
  if (exact) {
    return compactWhitespace(exact).slice(0, 220)
  }

  const minutePrefix = timestamp.slice(0, 2)
  const near = lines.find((line) => line.startsWith(`[${minutePrefix}:`))
  return near ? compactWhitespace(near).slice(0, 220) : ''
}

function normalizeTimestamp(value: string): string {
  const trimmed = value.trim()
  if (/^\d{2}:\d{2}:\d{2}$/.test(trimmed)) {
    return trimmed.slice(0, 5)
  }
  return trimmed
}

function compactWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

function formatShortDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date)
}

function formatLongDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

function buildDeterministicFallback(question: string, context: VisitContext): string {
  const lower = question.toLowerCase()

  if (shouldVisualizeBloodPressure(question)) {
    if (context.bpHistory.length < 2) {
      return 'I could not find enough blood pressure history to compare your recent visits yet. [Summary] [SOAP]'
    }

    const recent = context.bpHistory.slice(-3)
    const latest = recent[recent.length - 1]
    const previous = recent[recent.length - 2]
    const systolicDelta = latest.systolic - previous.systolic
    const diastolicDelta = latest.diastolic - previous.diastolic
    const systolicWord = systolicDelta === 0 ? 'unchanged' : systolicDelta > 0 ? 'higher' : 'lower'
    const diastolicWord = diastolicDelta === 0 ? 'unchanged' : diastolicDelta > 0 ? 'higher' : 'lower'

    return [
      `From your recent visits, your latest blood pressure was ${latest.systolic}/${latest.diastolic} on ${formatLongDate(latest.visitDate)}.`,
      `Compared with the previous visit (${previous.systolic}/${previous.diastolic}), your systolic is ${Math.abs(systolicDelta)} mmHg ${systolicWord} and your diastolic is ${Math.abs(diastolicDelta)} mmHg ${diastolicWord}.`,
      'I also added a trend graph below so you can see the pattern over visits.',
      'Sources: [SOAP] [Summary] [Transcript 00:00]',
    ].join(' ')
  }

  if (lower.includes('appointment') || lower.includes('next visit')) {
    const next = context.appointments
      .filter((appointment) => appointment.scheduledFor.getTime() >= Date.now())
      .sort((a, b) => a.scheduledFor.getTime() - b.scheduledFor.getTime())[0]

    if (!next) {
      return 'I do not see a future appointment scheduled in your chart yet. [Appointment]'
    }

    return `Your next appointment is "${next.title}" on ${formatLongDate(next.scheduledFor)}. ${next.notes ? `Notes: ${compactWhitespace(next.notes)}.` : ''} [Appointment]`
  }

  if (lower.includes('task') || lower.includes('plan')) {
    const pending = context.planItems.filter((item) => item.status.toLowerCase() === 'pending').slice(0, 3)
    if (pending.length === 0) {
      return 'I do not see pending care plan tasks in your current record. [Plan]'
    }

    const listed = pending
      .map((item, index) => `${index + 1}. ${item.title}${item.details ? ` - ${compactWhitespace(item.details)}` : ''}`)
      .join(' ')
    return `Your pending care tasks are: ${listed} [Plan]`
  }

  return 'I am temporarily rate-limited by the AI service right now, but I can still answer using your visit records if you ask about appointments, care tasks, or blood pressure trends. [Summary] [SOAP]'
}

function streamResponse(data: StreamPayload, existingConversationId: string | null) {
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      try {
        if (data.conversation_id && !existingConversationId) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: 'conversation_id_set',
                conversationId: data.conversation_id,
              })}\n\n`
            )
          )
        }

        if (data.tool_events) {
          for (const event of data.tool_events) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
            await new Promise((resolve) => setTimeout(resolve, 100))
          }
        }

        const words = (data.response || '').split(' ')
        for (const word of words) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: 'message_chunk',
                chunk: word + ' ',
              })}\n\n`
            )
          )
          await new Promise((resolve) => setTimeout(resolve, 30))
        }

        if (
          (data.citations && data.citations.length > 0) ||
          (data.source_details && data.source_details.length > 0) ||
          data.visualization
        ) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: 'message_metadata',
                citations: data.citations ?? [],
                sourceDetails: data.source_details ?? [],
                visualization: data.visualization ?? null,
              })}\n\n`
            )
          )
        }

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'message_complete' })}\n\n`))
        controller.close()
      } catch (error) {
        console.error('Stream error:', error)
        controller.error(error)
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
