import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getGeminiModel } from '@/lib/gemini'

type SpeakerRole = 'clinician' | 'patient'

interface TranscriptSegment {
  speaker: SpeakerRole
  start_ms: number
  end_ms: number
  text: string
}

function inferSpeakerFromText(text: string, previousSpeaker: SpeakerRole): SpeakerRole {
  const normalized = text.toLowerCase()

  const clinicianHints = [
    'i recommend',
    'i am going to',
    "i'm going to",
    'take this medication',
    'your blood pressure',
    'we should',
    'we will',
    'follow up',
    'prescribe',
    'let us',
    "let's",
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

function parseGeminiTranscript(raw: string): TranscriptSegment[] {
  const segments: TranscriptSegment[] = []
  let previousSpeaker: SpeakerRole = 'patient'

  // Try to parse structured JSON from Gemini response
  try {
    // Look for a JSON array in the response
    const jsonMatch = raw.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as Array<{
        speaker?: string
        start_ms?: number
        end_ms?: number
        text?: string
      }>
      if (Array.isArray(parsed) && parsed.length > 0) {
        for (const item of parsed) {
          const text = (item.text ?? '').trim()
          if (!text) continue
          const speaker: SpeakerRole =
            item.speaker === 'clinician' || item.speaker === 'patient'
              ? item.speaker
              : inferSpeakerFromText(text, previousSpeaker)
          previousSpeaker = speaker
          segments.push({
            speaker,
            start_ms: typeof item.start_ms === 'number' ? item.start_ms : 0,
            end_ms: typeof item.end_ms === 'number' ? item.end_ms : 0,
            text,
          })
        }
        return segments
      }
    }
  } catch {
    // JSON parse failed — fall through to line-based parsing
  }

  // Fallback: split by lines / paragraphs and infer speakers
  const lines = raw
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)

  let currentMs = 0
  for (const line of lines) {
    // Strip common prefixes like "Doctor:", "Patient:", "Clinician:", etc.
    const prefixMatch = line.match(
      /^(?:(?:doctor|clinician|dr\.?)\s*:|(?:patient)\s*:)\s*/i
    )
    let text = line
    let speaker: SpeakerRole

    if (prefixMatch) {
      text = line.slice(prefixMatch[0].length).trim()
      speaker = /doctor|clinician|dr/i.test(prefixMatch[0]) ? 'clinician' : 'patient'
    } else {
      speaker = inferSpeakerFromText(text, previousSpeaker)
    }

    if (!text) continue

    previousSpeaker = speaker
    const durationMs = Math.max(2000, text.length * 60) // rough estimate
    segments.push({
      speaker,
      start_ms: currentMs,
      end_ms: currentMs + durationMs,
      text,
    })
    currentMs += durationMs
  }

  return segments
}

async function transcribeWithGemini(audioFile: File): Promise<{
  transcript: TranscriptSegment[]
  duration_ms: number
}> {
  const model = getGeminiModel('gemini-2.0-flash')

  const audioBytes = Buffer.from(await audioFile.arrayBuffer())
  const base64Audio = audioBytes.toString('base64')

  // Determine MIME type
  let mimeType = audioFile.type || 'audio/webm'
  if (!mimeType.startsWith('audio/')) {
    mimeType = 'audio/webm'
  }

  const result = await model.generateContent([
    {
      inlineData: {
        mimeType,
        data: base64Audio,
      },
    },
    {
      text: `You are a medical transcription assistant. Transcribe this audio recording of a doctor-patient conversation.

Return ONLY a JSON array with no other text. Each element should have:
- "speaker": either "clinician" or "patient"
- "start_ms": approximate start time in milliseconds
- "end_ms": approximate end time in milliseconds  
- "text": the spoken text

Infer who is speaking based on context (medical instructions = clinician, symptoms/complaints = patient).
If you cannot determine timestamps, estimate them based on speech duration.
Do not fabricate or invent transcript lines. Only return content actually present in the audio.`,
    },
  ])

  const responseText = result.response.text()
  const transcript = parseGeminiTranscript(responseText)
  const duration_ms =
    transcript.length > 0 ? Math.max(...transcript.map((s) => s.end_ms)) : 0

  return { transcript, duration_ms }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await req.formData()
    const audioFile = formData.get('audio')

    if (!(audioFile instanceof File)) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 })
    }

    const result = await transcribeWithGemini(audioFile)
    return NextResponse.json({
      success: true,
      transcript: result.transcript,
      duration_ms: result.duration_ms,
    })
  } catch (error) {
    console.error('Transcribe error:', error)
    const message = error instanceof Error ? error.message : 'Transcription failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
