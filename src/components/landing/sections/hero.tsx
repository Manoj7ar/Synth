"use client";

import React, { useState } from "react";
import { FileText, Mic, ArrowRight } from "lucide-react";

const HeroSection: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"transcript" | "audio">(
    "transcript"
  );

  return (
    <section
      id="top"
      className="relative min-h-screen w-full flex flex-col items-center justify-center overflow-hidden"
    >
      {/* Original landing visuals: photo background + floral overlay + fixed noise texture */}
      <div
        aria-hidden="true"
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage:
            "url('https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/4ce66827-b6c7-4a55-bcab-d3da8a13ff63-redcove-pro/assets/images/08-2.jpg')",
          backgroundSize: "cover",
        }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 z-[1] bg-cover bg-bottom opacity-100 pointer-events-none"
        style={{
          backgroundImage:
            "url('https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/4ce66827-b6c7-4a55-bcab-d3da8a13ff63-redcove-pro/assets/images/daisies-4.png')",
          backgroundSize: "cover",
        }}
      />
      <div
        aria-hidden="true"
        className="fixed inset-0 z-[2] pointer-events-none opacity-25"
        style={{
          backgroundImage:
            "url('https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/4ce66827-b6c7-4a55-bcab-d3da8a13ff63-redcove-pro/assets/images/noise-3.png')",
          backgroundRepeat: "repeat",
        }}
      />

      <div className="w-full max-w-3xl px-6 pt-20 flex flex-col items-center space-y-8 text-center mt-[-40px]">
        <div className="relative z-10 space-y-4">
          <h1 className="text-[52px] md:text-[72px] leading-[1.05] tracking-tight text-white hero-text-shadow">
            Structured{" "}
            <span className="relative inline-block">
              visit notes
              <span className="absolute left-0 bottom-[-4px] w-full h-[8px] bg-[url('data:image/svg+xml,%3Csvg%20width%3D%22100%22%20height%3D%228%22%20viewBox%3D%220%200%20100%208%22%20fill%3D%22none%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cpath%20d%3D%22M1%205.5C20%202.5%2060%201.5%2099%206.5%22%20stroke%3D%22%2338bdf8%22%20stroke-width%3D%223%22%20stroke-linecap%3D%22round%22/%3E%3C/svg%3E')] bg-no-repeat bg-contain" />
            </span>
            , in minutes
          </h1>

          <p className="max-w-2xl mx-auto text-[16px] leading-[1.6] text-slate-100/90 text-balance">
            Synth extracts medications, symptoms, vitals and procedures, generates visit summaries
            and SOAP notes, and powers a patient chat agent grounded in visit evidence.
          </p>
        </div>

        <div
          id="try-it"
          className="relative z-10 w-full max-w-2xl bg-white rounded-[24px] p-3 shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-slate-100/10"
        >
          <form className="flex flex-col" onSubmit={(e) => e.preventDefault()}>
            <div className="flex items-center px-4 py-4 border-b border-slate-100 mb-2">
              {activeTab === "transcript" ? (
                <FileText className="text-slate-400 size-6 mr-4 shrink-0" />
              ) : (
                <Mic className="text-slate-400 size-6 mr-4 shrink-0" />
              )}
              <input
                type="text"
                placeholder={
                  activeTab === "transcript"
                    ? "Paste a transcript snippet…"
                    : "Upload audio (coming soon)…"
                }
                className="flex-1 outline-none text-[18px] text-slate-800 placeholder:text-slate-400 font-medium bg-transparent"
              />
            </div>

            <div className="flex items-center justify-between pl-2 pr-1 pb-1">
              <div className="flex items-center bg-[#f1f5f9] p-1 rounded-[16px]">
                <button
                  type="button"
                  onClick={() => setActiveTab("transcript")}
                  className={`relative flex items-center gap-2 px-5 py-2 rounded-[12px] text-sm font-medium transition-all duration-200 ${
                    activeTab === "transcript"
                      ? "text-slate-900"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {activeTab === "transcript" && (
                    <div className="absolute inset-0 bg-white shadow-sm border border-slate-200/50 rounded-[12px] -z-10" />
                  )}
                  <FileText
                    className={`size-3.5 ${
                      activeTab === "transcript"
                        ? "text-[#0ea5e9]"
                        : "text-slate-400"
                    }`}
                  />
                  Transcript
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("audio")}
                  className={`relative flex items-center gap-2 px-5 py-2 rounded-[12px] text-sm font-medium transition-all duration-200 ${
                    activeTab === "audio"
                      ? "text-slate-900"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {activeTab === "audio" && (
                    <div className="absolute inset-0 bg-white shadow-sm border border-slate-200/50 rounded-[12px] -z-10" />
                  )}
                  <Mic
                    className={`size-3.5 ${
                      activeTab === "audio"
                        ? "text-[#0ea5e9]"
                        : "text-slate-400"
                    }`}
                  />
                  Audio
                </button>
              </div>

              <a
                href="/login"
                className="bg-[#0ea5e9] hover:bg-[#38bdf8] text-white p-2.5 rounded-[12px] transition-all transform hover:scale-105 active:scale-95 shadow-md"
                aria-label="Sign in"
              >
                <ArrowRight className="size-6" />
              </a>
            </div>
          </form>
        </div>

        <div className="relative z-10 mt-4 flex items-center gap-2 text-xs text-white/80 font-medium">
          <span>Built with ❤️ by</span>
          <a
            href="https://www.linkedin.com/in/manoj07ar/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center rounded-full bg-white/20 px-3 py-1 text-white transition hover:bg-white/30"
          >
            Manoj
          </a>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
