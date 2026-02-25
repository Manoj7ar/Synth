"use client";

import React, { FormEvent, useRef, useState } from "react";
import {
  ArrowRight,
  FileText,
  Loader2,
  Mic,
  Paperclip,
  Sparkles,
} from "lucide-react";
import { MarkdownRenderer } from "@/components/soap-notes/MarkdownRenderer";

type InputTab = "transcript" | "audio";
type SpeakerRole = "clinician" | "patient";

interface TranscriptSegment {
  speaker: SpeakerRole;
  start_ms: number;
  end_ms: number;
  text: string;
}

interface LandingSoapPreviewResponse {
  success: boolean;
  transcript: TranscriptSegment[];
  summary: string;
  soapNotes: string;
  chiefComplaint?: string;
  error?: string;
}

function formatTimestamp(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;
}

const HeroSection: React.FC = () => {
  const [activeTab, setActiveTab] = useState<InputTab>("transcript");
  const [transcriptText, setTranscriptText] = useState("");
  const [transcriptFile, setTranscriptFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [result, setResult] = useState<LandingSoapPreviewResponse | null>(null);

  const transcriptFileInputRef = useRef<HTMLInputElement | null>(null);
  const audioFileInputRef = useRef<HTMLInputElement | null>(null);

  const hasTranscriptInput =
    transcriptText.trim().length > 0 || transcriptFile !== null;
  const hasAudioInput = audioFile !== null;
  const canGenerate =
    !isGenerating &&
    (activeTab === "transcript" ? hasTranscriptInput : hasAudioInput);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canGenerate) return;

    setIsGenerating(true);
    setErrorMessage("");
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("mode", activeTab);

      if (activeTab === "transcript") {
        if (transcriptText.trim()) {
          formData.append("transcriptText", transcriptText.trim());
        }
        if (transcriptFile) {
          formData.append("transcriptFile", transcriptFile);
        }
      } else if (audioFile) {
        formData.append("audio", audioFile);
      }

      const response = await fetch("/api/landing/soap-preview", {
        method: "POST",
        body: formData,
      });

      const payload =
        (await response.json()) as Partial<LandingSoapPreviewResponse> & {
          error?: string;
        };

      if (!response.ok || !payload.success) {
        throw new Error(
          payload.error || "Unable to generate transcript and SOAP note preview."
        );
      }

      setResult(payload as LandingSoapPreviewResponse);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to generate transcript and SOAP note preview."
      );
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <section
      id="top"
      className="relative min-h-screen w-full flex flex-col items-center justify-center overflow-hidden"
    >
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

      <div className="w-full max-w-5xl px-6 pt-20 pb-10 flex flex-col items-center space-y-8 text-center mt-[-20px]">
        <div className="relative z-10 space-y-4">
          <h1 className="text-[40px] md:text-[72px] leading-[1.05] tracking-tight text-white hero-text-shadow">
            Structured{" "}
            <span className="relative inline-block">
              visit notes
              <span className="absolute left-0 bottom-[-4px] w-full h-[8px] bg-[url('data:image/svg+xml,%3Csvg%20width%3D%22100%22%20height%3D%228%22%20viewBox%3D%220%200%20100%208%22%20fill%3D%22none%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cpath%20d%3D%22M1%205.5C20%202.5%2060%201.5%2099%206.5%22%20stroke%3D%22%2338bdf8%22%20stroke-width%3D%223%22%20stroke-linecap%3D%22round%22/%3E%3C/svg%3E')] bg-no-repeat bg-contain" />
            </span>
            , in minutes
          </h1>

          <p className="max-w-2xl mx-auto text-[16px] leading-[1.6] text-slate-100/90 text-balance">
            Attach a transcript or audio recording and let Synth parse the
            visit, extract clinical signals, and generate a SOAP note preview
            directly on the landing page.
          </p>
        </div>

        <div
          id="try-it"
          className="relative z-10 w-full max-w-4xl bg-white rounded-[24px] p-3 shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-slate-100/10"
        >
          <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
            <div className="flex items-center justify-between gap-3 px-2 pt-1">
              <div className="flex items-center bg-[#f1f5f9] p-1 rounded-[16px]">
                <button
                  type="button"
                  onClick={() => setActiveTab("transcript")}
                  className={`relative flex items-center gap-2 px-4 py-2 rounded-[12px] text-sm font-medium transition-all duration-200 ${
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
                  className={`relative flex items-center gap-2 px-4 py-2 rounded-[12px] text-sm font-medium transition-all duration-200 ${
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
                      activeTab === "audio" ? "text-[#0ea5e9]" : "text-slate-400"
                    }`}
                  />
                  Audio
                </button>
              </div>

              <a
                href="/login"
                className="inline-flex items-center gap-2 rounded-[12px] border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Full workflow
                <ArrowRight className="size-4" />
              </a>
            </div>

            {activeTab === "transcript" ? (
              <div className="rounded-[18px] border border-slate-200 bg-slate-50/60 p-3 text-left">
                <textarea
                  value={transcriptText}
                  onChange={(e) => setTranscriptText(e.target.value)}
                  placeholder="Paste a doctor-patient transcript here (or attach a .txt/.md/.json transcript file)..."
                  className="min-h-[140px] w-full resize-y rounded-[14px] border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-800 outline-none placeholder:text-slate-400"
                />

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
                    <button
                      type="button"
                      onClick={() => transcriptFileInputRef.current?.click()}
                      className="inline-flex items-center gap-2 rounded-[12px] border border-slate-200 bg-white px-3 py-2 font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <Paperclip className="size-4" />
                      Attach transcript
                    </button>
                    {transcriptFile && (
                      <span className="inline-flex items-center rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700">
                        {transcriptFile.name}
                      </span>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={!canGenerate}
                    className="inline-flex items-center gap-2 rounded-[12px] bg-[#0ea5e9] px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-[#38bdf8] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        Generate SOAP preview
                      </>
                    )}
                  </button>
                </div>

                <input
                  ref={transcriptFileInputRef}
                  type="file"
                  accept=".txt,.md,.json,.csv,.srt,.vtt,text/plain,text/markdown,application/json"
                  className="hidden"
                  onChange={(e) =>
                    setTranscriptFile(e.target.files?.[0] ?? null)
                  }
                />
              </div>
            ) : (
              <div className="rounded-[18px] border border-slate-200 bg-slate-50/60 p-3 text-left">
                <div className="rounded-[14px] border border-dashed border-slate-300 bg-white px-4 py-6">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 rounded-xl bg-sky-50 p-2 text-sky-600">
                        <Mic className="size-5" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          Upload Audio
                        </p>
                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          Accepted: browser recordings, mp3, wav, m4a, webm, and
                          other audio formats supported by your browser.
                        </p>
                        {audioFile && (
                          <p className="mt-2 text-xs font-medium text-sky-700">
                            Selected: {audioFile.name}
                          </p>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => audioFileInputRef.current?.click()}
                      className="inline-flex items-center justify-center gap-2 rounded-[12px] border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <Paperclip className="size-4" />
                      Upload Audio
                    </button>
                  </div>
                </div>

                <div className="mt-3 flex justify-end">
                  <button
                    type="submit"
                    disabled={!canGenerate}
                    className="inline-flex items-center gap-2 rounded-[12px] bg-[#0ea5e9] px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-[#38bdf8] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Transcribing...
                      </>
                    ) : (
                      <>
                        Transcribe + SOAP preview
                      </>
                    )}
                  </button>
                </div>

                <input
                  ref={audioFileInputRef}
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={(e) => setAudioFile(e.target.files?.[0] ?? null)}
                />
              </div>
            )}

            <p className="px-1 pb-1 text-left text-xs text-slate-500">
              Landing page demo generates a preview only. Sign in for saved visits,
              patient sharing, and full clinician workflows.
            </p>
          </form>
        </div>

        {errorMessage && (
          <div className="relative z-10 w-full max-w-4xl rounded-2xl border border-red-200 bg-white/95 px-4 py-3 text-left text-sm text-red-700 shadow-lg">
            {errorMessage}
          </div>
        )}

        {result && (
          <div className="relative z-10 w-full max-w-4xl rounded-[24px] border border-white/40 bg-white/95 p-4 text-left shadow-[0_20px_60px_rgba(0,0,0,0.3)] backdrop-blur">
            <div className="grid gap-4 lg:grid-cols-[1.1fr_1.4fr]">
              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Summary
                  </p>
                  <div className="mt-3">
                    <MarkdownRenderer content={result.summary} />
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Parsed Transcript
                    </p>
                    <span className="text-xs font-medium text-slate-500">
                      {result.transcript.length} segments
                    </span>
                  </div>
                  {result.chiefComplaint && (
                    <p className="mt-2 text-xs text-slate-600">
                      Chief complaint seed:{" "}
                      <span className="font-medium text-slate-800">
                        {result.chiefComplaint}
                      </span>
                    </p>
                  )}
                  <div className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
                    {result.transcript.map((segment, index) => (
                      <div
                        key={`${segment.start_ms}-${index}`}
                        className={`rounded-xl border px-3 py-2 ${
                          segment.speaker === "clinician"
                            ? "border-sky-200 bg-sky-50/70"
                            : "border-emerald-200 bg-emerald-50/70"
                        }`}
                      >
                        <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600">
                          <span>
                            {segment.speaker === "clinician"
                              ? "Doctor"
                              : "Patient"}
                          </span>
                          <span className="text-slate-400 normal-case tracking-normal">
                            {formatTimestamp(segment.start_ms)} -{" "}
                            {formatTimestamp(segment.end_ms)}
                          </span>
                        </div>
                        <p className="text-sm leading-5 text-slate-800">
                          {segment.text}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  SOAP Note Preview
                </p>
                <div className="mt-3 max-h-[38rem] overflow-y-auto pr-1">
                  <MarkdownRenderer content={result.soapNotes} />
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="relative z-10 mt-1 flex items-center gap-2 text-xs text-white/80 font-medium">
          <span>Built with heart by</span>
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
