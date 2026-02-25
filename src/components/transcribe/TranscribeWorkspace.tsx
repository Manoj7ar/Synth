'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  AudioLines,
  FileText,
  LogOut,
  Plus,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { FloatingSidebarNav } from '@/components/clinician/FloatingSidebarNav'
import { TranscribeRecorder } from '@/components/transcribe/TranscribeRecorder'

interface TranscribeWorkspaceProps {
  clinicianName: string
}

const PANEL =
  'border border-[#eadfcd] bg-white/75 shadow-[0_14px_40px_rgba(84,63,31,0.12)] backdrop-blur-xl'

export function TranscribeWorkspace({ clinicianName }: TranscribeWorkspaceProps) {
  const [isRecordingFocus, setIsRecordingFocus] = useState(false)

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f6efe2] text-slate-900">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          backgroundImage:
            'radial-gradient(circle at 10% 10%, rgba(255,255,255,.65), transparent 45%), radial-gradient(circle at 82% 86%, rgba(238,224,197,.72), transparent 42%), radial-gradient(circle at 58% 24%, rgba(248,236,212,.65), transparent 50%)',
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

      <FloatingSidebarNav anchor="top-left" fadeOnScroll />

      <div className="fixed right-4 top-4 z-20 flex items-center gap-2 md:right-6 md:top-6">
        <Button
          asChild
          className="rounded-full bg-[#0ea5e9] text-white shadow-[0_10px_24px_rgba(14,165,233,0.24)] hover:bg-[#38bdf8]"
        >
          <Link href="/clinician/new-visit">
            <Plus size={16} className="mr-2" />
            New Visit
          </Link>
        </Button>
        <Button
          asChild
          variant="ghost"
          className="rounded-full border border-[#e6d9c4] bg-white/70 text-slate-700 backdrop-blur-md hover:bg-white"
        >
          <Link href="/signout">
            <LogOut size={16} className="mr-2" />
            Sign Out
          </Link>
        </Button>
      </div>

      <header className="relative z-10 px-4 pt-20 md:px-6 md:pt-8 md:pl-24">
        <div
          className={`mx-auto max-w-7xl rounded-3xl border border-[#eadfcd] bg-white/70 p-6 shadow-[0_20px_60px_rgba(84,63,31,0.14)] backdrop-blur-xl md:p-8 ${
            isRecordingFocus ? 'opacity-95' : ''
          }`}
        >
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Synth / Transcribe
              </p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight md:text-4xl">
                {isRecordingFocus
                  ? 'Live recording session in progress'
                  : `Welcome back, ${clinicianName}`}
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600 md:text-base md:leading-7">
                {isRecordingFocus
                  ? 'Capture the visit, monitor the live transcript, then save a structured record for SOAP generation.'
                  : 'Record visits, review AI transcript segments, and save the session directly into your SOAP notes workflow.'}
              </p>
            </div>

            <div className="flex flex-col gap-3.5 sm:flex-row sm:flex-wrap sm:items-center">
              <div className="inline-flex items-center gap-2 rounded-2xl border border-cyan-200 bg-cyan-50/80 px-3.5 py-2.5 text-sm text-cyan-800">
                <AudioLines size={15} />
                {isRecordingFocus ? 'Recording focus mode' : 'Transcription workspace'}
              </div>
              <div className="inline-flex items-center gap-2 rounded-2xl border border-[#eadfcd] bg-white/75 px-3.5 py-2.5 text-sm text-slate-700">
                <ShieldCheck size={15} />
                Clinician-only save flow
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 px-4 pb-14 pt-8 md:px-6 md:pb-20 md:pt-9 md:pl-24">
        <div
          className={`mx-auto grid max-w-7xl gap-10 ${
            isRecordingFocus
              ? 'grid-cols-1'
              : 'xl:grid-cols-[minmax(0,1.35fr)_minmax(0,0.8fr)]'
          }`}
        >
          <section className="space-y-10">
            {!isRecordingFocus && (
              <div className={`rounded-3xl p-6 md:p-8 ${PANEL}`}>
                <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Workflow
                    </p>
                    <h2 className="mt-2 text-xl font-semibold tracking-tight md:text-2xl">
                      Turn spoken visits into structured documentation
                    </h2>
                    <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">
                      Start recording, monitor live transcript quality, stop to run server
                      transcription, then save the patient record for SOAP notes and follow-up
                      workflows.
                    </p>
                  </div>
                  <div className="grid gap-4 text-sm sm:grid-cols-2 lg:w-[24rem]">
                    <div className="rounded-2xl border border-[#eadfcd] bg-white/75 p-5">
                      <div className="flex items-center gap-2 text-slate-800">
                        <AudioLines size={16} className="text-cyan-700" />
                        <span className="font-medium">Live capture</span>
                      </div>
                      <p className="mt-2.5 text-xs leading-5 text-slate-600">
                        Browser mic capture with live transcript fallback.
                      </p>
                    </div>
                    <div className="rounded-2xl border border-[#eadfcd] bg-white/75 p-5">
                      <div className="flex items-center gap-2 text-slate-800">
                        <Sparkles size={16} className="text-cyan-700" />
                        <span className="font-medium">AI parsing</span>
                      </div>
                      <p className="mt-2.5 text-xs leading-5 text-slate-600">
                        Segment transcript into doctor and patient turns.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className={`rounded-3xl p-6 md:p-8 ${PANEL}`}>
              <TranscribeRecorder onRecordingFocusChange={setIsRecordingFocus} />
            </div>
          </section>

          {!isRecordingFocus && (
            <aside className="space-y-10">
              <div className={`rounded-3xl p-6 md:p-8 ${PANEL}`}>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Recording Tips
                </p>
                <h2 className="mt-2 text-lg font-semibold">Better transcript quality</h2>
                <div className="mt-6 space-y-4">
                  {[
                    'Use a quiet room and keep the microphone between clinician and patient.',
                    'Pause briefly between speakers when possible to improve turn segmentation.',
                    'Review AI output before saving if fallback browser transcript was used.',
                  ].map((tip) => (
                    <div
                      key={tip}
                      className="rounded-2xl border border-[#eadfcd] bg-white/70 p-5 text-sm leading-7 text-slate-700"
                    >
                      {tip}
                    </div>
                  ))}
                </div>
              </div>

              <div className={`rounded-3xl p-6 md:p-8 ${PANEL}`}>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Next Steps
                </p>
                <h2 className="mt-2 text-lg font-semibold">After transcription</h2>
                <div className="mt-6 grid gap-4">
                  <Link
                    href="/soap-notes"
                    className="rounded-2xl border border-[#eadfcd] bg-white/75 p-5 text-sm text-slate-700 transition hover:bg-white"
                  >
                    <div className="flex items-center gap-2 font-medium text-slate-900">
                      <FileText size={16} className="text-cyan-700" />
                      SOAP Notes Library
                    </div>
                    <p className="mt-2.5 text-xs leading-5 text-slate-500">
                      Open saved patient records, summaries, transcripts, and SOAP notes.
                    </p>
                  </Link>

                  <Link
                    href="/clinician/new-visit"
                    className="rounded-2xl border border-[#eadfcd] bg-white/75 p-5 text-sm text-slate-700 transition hover:bg-white"
                  >
                    <div className="flex items-center gap-2 font-medium text-slate-900">
                      <Plus size={16} className="text-cyan-700" />
                      Start Another Visit
                    </div>
                    <p className="mt-2.5 text-xs leading-5 text-slate-500">
                      Create a new visit entry if you want to document manually first.
                    </p>
                  </Link>
                </div>
              </div>
            </aside>
          )}
        </div>
      </main>
    </div>
  )
}
