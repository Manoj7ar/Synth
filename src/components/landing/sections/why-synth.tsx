import React from "react";

const marqueeCards = [
  {
    label: "Entity extraction",
    title: "Medications, symptoms, vitals and procedures",
    body: "Highlight key medical entities in the transcript so clinicians can review quickly and patients can understand the plan.",
  },
  {
    label: "Summaries",
    title: "Visit summary + SOAP note generation",
    body: "Generate clinician-ready documentation from the conversation, then refine it with reviewable edits.",
  },
  {
    label: "Patient chat",
    title: "Evidence-only answers with tool trace",
    body: "A patient agent that answers questions grounded in visit evidence and shows how it reached the result.",
  },
  {
    label: "Analytics",
    title: "Trends across visits and cohorts",
    body: "Surface patterns like symptom trends and medication changes with Elasticsearch-powered aggregations.",
  },
  {
    label: "Workflows",
    title: "Multi-agent handoffs with audit trail",
    body: "Clinician, patient and triage agents working together, with a record of actions and outputs.",
  },
];

const Card = ({ item }: { item: (typeof marqueeCards)[0] }) => (
  <article className="mx-2 w-[440px] shrink-0 rounded-xl border border-slate-900/10 bg-white/80 p-5">
    <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">
      {item.label}
    </div>
    <div className="mt-2 text-[16px] font-semibold leading-snug text-slate-900">
      {item.title}
    </div>
    <p className="mt-2 text-[13px] leading-relaxed text-slate-700">
      {item.body}
    </p>
  </article>
);

const WhySynth = () => {
  return (
    <section
      id="features"
      className="relative w-full overflow-hidden bg-[#f4e8d2] py-32 text-slate-900"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 opacity-20"
        style={{
          backgroundImage:
            "url('https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/4ce66827-b6c7-4a55-bcab-d3da8a13ff63-redcove-pro/assets/images/noise-3.png')",
          backgroundRepeat: "repeat",
        }}
      />
      <div className="container relative z-10 mx-auto px-6">
        <div className="mb-16 text-center space-y-6">
          <h2 className="text-5xl tracking-tight lg:text-7xl">
            Why use{" "}
            <span className="relative z-20 inline-flex translate-y-1 rounded-full border border-[#e8d6b8] bg-[#fff7e8] px-4 py-1.5 text-[#38bdf8] shadow-[0_8px_22px_rgba(94,72,35,0.18)]">
              Synth
            </span>
          </h2>
          <p className="mx-auto inline-block max-w-4xl rounded-full border border-[#e8d6b8] bg-[#fff7e8] px-6 py-3 text-base leading-relaxed text-slate-700 shadow-[0_8px_20px_rgba(94,72,35,0.12)] md:text-lg">
            An AI medical visit assistant that turns conversations into extracted entities,
            summaries and evidence-grounded agents. Built to be reviewable.
          </p>
        </div>
      </div>

      <div className="relative z-10 w-full">
        <div className="mask-marquee flex overflow-hidden">
          <div className="animate-marquee flex min-w-full items-center py-4">
            {marqueeCards.map((item, idx) => (
              <Card key={`card-a-${idx}`} item={item} />
            ))}
            {marqueeCards.map((item, idx) => (
              <Card key={`card-b-${idx}`} item={item} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default WhySynth;
