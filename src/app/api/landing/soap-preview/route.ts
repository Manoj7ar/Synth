import { NextRequest, NextResponse } from 'next/server'
import { getGeminiModel, isGeminiConfigured } from '@/lib/gemini'
import {
  deriveChiefComplaint,
  generateConversationSummary,
  generateSoapNotesFromTranscript,
  type TranscriptSegment,
  type TranscriptSpeaker,
} from '@/lib/clinical-notes'

function inferSpeakerFromText(text: string, previousSpeaker: TranscriptSpeaker): TranscriptSpeaker {
  const normalized = text.toLowerCase()

  const clinicianHints = [
    'i recommend',
    'i am going to',
    "i'm going to",
    'your blood pressure',
    'we should',
    'we will',
    'follow up',
    'prescribe',
    'let us',
    "let's",
    'take this medication',
  ]

  const patientHints = [
    'i feel',
    "i've",
    'i have',
    'my pain',
    'my symptoms',
    'it hurts',
    'i noticed',
    'i am having',
    "i'm having",
  ]

  const clinicianScore = clinicianHints.reduce(
    (score, hint) => score + (normalized.includes(hint) ? 1 : 0),
    0
  )
  const patientScore = patientHints.reduce(
    (score, hint) => score + (normalized.includes(hint) ? 1 : 0),
    0
  )

  if (clinicianScore > patientScore) return 'clinician'
  if (patientScore > clinicianScore) return 'patient'

  return previousSpeaker === 'clinician' ? 'patient' : 'clinician'
}

function sanitizeSegments(input: TranscriptSegment[]): TranscriptSegment[] {
  let cursorMs = 0

  return input
    .map((segment) => {
      const text = segment.text.trim()
      if (!text) return null

      const start = Number.isFinite(segment.start_ms) ? Math.max(0, segment.start_ms) : cursorMs
      const estimatedDuration = Math.max(1500, Math.min(15000, text.length * 65))
      const endCandidate = Number.isFinite(segment.end_ms)
        ? Math.max(start + 500, segment.end_ms)
        : start + estimatedDuration
      const end = Math.max(start + 500, endCandidate)

      cursorMs = end

      return {
        speaker: segment.speaker === 'clinician' ? 'clinician' : 'patient',
        start_ms: start,
        end_ms: end,
        text,
      } satisfies TranscriptSegment
    })
    .filter((segment): segment is TranscriptSegment => Boolean(segment))
}

function parseStructuredTranscriptArray(raw: string): TranscriptSegment[] {
  try {
    const match = raw.match(/\[[\s\S]*\]/)
    if (!match) return []

    const parsed = JSON.parse(match[0]) as Array<{
      speaker?: string
      start_ms?: number
      end_ms?: number
      text?: string
    }>
    if (!Array.isArray(parsed)) return []

    return sanitizeSegments(
      parsed
        .map((item) => {
          const text = typeof item.text === 'string' ? item.text : ''
          if (!text.trim()) return null

          const speaker: TranscriptSpeaker =
            item.speaker === 'clinician' || item.speaker === 'patient'
              ? item.speaker
              : 'patient'

          return {
            speaker,
            start_ms: typeof item.start_ms === 'number' ? item.start_ms : 0,
            end_ms: typeof item.end_ms === 'number' ? item.end_ms : 0,
            text,
          } satisfies TranscriptSegment
        })
        .filter((segment): segment is TranscriptSegment => Boolean(segment))
    )
  } catch {
    return []
  }
}

function splitLongTextToLines(text: string): string[] {
  const normalized = text.replace(/\r\n/g, '\n').trim()
  if (!normalized) return []

  const byLine = normalized
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  if (byLine.length > 1) return byLine

  return normalized
    .split(/(?<=[.!?])\s+/)
    .map((line) => line.trim())
    .filter(Boolean)
}

function parseTranscriptText(rawText: string): TranscriptSegment[] {
  const structured = parseStructuredTranscriptArray(rawText)
  if (structured.length > 0) return structured

  const lines = splitLongTextToLines(rawText)
  const segments: TranscriptSegment[] = []
  let previousSpeaker: TranscriptSpeaker = 'patient'
  let currentMs = 0

  for (const originalLine of lines) {
    let line = originalLine
      .replace(/^\[?\d{1,2}:\d{2}(?::\d{2})?\]?\s*/, '')
      .replace(/^\(?\d{1,2}:\d{2}(?::\d{2})?\)?\s*/, '')
      .trim()

    if (!line) continue

    let speaker: TranscriptSpeaker | null = null
    const speakerMatch = line.match(
      /^(doctor|dr\.?|clinician|provider|patient|pt)\s*:\s*(.+)$/i
    )
    if (speakerMatch) {
      speaker = /^(doctor|dr\.?|clinician|provider)$/i.test(speakerMatch[1])
        ? 'clinician'
        : 'patient'
      line = speakerMatch[2].trim()
    }

    if (!line) continue

    const resolvedSpeaker: TranscriptSpeaker =
      speaker ?? inferSpeakerFromText(line, previousSpeaker)
    previousSpeaker = resolvedSpeaker

    const durationMs = Math.max(1500, Math.min(15000, line.split(/\s+/).length * 500))
    segments.push({
      speaker: resolvedSpeaker,
      start_ms: currentMs,
      end_ms: currentMs + durationMs,
      text: line,
    })
    currentMs += durationMs
  }

  return sanitizeSegments(segments)
}

function parseGeminiTranscript(raw: string): TranscriptSegment[] {
  const structured = parseStructuredTranscriptArray(raw)
  if (structured.length > 0) return structured
  return parseTranscriptText(raw)
}

async function transcribeAudioWithGemini(audioFile: File): Promise<TranscriptSegment[]> {
  const model = getGeminiModel('gemini-2.0-flash')
  const audioBytes = Buffer.from(await audioFile.arrayBuffer())
  const base64Audio = audioBytes.toString('base64')
  const mimeType = audioFile.type.startsWith('audio/') ? audioFile.type : 'audio/webm'

  const result = await model.generateContent([
    {
      inlineData: {
        mimeType,
        data: base64Audio,
      },
    },
    {
      text: `You are a medical transcription assistant. Transcribe this audio of a doctor-patient visit.

Return ONLY a JSON array. Each item must include:
- speaker: "clinician" or "patient"
- start_ms: number
- end_ms: number
- text: string

Infer speaker roles from clinical context. Estimate timestamps if exact timing is unavailable. Do not invent content.`,
    },
  ])

  return parseGeminiTranscript(result.response.text())
}

async function readTranscriptTextFromForm(formData: FormData): Promise<string> {
  const transcriptText = formData.get('transcriptText')
  if (typeof transcriptText === 'string' && transcriptText.trim()) {
    return transcriptText.trim()
  }

  const transcriptFile = formData.get('transcriptFile')
  if (transcriptFile instanceof File) {
    return (await transcriptFile.text()).trim()
  }

  return ''
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const modeValue = formData.get('mode')
    const mode = modeValue === 'audio' ? 'audio' : 'transcript'

    let transcript: TranscriptSegment[] = []

    if (mode === 'audio') {
      const audioFile = formData.get('audio')
      if (!(audioFile instanceof File)) {
        return NextResponse.json({ error: 'Please attach an audio file.' }, { status: 400 })
      }

      if (!isGeminiConfigured()) {
        return NextResponse.json(
          { error: 'Audio transcription requires GEMINI_API_KEY on the server.' },
          { status: 503 }
        )
      }

      transcript = await transcribeAudioWithGemini(audioFile)
    } else {
      const rawTranscript = await readTranscriptTextFromForm(formData)
      if (!rawTranscript) {
        return NextResponse.json(
          { error: 'Paste a transcript or attach a transcript file.' },
          { status: 400 }
        )
      }

      transcript = parseTranscriptText(rawTranscript)
    }

    if (transcript.length === 0) {
      return NextResponse.json(
        { error: 'Could not parse usable transcript content from the provided input.' },
        { status: 400 }
      )
    }

    const [summary, soapNotes] = await Promise.all([
      generateConversationSummary(transcript),
      generateSoapNotesFromTranscript(transcript),
    ])

    return NextResponse.json({
      success: true,
      transcript,
      summary,
      soapNotes,
      chiefComplaint: deriveChiefComplaint(transcript),
    })
  } catch (error) {
    console.error('Landing SOAP preview error:', error)
    const message = error instanceof Error ? error.message : 'Unable to generate SOAP preview'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
