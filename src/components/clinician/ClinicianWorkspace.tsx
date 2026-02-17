'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { LogOut, Plus, Search, Send } from 'lucide-react'
import { FloatingSidebarNav } from '@/components/clinician/FloatingSidebarNav'

interface ClinicianWorkspaceProps {
  clinicianName: string
}

export function ClinicianWorkspace({ clinicianName }: ClinicianWorkspaceProps) {
  const [question, setQuestion] = useState('')
  const [lastQuestion, setLastQuestion] = useState('')

  const handleAsk = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = question.trim()
    if (!trimmed) return
    setLastQuestion(trimmed)
    setQuestion('')
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f6efe2] text-slate-900">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          backgroundImage:
            'radial-gradient(circle at 12% 14%, rgba(255,255,255,0.55) 0%, transparent 45%), radial-gradient(circle at 82% 86%, rgba(238,224,197,0.6) 0%, transparent 42%), radial-gradient(circle at 58% 24%, rgba(248,236,212,0.7) 0%, transparent 50%)',
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.18] mix-blend-multiply"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180' viewBox='0 0 180 180'%3E%3Cg fill='%2368573f' fill-opacity='0.35'%3E%3Ccircle cx='14' cy='26' r='1'/%3E%3Ccircle cx='42' cy='68' r='1'/%3E%3Ccircle cx='88' cy='32' r='1'/%3E%3Ccircle cx='132' cy='54' r='1'/%3E%3Ccircle cx='168' cy='18' r='1'/%3E%3Ccircle cx='22' cy='122' r='1'/%3E%3Ccircle cx='64' cy='148' r='1'/%3E%3Ccircle cx='114' cy='124' r='1'/%3E%3Ccircle cx='154' cy='144' r='1'/%3E%3Ccircle cx='78' cy='92' r='1'/%3E%3C/g%3E%3C/svg%3E\")",
          backgroundRepeat: 'repeat',
          backgroundSize: '180px 180px',
        }}
      />

      <FloatingSidebarNav />

      <div className="fixed right-4 top-4 z-20 flex items-center gap-2 md:right-6 md:top-6">
        <Button asChild>
          <Link href="/clinician/new-visit">
            <Plus size={16} className="mr-2" />
            New Visit
          </Link>
        </Button>
        <Button asChild variant="ghost">
          <Link href="/signout">
            <LogOut size={16} className="mr-2" />
            Sign Out
          </Link>
        </Button>
      </div>

      <header className="fixed left-4 top-4 z-20 flex items-center md:left-6 md:top-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Synth</p>
          <p className="text-sm font-medium text-slate-700">Welcome, {clinicianName}</p>
        </div>
      </header>

      <main className="relative z-10 flex items-center justify-center p-6 md:p-10">
        <div className="mt-14 w-full max-w-3xl rounded-[30px] border border-[#e8dcc8] bg-[#fff8ea]/80 px-6 py-8 shadow-[0_24px_70px_rgba(114,90,56,0.18)] backdrop-blur-xl md:mt-16 md:px-10 md:py-12">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Clinician Workspace
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
            Ask a question
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-slate-600 md:text-base">
            Start with any clinical question about medications, symptoms, follow-ups, or visit
            trends.
          </p>

          <form onSubmit={handleAsk} className="mt-8">
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-2">
              <Search className="ml-2 size-5 text-slate-500" />
              <input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask about medications, symptoms, follow-ups, or visit trends..."
                className="h-11 flex-1 bg-transparent px-2 text-sm text-slate-900 outline-none placeholder:text-slate-500 md:text-base"
              />
              <button
                type="submit"
                className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-sky-500 text-white transition hover:bg-sky-400"
                aria-label="Ask question"
              >
                <Send size={17} />
              </button>
            </div>
          </form>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setQuestion('What medications are most common this month?')}
              className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-200"
            >
              Common medications
            </button>
            <button
              type="button"
              onClick={() => setQuestion('Which patients need follow-up soon?')}
              className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-200"
            >
              Follow-up reminders
            </button>
            <button
              type="button"
              onClick={() => setQuestion('Show me blood pressure related visits.')}
              className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-200"
            >
              Blood pressure visits
            </button>
          </div>

          {lastQuestion && (
            <div className="mt-6 rounded-2xl bg-sky-50 px-4 py-3 text-sm text-sky-900">
              Last question: <span className="font-semibold">{lastQuestion}</span>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
