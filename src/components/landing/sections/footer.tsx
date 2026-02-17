import React from "react";
import Link from "next/link";

const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="relative isolate z-10 mt-0 w-full overflow-hidden bg-[#f4e8d2] text-slate-900">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#f8f0df] via-transparent to-[#eddab9] opacity-70"
      />

      <div className="relative z-10 mx-auto w-full max-w-6xl px-6 py-14">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="max-w-md">
            <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-slate-900">
              Synth
            </p>
            <h3 className="mt-3 text-2xl font-semibold leading-tight text-slate-900">
              AI visit workflows, built for clinical clarity.
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-slate-900">
              Move from transcript to structured notes and patient-ready guidance with
              evidence-grounded outputs.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/how-it-works"
              className="rounded-full border border-slate-900/25 bg-white/65 px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-white/85"
            >
              How it works
            </Link>
            <Link
              href="/technology"
              className="rounded-full border border-slate-900/25 bg-white/65 px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-white/85"
            >
              Technology
            </Link>
            <Link
              href="/login"
              className="rounded-full bg-sky-300 px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-sky-200"
            >
              Sign in
            </Link>
          </div>
        </div>

        <div className="mt-8 border-t border-slate-900/20 pt-5">
          <p className="text-[12px] tracking-normal text-slate-900">
            (c) {year} Synth. AI-powered medical visit assistant.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
