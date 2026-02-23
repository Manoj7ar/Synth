'use client'

import Link from 'next/link'
import { type FormEvent, useState } from 'react'
import { Button } from '@/components/ui/button'
import type { LucideIcon } from 'lucide-react'
import {
  Activity,
  BellRing,
  ClipboardList,
  Clock3,
  FileAudio2,
  FileText,
  HeartPulse,
  LogOut,
  Pill,
  Plus,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  TrendingUp,
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

type QueueItem = {
  name: string
  reason: string
  eta: string
  priority: 'High' | 'Medium' | 'Routine'
}

const COMPOSER_MODES: Record<
  ComposerMode,
  { label: string; placeholder: string; helper: string; accent: string }
> = {
  ask: {
    label: 'Ask',
    placeholder: 'Ask about medications, symptom patterns, follow-ups, labs, or visit trends...',
    helper: 'Best for quick clinical questions and pattern checks across recent visits.',
    accent: 'text-cyan-700',
  },
  summarize: {
    label: 'Summarize',
    placeholder: 'Paste visit notes and ask for a concise summary, problem list, or next-step recap...',
    helper: 'Use for rapid note condensation before handoff or charting.',
    accent: 'text-emerald-700',
  },
  triage: {
    label: 'Triage',
    placeholder: 'Describe symptoms, timeline, vitals, and risk factors to generate a triage-oriented checklist...',
    helper: 'Use for structured triage prompts and follow-up questions to ask next.',
    accent: 'text-amber-700',
  },
}

const STAT_CARDS: StatCard[] = [
  {
    label: 'Patients Today',
    value: '18',
    delta: '+4 vs yesterday',
    tone: 'cyan',
    icon: Stethoscope,
  },
  {
    label: 'Follow-ups Due',
    value: '7',
    delta: '3 urgent',
    tone: 'amber',
    icon: BellRing,
  },
  {
    label: 'Notes Completed',
    value: '24',
    delta: '92% on-time',
    tone: 'emerald',
    icon: FileText,
  },
]

const QUICK_PROMPTS = [
  'Which patients need follow-up within 72 hours?',
  'Show medication trends for hypertensive visits this month.',
  'List missing labs for today’s completed consults.',
  'Create a concise follow-up checklist for chest pain complaints.',
]

const SHIFT_SNAPSHOT = [
  {
    title: 'Blood pressure follow-ups',
    detail: '6 patients due this week, 2 overdue by >7 days.',
    icon: HeartPulse,
  },
  {
    title: 'Medication refill signals',
    detail: '3 refill requests linked to recent symptom escalation notes.',
    icon: Pill,
  },
  {
    title: 'Transcription backlog',
    detail: '4 audio files waiting for review and SOAP note extraction.',
    icon: FileAudio2,
  },
]

const FOCUS_QUEUE: QueueItem[] = [
  {
    name: 'A. Johnson',
    reason: 'Post-discharge medication reconciliation',
    eta: '15 min',
    priority: 'High',
  },
  {
    name: 'M. Patel',
    reason: 'Repeat BP follow-up and symptom check-in',
    eta: '30 min',
    priority: 'Medium',
  },
  {
    name: 'R. Smith',
    reason: 'Lab review call and treatment plan update',
    eta: '45 min',
    priority: 'Routine',
  },
]

const PLAYBOOK_CARDS = [
  {
    title: 'Morning Review',
    description: 'Scan appointments, late follow-ups, and open notes before first consult.',
    icon: ClipboardList,
    badge: 'Workflow',
    href: '/clinician/workflows/morning-review',
  },
  {
    title: 'Medication Risk Sweep',
    description: 'Check refill patterns, symptom spikes, and adherence notes in one pass.',
    icon: ShieldCheck,
    badge: 'Safety',
    href: '/clinician/workflows/medication-risk-sweep',
  },
  {
    title: 'Trend Watch',
    description: 'Surface visit-volume and symptom clusters to prioritize outreach.',
    icon: TrendingUp,
    badge: 'Insight',
    href: '/clinician/workflows/trend-watch',
  },
]

const LANDING_GLASS_PANEL =
  'border border-[#eadfcd] bg-white/70 shadow-[0_20px_60px_rgba(84,63,31,0.14)] backdrop-blur-xl'
const LANDING_GLASS_CARD =
  'border border-[#eadfcd] bg-white/60 shadow-[0_16px_38px_rgba(84,63,31,0.1)] backdrop-blur-xl'

function toneClasses(tone: StatCard['tone']): { ring: string; icon: string; chip: string } {
  switch (tone) {
    case 'emerald':
      return {
        ring: 'border-emerald-200 bg-emerald-50/80',
        icon: 'bg-emerald-100 text-emerald-700',
        chip: 'text-emerald-700',
      }
    case 'amber':
      return {
        ring: 'border-amber-200 bg-amber-50/80',
        icon: 'bg-amber-100 text-amber-700',
        chip: 'text-amber-700',
      }
    default:
      return {
        ring: 'border-cyan-200 bg-cyan-50/80',
        icon: 'bg-cyan-100 text-cyan-700',
        chip: 'text-cyan-700',
      }
  }
}

export function ClinicianWorkspace({ clinicianName }: ClinicianWorkspaceProps) {
  const [question, setQuestion] = useState('')
  const [lastQuestion, setLastQuestion] = useState('')
  const [mode, setMode] = useState<ComposerMode>('ask')

  const handleAsk = (e: FormEvent) => {
    e.preventDefault()
    const trimmed = question.trim()
    if (!trimmed) return
    setLastQuestion(trimmed)
    setQuestion('')
  }

  const modeConfig = COMPOSER_MODES[mode]

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f6efe2] text-slate-900">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-80"
        style={{
          backgroundImage:
            'radial-gradient(circle at 12% 14%, rgba(255,255,255,0.6) 0%, transparent 46%), radial-gradient(circle at 82% 86%, rgba(238,224,197,0.72) 0%, transparent 42%), radial-gradient(circle at 58% 24%, rgba(248,236,212,0.82) 0%, transparent 50%), radial-gradient(circle at 80% 16%, rgba(56,189,248,0.08) 0%, transparent 34%)',
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.16] mix-blend-multiply"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180' viewBox='0 0 180 180'%3E%3Cg fill='%2368573f' fill-opacity='0.35'%3E%3Ccircle cx='14' cy='26' r='1'/%3E%3Ccircle cx='42' cy='68' r='1'/%3E%3Ccircle cx='88' cy='32' r='1'/%3E%3Ccircle cx='132' cy='54' r='1'/%3E%3Ccircle cx='168' cy='18' r='1'/%3E%3Ccircle cx='22' cy='122' r='1'/%3E%3Ccircle cx='64' cy='148' r='1'/%3E%3Ccircle cx='114' cy='124' r='1'/%3E%3Ccircle cx='154' cy='144' r='1'/%3E%3Ccircle cx='78' cy='92' r='1'/%3E%3C/g%3E%3C/svg%3E\")",
          backgroundRepeat: 'repeat',
          backgroundSize: '180px 180px',
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-white/45 via-white/10 to-transparent"
      />

      <FloatingSidebarNav anchor="top-left" />

      <header className="relative z-10 px-4 pt-20 sm:pt-24 md:px-6 md:pt-6 md:pl-24 md:pr-6 lg:pr-8">
        <div className="mx-auto max-w-7xl">
          <div className={`rounded-3xl p-4 md:p-6 ${LANDING_GLASS_PANEL}`}>
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-[#e6d9c4] bg-white/70 px-3 py-1 text-xs font-medium text-slate-700 shadow-[0_8px_18px_rgba(109,86,52,0.12)] backdrop-blur-md">
                  <span className="inline-flex size-2 rounded-full bg-emerald-300 animate-pulse" />
                  Clinician Command Center
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Synth / Clinician
                  </p>
                  <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 md:text-4xl">
                    Welcome back, {clinicianName}
                  </h1>
                  <p className="mt-2 max-w-2xl text-sm text-slate-600 md:text-base">
                    Review patient signals, launch visits, and ask focused clinical questions from
                    one workspace.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="inline-flex items-center gap-2 rounded-2xl border border-cyan-200 bg-cyan-50/80 px-3 py-2 text-sm text-cyan-800">
                  <Clock3 size={15} />
                  Shift board active
                </div>
                <Button
                  asChild
                  className="rounded-full bg-[#0ea5e9] text-white shadow-lg hover:bg-[#38bdf8]"
                >
                  <Link href="/clinician/new-visit">
                    <Plus size={16} className="mr-2" />
                    New Visit
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="ghost"
                  className="rounded-full border border-[#e6d9c4] bg-white/70 text-slate-700 shadow-[0_8px_18px_rgba(109,86,52,0.12)] backdrop-blur-md hover:bg-white"
                >
                  <Link href="/signout">
                    <LogOut size={16} className="mr-2" />
                    Sign Out
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 px-4 pb-10 pt-6 md:px-6 md:pb-14 md:pl-24 md:pr-6 lg:pr-8">
        <div className="mx-auto grid max-w-7xl gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,0.85fr)]">
          <section className="space-y-6">
            <div className={`relative overflow-hidden rounded-3xl p-5 md:p-6 ${LANDING_GLASS_PANEL}`}>
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-24 -top-24 h-48 w-48 rounded-full bg-cyan-400/10 blur-3xl"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-16 left-10 h-40 w-40 rounded-full bg-emerald-300/10 blur-3xl"
              />

              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Shift Overview
                    </p>
                    <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-900 md:text-2xl">
                      Today&apos;s clinical board at a glance
                    </h2>
                    <p className="mt-2 text-sm text-slate-600">
                      Prioritize follow-ups, track note progress, and surface risk signals before
                      they become bottlenecks.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
                    <div className="rounded-2xl border border-[#eadfcd] bg-white/70 px-3 py-2">
                      <p className="text-slate-500">Avg wait</p>
                      <p className="mt-1 font-semibold text-slate-900">11m</p>
                    </div>
                    <div className="rounded-2xl border border-[#eadfcd] bg-white/70 px-3 py-2">
                      <p className="text-slate-500">Escalations</p>
                      <p className="mt-1 font-semibold text-slate-900">2</p>
                    </div>
                    <div className="rounded-2xl border border-[#eadfcd] bg-white/70 px-3 py-2 col-span-2 sm:col-span-1">
                      <p className="text-slate-500">Capacity</p>
                      <p className="mt-1 font-semibold text-emerald-700">Stable</p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  {STAT_CARDS.map((card) => {
                    const Icon = card.icon
                    const tone = toneClasses(card.tone)

                    return (
                      <div
                        key={card.label}
                        className={`rounded-2xl border p-4 transition hover:-translate-y-0.5 hover:bg-white/10 ${tone.ring}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-medium text-slate-600">{card.label}</p>
                            <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
                              {card.value}
                            </p>
                          </div>
                          <span
                            className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${tone.icon}`}
                          >
                            <Icon size={18} />
                          </span>
                        </div>
                        <p className={`mt-3 text-xs font-medium ${tone.chip}`}>{card.delta}</p>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className={`rounded-3xl p-5 md:p-6 ${LANDING_GLASS_PANEL}`}>
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    AI Workspace
                  </p>
                  <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-900 md:text-2xl">
                    Ask, summarize, or triage in one composer
                  </h2>
                  <p className="mt-2 text-sm text-slate-600">{modeConfig.helper}</p>
                </div>

                <div className="inline-flex rounded-2xl border border-[#e8dcc8] bg-white/70 p-1 backdrop-blur-lg">
                  {(Object.keys(COMPOSER_MODES) as ComposerMode[]).map((nextMode) => {
                    const active = nextMode === mode

                    return (
                      <button
                        key={nextMode}
                        type="button"
                        onClick={() => setMode(nextMode)}
                        aria-pressed={active}
                        className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                          active
                            ? 'bg-white text-slate-900 shadow-[0_1px_2px_rgba(84,63,31,0.12)]'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        {COMPOSER_MODES[nextMode].label}
                      </button>
                    )
                  })}
                </div>
              </div>

              <form onSubmit={handleAsk} className="mt-5">
                <div className="rounded-2xl border border-[#eadfcd] bg-white/75 p-3 backdrop-blur-lg">
                  <div className="flex items-center gap-2 px-2 pb-3 text-xs font-medium text-slate-500">
                    <Search size={14} />
                    Prompt composer
                    <span className={`ml-1 ${modeConfig.accent}`}>{COMPOSER_MODES[mode].label}</span>
                  </div>

                  <textarea
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder={modeConfig.placeholder}
                    rows={4}
                    className="w-full resize-none rounded-xl border border-[#eadfcd] bg-white/85 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-300/40 focus:bg-white md:text-base"
                  />

                  <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="flex flex-wrap gap-2">
                      {QUICK_PROMPTS.map((prompt) => (
                        <button
                          key={prompt}
                          type="button"
                          onClick={() => setQuestion(prompt)}
                          className="rounded-full border border-[#eadfcd] bg-white/70 px-3 py-1.5 text-xs text-slate-700 transition hover:bg-white"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>

                    <button
                      type="submit"
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan-300 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
                    >
                      Send Prompt
                      <Send size={16} />
                    </button>
                  </div>
                </div>
              </form>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {PLAYBOOK_CARDS.map((playbook) => {
                const Icon = playbook.icon

                return (
                  <Link
                    key={playbook.title}
                    href={playbook.href}
                    className={`group rounded-3xl p-4 text-left transition hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.08] ${LANDING_GLASS_CARD}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/80 text-slate-700">
                        <Icon size={18} />
                      </span>
                      <span className="rounded-full border border-[#eadfcd] bg-white/70 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-slate-600">
                        {playbook.badge}
                      </span>
                    </div>
                    <h3 className="mt-4 text-base font-semibold text-slate-900">{playbook.title}</h3>
                    <p className="mt-2 text-sm leading-5 text-slate-600">{playbook.description}</p>
                    <div className="mt-4 inline-flex items-center text-sm font-medium text-cyan-700 transition group-hover:text-cyan-800">
                      Open workflow
                      <span className="ml-1">→</span>
                    </div>
                  </Link>
                )
              })}
            </div>
          </section>

          <aside className="space-y-6">
            <div className={`rounded-3xl p-5 md:p-6 ${LANDING_GLASS_PANEL}`}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Shift Snapshot
                  </p>
                  <h2 className="mt-2 text-lg font-semibold text-slate-900">What needs attention now</h2>
                </div>
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-100 text-cyan-700">
                  <Activity size={18} />
                </span>
              </div>

              <div className="mt-5 space-y-4">
                {SHIFT_SNAPSHOT.map((item) => {
                  const Icon = item.icon
                  return (
                    <div
                      key={item.title}
                      className="rounded-2xl border border-[#eadfcd] bg-white/70 p-3 transition hover:bg-white"
                    >
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/80 text-slate-700">
                          <Icon size={16} />
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                          <p className="mt-1 text-xs leading-5 text-slate-600">{item.detail}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className={`rounded-3xl p-5 md:p-6 ${LANDING_GLASS_PANEL}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Focus Queue
                  </p>
                  <h2 className="mt-2 text-lg font-semibold text-slate-900">Next patient tasks</h2>
                </div>
                <span className="text-xs text-slate-500">{FOCUS_QUEUE.length} items</span>
              </div>

              <div className="mt-4 space-y-3">
                {FOCUS_QUEUE.map((item) => {
                  const priorityClasses =
                    item.priority === 'High'
                      ? 'border-rose-300/20 bg-rose-300/10 text-rose-200'
                      : item.priority === 'Medium'
                        ? 'border-amber-300/20 bg-amber-300/10 text-amber-200'
                        : 'border-[#eadfcd] bg-white/70 text-slate-700'

                  return (
                    <div
                      key={`${item.name}-${item.reason}`}
                      className="rounded-2xl border border-[#eadfcd] bg-white/75 p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{item.name}</p>
                          <p className="mt-1 text-xs leading-5 text-slate-600">{item.reason}</p>
                        </div>
                        <span
                          className={`rounded-full border px-2 py-1 text-[11px] font-medium ${priorityClasses}`}
                        >
                          {item.priority}
                        </span>
                      </div>
                      <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                        <span>ETA {item.eta}</span>
                        <button type="button" className="text-cyan-700 transition hover:text-cyan-800">
                          Open
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className={`rounded-3xl p-5 md:p-6 ${LANDING_GLASS_PANEL}`}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Last Prompt
                  </p>
                  <h2 className="mt-2 text-lg font-semibold text-slate-900">Recent AI request</h2>
                </div>
                <Sparkles size={18} className="text-cyan-700" />
              </div>

              {lastQuestion ? (
                <div className="mt-4 rounded-2xl border border-cyan-200 bg-cyan-50/80 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-700">
                    Submitted
                  </p>
                  <p className="mt-2 text-sm leading-6 text-cyan-950">{lastQuestion}</p>
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-dashed border-[#e2d3bd] bg-white/55 p-4">
                  <p className="text-sm text-slate-600">
                    No prompt submitted yet in this session. Use the composer to save the latest
                    question here for quick reference.
                  </p>
                </div>
              )}

              <div className="mt-4 grid grid-cols-2 gap-3">
                <Link
                  href="/transcribe"
                  className="rounded-2xl border border-[#eadfcd] bg-white/70 p-3 text-sm text-slate-700 transition hover:bg-white"
                >
                  <div className="flex items-center gap-2">
                    <FileAudio2 size={15} />
                    Transcribe
                  </div>
                  <p className="mt-2 text-xs text-slate-500">Review audio backlog</p>
                </Link>
                <Link
                  href="/soap-notes"
                  className="rounded-2xl border border-[#eadfcd] bg-white/70 p-3 text-sm text-slate-700 transition hover:bg-white"
                >
                  <div className="flex items-center gap-2">
                    <ClipboardList size={15} />
                    SOAP Notes
                  </div>
                  <p className="mt-2 text-xs text-slate-500">Open documentation tools</p>
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  )
}
