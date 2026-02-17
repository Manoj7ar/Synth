'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { LogOut, Plus } from 'lucide-react'
import { FloatingSidebarNav } from '@/components/clinician/FloatingSidebarNav'
import { TranscribeRecorder } from '@/components/transcribe/TranscribeRecorder'

interface TranscribeWorkspaceProps {
  clinicianName: string
}

export function TranscribeWorkspace({ clinicianName }: TranscribeWorkspaceProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(135deg,#f7f9ff_0%,#e5ecff_50%,#eef3ff_100%)] text-slate-900">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-75"
        style={{
          backgroundImage:
            'radial-gradient(circle at 10% 12%, rgba(255,255,255,0.8) 0%, transparent 42%), radial-gradient(circle at 84% 16%, rgba(152,185,255,0.34) 0%, transparent 44%), radial-gradient(circle at 74% 86%, rgba(128,95,255,0.18) 0%, transparent 48%)',
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.1] mix-blend-multiply"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160' viewBox='0 0 160 160'%3E%3Cg fill='%232d3f67' fill-opacity='0.26'%3E%3Ccircle cx='14' cy='26' r='1'/%3E%3Ccircle cx='42' cy='68' r='1'/%3E%3Ccircle cx='88' cy='32' r='1'/%3E%3Ccircle cx='132' cy='54' r='1'/%3E%3Ccircle cx='22' cy='122' r='1'/%3E%3Ccircle cx='64' cy='148' r='1'/%3E%3Ccircle cx='114' cy='124' r='1'/%3E%3Ccircle cx='78' cy='92' r='1'/%3E%3C/g%3E%3C/svg%3E\")",
          backgroundRepeat: 'repeat',
          backgroundSize: '160px 160px',
        }}
      />

      <FloatingSidebarNav />

      <div className="fixed right-4 top-4 z-20 flex items-center gap-2 md:right-6 md:top-6">
        <Button asChild className="rounded-xl bg-[linear-gradient(135deg,#2563eb_0%,#7c3aed_100%)] text-white shadow-[0_10px_24px_rgba(37,99,235,0.32)] hover:opacity-95">
          <Link href="/clinician/new-visit">
            <Plus size={16} className="mr-2" />
            New Visit
          </Link>
        </Button>
        <Button asChild variant="ghost" className="rounded-xl bg-white/70 text-slate-700 backdrop-blur-md hover:bg-white">
          <Link href="/signout">
            <LogOut size={16} className="mr-2" />
            Sign Out
          </Link>
        </Button>
      </div>

      <header className="fixed left-4 top-4 z-20 flex items-center md:left-6 md:top-6">
        <div className="rounded-2xl border border-white/55 bg-white/65 px-4 py-3 shadow-[0_8px_24px_rgba(49,75,130,0.16)] backdrop-blur-md">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Synth</p>
          <p className="text-sm font-medium text-slate-700">Welcome, {clinicianName}</p>
        </div>
      </header>

      <main className="relative z-10 px-6 pb-10 pt-24 md:px-10 md:pb-14 md:pt-28">
        <div className="mx-auto w-full max-w-6xl">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Transcribe
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 md:text-5xl">
            Turn every conversation into structured clinical output
          </h1>
          <p className="mt-3 max-w-3xl text-sm text-slate-600 md:text-lg">
            Capture visits in real time, watch AI extract clinical signals, and save complete
            transcripts for SOAP generation and follow-up workflows.
          </p>

          <div className="mt-8">
            <TranscribeRecorder />
          </div>
        </div>
      </main>
    </div>
  )
}
