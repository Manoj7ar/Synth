import React from "react";
import { ArrowRight, FileText, MessageSquare, WandSparkles } from "lucide-react";

const ProcessSteps = () => {
  return (
    <section
      id="how"
      className="relative w-full overflow-hidden bg-[#f4e8d2] px-6 py-32 text-slate-900"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "url('https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/4ce66827-b6c7-4a55-bcab-d3da8a13ff63-redcove-pro/assets/images/noise-3.png')",
          backgroundRepeat: "repeat",
        }}
      />
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-6xl aspect-square pointer-events-none opacity-20 blur-[120px]"
        style={{
          background: "radial-gradient(circle, #38bdf8 0%, transparent 70%)",
        }}
      />

      <div className="container relative z-10 mx-auto max-w-[1200px]">
        <div className="text-center mb-24 space-y-6 max-w-3xl mx-auto">
          <h2 className="text-[48px] md:text-[60px] leading-[1.1] tracking-tight">
            How does this <span className="text-[#38bdf8]">work?</span>
          </h2>
          <p className="text-lg leading-relaxed text-slate-700">
            Import a transcript, let Synth extract medical entities, generate notes, and power a
            patient chat agent grounded in visit evidence.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="group flex flex-col items-start rounded-[24px] bg-white/35 p-8 backdrop-blur-xl shadow-[0_16px_38px_rgba(93,72,35,0.14)] transition-all duration-300 hover:bg-white/45">
            <div className="w-12 h-12 rounded-full bg-white/35 flex items-center justify-center mb-6 border border-white/55">
              <FileText className="w-6 h-6 text-[#38bdf8]" />
            </div>
            <h3 className="mb-4 text-[24px] font-semibold text-slate-900">
              Add a transcript
            </h3>
            <p className="mb-8 text-[16px] leading-relaxed text-slate-700">
              Bring a visit transcript and store it with an audit trail so you can review what was
              said and what was generated.
            </p>

            <div className="mt-auto w-full overflow-hidden rounded-xl border border-white/55 bg-white/45 p-3 backdrop-blur-md">
              <div className="flex items-center gap-3 rounded-lg bg-white/65 px-3 py-2">
                <FileText className="w-4 h-4 text-slate-400" />
                <span className="text-slate-800 text-sm font-medium truncate">
                  “Patient reports dizziness…”
                </span>
                <div className="ml-auto w-6 h-6 rounded bg-[#0ea5e9] flex items-center justify-center">
                  <ArrowRight className="w-3.5 h-3.5 text-white" />
                </div>
              </div>
            </div>
          </div>

          <div className="group flex flex-col items-start rounded-[24px] bg-white/35 p-8 backdrop-blur-xl shadow-[0_16px_38px_rgba(93,72,35,0.14)] transition-all duration-300 hover:bg-white/45">
            <div className="w-12 h-12 rounded-full bg-white/35 flex items-center justify-center mb-6 border border-white/55">
              <WandSparkles className="w-6 h-6 text-[#38bdf8]" />
            </div>
            <h3 className="mb-4 text-[24px] font-semibold text-slate-900">
              Extract + summarize
            </h3>
            <p className="mb-8 text-[16px] leading-relaxed text-slate-700">
              Meds, symptoms and vitals get extracted, then Synth generates summaries and structured
              documentation like SOAP.
            </p>

            <div className="w-full mt-auto space-y-2">
              <div className="transform rounded-xl border border-white/55 bg-white/55 p-3 backdrop-blur-md transition-transform group-hover:-translate-y-1">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-4 h-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                  </div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Entities
                  </span>
                </div>
                <div className="line-clamp-1 text-[12px] font-medium text-slate-800">
                  Meds: lisinopril, metformin
                </div>
              </div>
              <div className="rounded-xl border border-white/50 bg-white/45 p-3 backdrop-blur-md">
                <div className="line-clamp-1 text-[12px] font-medium text-slate-700">
                  SOAP: Assessment + Plan generated
                </div>
              </div>
            </div>
          </div>

          <div className="group flex flex-col items-start rounded-[24px] bg-white/35 p-8 backdrop-blur-xl shadow-[0_16px_38px_rgba(93,72,35,0.14)] transition-all duration-300 hover:bg-white/45">
            <div className="w-12 h-12 rounded-full bg-white/35 flex items-center justify-center mb-6 border border-white/55">
              <MessageSquare className="w-6 h-6 text-[#38bdf8]" />
            </div>
            <h3 className="mb-4 text-[24px] font-semibold text-slate-900">
              Chat + audit
            </h3>
            <p className="mb-8 text-[16px] leading-relaxed text-slate-700">
              Ask questions and see answers grounded in visit evidence, plus a trace of tools and
              queries.
            </p>

            <div className="mt-auto w-full rounded-xl border border-[#38bdf8]/35 bg-white/45 p-4 border-dashed backdrop-blur-md">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-[#0ea5e9] flex items-center justify-center shrink-0">
                  <MessageSquare className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="text-[14px] font-semibold text-slate-900">
                    Evidence only
                  </div>
                  <div className="text-[11px] font-medium text-slate-600">
                    Tool trace visible
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Subtle original gradient texture overlay */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[url('https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/4ce66827-b6c7-4a55-bcab-d3da8a13ff63-redcove-pro/assets/images/gradient-bg-5.png')] bg-cover opacity-10 pointer-events-none mix-blend-overlay"
      />
    </section>
  );
};

export default ProcessSteps;
