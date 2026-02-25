'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import type { LucideIcon } from 'lucide-react'
import {
  Activity,
  AlertCircle,
  BellRing,
  ClipboardList,
  Clock3,
  FileAudio2,
  FileText,
  Loader2,
  LogOut,
  Plus,
  Search,
  Send,
  Sparkles,
  Stethoscope,
} from 'lucide-react'
import { FloatingSidebarNav } from '@/components/clinician/FloatingSidebarNav'

interface ClinicianWorkspaceProps {
  clinicianName: string
}

type ComposerMode = 'ask' | 'summarize' | 'triage'

type StatCard = {
  label: string
  value: string
  delta: string
  tone: 'cyan' | 'emerald' | 'amber'
  icon: LucideIcon
}

type VisitRecord = {
  id: string
  status: string
  chiefComplaint: string | null
  startedAt: string
  finalizedAt: string | null
  patient: { id: string; displayName: string }
}

type VisitsApiResponse = { visits: VisitRecord[] }
type AssistantApiResponse = { answer: string; navigateTo: string | null; navigationLabel: string | null }

type QueueItem = {
  id: string
  name: string
  reason: string
  status: string
  priority: 'High' | 'Medium' | 'Routine'
  href: string
}

const COMPOSER_MODES: Record<ComposerMode, { label: string; placeholder: string; helper: string; accent: string }> = {
  ask: {
    label: 'Ask',
    placeholder: 'Ask about visits, records, app navigation, or next steps...',
    helper: 'Sends a real request to Synth Assist and can navigate you to pages.',
    accent: 'text-cyan-700',
  },
  summarize: {
    label: 'Summarize',
    placeholder: 'Ask for a summary of open visits, recent records, or today\'s activity...',
    helper: 'Best for board summaries and quick record lookup prompts.',
    accent: 'text-emerald-700',
  },
  triage: {
    label: 'Triage',
    placeholder: 'Ask which visits are open, stale, or should be handled first...',
    helper: 'Use for prioritization prompts based on live visit data.',
    accent: 'text-amber-700',
  },
}

const PLAYBOOKS = [
  { title: 'Morning Review', href: '/clinician/workflows/morning-review' },
  { title: 'Medication Risk Sweep', href: '/clinician/workflows/medication-risk-sweep' },
  { title: 'Trend Watch', href: '/clinician/workflows/trend-watch' },
]

const PANEL =
  'border border-[#eadfcd] bg-white/75 shadow-[0_14px_40px_rgba(84,63,31,0.12)] backdrop-blur-xl'

function toneClasses(tone: StatCard['tone']) {
  if (tone === 'emerald') return { ring: 'border-emerald-200 bg-emerald-50/80', icon: 'bg-emerald-100 text-emerald-700', chip: 'text-emerald-700' }
  if (tone === 'amber') return { ring: 'border-amber-200 bg-amber-50/80', icon: 'bg-amber-100 text-amber-700', chip: 'text-amber-700' }
  return { ring: 'border-cyan-200 bg-cyan-50/80', icon: 'bg-cyan-100 text-cyan-700', chip: 'text-cyan-700' }
}

function startOfDay(d = new Date()) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()) }
function toTitle(s: string) { return s.replace(/[_-]+/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase()) }
function ageHours(date: string) { return (Date.now() - new Date(date).getTime()) / 36e5 }
function rel(date: string) {
  const m = Math.max(1, Math.round((Date.now() - new Date(date).getTime()) / 6e4))
  if (m < 60) return `${m}m ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.round(h / 24)}d ago`
}
function queuePriority(v: VisitRecord): QueueItem['priority'] {
  if (v.status === 'finalized') return 'Routine'
  const h = ageHours(v.startedAt)
  if (h >= 24) return 'High'
  if (h >= 6) return 'Medium'
  return 'Routine'
}

export function ClinicianWorkspace({ clinicianName }: ClinicianWorkspaceProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [mode, setMode] = useState<ComposerMode>('ask')
  const [question, setQuestion] = useState('')
  const [lastQuestion, setLastQuestion] = useState('')
  const [lastAnswer, setLastAnswer] = useState('')
  const [visits, setVisits] = useState<VisitRecord[]>([])
  const [visitsLoading, setVisitsLoading] = useState(true)
  const [visitsError, setVisitsError] = useState('')
  const [assistantPending, setAssistantPending] = useState(false)
  const [assistantError, setAssistantError] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setVisitsLoading(true)
      setVisitsError('')
      try {
        const res = await fetch('/api/visits', { cache: 'no-store' })
        if (!res.ok) throw new Error('Failed to fetch visits')
        const data = (await res.json()) as VisitsApiResponse
        if (!cancelled) setVisits(Array.isArray(data.visits) ? data.visits : [])
      } catch {
        if (!cancelled) setVisitsError('Unable to load visits right now.')
      } finally {
        if (!cancelled) setVisitsLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const dashboard = useMemo(() => {
    const today = startOfDay()
    const yesterday = new Date(today)
    yesterday.setDate(today.getDate() - 1)

    const parsed = visits.map((v) => ({ ...v, started: new Date(v.startedAt), finalized: v.finalizedAt ? new Date(v.finalizedAt) : null }))
    const todayVisits = parsed.filter((v) => v.started >= today)
    const yesterdayVisits = parsed.filter((v) => v.started >= yesterday && v.started < today)
    const uniqueToday = new Set(todayVisits.map((v) => v.patient.id)).size
    const uniqueYesterday = new Set(yesterdayVisits.map((v) => v.patient.id)).size
    const open = parsed.filter((v) => v.status !== 'finalized')
    const overdue = open.filter((v) => ageHours(v.startedAt) > 24)
    const finalized = parsed.filter((v) => v.status === 'finalized')
    const finalizedToday = finalized.filter((v) => v.finalized && v.finalized >= today)

    const avgOpenAgeMins = open.length === 0 ? 0 : Math.round(open.reduce((sum, v) => sum + (Date.now() - v.started.getTime()) / 6e4, 0) / open.length)

    const statCards: StatCard[] = [
      { label: 'Patients Today', value: String(uniqueToday), delta: `${uniqueToday - uniqueYesterday >= 0 ? '+' : ''}${uniqueToday - uniqueYesterday} vs yesterday`, tone: 'cyan', icon: Stethoscope },
      { label: 'Open Visits', value: String(open.length), delta: overdue.length ? `${overdue.length} older than 24h` : 'No aged drafts', tone: 'amber', icon: BellRing },
      { label: 'Notes Completed', value: String(finalized.length), delta: finalizedToday.length ? `${finalizedToday.length} finalized today` : 'No finalizations today', tone: 'emerald', icon: FileText },
    ]

    const queue: QueueItem[] = parsed.slice(0, 5).map((v) => ({
      id: v.id,
      name: v.patient.displayName,
      reason: v.chiefComplaint?.trim() || (v.status === 'finalized' ? 'Review finalized documentation' : 'Continue visit documentation'),
      status: toTitle(v.status),
      priority: queuePriority(v),
      href: v.status === 'finalized' ? `/soap-notes/${v.id}` : `/visit/${v.id}`,
    }))

    const quickPrompts = [
      'Open transcribe',
      'Open SOAP notes',
      'Which visits are still open today?',
      parsed[0] ? `Open ${parsed[0].patient.displayName}\'s notes` : 'Show my most recent patient record',
    ]

    return {
      statCards,
      queue,
      quickPrompts,
      snapshot: [
        { title: 'Open queue', detail: open.length ? `${open.length} draft visit(s) need attention.` : 'No draft visits waiting.', icon: Activity },
        { title: 'Finalized today', detail: finalizedToday.length ? `${finalizedToday.length} visit(s) finalized today.` : 'No visits finalized yet today.', icon: ClipboardList },
        { title: 'Latest activity', detail: parsed[0] ? `${parsed[0].patient.displayName} (${toTitle(parsed[0].status)}), ${rel(parsed[0].startedAt)}.` : 'No visits recorded yet.', icon: FileAudio2 },
      ] as Array<{ title: string; detail: string; icon: LucideIcon }>,
      avgWait: open.length === 0 ? 'No open visits' : avgOpenAgeMins < 60 ? `${avgOpenAgeMins}m` : `${Math.round(avgOpenAgeMins / 60)}h`,
      escalations: String(overdue.length),
      capacity: open.length <= 3 ? 'Stable' : open.length <= 8 ? 'Busy' : 'High',
    }
  }, [visits])

  const modeConfig = COMPOSER_MODES[mode]

  const handleAsk = async (e: FormEvent) => {
    e.preventDefault()
    const trimmed = question.trim()
    if (!trimmed || assistantPending) return
    setAssistantPending(true)
    setAssistantError('')
    try {
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed, currentPath: pathname, history: [{ role: 'user', content: trimmed }] }),
      })
      if (!res.ok) throw new Error('Assistant request failed')
      const data = (await res.json()) as AssistantApiResponse
      setLastQuestion(trimmed)
      setLastAnswer(data.answer?.trim() || 'No response received.')
      setQuestion('')
      if (data.navigateTo) setTimeout(() => router.push(data.navigateTo as string), 300)
    } catch {
      setAssistantError('AI request failed. Please try again.')
    } finally {
      setAssistantPending(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f6efe2] text-slate-900">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-70" style={{ backgroundImage: 'radial-gradient(circle at 10% 10%, rgba(255,255,255,.65), transparent 45%), radial-gradient(circle at 82% 86%, rgba(238,224,197,.72), transparent 42%)' }} />
      <FloatingSidebarNav anchor="top-left" />

      <header className="relative z-10 px-4 pt-20 md:px-6 md:pt-8 md:pl-24">
        <div className="mx-auto max-w-7xl rounded-3xl border border-[#eadfcd] bg-white/70 p-5 shadow-[0_20px_60px_rgba(84,63,31,0.14)] backdrop-blur-xl md:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Synth / Clinician</p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight md:text-4xl">Welcome back, {clinicianName}</h1>
              <p className="mt-3 max-w-2xl text-sm text-slate-600 md:text-base">Live visit board and working assistant tools for your shift.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <div className="inline-flex items-center gap-2 rounded-2xl border border-cyan-200 bg-cyan-50/80 px-3 py-2 text-sm text-cyan-800"><Clock3 size={15} />Shift board active</div>
              <Button asChild className="rounded-full bg-[#0ea5e9] text-white hover:bg-[#38bdf8]"><Link href="/clinician/new-visit"><Plus size={16} className="mr-2" />New Visit</Link></Button>
              <Button asChild variant="ghost" className="rounded-full border border-[#e6d9c4] bg-white/70 text-slate-700 hover:bg-white"><Link href="/signout"><LogOut size={16} className="mr-2" />Sign Out</Link></Button>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 px-4 pb-12 pt-8 md:px-6 md:pb-16 md:pt-8 md:pl-24">
        <div className="mx-auto grid max-w-7xl gap-8 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,0.85fr)]">
          <section className="space-y-8">
            <div className={`rounded-3xl p-6 md:p-7 ${PANEL}`}>
              <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Shift Overview</p>
                  <h2 className="mt-2 text-xl font-semibold tracking-tight md:text-2xl">Today&apos;s clinical board at a glance</h2>
                  <p className="mt-3 text-sm text-slate-600">Metrics and queue data below are computed from your real visits.</p>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
                  <div className="rounded-2xl border border-[#eadfcd] bg-white/70 px-3.5 py-2.5"><p className="text-slate-500">Avg wait</p><p className="mt-1.5 font-semibold">{dashboard.avgWait}</p></div>
                  <div className="rounded-2xl border border-[#eadfcd] bg-white/70 px-3.5 py-2.5"><p className="text-slate-500">Escalations</p><p className="mt-1.5 font-semibold">{dashboard.escalations}</p></div>
                  <div className="col-span-2 rounded-2xl border border-[#eadfcd] bg-white/70 px-3.5 py-2.5 sm:col-span-1"><p className="text-slate-500">Capacity</p><p className="mt-1.5 font-semibold text-emerald-700">{dashboard.capacity}</p></div>
                </div>
              </div>

              {visitsError ? (
                <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50/70 p-4 text-sm text-rose-800"><div className="flex items-center gap-2.5"><AlertCircle size={16} />{visitsError}</div></div>
              ) : visitsLoading ? (
                <div className="mt-5 rounded-2xl border border-[#eadfcd] bg-white/70 p-4 text-sm text-slate-600"><div className="flex items-center gap-2.5"><Loader2 size={16} className="animate-spin" />Loading clinician visit data...</div></div>
              ) : (
                <div className="mt-5 grid gap-4 md:grid-cols-3">
                  {dashboard.statCards.map((card) => {
                    const Icon = card.icon
                    const tone = toneClasses(card.tone)
                    return (
                      <div key={card.label} className={`rounded-2xl border p-5 ${tone.ring}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div><p className="text-xs font-medium text-slate-600">{card.label}</p><p className="mt-2 text-3xl font-semibold tracking-tight">{card.value}</p></div>
                          <span className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${tone.icon}`}><Icon size={18} /></span>
                        </div>
                        <p className={`mt-3 text-xs font-medium ${tone.chip}`}>{card.delta}</p>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className={`rounded-3xl p-6 md:p-7 ${PANEL}`}>
              <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">AI Workspace</p>
                  <h2 className="mt-2 text-xl font-semibold tracking-tight md:text-2xl">Ask, summarize, or triage in one composer</h2>
                  <p className="mt-3 text-sm text-slate-600">{modeConfig.helper}</p>
                </div>
                <div className="inline-flex rounded-2xl border border-[#e8dcc8] bg-white/70 p-1">
                  {(Object.keys(COMPOSER_MODES) as ComposerMode[]).map((nextMode) => {
                    const active = nextMode === mode
                    return (
                      <button key={nextMode} type="button" onClick={() => setMode(nextMode)} aria-pressed={active} className={`rounded-xl px-3 py-2 text-sm font-medium ${active ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                        {COMPOSER_MODES[nextMode].label}
                      </button>
                    )
                  })}
                </div>
              </div>

              <form onSubmit={handleAsk} className="mt-6">
                <div className="rounded-2xl border border-[#eadfcd] bg-white/80 p-4">
                  <div className="flex items-center gap-2 px-2 pb-4 text-xs font-medium text-slate-500"><Search size={14} />Prompt composer <span className={`ml-1 ${modeConfig.accent}`}>{modeConfig.label}</span></div>
                  <textarea value={question} onChange={(e) => setQuestion(e.target.value)} placeholder={modeConfig.placeholder} rows={4} className="w-full resize-none rounded-xl border border-[#eadfcd] bg-white px-4 py-3.5 text-sm outline-none placeholder:text-slate-400 focus:border-cyan-300/40 md:text-base" />
                  <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex flex-wrap gap-2.5">
                      {dashboard.quickPrompts.map((prompt) => (
                        <button key={prompt} type="button" disabled={assistantPending} onClick={() => setQuestion(prompt)} className="rounded-full border border-[#eadfcd] bg-white/70 px-3.5 py-2 text-xs text-slate-700 hover:bg-white disabled:opacity-50">{prompt}</button>
                      ))}
                    </div>
                    <button type="submit" disabled={assistantPending || question.trim().length === 0} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan-300 px-4.5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-200 disabled:opacity-60">
                      {assistantPending ? 'Sending...' : 'Send Prompt'}
                      {assistantPending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                    </button>
                  </div>
                </div>
              </form>

              {assistantError ? <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50/70 p-4 text-sm text-rose-800">{assistantError}</div> : null}
            </div>

            <div className={`rounded-3xl p-6 md:p-7 ${PANEL}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Workflows</p>
                  <h2 className="mt-2 text-lg font-semibold">Clinician playbooks</h2>
                </div>
              </div>
              <div className="mt-5 grid gap-4 md:grid-cols-3">
                {PLAYBOOKS.map((p) => (
                  <Link key={p.href} href={p.href} className="rounded-2xl border border-[#eadfcd] bg-white/70 px-4 py-3.5 text-sm font-medium text-slate-700 hover:bg-white">{p.title}</Link>
                ))}
              </div>
            </div>
          </section>

          <aside className="space-y-8">
            <div className={`rounded-3xl p-6 md:p-7 ${PANEL}`}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Shift Snapshot</p>
                  <h2 className="mt-2 text-lg font-semibold">What needs attention now</h2>
                </div>
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-100 text-cyan-700"><Activity size={18} /></span>
              </div>
              <div className="mt-5 space-y-4">
                {dashboard.snapshot.map((item) => {
                  const Icon = item.icon
                  return (
                    <div key={item.title} className="rounded-2xl border border-[#eadfcd] bg-white/70 p-4">
                      <div className="flex items-start gap-3">
                        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/80 text-slate-700"><Icon size={16} /></span>
                        <div><p className="text-sm font-semibold">{item.title}</p><p className="mt-1 text-xs leading-5 text-slate-600">{item.detail}</p></div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className={`rounded-3xl p-6 md:p-7 ${PANEL}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Focus Queue</p>
                  <h2 className="mt-2 text-lg font-semibold">Next patient tasks</h2>
                </div>
                <span className="text-xs text-slate-500">{dashboard.queue.length} items</span>
              </div>
              <div className="mt-5 space-y-4">
                {dashboard.queue.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[#e2d3bd] bg-white/55 p-4 text-sm text-slate-600">No visits yet. Start a new visit to populate your queue.</div>
                ) : (
                  dashboard.queue.map((item) => {
                    const badge = item.priority === 'High' ? 'border-rose-200 bg-rose-50 text-rose-700' : item.priority === 'Medium' ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-[#eadfcd] bg-white/70 text-slate-700'
                    return (
                      <div key={item.id} className="rounded-2xl border border-[#eadfcd] bg-white/75 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{item.name}</p>
                            <p className="mt-1 text-xs leading-5 text-slate-600">{item.reason}</p>
                          </div>
                          <span className={`rounded-full border px-2 py-1 text-[11px] font-medium ${badge}`}>{item.priority}</span>
                        </div>
                        <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                          <span>{item.status}</span>
                          <Link href={item.href} className="text-cyan-700 hover:text-cyan-800">Open</Link>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            <div className={`rounded-3xl p-6 md:p-7 ${PANEL}`}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Last Prompt</p>
                  <h2 className="mt-2 text-lg font-semibold">Recent AI request</h2>
                </div>
                <Sparkles size={18} className="text-cyan-700" />
              </div>

              {lastQuestion ? (
                <div className="mt-5 rounded-2xl border border-cyan-200 bg-cyan-50/80 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-700">Submitted</p>
                  <p className="mt-2 text-sm leading-6 text-cyan-950">{lastQuestion}</p>
                  <div className="mt-4 border-t border-cyan-200/70 pt-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-700">Response</p>
                    <p className="mt-2 text-sm leading-6 text-cyan-950">{lastAnswer || 'No response recorded.'}</p>
                  </div>
                </div>
              ) : (
                <div className="mt-5 rounded-2xl border border-dashed border-[#e2d3bd] bg-white/55 p-4 text-sm text-slate-600">No prompt submitted yet. Use the composer above to send a real request.</div>
              )}

              <div className="mt-5 grid grid-cols-2 gap-4">
                <Link href="/transcribe" className="rounded-2xl border border-[#eadfcd] bg-white/70 p-4 text-sm text-slate-700 hover:bg-white"><div className="flex items-center gap-2"><FileAudio2 size={15} />Transcribe</div><p className="mt-2.5 text-xs text-slate-500">Review audio backlog</p></Link>
                <Link href="/soap-notes" className="rounded-2xl border border-[#eadfcd] bg-white/70 p-4 text-sm text-slate-700 hover:bg-white"><div className="flex items-center gap-2"><ClipboardList size={15} />SOAP Notes</div><p className="mt-2.5 text-xs text-slate-500">Open documentation tools</p></Link>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  )
}
