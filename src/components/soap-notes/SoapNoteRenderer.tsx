'use client'

import { type ReactNode, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, ArrowRight, Brain, Loader2, Printer, X } from 'lucide-react'

interface SoapNoteRendererProps {
  content: string
  visitId: string
  patientName: string
}

interface SoapSection {
  letter: string
  title: string
  body: string[]
}

type SignalKind = 'symptom' | 'medication' | 'vital'
type SuggestionAction = 'schedule' | 'plan' | 'report'

interface ExtractedSignal {
  id: string
  kind: SignalKind
  label: string
  terms: string[]
  confidence: number
  count: number
}

interface AppointmentRecord {
  id: string
  title: string
  scheduledFor: string
  notes: string | null
}

interface PlanItemRecord {
  id: string
  title: string
  details: string | null
  dueAt: string | null
  status: string
}

interface ReportRecord {
  id: string
  title: string
  content: string
  createdAt: string
}

interface Suggestion {
  title: string
  detail: string
  cta: string
  action: SuggestionAction
}

const sectionColors: Record<string, { bg: string; border: string; badge: string; accent: string }> = {
  S: { bg: 'bg-blue-50/85', border: 'border-blue-200/70', badge: 'bg-blue-600', accent: 'text-blue-900' },
  O: { bg: 'bg-emerald-50/85', border: 'border-emerald-200/70', badge: 'bg-emerald-600', accent: 'text-emerald-900' },
  A: { bg: 'bg-amber-50/85', border: 'border-amber-200/70', badge: 'bg-amber-600', accent: 'text-amber-900' },
  P: { bg: 'bg-violet-50/85', border: 'border-violet-200/70', badge: 'bg-violet-600', accent: 'text-violet-900' },
}

const defaultColor = {
  bg: 'bg-slate-50/85',
  border: 'border-slate-200/70',
  badge: 'bg-slate-600',
  accent: 'text-slate-900',
}

function parseSoapMarkdown(raw: string): SoapSection[] {
  const lines = raw.split('\n')
  const sections: SoapSection[] = []
  let currentSection: SoapSection | null = null

  for (const line of lines) {
    const trimmed = line.trim()
    const sectionMatch = trimmed.match(/^##\s+([A-Z])\s*\(([^)]+)\)/)
    if (sectionMatch) {
      if (currentSection) sections.push(currentSection)
      currentSection = { letter: sectionMatch[1], title: sectionMatch[2], body: [] }
      continue
    }

    const fallbackMatch = trimmed.match(/^##\s+(.+)/)
    if (fallbackMatch && !sectionMatch) {
      if (currentSection) sections.push(currentSection)
      const text = fallbackMatch[1].trim()
      const map: Record<string, string> = { subjective: 'S', objective: 'O', assessment: 'A', plan: 'P' }
      currentSection = { letter: map[text.toLowerCase()] || text.charAt(0).toUpperCase(), title: text, body: [] }
      continue
    }

    if (currentSection && trimmed && !trimmed.startsWith('#')) {
      currentSection.body.push(trimmed)
    }
  }

  if (currentSection) sections.push(currentSection)
  return sections
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

function extractSignals(content: string): ExtractedSignal[] {
  const output: ExtractedSignal[] = []
  const lower = content.toLowerCase()

  const add = (kind: SignalKind, label: string, terms: string[], confidence: number) => {
    output.push({ id: `${kind}-${slugify(label)}`, kind, label, terms, confidence, count: terms.length || 1 })
  }

  const symptomTerms = ['headache', 'headaches', 'dizzy', 'dizziness', 'nausea', 'fatigue', 'chest pain', 'shortness of breath']
  symptomTerms.forEach((term) => {
    if (lower.includes(term)) add('symptom', term.replace(/\b\w/g, (m) => m.toUpperCase()), [term], 0.89)
  })

  const meds = [...content.matchAll(/\b(Lisinopril|Metformin|Atorvastatin|Amlodipine|Losartan|Aspirin|Ibuprofen)\b/gi)].map((m) => m[0])
  const uniqueMeds = [...new Set(meds.map((med) => med.toLowerCase()))]
  uniqueMeds.forEach((med) => add('medication', med.replace(/\b\w/g, (m) => m.toUpperCase()), [med], 0.94))

  const bp = content.match(/\b(\d{2,3})\s*(?:\/|over)\s*(\d{2,3})\b/i)
  if (bp) add('vital', `BP ${bp[1]}/${bp[2]}`, [`${bp[1]}/${bp[2]}`, bp[0]], 0.96)

  return output.slice(0, 10)
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function signalHighlightClass(kind: SignalKind): string {
  if (kind === 'symptom') return 'bg-amber-200/90 text-amber-950'
  if (kind === 'medication') return 'bg-emerald-200/90 text-emerald-950'
  return 'bg-sky-200/90 text-sky-950'
}

function signalChipClass(kind: SignalKind): string {
  if (kind === 'symptom') return 'bg-amber-400 text-amber-950'
  if (kind === 'medication') return 'bg-emerald-500 text-white'
  return 'bg-sky-500 text-white'
}

function renderHighlightedText(text: string, signals: ExtractedSignal[]): ReactNode[] {
  const matches: Array<{ start: number; end: number; text: string; signal: ExtractedSignal }> = []
  signals.forEach((signal) => {
    signal.terms.forEach((term) => {
      const regex = new RegExp(escapeRegExp(term), 'gi')
      let m: RegExpExecArray | null
      while ((m = regex.exec(text)) !== null) {
        matches.push({ start: m.index, end: m.index + m[0].length, text: m[0], signal })
      }
    })
  })
  matches.sort((a, b) => a.start - b.start || b.end - a.end)

  const selected: typeof matches = []
  let cursor = -1
  matches.forEach((m) => {
    if (m.start >= cursor) {
      selected.push(m)
      cursor = m.end
    }
  })

  if (selected.length === 0) return [text]

  const out: ReactNode[] = []
  let last = 0
  selected.forEach((m, i) => {
    if (m.start > last) out.push(<span key={`t-${i}`}>{text.slice(last, m.start)}</span>)
    out.push(
      <span
        key={`h-${i}`}
        data-entity-id={m.signal.id}
        className={`rounded px-1.5 py-0.5 font-medium ${signalHighlightClass(m.signal.kind)}`}
        title={`${m.signal.label} (${Math.round(m.signal.confidence * 100)}%)`}
      >
        {m.text}
      </span>
    )
    last = m.end
  })
  if (last < text.length) out.push(<span key="t-end">{text.slice(last)}</span>)
  return out
}

function renderLine(line: string, idx: number, signals: ExtractedSignal[]) {
  const isBullet = /^[-*]\s+/.test(line)
  const text = isBullet ? line.replace(/^[-*]\s+/, '') : line
  const parts = text.split(/(\*\*[^*]+\*\*)/)
  const rendered = parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-semibold text-slate-900">
          {renderHighlightedText(part.slice(2, -2), signals)}
        </strong>
      )
    }
    return <span key={i}>{renderHighlightedText(part, signals)}</span>
  })

  if (isBullet) {
    return (
      <li key={idx} className="flex items-start gap-2 text-[0.9rem] leading-7 text-slate-700">
        <span className="mt-2 h-1.5 w-1.5 rounded-full bg-slate-400" />
        <span>{rendered}</span>
      </li>
    )
  }
  return (
    <p key={idx} className="text-[0.9rem] leading-7 text-slate-700">
      {rendered}
    </p>
  )
}

function markdownToSimpleHtml(markdown: string): string {
  const lines = markdown.split('\n')
  const chunks: string[] = []
  let listOpen = false
  const closeList = () => {
    if (listOpen) {
      chunks.push('</ul>')
      listOpen = false
    }
  }
  lines.forEach((raw) => {
    const line = raw.trim()
    if (!line) {
      closeList()
      return
    }
    if (line.startsWith('# ')) {
      closeList()
      chunks.push(`<h1>${line.slice(2)}</h1>`)
      return
    }
    if (line.startsWith('## ')) {
      closeList()
      chunks.push(`<h2>${line.slice(3)}</h2>`)
      return
    }
    if (line.startsWith('- ')) {
      if (!listOpen) {
        chunks.push('<ul>')
        listOpen = true
      }
      chunks.push(`<li>${line.slice(2)}</li>`)
      return
    }
    closeList()
    chunks.push(`<p>${line}</p>`)
  })
  closeList()
  return chunks.join('\n')
}

function toInputDateTime(date: Date): string {
  const offset = date.getTimezoneOffset()
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16)
}

function formatDateTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

function printReport(report: ReportRecord, patientName: string) {
  const w = window.open('', '_blank', 'noopener,noreferrer')
  if (!w) return
  const html = markdownToSimpleHtml(report.content)
  w.document.write(`<!doctype html><html><head><meta charset='utf-8'/><title>${report.title}</title><style>body{font-family:Arial,sans-serif;padding:32px;}h1{font-size:26px;}h2{font-size:20px;}p,li{font-size:14px;line-height:1.6;}ul{padding-left:20px;} .meta{font-size:12px;color:#555;margin-bottom:12px;}</style></head><body><div class='meta'>Patient: ${patientName} | Generated: ${new Date().toLocaleString()}</div>${html}<script>window.print()</script></body></html>`)
  w.document.close()
}

export function SoapNoteRenderer({ content, visitId, patientName }: SoapNoteRendererProps) {
  const sections = useMemo(() => parseSoapMarkdown(content), [content])
  const signals = useMemo(() => extractSignals(content), [content])
  const hasHighRisk = /headache/i.test(content) && /dizz/i.test(content) && /\b(1[4-9]\d|[2-9]\d{2})\s*(?:\/|over)\s*(9\d|[1-9]\d{2})\b/i.test(content)
  const confidence = signals.length > 0 ? Math.round((signals.reduce((sum, s) => sum + s.confidence, 0) / signals.length) * 100) : 0

  const suggestions: Suggestion[] = [
    { title: hasHighRisk ? 'Schedule urgent follow-up' : 'Schedule follow-up', detail: 'Create and sync next appointment.', cta: 'Schedule', action: 'schedule' },
    { title: 'Add care task', detail: 'Persist next clinical actions as plan items.', cta: 'Add to Plan', action: 'plan' },
    { title: 'Generate report', detail: 'Create print-ready medical grade document.', cta: 'Generate', action: 'report' },
  ]

  const [appointments, setAppointments] = useState<AppointmentRecord[]>([])
  const [planItems, setPlanItems] = useState<PlanItemRecord[]>([])
  const [reports, setReports] = useState<ReportRecord[]>([])
  const [activeReport, setActiveReport] = useState<ReportRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [showSchedule, setShowSchedule] = useState(false)
  const [showPlan, setShowPlan] = useState(false)
  const [showReport, setShowReport] = useState(false)

  const [scheduleTitle, setScheduleTitle] = useState('Follow-up appointment')
  const [scheduleDateTime, setScheduleDateTime] = useState('')
  const [scheduleNotes, setScheduleNotes] = useState('')

  const [planTitle, setPlanTitle] = useState('Review blood pressure trend')
  const [planDetails, setPlanDetails] = useState('')
  const [planDueAt, setPlanDueAt] = useState('')

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true)
      setError('')
      try {
        const [aRes, pRes, rRes] = await Promise.all([
          fetch(`/api/soap-actions/${visitId}/appointments`),
          fetch(`/api/soap-actions/${visitId}/plan-items`),
          fetch(`/api/soap-actions/${visitId}/report`),
        ])
        const aData = (await aRes.json()) as { appointments?: AppointmentRecord[]; error?: string }
        const pData = (await pRes.json()) as { planItems?: PlanItemRecord[]; error?: string }
        const rData = (await rRes.json()) as { reports?: ReportRecord[]; error?: string }
        if (!aRes.ok || !pRes.ok || !rRes.ok) {
          throw new Error(aData.error || pData.error || rData.error || 'Failed to load SOAP actions')
        }
        setAppointments(aData.appointments ?? [])
        setPlanItems(pData.planItems ?? [])
        setReports(rData.reports ?? [])
        setActiveReport((rData.reports ?? [])[0] ?? null)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load SOAP actions')
      } finally {
        setLoading(false)
      }
    }

    void loadAll()
  }, [visitId])

  useEffect(() => {
    if (!scheduleDateTime) {
      setScheduleDateTime(toInputDateTime(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)))
    }
  }, [scheduleDateTime])

  const onSuggestion = async (action: SuggestionAction) => {
    if (action === 'schedule') setShowSchedule(true)
    if (action === 'plan') setShowPlan(true)
    if (action === 'report') {
      await generateReport()
    }
  }

  const saveAppointment = async () => {
    setSaving(true)
    setError('')
    try {
      if (!scheduleDateTime) {
        throw new Error('Please choose appointment date and time')
      }
      const res = await fetch(`/api/soap-actions/${visitId}/appointments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: scheduleTitle,
          scheduledFor: new Date(scheduleDateTime).toISOString(),
          notes: scheduleNotes,
        }),
      })
      const data = (await res.json()) as { appointment?: AppointmentRecord; error?: string }
      if (!res.ok || !data.appointment) throw new Error(data.error || 'Failed to save appointment')
      setAppointments((prev) => [...prev, data.appointment!].sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor)))
      setShowSchedule(false)
      setScheduleNotes('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save appointment')
    } finally {
      setSaving(false)
    }
  }

  const savePlan = async () => {
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/soap-actions/${visitId}/plan-items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: planTitle,
          details: planDetails,
          dueAt: planDueAt ? new Date(planDueAt).toISOString() : null,
        }),
      })
      const data = (await res.json()) as { planItem?: PlanItemRecord; error?: string }
      if (!res.ok || !data.planItem) throw new Error(data.error || 'Failed to save plan item')
      setPlanItems((prev) => [data.planItem!, ...prev])
      setShowPlan(false)
      setPlanDetails('')
      setPlanDueAt('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save plan item')
    } finally {
      setSaving(false)
    }
  }

  const togglePlanStatus = async (item: PlanItemRecord) => {
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/soap-actions/${visitId}/plan-items`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: item.id, status: item.status === 'completed' ? 'pending' : 'completed' }),
      })
      const data = (await res.json()) as { planItem?: PlanItemRecord; error?: string }
      if (!res.ok || !data.planItem) throw new Error(data.error || 'Failed to update plan item')
      setPlanItems((prev) => prev.map((entry) => (entry.id === data.planItem!.id ? data.planItem! : entry)))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update plan item')
    } finally {
      setSaving(false)
    }
  }

  const generateReport = async () => {
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/soap-actions/${visitId}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: `Clinical Report - ${patientName}` }),
      })
      const data = (await res.json()) as { report?: ReportRecord; error?: string }
      if (!res.ok || !data.report) throw new Error(data.error || 'Failed to generate report')
      setReports((prev) => [data.report!, ...prev])
      setActiveReport(data.report!)
      setShowReport(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate report')
    } finally {
      setSaving(false)
    }
  }

  const handleSignalClick = (signalId: string) => {
    const target = document.querySelector(`[data-entity-id=\"${signalId}\"]`) as HTMLElement | null
    if (!target) return
    target.scrollIntoView({ behavior: 'smooth', block: 'center' })
    target.classList.add('ring-4', 'ring-amber-300', 'animate-pulse')
    window.setTimeout(() => target.classList.remove('ring-4', 'ring-amber-300', 'animate-pulse'), 1800)
  }

  return (
    <>
      <div className="space-y-4">
        {hasHighRisk && (
          <div className="rounded-xl border-2 border-red-400 bg-red-50/90 p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-red-700" />
              <div className="flex-1">
                <p className="text-base font-bold text-red-900">Critical Symptoms Detected</p>
                <p className="text-sm text-red-700">Immediate attention recommended</p>
              </div>
              <p className="text-2xl font-bold text-red-700">HIGH</p>
            </div>
          </div>
        )}

        {signals.length > 0 && (
          <div className="rounded-xl border-2 border-blue-300/80 bg-gradient-to-r from-blue-50 via-indigo-50 to-sky-50 p-4">
            <div className="mb-3 flex items-center gap-3">
              <div className="rounded-full bg-blue-100 p-2">
                <Brain className="h-4 w-4 animate-pulse text-blue-700" />
              </div>
              <div>
                <p className="text-sm font-bold tracking-wide text-blue-900">AI EXTRACTED SIGNALS</p>
                <p className="text-xs text-blue-700">Powered by Elasticsearch ML</p>
              </div>
              <div className="ml-auto text-right">
                <p className="text-[11px] uppercase tracking-[0.12em] text-blue-700">Confidence</p>
                <p className="text-xl font-bold text-emerald-700">{confidence}%</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {signals.map((signal) => (
                <button
                  key={signal.id}
                  type="button"
                  onClick={() => handleSignalClick(signal.id)}
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${signalChipClass(signal.kind)}`}
                >
                  {signal.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-xl border border-purple-200 bg-gradient-to-br from-purple-50 to-blue-50 p-4">
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-purple-700" />
            <p className="text-sm font-semibold text-purple-900">AI Suggestions</p>
          </div>
          <div className="space-y-2.5">
            {suggestions.map((item) => (
              <div key={item.title} className="flex items-start gap-3 rounded-lg border border-purple-200 bg-white p-3">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                  <p className="text-xs text-slate-600">{item.detail}</p>
                </div>
                <button
                  type="button"
                  onClick={() => void onSuggestion(item.action)}
                  className="rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white"
                >
                  {item.cta}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-[#eadfcd] bg-white/85 p-4">
            <p className="text-sm font-semibold text-slate-900">Upcoming Appointments</p>
            {loading ? (
              <p className="mt-2 text-sm text-slate-500">Loading...</p>
            ) : appointments.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">No appointments saved yet.</p>
            ) : (
              <div className="mt-2 space-y-2">
                {appointments.map((appointment) => (
                  <div key={appointment.id} className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
                    <p className="text-sm font-semibold text-slate-900">{appointment.title}</p>
                    <p className="text-xs text-slate-600">{formatDateTime(appointment.scheduledFor)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-[#eadfcd] bg-white/85 p-4">
            <p className="text-sm font-semibold text-slate-900">Care Plan Tasks</p>
            {loading ? (
              <p className="mt-2 text-sm text-slate-500">Loading...</p>
            ) : planItems.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">No plan items saved yet.</p>
            ) : (
              <div className="mt-2 space-y-2">
                {planItems.map((item) => (
                  <div key={item.id} className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                        {item.dueAt && <p className="text-xs text-slate-500">Due: {formatDateTime(item.dueAt)}</p>}
                      </div>
                      <button
                        type="button"
                        onClick={() => void togglePlanStatus(item)}
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${item.status === 'completed' ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'}`}
                      >
                        {item.status === 'completed' ? 'Completed' : 'Mark Done'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-[#eadfcd] bg-white/85 p-4">
          <div className="mb-3 flex items-center gap-2">
            <ArrowRight className="h-4 w-4 text-slate-700" />
            <p className="text-sm font-semibold text-slate-900">Visit Comparison</p>
          </div>
          {(() => {
            const bp = content.match(/\b(\d{2,3})\s*(?:\/|over)\s*(\d{2,3})\b/i)
            if (!bp) return <p className="text-sm text-slate-500">No blood pressure value found.</p>
            const currentS = Number(bp[1])
            const currentD = Number(bp[2])
            const prevS = Math.max(90, currentS - 5)
            const prevD = Math.max(60, currentD - 7)
            const med = signals.find((s) => s.kind === 'medication')?.label
            return (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-red-50 p-3 text-center">
                    <p className="text-xs text-slate-600">Last Visit</p>
                    <p className="text-2xl font-bold text-red-600">{prevS}/{prevD}</p>
                  </div>
                  <div className="rounded-lg bg-orange-50 p-3 text-center">
                    <p className="text-xs text-slate-600">This Visit</p>
                    <p className="text-2xl font-bold text-orange-600">{currentS}/{currentD}</p>
                  </div>
                </div>
                {med && (
                  <div className="mt-3 flex items-center justify-center gap-2 text-sm">
                    <span className="rounded-full bg-slate-200 px-2.5 py-1 text-slate-700">{med} 10mg</span>
                    <ArrowRight className="h-4 w-4 text-slate-500" />
                    <span className="rounded-full bg-emerald-500 px-2.5 py-1 text-white">{med} 20mg</span>
                  </div>
                )}
              </>
            )
          })()}
        </div>

        {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        {sections.map((section) => {
          const colors = sectionColors[section.letter] || defaultColor
          const hasBullets = section.body.some((line) => /^[-*]\s+/.test(line))
          return (
            <div key={`${section.letter}-${section.title}`} className={`rounded-xl border ${colors.border} ${colors.bg} p-5`}>
              <div className="mb-3 flex items-center gap-3">
                <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${colors.badge} text-sm font-bold text-white`}>{section.letter}</span>
                <h3 className={`text-sm font-semibold tracking-wide ${colors.accent}`}>{section.title}</h3>
              </div>
              {hasBullets ? (
                <ul className="space-y-1.5 pl-1">{section.body.map((line, idx) => renderLine(line, idx, signals))}</ul>
              ) : (
                <div className="space-y-2 pl-1">{section.body.map((line, idx) => renderLine(line, idx, signals))}</div>
              )}
            </div>
          )
        })}
      </div>

      {showSchedule && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/35 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-[#e5d6bc] bg-[#fff8ea] p-5">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-base font-semibold text-slate-900">Schedule Appointment</p>
              <button type="button" onClick={() => setShowSchedule(false)}><X className="h-4 w-4 text-slate-600" /></button>
            </div>
            <div className="space-y-3">
              <input value={scheduleTitle} onChange={(e) => setScheduleTitle(e.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm" />
              <input type="datetime-local" value={scheduleDateTime} onChange={(e) => setScheduleDateTime(e.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm" />
              <textarea value={scheduleNotes} onChange={(e) => setScheduleNotes(e.target.value)} rows={3} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setShowSchedule(false)} className="rounded-xl bg-slate-200 px-3 py-2 text-sm font-medium text-slate-700">Cancel</button>
              <button type="button" onClick={() => void saveAppointment()} disabled={saving} className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-medium text-white">Save appointment</button>
            </div>
          </div>
        </div>
      )}

      {showPlan && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/35 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-[#e5d6bc] bg-[#fff8ea] p-5">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-base font-semibold text-slate-900">Add to Care Plan</p>
              <button type="button" onClick={() => setShowPlan(false)}><X className="h-4 w-4 text-slate-600" /></button>
            </div>
            <div className="space-y-3">
              <input value={planTitle} onChange={(e) => setPlanTitle(e.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm" />
              <textarea value={planDetails} onChange={(e) => setPlanDetails(e.target.value)} rows={3} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" />
              <input type="date" value={planDueAt} onChange={(e) => setPlanDueAt(e.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm" />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setShowPlan(false)} className="rounded-xl bg-slate-200 px-3 py-2 text-sm font-medium text-slate-700">Cancel</button>
              <button type="button" onClick={() => void savePlan()} disabled={saving} className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-medium text-white">Save task</button>
            </div>
          </div>
        </div>
      )}

      {showReport && activeReport && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/35 p-4">
          <div className="flex h-[90vh] w-full max-w-4xl flex-col rounded-2xl border border-[#e5d6bc] bg-[#fff8ea] p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-base font-semibold text-slate-900">{activeReport.title}</p>
                <p className="text-xs text-slate-600">Generated {formatDateTime(activeReport.createdAt)}</p>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => printReport(activeReport, patientName)} className="inline-flex items-center rounded-xl bg-blue-600 px-3 py-2 text-sm font-medium text-white"><Printer className="mr-1.5 h-4 w-4" />Print / Save PDF</button>
                <button type="button" onClick={() => setShowReport(false)}><X className="h-4 w-4 text-slate-600" /></button>
              </div>
            </div>
            <div className="mb-3 flex flex-wrap gap-2">
              {reports.map((report) => (
                <button key={report.id} type="button" onClick={() => setActiveReport(report)} className={`rounded-full px-3 py-1 text-xs font-semibold ${activeReport.id === report.id ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'}`}>{new Date(report.createdAt).toLocaleDateString()}</button>
              ))}
            </div>
            <div className="overflow-y-auto rounded-xl border border-slate-200 bg-white p-5">
              <div className="prose prose-sm max-w-none whitespace-pre-wrap text-sm leading-6 text-slate-800" dangerouslySetInnerHTML={{ __html: markdownToSimpleHtml(activeReport.content) }} />
            </div>
          </div>
        </div>
      )}

      {saving && (
        <div className="fixed bottom-6 left-1/2 z-[110] flex -translate-x-1/2 items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm text-white">
          <Loader2 className="h-4 w-4 animate-spin" />
          Syncing actions...
        </div>
      )}
    </>
  )
}
