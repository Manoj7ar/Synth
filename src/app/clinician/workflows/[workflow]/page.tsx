import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { LucideIcon } from 'lucide-react'
import {
  ArrowLeft,
  ClipboardList,
  FileText,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  TrendingUp,
} from 'lucide-react'
import { FloatingSidebarNav } from '@/components/clinician/FloatingSidebarNav'
import { requireClinicianPage } from '@/lib/server/clinician-auth'

type WorkflowKey = 'morning-review' | 'medication-risk-sweep' | 'trend-watch'

type WorkflowDetails = {
  badge: 'Workflow' | 'Safety' | 'Insight'
  title: string
  description: string
  icon: LucideIcon
  overview: string
  checklist: string[]
  outputs: string[]
  prompts: string[]
  relatedPages: Array<{ label: string; href: string; note: string }>
}

const WORKFLOWS: Record<WorkflowKey, WorkflowDetails> = {
  'morning-review': {
    badge: 'Workflow',
    title: 'Morning Review',
    description: 'Scan appointments, late follow-ups, and open notes before first consult.',
    icon: ClipboardList,
    overview:
      'Use this before clinic starts to build a clear list of urgent follow-ups, unfinished documentation, and visit prep tasks for the day.',
    checklist: [
      'Review today’s patient list and confirm high-priority visits.',
      'Check late follow-ups and overdue callbacks from previous days.',
      'Open incomplete SOAP notes and identify documentation blockers.',
      'Capture top risks or reminders for the first 3-5 consults.',
      'Prepare one AI prompt for any expected complex visit.',
    ],
    outputs: [
      'Prioritized patient queue for the first consult block',
      'List of overdue follow-ups to address today',
      'Open documentation tasks requiring completion',
      'Prepared prompts for expected high-risk or complex visits',
    ],
    prompts: [
      'Which patients need follow-up within 72 hours?',
      'Show any overdue documentation from visits finalized this week.',
      'Summarize priority concerns for today’s first appointments.',
    ],
    relatedPages: [
      { label: 'Clinician Dashboard', href: '/clinician', note: 'Run the AI workspace and review queue signals.' },
      { label: 'SOAP Notes', href: '/soap-notes', note: 'Close documentation gaps before clinic load increases.' },
      { label: 'Transcribe', href: '/transcribe', note: 'Check audio backlog that may block notes later.' },
    ],
  },
  'medication-risk-sweep': {
    badge: 'Safety',
    title: 'Medication Risk Sweep',
    description: 'Check refill patterns, symptom spikes, and adherence notes in one pass.',
    icon: ShieldCheck,
    overview:
      'Use this workflow to quickly surface medication-related concerns from recent visits, refill requests, and symptom escalations so the team can act early.',
    checklist: [
      'Identify refill requests with repeated early refill timing or missing follow-up.',
      'Review symptom notes linked to medication changes or dose adjustments.',
      'Scan for adherence concerns, side effects, or patient confusion in notes.',
      'Flag patients needing clinician callback or medication reconciliation.',
      'Document a short action plan for high-priority cases.',
    ],
    outputs: [
      'Medication risk list with urgency markers',
      'Patients needing medication reconciliation',
      'Follow-up call tasks for side effects or adherence issues',
      'Short summary to hand off to nursing/admin staff',
    ],
    prompts: [
      'List patients with refill requests linked to symptom escalation notes.',
      'Summarize medication-related complaints from this week’s visits.',
      'Create a callback checklist for patients with adherence concerns.',
    ],
    relatedPages: [
      { label: 'Clinician Dashboard', href: '/clinician', note: 'Use AI prompts to find medication patterns quickly.' },
      { label: 'SOAP Notes', href: '/soap-notes', note: 'Review finalized notes for medication mentions and plans.' },
      { label: 'Transcribe', href: '/transcribe', note: 'Process audio still waiting on medication detail extraction.' },
    ],
  },
  'trend-watch': {
    badge: 'Insight',
    title: 'Trend Watch',
    description: 'Surface visit-volume and symptom clusters to prioritize outreach.',
    icon: TrendingUp,
    overview:
      'Use this workflow to spot changing visit patterns, repeated complaints, and clusters that may require proactive outreach or scheduling changes.',
    checklist: [
      'Review visit volume changes by day or week for recent periods.',
      'Scan repeated symptom themes across current and recent visits.',
      'Note high-frequency complaints that may need outreach campaigns.',
      'Identify patient groups needing proactive follow-up or education.',
      'Capture a short summary with next actions and owners.',
    ],
    outputs: [
      'Top symptom/complaint clusters',
      'Short trend summary for daily huddle',
      'Outreach candidates and follow-up priorities',
      'Operational signals for staffing or scheduling review',
    ],
    prompts: [
      'Show symptom clusters appearing most often in the last 14 days.',
      'Summarize visit volume trends and high-frequency complaints.',
      'Suggest outreach priorities based on repeated follow-up needs.',
    ],
    relatedPages: [
      { label: 'Clinician Dashboard', href: '/clinician', note: 'Run trend-oriented prompts in the AI workspace.' },
      { label: 'SOAP Notes', href: '/soap-notes', note: 'Use completed notes to validate complaint trends.' },
      { label: 'Transcribe', href: '/transcribe', note: 'Reduce transcription backlog to improve trend coverage.' },
    ],
  },
}

function isWorkflowKey(value: string): value is WorkflowKey {
  return value in WORKFLOWS
}

export default async function ClinicianWorkflowPage({
  params,
}: {
  params: Promise<{ workflow: string }>
}) {
  const { user } = await requireClinicianPage()

  const { workflow } = await params

  if (!isWorkflowKey(workflow)) {
    notFound()
  }

  const details = WORKFLOWS[workflow]
  const Icon = details.icon

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

      <main className="relative z-10 px-4 pb-10 pt-20 sm:pt-24 md:px-6 md:pb-14 md:pl-24 md:pr-6 md:pt-6 lg:pr-8">
        <div className="mx-auto max-w-6xl space-y-6">
          <header className="rounded-3xl border border-[#eadfcd] bg-white/70 p-5 shadow-[0_20px_60px_rgba(84,63,31,0.14)] backdrop-blur-xl md:p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="space-y-3">
                <Link
                  href="/clinician"
                  className="inline-flex items-center gap-2 rounded-full border border-[#e6d9c4] bg-white/70 px-3 py-1.5 text-sm text-slate-700 shadow-[0_8px_18px_rgba(109,86,52,0.12)] backdrop-blur-md hover:bg-white"
                >
                  <ArrowLeft size={14} />
                  Back to Clinician
                </Link>

                <div className="inline-flex items-center gap-2 rounded-full border border-[#e6d9c4] bg-white/70 px-3 py-1 text-xs font-medium text-slate-700 shadow-[0_8px_18px_rgba(109,86,52,0.12)] backdrop-blur-md">
                  <Icon size={14} className="text-cyan-700" />
                  {details.badge}
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Workflow Detail
                  </p>
                  <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 md:text-4xl">
                    {details.title}
                  </h1>
                  <p className="mt-3 max-w-3xl text-sm text-slate-600 md:text-base">
                    {details.description}
                  </p>
                  <p className="mt-3 text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
                    {user.name ?? 'Clinician'}
                    {user.specialty ? ` · ${user.specialty}` : ''}
                    {user.practiceName ? ` · ${user.practiceName}` : ''}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-cyan-200 bg-cyan-50/80 p-4 text-sm text-cyan-900 md:max-w-sm">
                <div className="mb-2 inline-flex items-center gap-2 font-semibold">
                  <Sparkles size={15} />
                  Overview
                </div>
                <p>{details.overview}</p>
              </div>
            </div>
          </header>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
            <section className="space-y-6">
              <div className="rounded-3xl border border-[#eadfcd] bg-white/70 p-5 shadow-[0_20px_60px_rgba(84,63,31,0.14)] backdrop-blur-xl md:p-6">
                <div className="flex items-center gap-2">
                  <Stethoscope size={18} className="text-cyan-700" />
                  <h2 className="text-lg font-semibold text-slate-900">Step-by-Step Checklist</h2>
                </div>
                <ol className="mt-4 space-y-3">
                  {details.checklist.map((step, index) => (
                    <li
                      key={step}
                      className="flex gap-3 rounded-2xl border border-[#eadfcd] bg-white/75 p-3"
                    >
                      <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cyan-100 text-sm font-semibold text-cyan-800">
                        {index + 1}
                      </span>
                      <p className="text-sm leading-6 text-slate-700">{step}</p>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="rounded-3xl border border-[#eadfcd] bg-white/70 p-5 shadow-[0_20px_60px_rgba(84,63,31,0.14)] backdrop-blur-xl md:p-6">
                <div className="flex items-center gap-2">
                  <FileText size={18} className="text-cyan-700" />
                  <h2 className="text-lg font-semibold text-slate-900">Suggested AI Prompts</h2>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {details.prompts.map((prompt) => (
                    <div
                      key={prompt}
                      className="rounded-2xl border border-[#eadfcd] bg-white/75 px-3 py-2 text-sm text-slate-700"
                    >
                      {prompt}
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <aside className="space-y-6">
              <div className="rounded-3xl border border-[#eadfcd] bg-white/70 p-5 shadow-[0_20px_60px_rgba(84,63,31,0.14)] backdrop-blur-xl md:p-6">
                <h2 className="text-lg font-semibold text-slate-900">Expected Outputs</h2>
                <ul className="mt-4 space-y-2">
                  {details.outputs.map((item) => (
                    <li
                      key={item}
                      className="rounded-2xl border border-[#eadfcd] bg-white/75 px-3 py-2 text-sm text-slate-700"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-3xl border border-[#eadfcd] bg-white/70 p-5 shadow-[0_20px_60px_rgba(84,63,31,0.14)] backdrop-blur-xl md:p-6">
                <h2 className="text-lg font-semibold text-slate-900">Open Related Pages</h2>
                <div className="mt-4 space-y-3">
                  {details.relatedPages.map((page) => (
                    <Link
                      key={page.href}
                      href={page.href}
                      className="block rounded-2xl border border-[#eadfcd] bg-white/75 p-3 transition hover:bg-white"
                    >
                      <p className="text-sm font-semibold text-slate-900">{page.label}</p>
                      <p className="mt-1 text-xs leading-5 text-slate-600">{page.note}</p>
                    </Link>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </main>
    </div>
  )
}
