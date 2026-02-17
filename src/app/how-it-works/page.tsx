import Link from "next/link";
import { ArrowRight, Bot, ClipboardList, FileAudio, ShieldCheck } from "lucide-react";

const steps = [
  {
    title: "1. Capture the visit",
    body: "Use Transcribe to record clinician-patient conversation with start, pause, and stop controls. The transcript appears live and is saved for downstream workflows.",
    ctaLabel: "Open Transcribe",
    ctaHref: "/transcribe",
    icon: FileAudio,
  },
  {
    title: "2. Generate clinical outputs",
    body: "When a transcript is saved, Synth creates structured artifacts: conversation summary, SOAP note draft, and a clinician-editable additional notes section.",
    ctaLabel: "Open SOAP Notes",
    ctaHref: "/soap-notes",
    icon: ClipboardList,
  },
  {
    title: "3. Enable patient-safe chat",
    body: "Each saved patient record has a Patient's Agent link. It opens a patient-facing assistant grounded in that specific visit context.",
    ctaLabel: "View Login",
    ctaHref: "/login",
    icon: Bot,
  },
  {
    title: "4. Keep an audit trail",
    body: "The system preserves visit-linked data objects and update history so clinicians can review, refine, and share final guidance with confidence.",
    ctaLabel: "Start with Demo",
    ctaHref: "/login",
    icon: ShieldCheck,
  },
];

export default function HowItWorksPage() {
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
          <span className="px-4 text-[12px] font-medium text-slate-700 md:hidden">How it works</span>
          <div className="hidden items-center px-4 md:flex">
            <span className="px-2 text-[12px] font-medium text-slate-900">How it works</span>
            <Link href="/technology" className="px-2 text-[12px] font-medium text-slate-600">
              Technology
            </Link>
          </div>
          <Link
            href="/login"
            className="rounded-full bg-[#0ea5e9] px-5 py-2 text-[13px] font-medium text-white shadow-lg transition-colors hover:bg-[#38bdf8] active:scale-95"
          >
            Sign in
          </Link>
        </div>
      </nav>

      <section className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center px-6 py-24">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-[44px] leading-[1.05] tracking-tight md:text-[64px]">
            How the Synth system works
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-[16px] leading-[1.65] text-slate-700">
            From raw conversation to patient-ready guidance: this workflow connects transcription,
            structured notes, and evidence-grounded patient support in one clinician flow.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.title}
                className="rounded-[22px] border border-slate-900/10 bg-white/70 p-5 backdrop-blur-md"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-sky-400/20">
                  <Icon className="h-5 w-5 text-sky-600" />
                </div>
                <h2 className="text-[24px] font-semibold leading-tight text-slate-900">{step.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-700">{step.body}</p>
                <Link
                  href={step.ctaHref}
                  className="mt-4 inline-flex items-center rounded-xl bg-white px-3.5 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
                >
                  {step.ctaLabel}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
