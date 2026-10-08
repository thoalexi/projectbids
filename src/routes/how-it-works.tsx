import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title: "How bidding works — ProjectBids" },
      { name: "description", content: "Post a job, receive sealed bids, or bid for free and only pay when hired." },
      { property: "og:title", content: "How bidding works — ProjectBids" },
      { property: "og:description", content: "Post a job, receive sealed bids, or bid for free and only pay when hired." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HowItWorks,
});

const steps = [
  { n: "01", t: "Post your project", d: "Add a photo, the details and size of the job, and when you'd like it done." },
  { n: "02", t: "Contractors bid for free", d: "Up to five Atlanta pros send itemized, sealed bids. There are no pay-per-lead fees." },
  { n: "03", t: "You choose", d: "AI lines up every bid side by side and flags what's missing. Accept the one you trust." },
];

function HowItWorks() {
  return (
    <main className="mx-auto max-w-6xl px-6 pb-20 pt-14">
      <h1 className="font-display max-w-[20ch] text-balance text-5xl leading-[1.04]">Three steps from to-do to done.</h1>
      <div className="mt-10 grid gap-5 md:grid-cols-3">
        {steps.map((s) => (
          <div key={s.n} className="frosted rounded-2xl p-6">
            <span className="text-xs font-medium uppercase tracking-[0.14em] text-primary">{s.n}</span>
            <h2 className="mt-2 text-lg font-semibold">{s.t}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{s.d}</p>
          </div>
        ))}
      </div>
      <div className="mt-5 rounded-lg bg-success/10 p-5 ring-1 ring-success/25">
        <p className="font-semibold text-success">The end of paying for leads that never become customers.</p>
        <p className="mt-1 text-sm text-muted-foreground">Contractors only pay ProjectBids after a homeowner hires them. Every losing bid costs $0.</p>
      </div>
      <div className="mt-10 flex gap-3">
        <Button asChild><Link to="/post">Post a project</Link></Button>
        <Button asChild variant="soft"><Link to="/projects">Browse jobs</Link></Button>
      </div>
    </main>
  );
}
