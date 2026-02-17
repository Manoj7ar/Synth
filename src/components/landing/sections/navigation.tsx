import React from "react";
import Link from "next/link";

const Navigation = () => {
  const navItems = [
    { label: "How it works", href: "/how-it-works" },
    { label: "Technology", href: "/technology" },
    { label: "Try It", href: "#try-it" },
  ];

  return (
    <nav className="fixed top-3 left-1/2 -translate-x-1/2 z-50 w-fit">
      <div className="glass-nav rounded-full p-1.5 flex items-center shadow-2xl">
        <Link
          href="/#top"
          aria-label="Synth home"
          className="bg-white rounded-full h-8 px-3 flex items-center justify-center shrink-0 shadow-sm ml-px"
        >
          <span className="text-[12px] font-semibold tracking-tight text-slate-900">
            Synth
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-8 px-8">
          {navItems.map((item) =>
            item.href.startsWith("#") ? (
              <a
                key={item.label}
                href={item.href}
                className="group relative text-[12px] font-medium text-white/65 transition-colors duration-300 hover:text-white"
              >
                {item.label}
                <span className="pointer-events-none absolute -bottom-1 left-0 h-px w-0 bg-white/80 transition-all duration-300 group-hover:w-full" />
              </a>
            ) : (
              <Link
                key={item.label}
                href={item.href}
                className="group relative text-[12px] font-medium text-white/65 transition-colors duration-300 hover:text-white"
              >
                {item.label}
                <span className="pointer-events-none absolute -bottom-1 left-0 h-px w-0 bg-white/80 transition-all duration-300 group-hover:w-full" />
              </Link>
            )
          )}
        </div>

        <Link
          href="/login"
          className="bg-[#0ea5e9] hover:bg-[#38bdf8] text-white px-5 py-2 rounded-full text-[13px] font-medium transition-colors shadow-lg active:scale-95"
        >
          Sign in
        </Link>
      </div>
    </nav>
  );
};

export default Navigation;
