import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/vendor/qa")({
  component: VendorQARoute,
});

function VendorQARoute() {
  const questions = [
    {
      id: "Q-01",
      author: "Helios Civil Works AG",
      status: "Answered",
      question: "Are there any specific requirements for the asphalt mix on section B4?",
      answer:
        "Yes, please refer to Technical Annex A.3 regarding the modified polymer mix required for heavy traffic zones.",
      date: "2026-04-20 10:45 UTC",
    },
    {
      id: "Q-02",
      author: "Stratum Infrastructure",
      status: "Answered",
      question: "Will night-time construction be permitted to accelerate the timeline?",
      answer:
        "Night-time construction is permitted between 22:00 and 05:00, subject to local noise ordinance compliance.",
      date: "2026-04-21 14:12 UTC",
    },
    {
      id: "Q-03",
      author: "Northwind Construct",
      status: "Pending",
      question: "Is the 15% environmental impact weighting evaluated linearly?",
      answer: null,
      date: "2026-04-22 09:30 UTC",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
        <span>Vendor Identity</span>
        <span>/</span>
        <span>Tender Context</span>
        <span>/</span>
        <span className="text-foreground">Q&A Forum</span>
      </div>

      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            Clarification Forum
          </h1>
          <div className="mt-1 font-mono text-[11px] text-muted-foreground">
            All answers provided by the procurement authority are legally binding.
          </div>
        </div>
        <button className="btn-ember inline-flex h-9 items-center rounded-md px-4 text-[12px] font-semibold cursor-pointer">
          Ask a Question
        </button>
      </div>

      <div className="mt-8 space-y-4">
        {questions.map((q) => (
          <div
            key={q.id}
            className="glass-card relative rounded-xl p-5 shadow-[0_15px_30px_-10px_rgba(0,0,0,0.5)]"
          >
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-3">
                <span className="font-mono text-[11px] text-primary bg-primary/10 px-2 py-0.5 rounded-sm">
                  {q.id}
                </span>
                <span className="text-[12px] font-medium text-foreground/80">{q.author}</span>
                <span className="font-mono text-[10px] text-muted-foreground">{q.date}</span>
              </div>
              <span
                className={`font-mono text-[10px] uppercase tracking-[0.18em] px-2 py-0.5 rounded-sm ${
                  q.status === "Answered"
                    ? "bg-success/15 text-success"
                    : "bg-amber-deep/20 text-amber-deep"
                }`}
              >
                {q.status}
              </span>
            </div>

            <div className="text-[14px] text-foreground font-medium mb-3">{q.question}</div>

            {q.answer ? (
              <div className="mt-3 bg-surface/50 rounded-lg p-4 border-l-2 border-primary">
                <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-1.5">
                  Procurement Authority Response
                </div>
                <div className="text-[13px] text-foreground/90">{q.answer}</div>
              </div>
            ) : (
              <div className="mt-3 bg-surface/30 rounded-lg p-3 border border-dashed border-border text-center">
                <span className="font-mono text-[11px] text-muted-foreground">
                  Response pending review by technical committee.
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
