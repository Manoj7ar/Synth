import { getGeminiModel } from '@/lib/gemini'

export type TranscriptSpeaker = 'clinician' | 'patient'

export interface TranscriptSegment {
  speaker: TranscriptSpeaker
  start_ms: number
  end_ms: number
  text: string
}

function cleanText(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

function formatTranscriptForPrompt(segments: TranscriptSegment[]): string {
  return segments
    .map((s) => {
      const sec = Math.floor(s.start_ms / 1000)
      const mm = Math.floor(sec / 60).toString().padStart(2, '0')
      const ss = (sec % 60).toString().padStart(2, '0')
      const label = s.speaker === 'clinician' ? 'Doctor' : 'Patient'
      return `[${mm}:${ss}] ${label}: ${s.text}`
    })
    .join('\n')
}

export function deriveChiefComplaint(segments: TranscriptSegment[]): string {
  const patientSegment = segments.find((segment) => segment.speaker === 'patient')
  if (!patientSegment) return 'Follow-up consultation'

  return cleanText(patientSegment.text).slice(0, 140) || 'Follow-up consultation'
}

// ── Gemini-powered generation (preferred) ──────────────────────────────

export async function generateConversationSummary(segments: TranscriptSegment[]): Promise<string> {
  if (segments.length === 0) return 'No transcript segments available.'

  try {
    const model = getGeminiModel('gemini-2.0-flash')
    const transcript = formatTranscriptForPrompt(segments)
    const result = await model.generateContent(
      `You are a medical documentation assistant. Summarize this doctor-patient conversation in 3-5 concise bullet points. Focus on: chief complaint, key findings, decisions made, and next steps.\n\n${transcript}\n\nReturn only the summary, no preamble.`
    )
    return result.response.text()
  } catch (e) {
    console.warn('Gemini summary generation failed, using fallback:', e)
    return generateFallbackSummary(segments)
  }
}

export async function generateSoapNotesFromTranscript(segments: TranscriptSegment[]): Promise<string> {
  if (segments.length === 0) {
    return '# SOAP Note\n\nNo transcript data available.'
  }

  try {
    const model = getGeminiModel('gemini-2.0-flash')
    const transcript = formatTranscriptForPrompt(segments)
    const result = await model.generateContent(
      `You are a medical documentation assistant. Generate a SOAP note from this doctor-patient conversation transcript.

${transcript}

Format the output exactly as:

# SOAP Note

## S (Subjective)
[Patient's reported symptoms, concerns, and history in their own words]

## O (Objective)
[Vitals, exam findings, and measurable data mentioned by the clinician]

## A (Assessment)
[Clinical assessment and differential diagnosis based on the conversation]

## P (Plan)
[Treatment plan, medications, follow-ups, and patient instructions]

Be thorough but concise. Extract real information from the transcript. Mark anything uncertain with [to be confirmed].`
    )
    return result.response.text()
  } catch (e) {
    console.warn('Gemini SOAP generation failed, using fallback:', e)
    return generateFallbackSoap(segments)
  }
}

// ── Fallback generators (no AI needed) ─────────────────────────────────

function generateFallbackSummary(segments: TranscriptSegment[]): string {
  const patientStatements = segments
    .filter((segment) => segment.speaker === 'patient')
    .slice(0, 4)
    .map((segment) => cleanText(segment.text))

  const clinicianStatements = segments
    .filter((segment) => segment.speaker === 'clinician')
    .slice(0, 4)
    .map((segment) => cleanText(segment.text))

  const summaryLines: string[] = ['Conversation summary:']

  if (patientStatements.length > 0) {
    summaryLines.push('', 'Patient shared:')
    patientStatements.forEach((line) => summaryLines.push(`- ${line}`))
  }

  if (clinicianStatements.length > 0) {
    summaryLines.push('', 'Clinician discussed:')
    clinicianStatements.forEach((line) => summaryLines.push(`- ${line}`))
  }

  return summaryLines.join('\n')
}

function generateFallbackSoap(segments: TranscriptSegment[]): string {
  const subjective = segments
    .filter((segment) => segment.speaker === 'patient')
    .slice(0, 6)
    .map((segment) => cleanText(segment.text))
    .join(' ')

  const objectivePoints = segments
    .filter((segment) => segment.speaker === 'clinician')
    .slice(0, 4)
    .map((segment) => cleanText(segment.text))

  const assessmentSeed = deriveChiefComplaint(segments)

  return `# SOAP Note

## S (Subjective)
${subjective || 'Patient-reported symptoms and concerns to be completed.'}

## O (Objective)
${objectivePoints.length > 0 ? objectivePoints.map((line) => `- ${line}`).join('\n') : '- Objective findings to be completed.'}

## A (Assessment)
- Primary concern: ${assessmentSeed}
- Clinical impression: To be completed by clinician.

## P (Plan)
- Continue assessment and treatment based on clinical findings.
- Review medications, follow-up schedule, and return precautions with patient.
`
}
