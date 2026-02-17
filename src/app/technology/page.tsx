import Link from "next/link";
import {
  ArrowRight,
  AudioLines,
  BrainCircuit,
  Database,
  FileStack,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

const stackItems = [
  {
    title: "Frontend",
    body: "Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4, and shadcn/ui for fast clinical UI iteration.",
    icon: Sparkles,
  },
  {
    title: "Core Data Layer",
    body: "Prisma ORM with SQLite schema for users, patients, visits, notes, share links, appointments, and care plan items.",
    icon: Database,
  },
  {
    title: "AI Layer",
    body: "Gemini 2.0 Flash powers audio-to-transcript conversion, conversation summaries, and SOAP draft generation.",
    icon: BrainCircuit,
  },
  {
    title: "Search and Analytics",
    body: "Elastic integrations support indexed chunks, entity extraction, analytics, and optional audit trail capabilities.",
    icon: FileStack,
  },
];

const flowSteps = [
  {
    title: "1. Capture",
    body: "Browser audio capture starts in Transcribe. Session state is tracked in real time with start, pause, and stop controls.",
    icon: AudioLines,
  },
  {
    title: "2. Transcribe",
    body: "Audio is posted to /api/transcribe, then converted into speaker-labeled segments for clinician and patient dialogue.",
    icon: BrainCircuit,
  },
  {
    title: "3. Structure",
    body: "Saving runs /api/transcribe/save to generate summary + SOAP notes and persist visit-linked documentation.",
    icon: FileStack,
  },
  {
    title: "4. Deliver",
    body: "Clinician and patient surfaces consume the same visit context so guidance stays grounded in stored visit evidence.",
    icon: ShieldCheck,
  },
];

const privacyControls = [
  "Credential authentication with NextAuth and bcrypt password hashing.",
  "Role-based API guards so clinician-only workflows stay access controlled.",
  "Tokenized share links for patient views with revocation support in data model.",
  "HTTPS/TLS for data in transit between browser and server.",
  "AES-256 encryption at rest via managed infrastructure configuration (recommended deployment baseline).",
  "Clear auditability path through visit-linked records and optional Elastic audit indexing.",
];

export default function TechnologyPage() {
  return (
    <main className="relative min-h-screen w-full overflow-hidden bg-[#f4e8d2] text-slate-900">
      <div
        aria-hidden="true"
        className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_top,#fff8ea_0%,#f4e8d2_48%,#ead6b5_100%)]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 z-[1] pointer-events-none"
        style={{
          background:
            "linear-gradient(135deg, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0) 45%, rgba(232,212,179,0.35) 100%)",
        }}
      />
      <div
        aria-hidden="true"
        className="fixed inset-0 z-[2] pointer-events-none opacity-20"
        style={{
          backgroundImage:
            "url('https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/4ce66827-b6c7-4a55-bcab-d3da8a13ff63-redcove-pro/assets/images/noise-3.png')",
          backgroundRepeat: "repeat",
        }}
      />
      <nav className="fixed top-3 left-1/2 z-50 w-fit -translate-x-1/2">
        <div className="flex items-center rounded-full border border-slate-900/10 bg-[#fff8ea]/85 p-1.5 shadow-[0_10px_30px_rgba(75,50,20,0.15)] backdrop-blur-md">
          <Link
            href="/"
            aria-label="Back to home"
            className="ml-px flex h-8 shrink-0 items-center justify-center rounded-full bg-slate-900 px-3 shadow-sm"
          >
            <span className="text-[12px] font-semibold tracking-tight text-white">Synth</span>
          </Link>
          <span className="px-4 text-[12px] font-medium text-slate-700 md:hidden">Technology</span>
          <div className="hidden items-center px-4 md:flex">
            <Link href="/how-it-works" className="px-2 text-[12px] font-medium text-slate-600">
              How it works
            </Link>
            <span className="px-2 text-[12px] font-medium text-slate-900">Technology</span>
          </div>
          <Link
            href="/login"
            className="rounded-full bg-[#0ea5e9] px-5 py-2 text-[13px] font-medium text-white shadow-lg transition-colors hover:bg-[#38bdf8] active:scale-95"
          >
            Sign in
          </Link>
        </div>
      </nav>

      <section className="relative z-10 mx-auto w-full max-w-6xl px-6 pb-20 pt-28 md:pt-32">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-[44px] leading-[1.05] tracking-tight md:text-[64px]">
            Technology behind Synth
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-[16px] leading-[1.65] text-slate-700">
            This page outlines the stack, flow, and privacy controls used to convert visit audio
            into structured clinical outputs and patient-safe interactions.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2">
          {stackItems.map((item) => {
            const Icon = item.icon;
            return (
              <article
                key={item.title}
                className="rounded-[22px] border border-slate-900/10 bg-white/70 p-5 backdrop-blur-md"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-sky-400/20">
                  <Icon className="h-5 w-5 text-sky-600" />
                </div>
                <h2 className="text-[24px] font-semibold leading-tight text-slate-900">{item.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-700">{item.body}</p>
              </article>
            );
          })}
        </div>

        <div className="mt-10 rounded-[24px] border border-slate-900/10 bg-white/70 p-6 backdrop-blur-md">
          <h2 className="text-[30px] font-semibold leading-tight text-slate-900">How it works</h2>
          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            {flowSteps.map((step) => {
              const Icon = step.icon;
              return (
                <article key={step.title} className="rounded-2xl bg-white/70 p-4 border border-slate-900/10">
                  <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900/10">
                    <Icon className="h-4 w-4 text-slate-700" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-700">{step.body}</p>
                </article>
              );
            })}
          </div>
        </div>

        <div className="mt-10 rounded-[24px] border border-slate-900/10 bg-white/70 p-6 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400/20">
              <LockKeyhole className="h-5 w-5 text-emerald-300" />
            </div>
            <h2 className="text-[30px] font-semibold leading-tight text-slate-900">Privacy and security</h2>
          </div>
          <ul className="mt-5 space-y-2.5 text-sm leading-relaxed text-slate-700">
            {privacyControls.map((control) => (
              <li key={control} className="rounded-xl border border-slate-900/10 bg-white/65 px-3.5 py-3">
                {control}
              </li>
            ))}
          </ul>

          <p className="mt-5 text-xs leading-relaxed text-slate-700/90">
            Deployment note: production healthcare environments should pair this application with
            compliance controls (BAA-ready vendors, key management, logging retention, and access
            governance) before handling regulated PHI.
          </p>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/how-it-works"
            className="inline-flex items-center rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
          >
            Explore product flow
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center rounded-xl border border-slate-900/20 bg-white/70 px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-white"
          >
            Open app
          </Link>
        </div>
      </section>
    </main>
  );
}
