'use client'

import { Brain, MessageCircle, Stethoscope, UserRound } from 'lucide-react'

interface ConversationSummaryRendererProps {
  content: string
}

interface SummarySection {
  title: string
  items: string[]
}

function normalizeLine(line: string): string {
  return line.replace(/\s+/g, ' ').trim()
}

function isSectionTitle(line: string): boolean {
  const trimmed = normalizeLine(line)
  if (!trimmed.endsWith(':')) return false
  if (/^[-*]\s+/.test(trimmed)) return false
  return trimmed.length <= 48
}

function stripBullet(line: string): string {
  return normalizeLine(line).replace(/^[-*]\s+/, '')
}

function parseSummary(content: string): SummarySection[] {
  const rawLines = content
    .split('\n')
    .map(normalizeLine)
    .filter(Boolean)

  const sections: SummarySection[] = []
  let currentSection: SummarySection | null = null

  for (const line of rawLines) {
    if (line.toLowerCase() === 'conversation summary:' || line.toLowerCase() === 'summary:') {
      continue
    }

    if (isSectionTitle(line)) {
      if (currentSection) sections.push(currentSection)
      currentSection = { title: line.replace(/:$/, ''), items: [] }
      continue
    }

    const itemText = stripBullet(line)

    if (!currentSection) {
      currentSection = { title: 'Summary', items: [] }
    }
    currentSection.items.push(itemText)
  }

  if (currentSection) sections.push(currentSection)

  return sections.filter((section) => section.items.length > 0)
}

function sectionStyles(title: string): { badge: string; card: string } {
  const lowered = title.toLowerCase()

  if (lowered.includes('patient')) {
    return {
      badge: 'bg-emerald-600 text-white',
      card: 'border-emerald-200/70 bg-emerald-50/70',
    }
  }

  if (lowered.includes('clinician') || lowered.includes('doctor')) {
    return {
      badge: 'bg-sky-600 text-white',
      card: 'border-sky-200/70 bg-sky-50/70',
    }
  }

  return {
    badge: 'bg-slate-600 text-white',
    card: 'border-slate-200/70 bg-slate-50/70',
  }
}

type SignalKind = 'medication' | 'symptom' | 'vital'

interface SignalChip {
  label: string
  kind: SignalKind
}

function dedupeByLabel(items: SignalChip[]): SignalChip[] {
  const seen = new Set<string>()
  const output: SignalChip[] = []

  for (const item of items) {
    const key = item.label.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    output.push(item)
  }
  return output
}

function extractSignals(content: string): SignalChip[] {
  const lower = content.toLowerCase()
  const chips: SignalChip[] = []

  const symptomKeywords = [
    'headache',
    'headaches',
    'dizziness',
    'dizzy',
    'nausea',
    'fatigue',
    'chest pain',
    'shortness of breath',
    'cough',
    'fever',
  ]
  symptomKeywords.forEach((symptom) => {
    if (lower.includes(symptom)) {
      chips.push({ kind: 'symptom', label: symptom.replace(/\b\w/g, (c) => c.toUpperCase()) })
    }
  })

  const medicationPatterns = [
    /\b([A-Z][a-z]+(?:pril|sartan|statin|formin|zepam|azole|cillin))\b/g,
    /\b(Lisinopril|Metformin|Atorvastatin|Amlodipine|Losartan)\b/gi,
  ]
  medicationPatterns.forEach((pattern) => {
    const matches = content.match(pattern) ?? []
    matches.forEach((match) => chips.push({ kind: 'medication', label: match }))
  })

  const bpMatch = content.match(/\b(\d{2,3})\s*(?:\/|over)\s*(\d{2,3})\b/i)
  if (bpMatch) {
    chips.push({ kind: 'vital', label: `BP ${bpMatch[1]}/${bpMatch[2]}` })
  }

  return dedupeByLabel(chips).slice(0, 8)
}

function signalChipStyle(kind: SignalKind): string {
  if (kind === 'medication') return 'bg-emerald-100 text-emerald-800'
  if (kind === 'symptom') return 'bg-amber-100 text-amber-800'
  return 'bg-sky-100 text-sky-800'
}

function signalChipPrefix(kind: SignalKind): string {
  if (kind === 'medication') return '💊'
  if (kind === 'symptom') return '🩹'
  return '🩺'
}

function sectionIcon(title: string) {
  const lowered = title.toLowerCase()
  if (lowered.includes('patient')) {
    return <UserRound className="h-4 w-4 text-emerald-700" />
  }
  if (lowered.includes('clinician') || lowered.includes('doctor')) {
    return <Stethoscope className="h-4 w-4 text-sky-700" />
  }
  return <MessageCircle className="h-4 w-4 text-slate-700" />
}

export function ConversationSummaryRenderer({ content }: ConversationSummaryRendererProps) {
  const sections = parseSummary(content)
  const signals = extractSignals(content)

  if (sections.length === 0) {
    return (
      <p className="whitespace-pre-wrap text-[0.9rem] leading-7 text-slate-700">
        {content}
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {signals.length > 0 && (
        <div className="rounded-xl border border-indigo-200/70 bg-gradient-to-r from-indigo-50 to-sky-50 p-4">
          <div className="mb-2 flex items-center gap-2">
            <Brain className="h-4 w-4 text-indigo-700" />
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-indigo-700">
              AI Extracted Signals
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {signals.map((signal, idx) => (
              <span
                key={`${signal.label}-${idx}`}
                className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${signalChipStyle(signal.kind)}`}
              >
                <span className="mr-1">{signalChipPrefix(signal.kind)}</span>
                {signal.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {sections.map((section, index) => {
        const styles = sectionStyles(section.title)
        return (
          <div key={`${section.title}-${index}`} className={`rounded-xl border p-4 ${styles.card}`}>
            <div className="mb-3 flex items-center gap-2">
              {sectionIcon(section.title)}
              <span className={`rounded-md px-2 py-1 text-[11px] font-semibold ${styles.badge}`}>
                {section.title}
              </span>
            </div>
            <ul className="space-y-1.5">
              {section.items.map((item, itemIndex) => (
                <li
                  key={itemIndex}
                  className="rounded-lg border border-white/70 bg-white/70 px-3 py-2 text-[0.9rem] leading-7 text-slate-700"
                >
                  <span className="font-medium text-slate-500">{itemIndex + 1}. </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )
      })}
    </div>
  )
}
